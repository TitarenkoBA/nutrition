/**
 * Продукты для барабанов подбора блюд.
 *
 * Падежные формы нужны, чтобы названия блюд звучали по-русски:
 *   nom — «Индейка», acc — «индейку», ins — «индейкой», gen — «индейки».
 * g — род для прилагательных («запечённая индейка», «запечённый лосось»).
 */

export type Gender = "m" | "f" | "n" | "pl";

interface Forms {
  id: string;
  nom: string;
  acc: string;
  ins: string;
  gen: string;
  g: Gender;
  emoji: string;
}

export type ProteinGroup = "meat" | "poultry" | "fish" | "seafood" | "eggs" | "dairy" | "plant";

export interface Protein extends Forms {
  group: ProteinGroup;
  /** Время приготовления по способам, минуты. Нет ключа — способ не подходит. */
  bake?: { min: number; temp: number };
  pan?: number;
  stew?: number;
  soup?: number;
  wok?: number;
  /** Можно сделать фарш (тефтели, котлеты, начинка). */
  mince?: number;
  /** Своя формулировка для шага приготовления «в целом». */
  note?: string;
  /** Порция «по руке». */
  portion: string;
  iron?: boolean;
  omega3?: boolean;
}

export interface Vegetable extends Forms {
  roast?: number;
  steam?: number;
  raw?: boolean;
  stew?: boolean;
  soup?: boolean;
  wok?: boolean;
  /** Название для «фаршированных» блюд во мн. ч.: «Перцы». */
  stuff?: string;
  vitaminC?: boolean;
  betaCarotene?: boolean;
}

export type CarbKind = "grain" | "pasta" | "noodle" | "potato" | "bread" | "oat";

export interface Carb extends Forms {
  kind: CarbKind;
  gluten: boolean;
  /** Время приготовления, минуты (0 — готовить не нужно). */
  time: number;
  how: string;
  portion: string;
}

export const PROTEIN_GROUPS: { id: ProteinGroup; label: string }[] = [
  { id: "meat", label: "Мясо" },
  { id: "poultry", label: "Птица" },
  { id: "fish", label: "Рыба" },
  { id: "seafood", label: "Морепродукты" },
  { id: "eggs", label: "Яйца" },
  { id: "dairy", label: "Молочные" },
  { id: "plant", label: "Растительные" },
];

const PALM = "порция размером с ладонь (≈ 120–150 г)";

export const proteins: Protein[] = [
  // Птица
  { id: "chicken", nom: "Куриное филе", acc: "куриное филе", ins: "куриным филе", gen: "куриного филе", g: "n", emoji: "🐔", group: "poultry", bake: { min: 25, temp: 200 }, pan: 10, stew: 20, soup: 25, wok: 8, mince: 20, portion: PALM },
  { id: "chicken-thighs", nom: "Куриные бёдра", acc: "куриные бёдра", ins: "куриными бёдрами", gen: "куриных бёдер", g: "pl", emoji: "🍗", group: "poultry", bake: { min: 35, temp: 200 }, pan: 15, stew: 35, soup: 35, portion: "2 небольших бедра без кожи" },
  { id: "turkey", nom: "Индейка", acc: "индейку", ins: "индейкой", gen: "индейки", g: "f", emoji: "🦃", group: "poultry", bake: { min: 30, temp: 190 }, pan: 12, stew: 30, soup: 30, wok: 10, mince: 20, portion: PALM },
  // Мясо
  { id: "beef", nom: "Говядина", acc: "говядину", ins: "говядиной", gen: "говядины", g: "f", emoji: "🥩", group: "meat", bake: { min: 50, temp: 180 }, pan: 8, stew: 80, soup: 90, wok: 6, mince: 20, portion: PALM, iron: true },
  { id: "veal", nom: "Телятина", acc: "телятину", ins: "телятиной", gen: "телятины", g: "f", emoji: "🥩", group: "meat", bake: { min: 45, temp: 180 }, pan: 8, stew: 60, soup: 70, mince: 20, portion: PALM, iron: true },
  { id: "pork", nom: "Свиная вырезка", acc: "свиную вырезку", ins: "свиной вырезкой", gen: "свиной вырезки", g: "f", emoji: "🐖", group: "meat", bake: { min: 30, temp: 190 }, pan: 10, stew: 40, wok: 8, portion: PALM },
  { id: "rabbit", nom: "Кролик", acc: "кролика", ins: "кроликом", gen: "кролика", g: "m", emoji: "🐇", group: "meat", bake: { min: 50, temp: 180 }, stew: 60, soup: 60, portion: PALM, iron: true },
  // Рыба
  { id: "trout", nom: "Форель", acc: "форель", ins: "форелью", gen: "форели", g: "f", emoji: "🐟", group: "fish", bake: { min: 15, temp: 200 }, pan: 8, portion: PALM, omega3: true },
  { id: "salmon", nom: "Лосось", acc: "лосось", ins: "лососем", gen: "лосося", g: "m", emoji: "🍣", group: "fish", bake: { min: 15, temp: 200 }, pan: 8, soup: 15, portion: PALM, omega3: true },
  { id: "cod", nom: "Треска", acc: "треску", ins: "треской", gen: "трески", g: "f", emoji: "🐟", group: "fish", bake: { min: 15, temp: 200 }, stew: 15, soup: 15, mince: 15, portion: PALM },
  { id: "pollock", nom: "Минтай", acc: "минтай", ins: "минтаем", gen: "минтая", g: "m", emoji: "🐟", group: "fish", bake: { min: 15, temp: 200 }, stew: 15, soup: 15, mince: 15, portion: PALM },
  { id: "mackerel", nom: "Скумбрия", acc: "скумбрию", ins: "скумбрией", gen: "скумбрии", g: "f", emoji: "🐟", group: "fish", bake: { min: 20, temp: 200 }, portion: PALM, omega3: true },
  { id: "zander", nom: "Судак", acc: "судака", ins: "судаком", gen: "судака", g: "m", emoji: "🐟", group: "fish", bake: { min: 20, temp: 200 }, pan: 8, soup: 20, portion: PALM },
  // Морепродукты
  { id: "shrimp", nom: "Креветки", acc: "креветки", ins: "креветками", gen: "креветок", g: "pl", emoji: "🦐", group: "seafood", pan: 4, wok: 4, soup: 4, portion: "горсть очищенных креветок (≈ 150 г)" },
  { id: "squid", nom: "Кальмары", acc: "кальмары", ins: "кальмарами", gen: "кальмаров", g: "pl", emoji: "🦑", group: "seafood", pan: 3, wok: 3, portion: PALM },
  { id: "mussels", nom: "Мидии", acc: "мидии", ins: "мидиями", gen: "мидий", g: "pl", emoji: "🦪", group: "seafood", stew: 7, soup: 7, portion: "горсть очищенных мидий (≈ 150 г)", iron: true },
  // Яйца и молочные
  { id: "eggs", nom: "Яйца", acc: "яйца", ins: "яйцами", gen: "яиц", g: "pl", emoji: "🥚", group: "eggs", note: "Отварите яйца 8–9 минут или приготовьте пашот — 3 минуты в едва кипящей воде.", portion: "2–3 яйца" },
  { id: "cottage", nom: "Творог", acc: "творог", ins: "творогом", gen: "творога", g: "m", emoji: "🥣", group: "dairy", note: "Смешайте творог с рубленой зеленью, щепоткой соли и чесноком — получится белковый крем.", portion: "150–200 г" },
  { id: "cheese", nom: "Адыгейский сыр", acc: "адыгейский сыр", ins: "адыгейским сыром", gen: "адыгейского сыра", g: "m", emoji: "🧀", group: "dairy", pan: 5, bake: { min: 15, temp: 200 }, portion: "ломтик размером с ладонь (≈ 100 г)" },
  // Растительные
  { id: "tofu", nom: "Тофу", acc: "тофу", ins: "тофу", gen: "тофу", g: "m", emoji: "⬜", group: "plant", pan: 8, wok: 8, bake: { min: 20, temp: 200 }, portion: PALM },
  { id: "lentils", nom: "Чечевица", acc: "чечевицу", ins: "чечевицей", gen: "чечевицы", g: "f", emoji: "🟠", group: "plant", stew: 25, soup: 25, mince: 20, note: "Промойте чечевицу и варите 15–20 минут (красную — 12–15) до мягкости.", portion: "кулак в готовом виде", iron: true },
  { id: "chickpeas", nom: "Нут", acc: "нут", ins: "нутом", gen: "нута", g: "m", emoji: "🧆", group: "plant", bake: { min: 25, temp: 200 }, stew: 15, soup: 20, mince: 15, note: "Возьмите консервированный нут или отварите замоченный с вечера 60–90 минут.", portion: "кулак в готовом виде", iron: true },
  { id: "beans", nom: "Фасоль", acc: "фасоль", ins: "фасолью", gen: "фасоли", g: "f", emoji: "🥫", group: "plant", stew: 15, soup: 20, note: "Возьмите консервированную фасоль или отварите замоченную с вечера 60–90 минут.", portion: "кулак в готовом виде", iron: true },
];

export const vegetables: Vegetable[] = [
  { id: "broccoli", nom: "Брокколи", acc: "брокколи", ins: "брокколи", gen: "брокколи", g: "f", emoji: "🥦", roast: 15, steam: 5, stew: true, soup: true, wok: true, vitaminC: true },
  { id: "cauliflower", nom: "Цветная капуста", acc: "цветную капусту", ins: "цветной капустой", gen: "цветной капусты", g: "f", emoji: "🥦", roast: 20, steam: 7, stew: true, soup: true, vitaminC: true },
  { id: "zucchini", nom: "Кабачок", acc: "кабачок", ins: "кабачком", gen: "кабачка", g: "m", emoji: "🥒", roast: 15, steam: 5, stew: true, soup: true, wok: true, stuff: "Кабачки-лодочки" },
  { id: "eggplant", nom: "Баклажан", acc: "баклажан", ins: "баклажаном", gen: "баклажана", g: "m", emoji: "🍆", roast: 20, stew: true, stuff: "Баклажаны-лодочки" },
  { id: "pepper", nom: "Болгарский перец", acc: "болгарский перец", ins: "болгарским перцем", gen: "болгарского перца", g: "m", emoji: "🌶️", roast: 15, raw: true, stew: true, wok: true, stuff: "Перцы", vitaminC: true },
  { id: "tomatoes", nom: "Томаты", acc: "томаты", ins: "томатами", gen: "томатов", g: "pl", emoji: "🍅", roast: 10, raw: true, stew: true, soup: true, stuff: "Томаты", vitaminC: true },
  { id: "cucumbers", nom: "Огурцы", acc: "огурцы", ins: "огурцами", gen: "огурцов", g: "pl", emoji: "🥒", raw: true },
  { id: "spinach", nom: "Шпинат", acc: "шпинат", ins: "шпинатом", gen: "шпината", g: "m", emoji: "🥬", steam: 2, raw: true, stew: true, soup: true },
  { id: "green-beans", nom: "Стручковая фасоль", acc: "стручковую фасоль", ins: "стручковой фасолью", gen: "стручковой фасоли", g: "f", emoji: "🌿", roast: 15, steam: 5, stew: true, soup: true, wok: true },
  { id: "carrot", nom: "Морковь", acc: "морковь", ins: "морковью", gen: "моркови", g: "f", emoji: "🥕", roast: 25, raw: true, stew: true, soup: true, wok: true, betaCarotene: true },
  { id: "pumpkin", nom: "Тыква", acc: "тыкву", ins: "тыквой", gen: "тыквы", g: "f", emoji: "🎃", roast: 25, stew: true, soup: true, betaCarotene: true },
  { id: "brussels", nom: "Брюссельская капуста", acc: "брюссельскую капусту", ins: "брюссельской капустой", gen: "брюссельской капусты", g: "f", emoji: "🥬", roast: 20, steam: 8, vitaminC: true },
  { id: "cabbage", nom: "Белокочанная капуста", acc: "капусту", ins: "капустой", gen: "капусты", g: "f", emoji: "🥬", raw: true, stew: true, soup: true, wok: true, vitaminC: true },
  { id: "mushrooms", nom: "Шампиньоны", acc: "шампиньоны", ins: "шампиньонами", gen: "шампиньонов", g: "pl", emoji: "🍄", roast: 15, stew: true, soup: true, wok: true },
  { id: "asparagus", nom: "Спаржа", acc: "спаржу", ins: "спаржей", gen: "спаржи", g: "f", emoji: "🌱", roast: 10, steam: 4 },
  { id: "beetroot", nom: "Свёкла", acc: "свёклу", ins: "свёклой", gen: "свёклы", g: "f", emoji: "🟣", roast: 40, raw: true, soup: true },
  { id: "peas", nom: "Зелёный горошек", acc: "зелёный горошек", ins: "зелёным горошком", gen: "зелёного горошка", g: "m", emoji: "🟢", steam: 3, stew: true, soup: true, wok: true },
  { id: "greens", nom: "Листовой салат", acc: "листовой салат", ins: "листовым салатом", gen: "листового салата", g: "m", emoji: "🥗", raw: true },
];

const FIST = "кулак в готовом виде (≈ 40–60 г сухого продукта)";

export const carbs: Carb[] = [
  { id: "buckwheat", nom: "Гречка", acc: "гречку", ins: "гречкой", gen: "гречки", g: "f", emoji: "🌾", kind: "grain", gluten: false, time: 15, how: "Промойте гречку и варите 15 минут в соотношении 1 : 2 с водой.", portion: FIST },
  { id: "brown-rice", nom: "Бурый рис", acc: "бурый рис", ins: "бурым рисом", gen: "бурого риса", g: "m", emoji: "🍚", kind: "grain", gluten: false, time: 35, how: "Промойте бурый рис и варите 30–35 минут в соотношении 1 : 2,5 с водой.", portion: FIST },
  { id: "quinoa", nom: "Киноа", acc: "киноа", ins: "киноа", gen: "киноа", g: "f", emoji: "🌾", kind: "grain", gluten: false, time: 15, how: "Тщательно промойте киноа и варите 15 минут в соотношении 1 : 2 с водой.", portion: FIST },
  { id: "bulgur", nom: "Булгур", acc: "булгур", ins: "булгуром", gen: "булгура", g: "m", emoji: "🌾", kind: "grain", gluten: true, time: 15, how: "Залейте булгур кипятком 1 : 2 и варите на слабом огне 12–15 минут.", portion: FIST },
  { id: "barley", nom: "Перловка", acc: "перловку", ins: "перловкой", gen: "перловки", g: "f", emoji: "🌾", kind: "grain", gluten: true, time: 45, how: "Замочите перловку на ночь, затем варите 40–45 минут в соотношении 1 : 3.", portion: FIST },
  { id: "millet", nom: "Пшено", acc: "пшено", ins: "пшеном", gen: "пшена", g: "n", emoji: "🌾", kind: "grain", gluten: false, time: 20, how: "Промойте пшено горячей водой и варите 20 минут в соотношении 1 : 2,5.", portion: FIST },
  { id: "pasta", nom: "Цельнозерновая паста", acc: "цельнозерновую пасту", ins: "цельнозерновой пастой", gen: "цельнозерновой пасты", g: "f", emoji: "🍝", kind: "pasta", gluten: true, time: 10, how: "Отварите пасту до состояния аль денте — на 1–2 минуты меньше, чем на упаковке.", portion: FIST },
  { id: "soba", nom: "Лапша соба", acc: "лапшу соба", ins: "лапшой соба", gen: "лапши соба", g: "f", emoji: "🍜", kind: "noodle", gluten: true, time: 6, how: "Отварите лапшу соба 5–6 минут и промойте холодной водой.", portion: FIST },
  { id: "sweet-potato", nom: "Батат", acc: "батат", ins: "бататом", gen: "батата", g: "m", emoji: "🍠", kind: "potato", gluten: false, time: 30, how: "Нарежьте батат дольками и запекайте 25–30 минут при 200 °C.", portion: "кулак (≈ 150 г)" },
  { id: "potato", nom: "Картофель в мундире", acc: "картофель", ins: "картофелем", gen: "картофеля", g: "m", emoji: "🥔", kind: "potato", gluten: false, time: 30, how: "Запеките или отварите картофель в мундире 25–30 минут — так меньше скачок сахара, чем от пюре.", portion: "кулак (≈ 150 г)" },
  { id: "lavash", nom: "Цельнозерновой лаваш", acc: "цельнозерновой лаваш", ins: "цельнозерновым лавашем", gen: "цельнозернового лаваша", g: "m", emoji: "🌯", kind: "bread", gluten: true, time: 0, how: "Подогрейте лаваш на сухой сковороде по 30 секунд с каждой стороны.", portion: "1 лист" },
  { id: "bread", nom: "Цельнозерновой хлеб", acc: "цельнозерновой хлеб", ins: "цельнозерновым хлебом", gen: "цельнозернового хлеба", g: "m", emoji: "🍞", kind: "bread", gluten: true, time: 0, how: "Подсушите 1–2 ломтика хлеба в тостере или на сухой сковороде.", portion: "1–2 ломтика" },
  { id: "oats", nom: "Овсянка", acc: "овсяные хлопья", ins: "овсянкой", gen: "овсянки", g: "f", emoji: "🥣", kind: "oat", gluten: true, time: 10, how: "Варите овсяные хлопья (не быстрого приготовления) 7–10 минут в соотношении 1 : 2,5.", portion: "кулак в готовом виде (≈ 40 г хлопьев)" },
];

export interface Sauce {
  id: string;
  name: string;
  how: string;
  dairy: boolean;
  /** Для каких групп белка особенно хорош (пусто — для всех). */
  goodFor?: ProteinGroup[];
  asian?: boolean;
  forPasta?: boolean;
}

export const sauces: Sauce[] = [
  { id: "lemon", name: "Лимон, чеснок и зелень", how: "сок ½ лимона, 1 зубчик чеснока, рубленая зелень и 1 ч. л. оливкового масла", dairy: false, forPasta: true },
  { id: "tzatziki", name: "Йогуртовый соус с огурцом", how: "3 ст. л. греческого йогурта, тёртый огурец, укроп и щепотка соли", dairy: true, goodFor: ["fish", "poultry", "meat", "plant", "eggs"] },
  { id: "asian", name: "Соевый соус, имбирь и кунжут", how: "1 ст. л. соевого соуса, тёртый имбирь, чеснок и ½ ч. л. кунжутного масла", dairy: false, goodFor: ["poultry", "meat", "seafood", "plant", "fish"], asian: true },
  { id: "tomato", name: "Томатный соус с базиликом", how: "томаты в собственном соку, чеснок и базилик — протушить 10 минут", dairy: false, goodFor: ["meat", "seafood", "plant", "poultry", "eggs"], forPasta: true },
  { id: "mustard", name: "Горчично-медовая заправка", how: "1 ч. л. зернистой горчицы, ½ ч. л. мёда, сок лимона и 1 ч. л. масла", dairy: false, goodFor: ["poultry", "meat", "fish"] },
  { id: "pesto", name: "Песто", how: "базилик, кедровые орехи, пармезан и оливковое масло — 1–2 ст. л. на порцию", dairy: true, goodFor: ["poultry", "seafood", "dairy", "eggs"], forPasta: true },
  { id: "tahini", name: "Тахини с лимоном", how: "1 ст. л. тахини, сок лимона и немного воды до густоты сметаны", dairy: false, goodFor: ["plant", "fish", "poultry", "dairy"] },
];

export type ReelId = "protein" | "veg" | "carb";

export const REELS: { id: ReelId; label: string; short: string }[] = [
  { id: "protein", label: "Белок", short: "Белок" },
  { id: "veg", label: "Овощи", short: "Овощи" },
  { id: "carb", label: "Сложные углеводы", short: "Углеводы" },
];

export function pool(reel: ReelId): (Protein | Vegetable | Carb)[] {
  return reel === "protein" ? proteins : reel === "veg" ? vegetables : carbs;
}

/** Минимальное время, за которое белок можно приготовить. */
export function proteinMinTime(p: Protein): number {
  const times = [p.bake?.min, p.pan, p.stew, p.soup, p.wok, p.mince].filter((t): t is number => typeof t === "number");
  return times.length ? Math.min(...times) : 10;
}
