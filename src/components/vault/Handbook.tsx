import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { highlight, search, tokenize, type Entry, type Handbook as HandbookData, type Scope } from "./search";

type TypeFilter = "all" | "adults" | "kids" | "cheat" | "schedule" | "compat";

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Всё" },
  { id: "adults", label: "Анализы: взрослые" },
  { id: "kids", label: "Анализы: дети" },
  { id: "cheat", label: "Шпаргалка" },
  { id: "schedule", label: "Приём добавок" },
  { id: "compat", label: "Совместимость" },
];

const SUGGESTIONS = ["дефицит В12", "железо", "магний", "щитовидн", "холестаз", "инсулинорезистентность", "витамин D", "цинк"];

function matchesType(entry: Entry, type: TypeFilter) {
  if (type === "all") return true;
  if (type === "adults") return entry.type === "indicator" && entry.audience !== "kids";
  if (type === "kids") return entry.type === "indicator" && entry.audience === "kids";
  return entry.type === type;
}

export default function Handbook({ data }: { data: HandbookData }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [section, setSection] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // «/» — быстрый переход к поиску
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const byType = useMemo(() => data.entries.filter((e) => matchesType(e, type)), [data, type]);
  const sections = useMemo(() => [...new Set(byType.map((e) => e.section))], [byType]);

  useEffect(() => {
    if (section && !sections.includes(section)) setSection("");
  }, [sections, section]);

  const filtered = useMemo(
    () => byType.filter((e) => (!section || e.section === section) && (!onlyFlagged || e.check)),
    [byType, section, onlyFlagged],
  );
  const results = useMemo(() => search(filtered, deferredQuery, scope), [filtered, deferredQuery, scope]);
  const tokens = useMemo(() => tokenize(deferredQuery), [deferredQuery]);
  const flaggedCount = data.entries.filter((e) => e.check).length;

  const reset = () => {
    setQuery("");
    setType("all");
    setSection("");
    setScope("all");
    setOnlyFlagged(false);
  };

  return (
    <div className="hb">
      <div className="hb-controls">
        <label className="hb-search">
          <span className="visually-hidden">Поиск по справочнику</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            placeholder="Показатель, причина, витамин… например «дефицит В12»"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>

        {!query && (
          <div className="hb-suggest">
            <span>Например:</span>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setQuery(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="hb-tabs" role="tablist" aria-label="Тип материалов">
          {TYPE_TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={type === tab.id} className={type === tab.id ? "is-active" : ""} onClick={() => setType(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hb-filters">
          {sections.length > 1 && (
            <label>
              <span>Раздел</span>
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="">Все разделы</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Искать в</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
              <option value="all">везде</option>
              <option value="low">причинах понижения</option>
              <option value="high">причинах повышения</option>
            </select>
          </label>
          {flaggedCount > 0 && (
            <label className="hb-check">
              <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
              <span>Только «⚠ проверить» ({flaggedCount})</span>
            </label>
          )}
        </div>
      </div>

      <p className="hb-count" aria-live="polite">
        {results.length === 0 ? "Ничего не найдено. " : `Найдено: ${results.length}. `}
        {(query || type !== "all" || section || scope !== "all" || onlyFlagged) && (
          <button type="button" className="q-link" onClick={reset}>
            Сбросить фильтры
          </button>
        )}
      </p>

      <div className="hb-list">
        {results.map(({ entry, where }) => (
          <EntryCard key={entry.id} entry={entry} tokens={tokens} where={where} defaultOpen={results.length <= 3} />
        ))}
      </div>

      <p className="hb-foot">{data.disclaimer}</p>
    </div>
  );
}

function Hl({ text, tokens }: { text?: string; tokens: string[] }) {
  if (!text) return null;
  return (
    <>
      {highlight(text, tokens).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  );
}

function List({ items, tokens }: { items: string[]; tokens: string[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <Hl text={item} tokens={tokens} />
        </li>
      ))}
    </ul>
  );
}

function Table({ rows, head, tokens }: { rows: [string, string][]; head?: [string, string]; tokens: string[] }) {
  return (
    <div className="hb-table">
      <table>
        {head && (
          <thead>
            <tr>
              <th>{head[0]}</th>
              <th>{head[1]}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i}>
              <th scope="row">
                <Hl text={a} tokens={tokens} />
              </th>
              <td>{b ? <Hl text={b} tokens={tokens} /> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  cheat: "Шпаргалка",
  schedule: "Приём добавок",
  compat: "Совместимость",
};

function EntryCard({ entry, tokens, where, defaultOpen }: { entry: Entry; tokens: string[]; where: string[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);

  const badge = entry.type === "indicator" ? (entry.audience === "kids" ? "Дети" : "Взрослые") : TYPE_BADGE[entry.type];
  const lowTitle = entry.type === "cheat" ? "Понижаются" : entry.lowLabel ?? "Понижение";
  const highTitle = entry.type === "cheat" ? "Повышаются" : entry.highLabel ?? "Повышение";

  return (
    <article className={`hb-card${open ? " is-open" : ""}`}>
      <button type="button" className="hb-card__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="hb-card__title">
          <Hl text={entry.name} tokens={tokens} />
          {entry.abbr && (
            <span className="hb-card__abbr">
              <Hl text={entry.abbr} tokens={tokens} />
            </span>
          )}
        </span>
        <span className="hb-card__meta">
          <span className={`hb-badge hb-badge--${entry.audience ?? entry.type}`}>{badge}</span>
          <span>{entry.section}</span>
          {entry.check && <span className="hb-flag">⚠ проверить</span>}
          {tokens.length > 0 && where.length > 0 && <span className="hb-where">найдено: {where.join(", ")}</span>}
        </span>
        <span className="hb-card__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="hb-card__body">
          {entry.check && (
            <p className="hb-check-note">
              <b>⚠ Проверить:</b> {entry.check}
            </p>
          )}
          {entry.description && (
            <p>
              <Hl text={entry.description} tokens={tokens} />
            </p>
          )}
          {entry.important && entry.important.length > 0 && (
            <div className="hb-important">
              {entry.important.map((text, i) => (
                <p key={i}>
                  <Hl text={text} tokens={tokens} />
                </p>
              ))}
            </div>
          )}
          {entry.synonyms && (
            <p className="hb-synonyms">
              <b>Синонимы:</b> <Hl text={entry.synonyms} tokens={tokens} />
            </p>
          )}
          {entry.ranges && <Table rows={entry.ranges} tokens={tokens} />}
          {entry.ageTable && <Table rows={entry.ageTable} head={["Возраст", "Норма"]} tokens={tokens} />}
          {entry.extraTable && (
            <>
              <h4>{entry.extraTable.title}</h4>
              <Table rows={entry.extraTable.rows} head={["Возраст", "Норма"]} tokens={tokens} />
            </>
          )}
          {entry.rows && <Table rows={entry.rows} head={["Нутрицевтик", "Комментарий"]} tokens={tokens} />}
          {entry.type === "compat" && (
            <dl className="hb-compat">
              <div>
                <dt>+ Синергисты</dt>
                <dd>{entry.synergists ? <Hl text={entry.synergists} tokens={tokens} /> : "—"}</dd>
              </div>
              <div>
                <dt>− Антагонисты</dt>
                <dd>{entry.antagonists ? <Hl text={entry.antagonists} tokens={tokens} /> : "—"}</dd>
              </div>
              {entry.comment && (
                <div>
                  <dt>Комментарий</dt>
                  <dd>
                    <Hl text={entry.comment} tokens={tokens} />
                  </dd>
                </div>
              )}
            </dl>
          )}
          {(entry.low?.length || entry.high?.length) && (
            <div className="hb-causes">
              {entry.low && entry.low.length > 0 && (
                <section className="hb-causes__low">
                  <h4>↓ {lowTitle}</h4>
                  <List items={entry.low} tokens={tokens} />
                </section>
              )}
              {entry.high && entry.high.length > 0 && (
                <section className="hb-causes__high">
                  <h4>↑ {highTitle}</h4>
                  {entry.highIntro && (
                    <p>
                      <Hl text={entry.highIntro} tokens={tokens} />
                    </p>
                  )}
                  <List items={entry.high} tokens={tokens} />
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
