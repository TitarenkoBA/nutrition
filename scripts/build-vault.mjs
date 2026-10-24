// Шифрует закрытые материалы для раздела /kabinet/.
//
//   npm run vault
//
// Что берётся:
//   private/files/*.pdf   — документы (название = имя файла)
//   private/handbook.mjs  — справочник с поиском
// Пароль:
//   переменная окружения VAULT_PASSWORD, иначе файл private/.vault-password,
//   иначе скрипт спросит его в терминале.
// Результат: public/vault/ (meta.json + зашифрованные *.bin) — его и нужно коммитить.
//
// Шифрование: PBKDF2-SHA256 (600 000 итераций) → AES-256-GCM, у каждого файла свой IV.
// Без пароля файлы расшифровать нельзя, поэтому их можно хранить в публичном репозитории.

import { webcrypto as crypto } from "node:crypto";
import { readFile, writeFile, readdir, mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import readline from "node:readline";

const ROOT = path.resolve(import.meta.dirname, "..");
const PRIVATE = path.join(ROOT, "private");
const FILES = path.join(PRIVATE, "files");
const OUT = path.join(ROOT, "public", "vault");
const ITERATIONS = 600_000;
const MIN_PASSWORD = 12;

const subtle = crypto.subtle;
const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const randomId = () => Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("hex");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function getPassword() {
  if (process.env.VAULT_PASSWORD) return process.env.VAULT_PASSWORD;
  const file = path.join(PRIVATE, ".vault-password");
  if (existsSync(file)) return (await readFile(file, "utf8")).trim();
  if (!process.stdin.isTTY) throw new Error("Нет пароля: задайте VAULT_PASSWORD или создайте private/.vault-password");
  const first = await askHidden("Пароль для закрытого раздела: ");
  const second = await askHidden("Повторите пароль: ");
  if (first !== second) throw new Error("Пароли не совпадают");
  return first;
}

async function deriveKey(password, salt) {
  const base = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return out;
}

async function decrypt(key, bytes) {
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12)));
}

function titleFromFile(name) {
  return path
    .basename(name, path.extname(name))
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const password = await getPassword();
  if (password.length < MIN_PASSWORD) throw new Error(`Пароль слишком короткий: нужно минимум ${MIN_PASSWORD} символов`);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const written = [];
  const put = async (bytes) => {
    const name = `${randomId()}.bin`;
    const encrypted = await encrypt(key, bytes);
    await writeFile(path.join(OUT, name), encrypted);
    written.push({ name, encrypted, original: bytes });
    return name;
  };

  // Документы
  const documents = [];
  if (existsSync(FILES)) {
    const names = (await readdir(FILES)).filter((n) => !n.startsWith(".")).sort((a, b) => a.localeCompare(b, "ru"));
    for (const name of names) {
      const full = path.join(FILES, name);
      if (!(await stat(full)).isFile()) continue;
      const bytes = new Uint8Array(await readFile(full));
      const ext = path.extname(name).toLowerCase();
      const mime = ext === ".pdf" ? "application/pdf" : "application/octet-stream";
      documents.push({ title: titleFromFile(name), fileName: name, mime, size: bytes.length, file: await put(bytes) });
      console.log(`  документ: ${name}`);
    }
  }

  // Справочник
  let handbook = null;
  const handbookPath = path.join(PRIVATE, "handbook.mjs");
  if (existsSync(handbookPath)) {
    const mod = await import(`${pathToFileURL(handbookPath).href}?t=${Date.now()}`);
    const json = JSON.stringify(mod.default);
    handbook = await put(new TextEncoder().encode(json));
    console.log(`  справочник: ${mod.default.entries.length} записей`);
  }

  const manifest = { version: 1, createdAt: new Date().toISOString(), documents, handbook };
  const manifestFile = await put(new TextEncoder().encode(JSON.stringify(manifest)));

  await writeFile(
    path.join(OUT, "meta.json"),
    JSON.stringify(
      {
        version: 1,
        kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: b64(salt) },
        cipher: "AES-GCM",
        manifest: manifestFile,
      },
      null,
      2,
    ),
  );

  // Проверка: всё расшифровывается тем же паролем
  const checkKey = await deriveKey(password, salt);
  for (const item of written) {
    const plain = await decrypt(checkKey, item.encrypted);
    if (Buffer.compare(Buffer.from(plain), Buffer.from(item.original)) !== 0) throw new Error(`Проверка не прошла: ${item.name}`);
  }

  console.log(`\nГотово: ${written.length} зашифрованных файлов в public/vault/. Проверка расшифровки пройдена.`);
}

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}`);
  process.exit(1);
});
