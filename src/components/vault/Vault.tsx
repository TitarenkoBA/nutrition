import { useEffect, useState } from "react";
import Handbook from "./Handbook";
import type { Handbook as HandbookData } from "./search";
import {
  deriveKey,
  fetchDecrypted,
  fetchJson,
  forgetKey,
  loadMeta,
  rememberKey,
  restoreKey,
  type VaultManifest,
  type VaultMeta,
} from "./crypto";
import "../questionnaire/questionnaire.css";
import "./vault.css";

interface Props {
  /** Путь к папке vault с учётом base, например "/repo/vault/". */
  base: string;
  homeUrl: string;
}

type State =
  | { status: "loading" }
  | { status: "locked"; meta: VaultMeta; error?: string; busy?: boolean }
  | { status: "open"; meta: VaultMeta; key: CryptoKey; manifest: VaultManifest; handbook: HandbookData | null }
  | { status: "missing"; message: string };

export default function Vault({ base, homeUrl }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [tab, setTab] = useState<"handbook" | "documents">("handbook");

  const open = async (meta: VaultMeta, key: CryptoKey) => {
    const manifest = await fetchJson<VaultManifest>(base, meta.manifest, key);
    const handbook = manifest.handbook ? await fetchJson<HandbookData>(base, manifest.handbook, key) : null;
    setState({ status: "open", meta, key, manifest, handbook });
    if (!handbook) setTab("documents");
  };

  useEffect(() => {
    (async () => {
      try {
        const meta = await loadMeta(base);
        const saved = await restoreKey(meta);
        if (saved) {
          try {
            await open(meta, saved);
            return;
          } catch {
            forgetKey();
          }
        }
        setState({ status: "locked", meta });
      } catch (e) {
        setState({ status: "missing", message: (e as Error).message });
      }
    })();
  }, []);

  const unlock = async (event: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    event.preventDefault();
    if (state.status !== "locked") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const remember = form.get("remember") === "on";
    setState({ ...state, busy: true, error: undefined });
    try {
      const key = await deriveKey(password, state.meta, true);
      await open(state.meta, key);
      if (remember) await rememberKey(key, state.meta.kdf.salt);
    } catch {
      setState({ status: "locked", meta: state.meta, error: "Неверный пароль" });
    }
  };

  const lock = () => {
    forgetKey();
    if (state.status === "open") setState({ status: "locked", meta: state.meta });
  };

  if (state.status === "loading") return <p className="vault-center muted">Загрузка…</p>;

  if (state.status === "missing")
    return (
      <div className="vault-login card">
        <h1>Закрытый раздел</h1>
        <p className="muted">{state.message}</p>
        <a href={homeUrl}>← На сайт</a>
      </div>
    );

  if (state.status === "locked")
    return (
      <form className="vault-login card" onSubmit={unlock}>
        <span className="vault-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
        <h1>Закрытый раздел</h1>
        <p className="muted">Материалы зашифрованы и открываются только по паролю — прямо в браузере.</p>
        <label className="q-field">
          <span>Пароль</span>
          <input className="q-input" type="password" name="password" autoComplete="current-password" required autoFocus aria-invalid={Boolean(state.error)} />
        </label>
        {state.error && <p className="q-error">{state.error}</p>}
        <label className="q-check">
          <input type="checkbox" name="remember" defaultChecked />
          <span>Не спрашивать до закрытия вкладки</span>
        </label>
        <button type="submit" className="btn btn--sage" disabled={state.busy}>
          {state.busy ? "Проверяю…" : "Открыть"}
        </button>
        <a className="vault-back" href={homeUrl}>
          ← На сайт
        </a>
      </form>
    );

  const { manifest, handbook, key } = state;

  return (
    <div className="vault">
      <header className="vault-bar">
        <div className="vault-bar__title">
          <span className="eyebrow">Кабинет</span>
          <h1>{handbook?.title ?? "Закрытые материалы"}</h1>
        </div>
        <div className="vault-bar__actions">
          <a className="btn btn--ghost btn--small" href={homeUrl}>
            На сайт
          </a>
          <button type="button" className="btn btn--small" onClick={lock}>
            Выйти
          </button>
        </div>
      </header>

      <div className="vault-tabs" role="tablist">
        {handbook && (
          <button type="button" role="tab" aria-selected={tab === "handbook"} className={tab === "handbook" ? "is-active" : ""} onClick={() => setTab("handbook")}>
            Справочник
          </button>
        )}
        <button type="button" role="tab" aria-selected={tab === "documents"} className={tab === "documents" ? "is-active" : ""} onClick={() => setTab("documents")}>
          Документы ({manifest.documents.length})
        </button>
      </div>

      {tab === "handbook" && handbook && <Handbook data={handbook} />}
      {tab === "documents" && <Documents base={base} docs={manifest.documents} cryptoKey={key} />}
    </div>
  );
}

function Documents({ base, docs, cryptoKey }: { base: string; docs: VaultManifest["documents"]; cryptoKey: CryptoKey }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const get = async (file: string, mime: string) => {
    setError("");
    setBusy(file);
    try {
      const buffer = await fetchDecrypted(base, file, cryptoKey);
      return URL.createObjectURL(new Blob([buffer], { type: mime }));
    } catch {
      setError("Не удалось расшифровать файл. Обновите страницу и войдите снова.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const view = async (doc: VaultManifest["documents"][number]) => {
    // Окно открываем сразу (до await), иначе браузер сочтёт его всплывающим и заблокирует.
    const win = window.open("", "_blank");
    const href = await get(doc.file, doc.mime);
    if (!href) {
      win?.close();
      return;
    }
    if (win) win.location.href = href;
    else window.location.href = href;
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  };

  const download = async (doc: VaultManifest["documents"][number]) => {
    const href = await get(doc.file, doc.mime);
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = doc.fileName;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  };

  if (docs.length === 0) return <p className="muted">Документов пока нет.</p>;

  return (
    <div className="vault-docs">
      {error && <p className="q-error">{error}</p>}
      {docs.map((doc) => (
        <article key={doc.file} className="vault-doc card">
          <div>
            <h2>{doc.title}</h2>
            <p className="muted">
              PDF · {(doc.size / 1024).toFixed(0)} КБ
            </p>
          </div>
          <div className="vault-doc__actions">
            <button type="button" className="btn btn--sage btn--small" disabled={busy === doc.file} onClick={() => view(doc)}>
              {busy === doc.file ? "Открываю…" : "Открыть"}
            </button>
            <button type="button" className="btn btn--ghost btn--small" disabled={busy === doc.file} onClick={() => download(doc)}>
              Скачать
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
