import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  steps,
  STORAGE_KEY,
  STORAGE_STEP_KEY,
  isVisible,
  str,
  stepProgress,
  validateStep,
  type Field,
  type Values,
} from "./schema";
import { buildPdf, pdfFileName } from "./pdf";
import { consentParagraphs } from "./consent";
import "./questionnaire.css";

interface Props {
  telegram: string;
  email: string;
  /** Имя нутрициолога — оператор персональных данных в тексте согласия. */
  ownerName: string;
  /** Полный адрес политики конфиденциальности (попадает в PDF). */
  privacyUrl: string;
}

const SEND_STEP = steps.length; // последний экран «Отправка» идёт после всех разделов

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Приватный режим или переполнено хранилище — анкета работает и без черновика.
  }
}

export default function Questionnaire({ telegram, email, ownerName, privacyUrl }: Props) {
  const [values, setValues] = useState<Values>({});
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Восстанавливаем черновик
  useEffect(() => {
    const saved = readStorage<Values>(STORAGE_KEY, {});
    const step = readStorage<number>(STORAGE_STEP_KEY, 0);
    if (Object.keys(saved).length > 0) {
      setValues(saved);
      setRestored(true);
    }
    setCurrent(Math.min(Math.max(0, Number(step) || 0), SEND_STEP));
    setLoaded(true);
  }, []);

  // Автосохранение
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => writeStorage(STORAGE_KEY, values), 300);
    return () => window.clearTimeout(id);
  }, [values, loaded]);

  useEffect(() => {
    if (loaded) writeStorage(STORAGE_STEP_KEY, current);
  }, [current, loaded]);

  const setValue = useCallback((id: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const goTo = (index: number) => {
    setErrors({});
    setCurrent(index);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const next = () => {
    if (current < steps.length) {
      const stepErrors = validateStep(steps[current], values);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        const first = Object.keys(stepErrors)[0];
        requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
        return;
      }
    }
    goTo(Math.min(current + 1, SEND_STEP));
  };

  const clearDraft = () => {
    if (!window.confirm("Удалить все ответы с этого устройства? Это действие нельзя отменить.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP_KEY);
    } catch {
      /* ничего страшного */
    }
    setValues({});
    setRestored(false);
    goTo(0);
  };

  const totalProgress = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const step of steps) {
      const p = stepProgress(step, values);
      filled += p.filled;
      total += p.total;
    }
    return total ? Math.round((filled / total) * 100) : 0;
  }, [values]);

  const isSend = current === SEND_STEP;
  const step = steps[current];

  return (
    <div className="q" ref={topRef}>
      <nav className="q-nav" aria-label="Разделы анкеты">
        <div className="q-progress" aria-hidden="true">
          <span style={{ width: `${isSend ? 100 : ((current + 1) / (SEND_STEP + 1)) * 100}%` }} />
        </div>
        <ol className="q-nav__list">
          {steps.map((s, i) => {
            const p = stepProgress(s, values);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`q-nav__item${i === current ? " is-current" : ""}${p.filled > 0 ? " is-touched" : ""}`}
                  aria-current={i === current ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span className="q-nav__num">{i + 1}</span>
                  <span className="q-nav__label">{s.short}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={`q-nav__item q-nav__item--send${isSend ? " is-current" : ""}`}
              aria-current={isSend ? "step" : undefined}
              onClick={() => goTo(SEND_STEP)}
            >
              <span className="q-nav__num">✓</span>
              <span className="q-nav__label">Отправка</span>
            </button>
          </li>
        </ol>
      </nav>

      <div className="q-body">
        {restored && current === 0 && (
          <div className="q-banner" role="status">
            Мы восстановили Ваш черновик — можно продолжить с того места, где Вы остановились.
          </div>
        )}

        {isSend ? (
          <SendStep values={values} setValue={setValue} telegram={telegram} email={email} ownerName={ownerName} privacyUrl={privacyUrl} goTo={goTo} />
        ) : (
          <section aria-labelledby="q-step-title">
            <p className="q-step__count">
              Раздел {current + 1} из {steps.length}
            </p>
            <h2 id="q-step-title" className="q-step__title">
              {step.title}
            </h2>
            {step.intro && <p className="q-step__intro">{step.intro}</p>}
            <div className="q-fields">
              {step.fields
                .filter((f) => isVisible(f, values))
                .map((field) => (
                  <FieldView key={field.id} field={field} values={values} setValue={setValue} error={errors[field.id]} />
                ))}
            </div>
          </section>
        )}

        <div className="q-actions">
          <button type="button" className="btn btn--ghost" onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}>
            Назад
          </button>
          {!isSend && (
            <button type="button" className="btn btn--sage" onClick={next}>
              {current === steps.length - 1 ? "К отправке" : "Далее"}
            </button>
          )}
        </div>

        <footer className="q-footer">
          <span>
            Заполнено примерно на {totalProgress}%. Черновик сохраняется автоматически только на этом устройстве.
          </span>
          <button type="button" className="q-link" onClick={clearDraft}>
            Удалить черновик
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- Поля ---------- */

interface FieldProps {
  field: Field;
  values: Values;
  setValue: (id: string, value: string | boolean) => void;
  error?: string;
}

function FieldView({ field, values, setValue, error }: FieldProps) {
  const id = `f-${field.id}`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = "hint" in field && field.hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  switch (field.kind) {
    case "heading":
      return (
        <div className="q-heading">
          <h3>{field.label}</h3>
          {field.hint && <p>{field.hint}</p>}
        </div>
      );

    case "note":
      if (field.label === "diary-guide") return <DiaryGuide />;
      if (field.label === "photo-guide") return <PhotoGuide />;
      return <div className={`q-note q-note--${field.tone ?? "info"}`}>{field.label}</div>;

    case "yesno": {
      const answer = str(values, field.id);
      return (
        <fieldset className="q-field q-yesno" aria-describedby={describedBy}>
          <legend>
            <span className="q-num">{field.num}</span>
            {field.label}
          </legend>
          {field.hint && (
            <p className="q-hint" id={hintId}>
              {field.hint}
            </p>
          )}
          <div className="q-segment" role="radiogroup" aria-label={field.label}>
            {[
              { value: "yes", label: "Да" },
              { value: "no", label: "Нет" },
            ].map((opt) => (
              <label key={opt.value} className={answer === opt.value ? "is-checked" : ""}>
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={answer === opt.value}
                  onChange={() => setValue(field.id, opt.value)}
                  onClick={() => answer === opt.value && setValue(field.id, "")}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <label className="q-details">
            <span className="visually-hidden">{field.detailsLabel ?? "Подробно"}</span>
            <textarea
              rows={answer === "yes" ? 3 : 2}
              placeholder={field.detailsLabel ?? "Подробно"}
              value={str(values, `${field.id}_details`)}
              onChange={(e) => setValue(`${field.id}_details`, e.target.value)}
            />
          </label>
        </fieldset>
      );
    }

    case "survey-text":
      return (
        <div className="q-field">
          <label htmlFor={id}>
            <span className="q-num">{field.num}</span>
            {field.label}
          </label>
          {field.hint && (
            <p className="q-hint" id={hintId}>
              {field.hint}
            </p>
          )}
          {field.short ? (
            <input
              id={id}
              type="text"
              className="q-input q-input--short"
              placeholder={field.placeholder}
              value={str(values, field.id)}
              onChange={(e) => setValue(field.id, e.target.value)}
              aria-describedby={describedBy}
            />
          ) : (
            <textarea
              id={id}
              rows={2}
              className="q-input"
              placeholder={field.placeholder ?? "Подробно"}
              value={str(values, field.id)}
              onChange={(e) => setValue(field.id, e.target.value)}
              aria-describedby={describedBy}
            />
          )}
        </div>
      );

    case "choice": {
      const value = str(values, field.id);
      return (
        <fieldset className="q-field" aria-describedby={describedBy}>
          <legend>{field.label}</legend>
          {field.hint && (
            <p className="q-hint" id={hintId}>
              {field.hint}
            </p>
          )}
          <div className="q-segment">
            {field.options.map((opt) => (
              <label key={opt.value} className={value === opt.value ? "is-checked" : ""}>
                <input type="radio" name={field.id} value={opt.value} checked={value === opt.value} onChange={() => setValue(field.id, opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    case "checkbox":
      return (
        <label className="q-check">
          <input type="checkbox" checked={values[field.id] === true} onChange={(e) => setValue(field.id, e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );

    case "textarea":
      return (
        <div className="q-field">
          <label htmlFor={id}>
            {field.label}
            {field.required && <span className="q-required"> *</span>}
          </label>
          {field.hint && (
            <p className="q-hint" id={hintId}>
              {field.hint}
            </p>
          )}
          <textarea
            id={id}
            rows={field.rows ?? 3}
            className="q-input"
            placeholder={field.placeholder}
            value={str(values, field.id)}
            onChange={(e) => setValue(field.id, e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
          />
          {error && (
            <p className="q-error" id={errorId}>
              {error}
            </p>
          )}
        </div>
      );

    default: {
      const isNumber = field.kind === "number";
      return (
        <div className={`q-field${"half" in field && field.half ? " q-field--half" : ""}`}>
          <label htmlFor={id}>
            {field.label}
            {field.required && <span className="q-required"> *</span>}
          </label>
          {field.hint && (
            <p className="q-hint" id={hintId}>
              {field.hint}
            </p>
          )}
          <div className={isNumber ? "q-unit" : undefined}>
            <input
              id={id}
              className="q-input"
              type={isNumber ? "number" : field.kind}
              inputMode={isNumber ? "decimal" : field.kind === "tel" ? "tel" : undefined}
              autoComplete={
                field.id === "fullName" ? "name" : field.kind === "tel" ? "tel" : field.kind === "email" ? "email" : field.id === "birthDate" ? "bday" : undefined
              }
              min={isNumber ? field.min : undefined}
              max={isNumber ? field.max : field.kind === "date" ? new Date().toISOString().slice(0, 10) : undefined}
              step={isNumber ? "0.1" : undefined}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              value={str(values, field.id)}
              onChange={(e) => setValue(field.id, e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
            />
            {isNumber && field.unit && <span className="q-unit__label">{field.unit}</span>}
          </div>
          {error && (
            <p className="q-error" id={errorId}>
              {error}
            </p>
          )}
        </div>
      );
    }
  }
}

/* ---------- Подсказки ---------- */

function DiaryGuide() {
  return (
    <div className="q-guide">
      <h3>Что указывать</h3>
      <ul>
        <li>
          <b>Еда.</b> Любой, даже незначительный приём пищи (например, жвачка, 2 ореха и т.д.).
        </li>
        <li>
          <b>Питьевой режим.</b> Любая жидкость: вода, кофе, сок и т.д.
        </li>
        <li>
          <b>Время</b> приёма пищи, воды или любой другой жидкости.
        </li>
        <li>
          <b>Объём порции</b> в граммах (с помощью кухонных весов). Если такой возможности нет — в столовых и чайных
          ложках или «по руке» (см. ниже).
        </li>
        <li>Если после приёма пищи случается всплеск эмоций или апатия — опишите их.</li>
        <li>Если после еды Вы испытываете дискомфортные, необычные или болезненные ощущения — опишите их.</li>
      </ul>

      <h3>Объём порции «по руке»</h3>
      <div className="q-hands">
        <div>
          <span aria-hidden="true">✋</span>
          <b>Ладонь</b>
          <small>мясо, рыба, птица</small>
        </div>
        <div>
          <span aria-hidden="true">✊</span>
          <b>Кулак</b>
          <small>гарнир, овощи</small>
        </div>
        <div>
          <span aria-hidden="true">🤲</span>
          <b>Горсть</b>
          <small>фрукты, ягоды</small>
        </div>
        <div>
          <span aria-hidden="true">👍</span>
          <b>Большой палец</b>
          <small>масло, орехи, сыр</small>
        </div>
      </div>

      <details className="q-example">
        <summary>Пример заполнения</summary>
        <pre>{`7:15 пробуждение
7:50 стакан воды 200 мл
8:05 завтрак около 100 г: овсянка, столовая ложка арахисовой пасты, две столовые ложки йогурта с черникой, чай с 2 чайными ложками сахара
9:15 стакан воды. Заболело в правом подреберье
9:55 стакан воды 200 мл
10:05 кофе с чёрным хлебом 70 г, творожным сыром и огурцом
11:30 стакан воды 100 мл
12:10 груша (спустя 30 минут случилась истерика)
13:30 обед:
  - жареная куриная ножка с луком 130 г
  - жареная картошка 50 г
  - помидоры 60 г
  - огурцы солёные 40 г
15:25 стакан воды
16:10 стакан сока «Мультифрукт» и 1 средний банан
16:50 стакан воды 100 мл
17:00 шоколадка 180 г
21:10 ужин около 200 г:
  - макароны 95 г
  - жареные котлеты 70 г
  - огурец 30 г
22:30 чай 150 мл с 3 конфетами`}</pre>
      </details>
    </div>
  );
}

function PhotoGuide() {
  return (
    <div className="q-guide">
      <h3>Как отправить фото</h3>
      <p>
        Фотографии на сайт не загружаются и никуда не передаются. Если хотите их отправить, приложите их к сообщению вместе
        с PDF-анкетой.
      </p>
      <ul>
        <li>Для оценки динамики веса: в полный рост спереди, сбоку и сзади, в облегающей одежде.</li>
        <li>Ровный свет и нейтральный фон, камера на уровне груди.</li>
        <li>Для кожи: крупный план при дневном свете, без фильтров.</li>
      </ul>
    </div>
  );
}

/* ---------- Отправка ---------- */

interface SendProps {
  values: Values;
  setValue: (id: string, value: string | boolean) => void;
  telegram: string;
  email: string;
  ownerName: string;
  privacyUrl: string;
  goTo: (index: number) => void;
}

function SendStep({ values, setValue, telegram, email, ownerName, privacyUrl, goTo }: SendProps) {
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);

  const missing = steps
    .map((step, index) => ({ step, index, errors: validateStep(step, values) }))
    .filter((s) => Object.keys(s.errors).length > 0);
  const consent = values.consent === true;
  const ready = consent && missing.length === 0;

  useEffect(() => {
    try {
      const probe = new File(["x"], "x.pdf", { type: "application/pdf" });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [probe] })));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const fullName = str(values, "fullName").trim();
  const fileName = pdfFileName(values);
  const message = `Здравствуйте! Отправляю заполненную анкету${fullName ? ` (${fullName})` : ""}. Файл «${fileName}» прикрепляю к сообщению.`;
  const telegramHref = `https://t.me/${telegram}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${email}?subject=${encodeURIComponent(`Анкета — ${fullName || "новый клиент"}`)}&body=${encodeURIComponent(
    `${message}\n\nВо вложении — PDF-файл анкеты.`,
  )}`;

  const makePdf = async () => {
    setError("");
    setBusy(true);
    try {
      return await buildPdf(values, { name: ownerName, email, privacyUrl });
    } catch (e) {
      console.error(e);
      setError("Не удалось сформировать PDF. Попробуйте ещё раз или откройте анкету в другом браузере.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const blob = await makePdf();
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    setDownloaded(true);
  };

  const share = async () => {
    const blob = await makePdf();
    if (!blob) return;
    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: "application/pdf" })],
        title: "Анкета",
        text: message,
      });
      setDownloaded(true);
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setError("Не получилось поделиться файлом — скачайте его кнопкой ниже.");
    }
  };

  return (
    <section aria-labelledby="q-send-title" className="q-send">
      <p className="q-step__count">Последний шаг</p>
      <h2 id="q-send-title" className="q-step__title">
        Отправка анкеты
      </h2>
      <p className="q-step__intro">
        Анкета превращается в PDF прямо в Вашем браузере — на сервер ничего не передаётся. Скачайте файл и отправьте
        его удобным способом.
      </p>

      <ul className="q-summary">
        {steps.map((step, index) => {
          const p = stepProgress(step, values);
          return (
            <li key={step.id}>
              <button type="button" className="q-link" onClick={() => goTo(index)}>
                {index + 1}. {step.title}
              </button>
              <span className={p.filled === 0 ? "q-summary__empty" : ""}>
                {p.filled} из {p.total}
              </span>
            </li>
          );
        })}
      </ul>

      {missing.length > 0 && (
        <div className="q-note q-note--warn" role="alert">
          Не заполнены обязательные поля:{" "}
          {missing.map((m, i) => (
            <span key={m.step.id}>
              {i > 0 && ", "}
              <button type="button" className="q-link" onClick={() => goTo(m.index)}>
                {m.step.title}
              </button>
            </span>
          ))}
          .
        </div>
      )}

      <div className="q-consent">
        <label className="q-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setValue("consent", e.target.checked);
              setValue("consentAt", e.target.checked ? new Date().toISOString() : "");
            }}
          />
          <span>
            Я даю согласие на обработку моих персональных данных, включая сведения о состоянии здоровья, в целях
            подготовки рекомендаций по питанию, в соответствии с{" "}
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
              политикой конфиденциальности
            </a>
            .
          </span>
        </label>
        <details className="q-consent__text">
          <summary>Полный текст согласия (он будет на последней странице PDF)</summary>
          {consentParagraphs(
            { fullName: str(values, "fullName"), birthDate: str(values, "birthDate").split("-").reverse().join(".") },
            { name: ownerName, email, privacyUrl },
          ).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </details>
      </div>

      <ol className="q-send__steps">
        <li>
          <h3>Сохраните анкету в PDF</h3>
          <div className="q-send__buttons">
            {canShareFiles && (
              <button type="button" className="btn btn--sage" disabled={!ready || busy} onClick={share}>
                {busy ? "Готовлю PDF…" : "Поделиться PDF"}
              </button>
            )}
            <button type="button" className={`btn ${canShareFiles ? "btn--ghost" : "btn--sage"}`} disabled={!ready || busy} onClick={download}>
              {busy ? "Готовлю PDF…" : "Скачать PDF"}
            </button>
          </div>
          {canShareFiles && <p className="q-hint">«Поделиться» сразу откроет Telegram, почту или мессенджер с прикреплённым файлом.</p>}
          {downloaded && <p className="q-ok">Готово! Файл «{fileName}» сохранён в папку «Загрузки».</p>}
          {error && <p className="q-error">{error}</p>}
        </li>
        <li>
          <h3>Отправьте файл</h3>
          <p className="q-hint">Откроется чат или письмо с готовым текстом — прикрепите к нему скачанный PDF (и, по желанию, анализы и фото).</p>
          <div className="q-send__buttons">
            <a className={`btn btn--ghost${ready ? "" : " is-disabled"}`} href={ready ? telegramHref : undefined} aria-disabled={!ready} target="_blank" rel="noopener noreferrer">
              Отправить в Telegram
            </a>
            <a className={`btn btn--ghost${ready ? "" : " is-disabled"}`} href={ready ? mailHref : undefined} aria-disabled={!ready}>
              Отправить на почту
            </a>
          </div>
          <p className="q-hint">
            Telegram: <b>@{telegram}</b> · E-mail: <b>{email}</b>
          </p>
        </li>
      </ol>

      {!ready && missing.length === 0 && <p className="q-hint">Чтобы скачать анкету, отметьте согласие на обработку данных.</p>}
    </section>
  );
}
