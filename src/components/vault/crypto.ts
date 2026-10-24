/** Расшифровка закрытых материалов в браузере (пара к scripts/build-vault.mjs). */

export interface VaultMeta {
  version: number;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: "AES-GCM";
  manifest: string;
}

export interface VaultDocument {
  title: string;
  fileName: string;
  mime: string;
  size: number;
  file: string;
}

export interface VaultManifest {
  version: number;
  createdAt: string;
  documents: VaultDocument[];
  handbook: string | null;
}

const SESSION_KEY = "vault.session.key";

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function loadMeta(base: string): Promise<VaultMeta> {
  const res = await fetch(`${base}meta.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error("Закрытые материалы ещё не загружены на сайт.");
  return res.json();
}

export async function deriveKey(password: string, meta: VaultMeta, extractable = false): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: meta.kdf.hash, salt: fromBase64(meta.kdf.salt), iterations: meta.kdf.iterations },
    base,
    { name: "AES-GCM", length: 256 },
    extractable,
    ["decrypt"],
  );
}

export async function fetchDecrypted(base: string, file: string, key: CryptoKey): Promise<ArrayBuffer> {
  const res = await fetch(`${base}${file}`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Файл не найден: ${file}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

export async function fetchJson<T>(base: string, file: string, key: CryptoKey): Promise<T> {
  const buffer = await fetchDecrypted(base, file, key);
  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}

/** Ключ на время сессии вкладки, чтобы не вводить пароль при каждом обновлении. */
export async function rememberKey(key: CryptoKey, salt: string) {
  try {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ salt, key: btoa(String.fromCharCode(...raw)) }));
  } catch {
    /* sessionStorage недоступен — просто попросим пароль снова */
  }
}

export async function restoreKey(meta: VaultMeta): Promise<CryptoKey | null> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!saved || saved.salt !== meta.kdf.salt) return null;
    return crypto.subtle.importKey("raw", fromBase64(saved.key), { name: "AES-GCM" }, false, ["decrypt"]);
  } catch {
    return null;
  }
}

export function forgetKey() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ничего */
  }
}
