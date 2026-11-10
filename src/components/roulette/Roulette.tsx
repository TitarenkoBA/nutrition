import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  carbs,
  PROTEIN_GROUPS,
  proteinMinTime,
  proteins,
  REELS,
  vegetables,
  type Carb,
  type Protein,
  type ReelId,
  type Vegetable,
} from "./data";
import { pairingTip, recipesFor, type Recipe } from "./recipes";
import "./roulette.css";

type Item = Protein | Vegetable | Carb;
type Preset = "noMeat" | "vegetarian" | "noDairy" | "glutenFree" | "quick";

const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: "noMeat", label: "Без мяса", hint: "рыба и морепродукты остаются" },
  { id: "vegetarian", label: "Вегетарианское", hint: "без мяса, птицы и рыбы" },
  { id: "noDairy", label: "Без молочного", hint: "и без сливочных соусов" },
  { id: "glutenFree", label: "Без глютена", hint: "убирает пшеницу, ячмень, овёс" },
  { id: "quick", label: "Быстро", hint: "блюда до 40 минут" },
];

const FILTERS_KEY = "nutrition.podbor.filters.v1";
const VISIBLE_RECIPES = 3;

interface Filters {
  presets: Preset[];
  excluded: string[];
}

const byId = <T extends { id: string }>(list: T[], id: string | undefined) => list.find((x) => x.id === id);

function allowed(reel: ReelId, item: Item, f: Filters): boolean {
  if (f.excluded.includes(`${reel}:${item.id}`)) return false;
  const has = (p: Preset) => f.presets.includes(p);
  if (reel === "protein") {
    const p = item as Protein;
    if (has("noMeat") && (p.group === "meat" || p.group === "poultry")) return false;
    if (has("vegetarian") && ["meat", "poultry", "fish", "seafood"].includes(p.group)) return false;
    if (has("noDairy") && p.group === "dairy") return false;
    if (has("quick") && proteinMinTime(p) > 30) return false;
  }
  if (reel === "carb") {
    const c = item as Carb;
    if (has("glutenFree") && c.gluten) return false;
    if (has("quick") && c.time > 30) return false;
  }
  return true;
}

const listFor = (reel: ReelId): Item[] => (reel === "protein" ? proteins : reel === "veg" ? vegetables : carbs);

function randomFrom<T>(items: T[], avoid?: T): T {
  const options = items.length > 1 && avoid ? items.filter((x) => x !== avoid) : items;
  return options[Math.floor(Math.random() * options.length)];
}

/* ---------- Барабан ---------- */

interface ReelState {
  strip: Item[];
  /** Индекс элемента в центре окна. */
  index: number;
  duration: number;
}

const initialReel = (list: Item[], current: Item): ReelState => {
  const i = list.indexOf(current);
  const at = (k: number) => list[(k + list.length) % list.length];
  return { strip: [at(i - 1), current, at(i + 1)], index: 1, duration: 0 };
};

function Reel({ state, label, short, locked, spinning }: { state: ReelState; label: string; short: string; locked: boolean; spinning: boolean }) {
  return (
    <div className={`slot-reel${locked ? " is-locked" : ""}${spinning ? " is-spinning" : ""}`}>
      <div className="slot-reel__label">
        <span className="slot-reel__label-full">{label}</span>
        <span className="slot-reel__label-short">{short}</span>
      </div>
      <div className="slot-reel__window" aria-hidden="true">
        <div
          className="slot-reel__strip"
          style={{
            transform: `translateY(calc(var(--row) * ${-(state.index - 1)}))`,
            transition: state.duration ? `transform ${state.duration}ms cubic-bezier(0.15, 0.7, 0.2, 1.02)` : "none",
          }}
        >
          {state.strip.map((item, i) => (
            <div className={`slot-reel__item${i === state.index && !spinning ? " is-center" : ""}`} key={i}>
              <span className="slot-reel__emoji emoji">{item.emoji}</span>
              <span className="slot-reel__name">{item.nom}</span>
            </div>
          ))}
        </div>
        <div className="slot-reel__line" />
      </div>
    </div>
  );
}

/* ---------- Главный компонент ---------- */

interface Props {
  anketaUrl: string;
}

export default function Roulette({ anketaUrl }: Props) {
  const [filters, setFilters] = useState<Filters>({ presets: [], excluded: [] });
  const [combo, setCombo] = useState({ protein: "chicken", veg: "broccoli", carb: "buckwheat" });
  const [reels, setReels] = useState<Record<ReelId, ReelState>>(() => ({
    protein: initialReel(proteins, proteins[0]),
    veg: initialReel(vegetables, vegetables[0]),
    carb: initialReel(carbs, carbs[0]),
  }));
  const [locked, setLocked] = useState<Record<ReelId, boolean>>({ protein: false, veg: false, carb: false });
  const [spinning, setSpinning] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [spins, setSpins] = useState(0);
  const timers = useRef<number[]>([]);

  // Фильтры из прошлого визита и комбинация из ссылки (#p=…&v=…&c=…)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
      if (saved && Array.isArray(saved.presets) && Array.isArray(saved.excluded)) setFilters(saved);
    } catch {
      /* без сохранённых фильтров */
    }
    const params = new URLSearchParams(window.location.hash.slice(1));
    const p = byId(proteins, params.get("p") ?? undefined);
    const v = byId(vegetables, params.get("v") ?? undefined);
    const c = byId(carbs, params.get("c") ?? undefined);
    if (p && v && c) {
      setCombo({ protein: p.id, veg: v.id, carb: c.id });
      setReels({ protein: initialReel(proteins, p), veg: initialReel(vegetables, v), carb: initialReel(carbs, c) });
    }
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {
      /* приватный режим */
    }
  }, [filters]);

  const pools = useMemo(
    () =>
      Object.fromEntries(REELS.map(({ id }) => [id, listFor(id).filter((item) => allowed(id, item, filters))])) as Record<ReelId, Item[]>,
    [filters],
  );
  const emptyReel = REELS.find(({ id }) => pools[id].length === 0 && !locked[id]);
  const allLocked = REELS.every(({ id }) => locked[id]);

  const current = {
    protein: byId(proteins, combo.protein)!,
    veg: byId(vegetables, combo.veg)!,
    carb: byId(carbs, combo.carb)!,
  };
  const recipeOpts = { noDairy: filters.presets.includes("noDairy"), maxTime: filters.presets.includes("quick") ? 40 : undefined };
  const recipes = useMemo(() => recipesFor(current, recipeOpts), [combo, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const tip = pairingTip(current);

  const spin = useCallback(() => {
    if (spinning || emptyReel || allLocked) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = { ...combo };
    const nextReels = { ...reels };
    let longest = 0;

    REELS.forEach(({ id }, order) => {
      if (locked[id]) return;
      const pool = pools[id];
      const currentItem = reels[id].strip[reels[id].index];
      const final = randomFrom(pool, currentItem);
      next[id] = final.id;

      const fillers = Array.from({ length: reduce ? 0 : 12 + order * 5 }, () => randomFrom(pool));
      const above = reels[id].strip[reels[id].index - 1] ?? randomFrom(pool);
      const strip = [above, currentItem, ...fillers, final, randomFrom(pool)];
      const duration = reduce ? 0 : 1300 + order * 500;
      longest = Math.max(longest, duration);
      // Сначала ставим ленту без анимации на текущий элемент…
      nextReels[id] = { strip, index: 1, duration: 0 };
    });

    setReels(nextReels);
    setSpinning(true);
    setShowAll(false);

    // …затем в следующем кадре запускаем прокрутку до выпавшего
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setReels((prev) => {
          const out = { ...prev };
          REELS.forEach(({ id }, order) => {
            if (locked[id]) return;
            out[id] = { ...prev[id], index: prev[id].strip.length - 2, duration: reduce ? 0 : 1300 + order * 500 };
          });
          return out;
        });
      }),
    );

    timers.current.push(
      window.setTimeout(() => {
        // Сжимаем ленту до трёх элементов, чтобы не росла бесконечно
        setReels((prev) => {
          const out = { ...prev };
          REELS.forEach(({ id }) => {
            const s = prev[id];
            out[id] = { strip: s.strip.slice(s.index - 1, s.index + 2), index: 1, duration: 0 };
          });
          return out;
        });
        setCombo(next);
        setSpinning(false);
        setSpins((n) => n + 1);
        history.replaceState(null, "", `#p=${next.protein}&v=${next.veg}&c=${next.carb}`);
      }, longest + 80),
    );
  }, [spinning, emptyReel, allLocked, combo, reels, locked, pools]);

  const togglePreset = (id: Preset) =>
    setFilters((f) => ({ ...f, presets: f.presets.includes(id) ? f.presets.filter((p) => p !== id) : [...f.presets, id] }));

  const toggleItem = (reel: ReelId, id: string) => {
    const key = `${reel}:${id}`;
    setFilters((f) => ({ ...f, excluded: f.excluded.includes(key) ? f.excluded.filter((k) => k !== key) : [...f.excluded, key] }));
  };

  const shown = showAll ? recipes : recipes.slice(0, VISIBLE_RECIPES);

  return (
    <div className="podbor">
      {/* Автомат */}
      <section className={`slot${spinning ? " is-spinning" : ""}`} aria-label="Барабаны подбора блюда">
        <div className="slot__marquee" aria-hidden="true">
          <span className="slot__lights" />
          <span className="slot__title">Что приготовить?</span>
          <span className="slot__lights" />
        </div>

        <div className="slot__reels">
          {REELS.map(({ id, label, short }) => (
            <div className="slot__col" key={id}>
              <Reel state={reels[id]} label={label} short={short} locked={locked[id]} spinning={spinning && !locked[id]} />
              <button
                type="button"
                className={`slot__lock${locked[id] ? " is-on" : ""}`}
                aria-pressed={locked[id]}
                disabled={spinning}
                onClick={() => setLocked((l) => ({ ...l, [id]: !l[id] }))}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path d={locked[id] ? "M8.5 11V8a3.5 3.5 0 0 1 7 0v3" : "M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                {locked[id] ? "Закреплено" : "Закрепить"}
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="slot__spin" onClick={spin} disabled={spinning || Boolean(emptyReel) || allLocked}>
          <span className="slot__spin-icon" aria-hidden="true">
            🎰
          </span>
          {spinning ? "Крутится…" : spins === 0 ? "Крутить барабаны" : "Крутить ещё"}
        </button>

        <p className="slot__hint" role="status">
          {emptyReel
            ? `В барабане «${emptyReel.label}» не осталось продуктов — ослабьте фильтры.`
            : allLocked
              ? "Все барабаны закреплены — снимите замок хотя бы с одного."
              : "Закрепите барабан, чтобы оставить продукт и прокрутить остальные."}
        </p>
      </section>

      {/* Фильтры */}
      <details className="podbor-filters">
        <summary>
          <span>Фильтры и продукты</span>
          {(filters.presets.length > 0 || filters.excluded.length > 0) && (
            <span className="podbor-filters__badge">
              {filters.presets.length + filters.excluded.length}
            </span>
          )}
        </summary>

        <div className="podbor-filters__body">
          <div className="podbor-presets" role="group" aria-label="Режим питания">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className={`chip${filters.presets.includes(p.id) ? " is-on" : ""}`} aria-pressed={filters.presets.includes(p.id)} onClick={() => togglePreset(p.id)}>
                {p.label}
                <small>{p.hint}</small>
              </button>
            ))}
          </div>

          <p className="podbor-filters__note">Нажмите на продукт, чтобы убрать его из барабана или вернуть обратно.</p>

          <div className="podbor-lists">
            {REELS.map(({ id, label }) => {
              const list = listFor(id);
              const groups =
                id === "protein"
                  ? PROTEIN_GROUPS.map((g) => ({ label: g.label, items: proteins.filter((p) => p.group === g.id) as Item[] }))
                  : [{ label: "", items: list }];
              return (
                <fieldset key={id} className="podbor-list">
                  <legend>
                    {label}{" "}
                    <span className="muted">
                      {pools[id].length} из {list.length}
                    </span>
                  </legend>
                  {groups.map((g) => (
                    <div key={g.label} className="podbor-list__group">
                      {g.label && <p className="podbor-list__title">{g.label}</p>}
                      <div className="podbor-list__items">
                        {g.items.map((item) => {
                          const on = allowed(id, item, filters);
                          const manuallyOff = filters.excluded.includes(`${id}:${item.id}`);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`chip chip--item${on ? " is-on" : ""}${!on && !manuallyOff ? " is-preset-off" : ""}`}
                              aria-pressed={on}
                              title={!on && !manuallyOff ? "Убрано фильтром режима питания" : undefined}
                              onClick={() => toggleItem(id, item.id)}
                            >
                              <span className="emoji" aria-hidden="true">{item.emoji}</span> {item.nom}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </fieldset>
              );
            })}
          </div>

          {(filters.presets.length > 0 || filters.excluded.length > 0) && (
            <button type="button" className="q-link" onClick={() => setFilters({ presets: [], excluded: [] })}>
              Сбросить все фильтры
            </button>
          )}
        </div>
      </details>

      {/* Результат */}
      <section className={`podbor-result${spinning ? " is-waiting" : ""}`} aria-live="polite" aria-busy={spinning}>
        <p className="eyebrow">Выпало</p>
        <h2 className="podbor-result__combo">
          {[current.protein, current.veg, current.carb].map((item, i) => (
            <span key={item.id}>
              {i > 0 && <span className="podbor-result__sep"> / </span>}
              <span className="podbor-result__part">
                <span className="emoji" aria-hidden="true">{item.emoji}</span> {item.nom}
              </span>
            </span>
          ))}
        </h2>
        {tip && <p className="podbor-result__tip">💡 {tip}</p>}

        {recipes.length === 0 ? (
          <p className="muted">С такими фильтрами подходящих блюд не нашлось — попробуйте прокрутить ещё раз или снять «Быстро».</p>
        ) : (
          <>
            <div className="podbor-recipes">
              {shown.map((r, i) => (
                <RecipeCard key={`${combo.protein}-${combo.veg}-${combo.carb}-${r.id}`} recipe={r} open={i === 0} />
              ))}
            </div>
            {recipes.length > VISIBLE_RECIPES && (
              <button type="button" className="btn btn--ghost podbor-more" onClick={() => setShowAll((s) => !s)}>
                {showAll ? "Свернуть" : `Ещё варианты (${recipes.length - VISIBLE_RECIPES})`}
              </button>
            )}
          </>
        )}

        <aside className="podbor-cta">
          <div>
            <h3>Хотите рацион под ваши цели?</h3>
            <p>Подбор блюд — это идеи на каждый день. Персональный план с учётом здоровья, анализов и привычек составим вместе.</p>
          </div>
          <a className="btn btn--sage" href={anketaUrl}>
            Заполнить анкету
          </a>
        </aside>
      </section>
    </div>
  );
}

/* ---------- Карточка рецепта ---------- */

function RecipeCard({ recipe, open }: { recipe: Recipe; open: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = [recipe.title + (recipe.subtitle ? ` (${recipe.subtitle})` : ""), "", "Продукты:", ...recipe.ingredients.map((i) => `• ${i}`), "", "Как приготовить:", ...recipe.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер обмена недоступен */
    }
  };

  return (
    <article className="recipe">
      <header className="recipe__head">
        <span className="recipe__icon emoji" aria-hidden="true">
          {recipe.icon}
        </span>
        <div>
          <h3 className="recipe__title">{recipe.title}</h3>
          {recipe.subtitle && <p className="recipe__subtitle">{recipe.subtitle}</p>}
          <p className="recipe__meta">
            <span>⏱ ~{recipe.time} мин</span>
            <span>{recipe.method}</span>
          </p>
        </div>
      </header>

      <ul className="recipe__ingredients">
        {recipe.ingredients.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <details className="recipe__steps" open={open}>
        <summary>Как приготовить</summary>
        <ol>
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>

      <button type="button" className="recipe__copy q-link" onClick={copy}>
        {copied ? "Скопировано ✓" : "Скопировать рецепт"}
      </button>
    </article>
  );
}
