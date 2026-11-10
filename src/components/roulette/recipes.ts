import { sauces, type Carb, type Gender, type Protein, type Sauce, type Vegetable } from "./data";

export interface Recipe {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  /** Общее время, минуты. */
  time: number;
  method: string;
  ingredients: string[];
  steps: string[];
  sauce: Sauce;
}

export interface Combo {
  protein: Protein;
  veg: Vegetable;
  carb: Carb;
}

export interface RecipeOptions {
  noDairy?: boolean;
  /** Показывать только блюда не дольше, мин. */
  maxTime?: number;
}

/* ---------- Грамматика ---------- */

const ENDINGS: Record<Gender, string> = { m: "ый", f: "ая", n: "ое", pl: "ые" };
const adj = (stem: string, g: Gender) => stem + ENDINGS[g];
/** Прилагательное в винительном падеже для неодушевлённых: «промытую гречку», «промытый рис». */
const ACC_ENDINGS: Record<Gender, string> = { m: "ый", f: "ую", n: "ое", pl: "ые" };
const ACC_ADJ = (stem: string, g: Gender) => stem + ACC_ENDINGS[g];
/** «с шпинатом» → «со шпинатом», «с свёклой» → «со свёклой». */
const fixSo = (text: string) => text.replace(/(^|[\s(—])([сС]) (?=[сзшжщ][бвгджзклмнпрстфхцчшщ])/gi, (_, before, s) => `${before}${s}о `);

/** Подпись к гарниру: хлеб не «гарнир», а «подаётся с …». */
const side = (c: Combo) => (c.carb.kind === "bread" ? `подаётся с ${c.carb.ins}` : `гарнир — ${lc(c.carb.nom)}`);

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Детерминированный «случай» по комбинации ---------- */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickSauce(c: Combo, salt: string, opts: RecipeOptions, filter: (s: Sauce) => boolean = () => true): Sauce {
  const allowed = sauces.filter((s) => !(opts.noDairy && s.dairy)).filter(filter);
  const fitting = allowed.filter((s) => !s.goodFor || s.goodFor.includes(c.protein.group));
  const list = fitting.length ? fitting : allowed.length ? allowed : sauces;
  return list[hash(c.protein.id + c.veg.id + c.carb.id + salt) % list.length];
}

/* ---------- Шаги приготовления ---------- */

type ProteinMethod = "bake" | "pan" | "stew";

function preferredMethod(p: Protein): ProteinMethod | null {
  if (p.bake) return "bake";
  if (p.pan) return "pan";
  if (p.stew) return "stew";
  return null;
}

function proteinStep(p: Protein, method: ProteinMethod | null): { text: string; time: number } {
  if (method === "bake" && p.bake) {
    return { text: `Запеките ${p.acc} при ${p.bake.temp} °C ${p.bake.min} минут, затем дайте отдохнуть 5 минут.`, time: p.bake.min };
  }
  if (method === "pan" && p.pan) {
    const verb = p.group === "dairy" ? "Нарежьте ломтиками и обжарьте" : "Нарежьте и обжарьте";
    return { text: `${verb} ${p.acc} на сковороде с 1 ч. л. масла ${p.pan} минут.`, time: p.pan };
  }
  if (method === "stew" && p.stew) {
    return {
      text: `Обжарьте ${p.acc} 3–4 минуты, добавьте немного воды и тушите под крышкой ${p.stew} минут.`,
      time: p.stew,
    };
  }
  return { text: p.note ?? `Подготовьте ${p.acc}.`, time: p.group === "eggs" ? 10 : 5 };
}

function vegStep(v: Vegetable, prefer: "roast" | "steam" | "raw" = "roast"): { text: string; time: number; method: "roast" | "steam" | "raw" } {
  const order: ("roast" | "steam" | "raw")[] =
    prefer === "raw" ? ["raw", "roast", "steam"] : prefer === "steam" ? ["steam", "roast", "raw"] : ["roast", "steam", "raw"];
  for (const m of order) {
    if (m === "roast" && v.roast) return { text: `Нарежьте ${v.acc}, сбрызните маслом и запекайте ${v.roast} минут при 200 °C.`, time: v.roast, method: m };
    if (m === "steam" && v.steam) return { text: `Приготовьте ${v.acc} на пару или в кипящей воде ${v.steam} минут — овощи должны остаться яркими.`, time: v.steam, method: m };
    if (m === "raw" && v.raw) return { text: `Нарежьте ${v.acc}${v.id === "carrot" || v.id === "beetroot" ? " (или натрите на тёрке)" : ""}.`, time: 3, method: m };
  }
  return { text: `Подготовьте ${v.acc}.`, time: 5, method: "raw" };
}

function carbStep(c: Carb) {
  return { text: c.how, time: c.time };
}

function ingredients(combo: Combo, sauce: Sauce, vegAmount = "2 кулака (≈ 200–250 г)"): string[] {
  return [
    `${combo.protein.nom} — ${combo.protein.portion}`,
    `${combo.veg.nom} — ${vegAmount}`,
    `${combo.carb.nom} — ${combo.carb.portion}`,
    `Соус «${sauce.name}»: ${sauce.how}`,
  ];
}

const total = (...times: number[]) => Math.max(10, Math.max(...times) + 10);

/* ---------- Типы блюд ---------- */

type Template = { id: string; special: boolean; build: (c: Combo, o: RecipeOptions) => Recipe | null };

const templates: Template[] = [
  {
    id: "pasta",
    special: true,
    build: (c, o) => {
      if (c.carb.kind !== "pasta") return null;
      const sauce = pickSauce(c, "pasta", o, (s) => !!s.forPasta);
      const p = proteinStep(c.protein, c.protein.pan ? "pan" : preferredMethod(c.protein));
      const v = vegStep(c.veg, c.veg.steam ? "steam" : "roast");
      return {
        id: "pasta",
        icon: "🍝",
        title: `Паста с ${c.protein.ins} и ${c.veg.ins}`,
        time: total(p.time, v.time, c.carb.time),
        method: "на сковороде",
        ingredients: ingredients(c, sauce),
        steps: [
          carbStep(c.carb).text + " Сохраните полстакана воды от варки.",
          p.text,
          v.text,
          `Смешайте пасту, ${lc(c.protein.nom)} и ${lc(c.veg.nom)} на сковороде, добавьте соус и немного воды от пасты — прогрейте 1 минуту.`,
        ],
        sauce,
      };
    },
  },
  {
    id: "wok",
    special: true,
    build: (c, o) => {
      if (!c.protein.wok || !c.veg.wok) return null;
      if (!(c.carb.kind === "noodle" || (c.carb.kind === "grain" && ["brown-rice", "buckwheat", "quinoa"].includes(c.carb.id)))) return null;
      const sauce = pickSauce(c, "wok", o, (s) => !!s.asian);
      return {
        id: "wok",
        icon: "🥢",
        title: `Вок с ${c.protein.ins} и ${c.veg.ins}`,
        subtitle: `подаётся с ${c.carb.ins}`,
        time: total(c.carb.time, c.protein.wok + 5),
        method: "вок на сильном огне",
        ingredients: ingredients(c, sauce),
        steps: [
          carbStep(c.carb).text,
          `Нарежьте ${c.protein.acc} тонкими полосками и обжарьте в сковороде-вок на сильном огне ${c.protein.wok} минут, постоянно помешивая.`,
          `Добавьте ${c.veg.acc} и жарьте ещё 3–4 минуты — овощи должны остаться хрустящими.`,
          `Влейте соус, перемешайте и подавайте с ${c.carb.ins}.`,
        ],
        sauce,
      };
    },
  },
  {
    id: "shakshuka",
    special: true,
    build: (c, o) => {
      if (c.protein.id !== "eggs" || !["tomatoes", "pepper", "zucchini", "eggplant", "spinach"].includes(c.veg.id) || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "shak", o);
      const extra = c.veg.id === "tomatoes" ? "" : ` и ${c.veg.ins}`;
      return {
        id: "shakshuka",
        icon: "🍳",
        title: `Шакшука${c.veg.id === "tomatoes" ? "" : ` с ${c.veg.ins}`}`,
        subtitle: side(c),
        time: total(20, c.carb.time),
        method: "на сковороде",
        ingredients: [...ingredients(c, sauce), "Томаты в собственном соку — ½ банки, паприка, зира"],
        steps: [
          `Обжарьте лук и чеснок 3 минуты${extra ? `, добавьте ${c.veg.acc} и готовьте ещё 5 минут` : ""}.`,
          `Добавьте томаты${extra}, паприку и зиру, тушите 10 минут до густоты.`,
          "Сделайте углубления, вбейте яйца, накройте крышкой и готовьте 5–6 минут, пока белок не схватится.",
          c.carb.kind === "bread" ? c.carb.how : carbStep(c.carb).text,
        ],
        sauce,
      };
    },
  },
  {
    id: "frittata",
    special: true,
    build: (c, o) => {
      if (c.protein.id !== "eggs" || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "frit", o);
      return {
        id: "frittata",
        icon: "🍳",
        title: `Фриттата с ${c.veg.ins}`,
        subtitle: `${c.carb.kind === "bread" ? "с" : "и"} ${c.carb.ins}`,
        time: total(15, c.carb.time),
        method: "сковорода или духовка",
        ingredients: ingredients(c, sauce, "кулак (≈ 150 г)"),
        steps: [
          `Нарежьте ${c.veg.acc} и обжарьте на сковороде с 1 ч. л. масла 4–5 минут.`,
          "Взбейте 2–3 яйца со щепоткой соли и 2 ст. л. молока или воды, залейте овощи.",
          "Готовьте под крышкой на слабом огне 6–7 минут или 10 минут в духовке при 180 °C.",
          carbStep(c.carb).text,
        ],
        sauce,
      };
    },
  },
  {
    id: "oat",
    special: true,
    build: (c, o) => {
      if (c.carb.kind !== "oat") return null;
      const sauce = pickSauce(c, "oat", o, (s) => !s.asian);
      const p = c.protein.id === "eggs" ? { text: "Приготовьте яйцо пашот: 3 минуты в едва кипящей воде.", time: 5 } : proteinStep(c.protein, c.protein.pan ? "pan" : preferredMethod(c.protein));
      const v = vegStep(c.veg, c.veg.steam ? "steam" : c.veg.raw ? "raw" : "roast");
      return {
        id: "oat",
        icon: "🥣",
        title: `Солёная овсянка с ${c.protein.ins} и ${c.veg.ins}`,
        time: total(c.carb.time, p.time, v.time),
        method: "сытный завтрак",
        ingredients: ingredients(c, sauce, "кулак (≈ 100–150 г)"),
        steps: [
          "Варите овсяные хлопья 7–10 минут на воде или овощном бульоне со щепоткой соли.",
          v.text,
          p.text,
          "Выложите кашу в тарелку, сверху — овощи и белок, посыпьте зеленью.",
        ],
        sauce,
      };
    },
  },
  {
    id: "stuffed",
    special: true,
    build: (c, o) => {
      if (!c.veg.stuff || c.carb.kind !== "grain") return null;
      const minced = c.protein.mince !== undefined || ["dairy", "plant"].includes(c.protein.group);
      if (!minced || c.protein.group === "eggs") return null;
      const sauce = pickSauce(c, "stuff", o);
      const filling =
        c.protein.group === "plant"
          ? `Разомните ${c.protein.acc} вилкой`
          : c.protein.group === "dairy"
            ? `Разомните ${c.protein.acc} с зеленью`
            : `Сделайте из ${c.protein.gen} фарш`;
      return {
        id: "stuffed",
        icon: "🫑",
        title: `${c.veg.stuff}, фаршированные ${c.protein.ins} и ${c.carb.ins}`,
        time: total(c.carb.time, 35),
        method: "в духовке",
        ingredients: ingredients(c, sauce, "2–3 штуки"),
        steps: [
          c.carb.how,
          `${filling}, смешайте с ${c.carb.ins}, посолите и поперчите.`,
          `Подготовьте ${lc(c.veg.stuff)}: разрежьте и выньте семена или мякоть, наполните начинкой.`,
          "Запекайте 25–30 минут при 190 °C. Перед подачей полейте соусом.",
        ],
        sauce,
      };
    },
  },
  {
    id: "meatballs",
    special: true,
    build: (c, o) => {
      if (c.protein.mince === undefined || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "balls", o);
      const v = vegStep(c.veg, c.veg.roast ? "roast" : "steam");
      const name = c.protein.group === "meat" || c.protein.group === "poultry" ? "Тефтели" : "Котлеты";
      return {
        id: "meatballs",
        icon: "🧆",
        title: `${name} из ${c.protein.gen} с ${c.veg.ins}`,
        subtitle: side(c),
        time: total(c.protein.mince + 10, v.time, c.carb.time),
        method: "в духовке",
        ingredients: ingredients(c, sauce),
        steps: [
          c.protein.group === "plant"
            ? `${c.protein.note ?? ""} Разомните ${c.protein.acc} блендером, добавьте 1 ст. л. овсяных хлопьев или муки, специи и сформируйте котлеты.`.trim()
            : `Сделайте из ${c.protein.gen} фарш, добавьте мелко нарезанный лук, соль и зелень, сформируйте ${lc(name)}.`,
          `Запекайте ${lc(name)} ${c.protein.mince} минут при 190 °C на пергаменте.`,
          v.text,
          carbStep(c.carb).text,
        ],
        sauce,
      };
    },
  },
  {
    id: "parchment",
    special: true,
    build: (c, o) => {
      if (c.protein.group !== "fish" || !c.protein.bake || !(c.veg.roast || c.veg.steam) || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "parch", o, (s) => !s.asian);
      return {
        id: "parchment",
        icon: "🐟",
        title: `${c.protein.nom} в пергаменте с ${c.veg.ins}`,
        subtitle: side(c),
        time: total(c.protein.bake.min + 5, c.carb.time),
        method: "в духовке",
        ingredients: ingredients(c, sauce),
        steps: [
          `Положите ${c.protein.acc} на лист пергамента, рядом выложите ${c.veg.acc} кусочками, ломтик лимона и веточку тимьяна.`,
          "Сверните пергамент конвертом, чтобы рыба готовилась в собственном соку.",
          `Запекайте ${c.protein.bake.min + 3} минут при ${c.protein.bake.temp} °C.`,
          carbStep(c.carb).text,
        ],
        sauce,
      };
    },
  },
  {
    id: "soup",
    special: true,
    build: (c, o) => {
      if (!c.protein.soup || !c.veg.soup || c.carb.kind === "bread" || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "soup", o, (s) => !s.asian && !s.forPasta);
      const carbIn =
        c.carb.kind === "potato"
          ? `Добавьте нарезанный кубиками ${lc(c.carb.nom.replace(" в мундире", ""))} и варите 15 минут.`
          : c.carb.kind === "noodle" || c.carb.kind === "pasta"
            ? `За 6–8 минут до конца добавьте ${c.carb.acc}.`
            : `Добавьте ${ACC_ADJ("промыт", c.carb.g)} ${c.carb.acc} и варите до мягкости.`;
      return {
        id: "soup",
        icon: "🍲",
        title: `Суп с ${c.protein.ins}, ${c.veg.ins} и ${c.carb.ins}`,
        time: total(c.protein.soup + 10),
        method: "в кастрюле",
        ingredients: [...ingredients(c, sauce, "кулак (≈ 150 г)").slice(0, 3), "Лук, морковь, лавровый лист, зелень"],
        steps: [
          c.protein.group === "plant"
            ? `${c.protein.note ?? ""} Обжарьте лук и морковь 5 минут, залейте 1,5 л воды и добавьте ${c.protein.acc}.`.trim()
            : `Залейте ${c.protein.acc} 1,5 л воды, доведите до кипения, снимите пену и варите ${c.protein.soup} минут.`,
          carbIn,
          `Добавьте ${c.veg.acc} за 5–10 минут до готовности.`,
          "Посолите, добавьте лавровый лист и зелень. Дайте настояться 10 минут под крышкой.",
        ],
        sauce,
      };
    },
  },
  {
    id: "stew",
    special: true,
    build: (c, o) => {
      if (!c.protein.stew || !c.veg.stew || c.carb.kind === "oat") return null;
      const sauce = pickSauce(c, "stew", o, (s) => !s.asian);
      return {
        id: "stew",
        icon: "🥘",
        title: `${cap(adj("тушён", c.protein.g))} ${lc(c.protein.nom)} с ${c.veg.ins}`,
        subtitle: side(c),
        time: total(c.protein.stew + 5, c.carb.time),
        method: "тушение",
        ingredients: ingredients(c, sauce),
        steps: [
          ...(c.protein.group === "plant" && c.protein.note ? [c.protein.note] : []),
          proteinStep(c.protein, "stew").text,
          `За 10–15 минут до готовности добавьте ${c.veg.acc}, при желании — немного томатов или специй.`,
          carbStep(c.carb).text,
          "Подавайте рагу с гарниром, сверху — свежая зелень.",
        ],
        sauce,
      };
    },
  },
  {
    id: "roll",
    special: true,
    build: (c, o) => {
      if (c.carb.kind !== "bread") return null;
      const sauce = pickSauce(c, "roll", o, (s) => !s.forPasta || s.id === "lemon");
      const p = proteinStep(c.protein, c.protein.pan ? "pan" : preferredMethod(c.protein));
      const v = vegStep(c.veg, c.veg.raw ? "raw" : "roast");
      const isLavash = c.carb.id === "lavash";
      return {
        id: "roll",
        icon: isLavash ? "🌯" : "🥪",
        title: isLavash ? `Ролл в лаваше с ${c.protein.ins} и ${c.veg.ins}` : `Открытый сэндвич с ${c.protein.ins} и ${c.veg.ins}`,
        time: total(p.time, v.time),
        method: "быстрый перекус",
        ingredients: ingredients(c, sauce, "кулак (≈ 100–150 г)"),
        steps: [
          p.text,
          v.text,
          c.carb.how,
          isLavash
            ? "Смажьте лаваш соусом, выложите белок и овощи, плотно сверните и разрежьте пополам."
            : "Смажьте хлеб соусом, выложите овощи и белок, посыпьте зеленью.",
        ],
        sauce,
      };
    },
  },
  // Универсальные варианты — подходят почти к любой комбинации
  {
    id: "plate",
    special: false,
    build: (c, o) => {
      if (c.carb.kind === "oat") return null;
      const method = preferredMethod(c.protein);
      const sauce = pickSauce(c, "plate", o);
      const p = proteinStep(c.protein, method);
      const v = vegStep(c.veg);
      const stem = method === "bake" ? "запечённ" : method === "pan" ? "обжаренн" : method === "stew" ? "тушён" : "";
      const title = stem ? `${cap(adj(stem, c.protein.g))} ${lc(c.protein.nom)}` : c.protein.nom;
      return {
        id: "plate",
        icon: "🍽️",
        title: `${title} с ${c.veg.ins}${v.method === "raw" ? " (салат)" : ""} и ${c.carb.ins}`,
        time: total(p.time, v.time, c.carb.time),
        method: "тарелка-баланс",
        ingredients: ingredients(c, sauce),
        steps: [
          p.text,
          v.text,
          carbStep(c.carb).text,
          "Соберите тарелку: половина — овощи, четверть — белок, четверть — гарнир. Полейте соусом.",
        ],
        sauce,
      };
    },
  },
  {
    id: "bowl",
    special: false,
    build: (c, o) => {
      if (!["grain", "noodle", "potato"].includes(c.carb.kind)) return null;
      const sauce = pickSauce(c, "bowl", o);
      const p = proteinStep(c.protein, c.protein.pan ? "pan" : preferredMethod(c.protein));
      const v = vegStep(c.veg, c.veg.raw ? "raw" : "roast");
      return {
        id: "bowl",
        icon: "🥗",
        title: `Боул с ${c.protein.ins}, ${c.veg.ins} и ${c.carb.ins}`,
        time: total(p.time, v.time, c.carb.time),
        method: "собрать в миске",
        ingredients: ingredients(c, sauce),
        steps: [carbStep(c.carb).text, p.text, v.text, "Выложите всё в глубокую миску секторами, полейте соусом и посыпьте семенами или зеленью."],
        sauce,
      };
    },
  },
  {
    id: "salad",
    special: false,
    build: (c, o) => {
      if (!(c.veg.raw || c.veg.roast) || c.carb.kind === "oat" || c.carb.kind === "pasta") return null;
      const sauce = pickSauce(c, "salad", o, (s) => !s.forPasta || s.id === "lemon");
      const p = proteinStep(c.protein, c.protein.pan ? "pan" : preferredMethod(c.protein));
      const v = vegStep(c.veg, c.veg.roast ? "roast" : "raw");
      const carbPart = c.carb.kind === "bread" ? "крутонами из цельнозернового хлеба" : c.carb.ins;
      return {
        id: "salad",
        icon: "🥙",
        title: `Тёплый салат с ${c.protein.ins}, ${c.veg.ins} и ${carbPart}`,
        time: total(p.time, v.time, c.carb.time),
        method: "салат",
        ingredients: [...ingredients(c, sauce), "Горсть листьев салата или рукколы"],
        steps: [
          c.carb.kind === "bread" ? "Нарежьте хлеб кубиками и подсушите на сухой сковороде 3–4 минуты." : carbStep(c.carb).text,
          p.text,
          v.text,
          "Смешайте тёплые ингредиенты с листьями салата и заправьте соусом прямо перед подачей.",
        ],
        sauce,
      };
    },
  },
];

/** Подходящие блюда для комбинации: сначала «особые», затем универсальные. */
export function recipesFor(combo: Combo, opts: RecipeOptions = {}): Recipe[] {
  const seed = hash(`${combo.protein.id}|${combo.veg.id}|${combo.carb.id}`);
  const built = templates
    .map((t, i) => ({ t, r: t.build(combo, opts), order: hash(`${seed}-${i}`) }))
    .filter((x): x is { t: Template; r: Recipe; order: number } => x.r !== null)
    .filter((x) => !opts.maxTime || x.r.time <= opts.maxTime);

  const special = built.filter((x) => x.t.special).sort((a, b) => a.order - b.order);
  const generic = built.filter((x) => !x.t.special);
  return [...special, ...generic].map(({ r }) => ({
    ...r,
    title: fixSo(r.title),
    subtitle: r.subtitle && fixSo(r.subtitle),
    ingredients: r.ingredients.map(fixSo),
    steps: r.steps.map(fixSo),
  }));
}

/** Короткая подсказка нутрициолога, почему сочетание удачное. */
export function pairingTip(c: Combo): string | null {
  if (c.protein.iron && c.veg.vitaminC) {
    return `Витамин C из ${c.veg.id === "broccoli" ? "брокколи" : c.veg.gen} помогает лучше усваивать железо из ${c.protein.gen}.`;
  }
  if (c.protein.omega3) {
    return `${c.protein.nom} — источник омега-3 жирных кислот. Запекайте или готовьте на пару без сильного пережаривания.`;
  }
  if (c.veg.betaCarotene) {
    return `Бета-каротин из ${c.veg.gen} лучше усваивается с жирами — добавьте ложку масла или соус на его основе.`;
  }
  if (c.protein.group === "plant" && c.carb.kind === "grain") {
    return "Бобовые и крупы хорошо дополняют друг друга по аминокислотам — получается полноценный белок.";
  }
  if (c.veg.vitaminC) {
    return `${c.veg.nom} богаты витамином C — чтобы его сохранить, не переваривайте овощи и добавляйте их в конце.`.replace(
      /богаты/,
      c.veg.g === "pl" ? "богаты" : c.veg.g === "f" ? "богата" : c.veg.g === "n" ? "богато" : "богат",
    );
  }
  return null;
}
