/**
 * Все вопросы анкеты в одном месте: по этой схеме строится и форма, и PDF.
 * Тексты взяты из «Анкета. Девушки.docx».
 */

export type Values = Record<string, string | boolean>;

interface BaseField {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Показывать поле, только если другое поле имеет нужное значение. */
  showIf?: { id: string; equals: string };
}

export type Field =
  | (BaseField & { kind: "text" | "tel" | "email" | "date" | "time"; placeholder?: string; half?: boolean })
  | (BaseField & { kind: "number"; unit?: string; half?: boolean; min?: number; max?: number })
  | (BaseField & { kind: "textarea"; rows?: number; placeholder?: string })
  | (BaseField & { kind: "yesno"; num: number; detailsLabel?: string })
  | (BaseField & { kind: "survey-text"; num: number; short?: boolean; placeholder?: string })
  | (BaseField & { kind: "choice"; options: { value: string; label: string }[] })
  | (BaseField & { kind: "checkbox" })
  | { kind: "heading"; id: string; label: string; hint?: string; showIf?: BaseField["showIf"] }
  | { kind: "note"; id: string; label: string; tone?: "info" | "privacy"; showIf?: BaseField["showIf"] };

export interface Step {
  id: string;
  title: string;
  /** Короткое название для навигации. */
  short: string;
  intro?: string;
  fields: Field[];
}

const yesno = (num: number, id: string, label: string, hint?: string, detailsLabel?: string): Field => ({
  kind: "yesno",
  num,
  id,
  label,
  hint,
  detailsLabel,
});

const surveyText = (num: number, id: string, label: string, hint?: string, short = false, placeholder?: string): Field => ({
  kind: "survey-text",
  num,
  id,
  label,
  hint,
  short,
  placeholder,
});

const disease = (id: string, label: string, hint?: string): Field => ({ kind: "textarea", id, label, hint, rows: 2 });

export const steps: Step[] = [
  {
    id: "general",
    title: "Общая информация",
    short: "Общее",
    intro:
      "Персональные данные, представленные Вами, являются строго конфиденциальными. Информация не подлежит передаче и разглашению третьим лицам.",
    fields: [
      { kind: "text", id: "fullName", label: "ФИО", required: true, placeholder: "Иванова Мария Сергеевна" },
      { kind: "date", id: "birthDate", label: "Дата рождения", required: true, half: true },
      { kind: "text", id: "cityCountry", label: "Город / Страна", half: true },
      { kind: "tel", id: "phone", label: "Телефон", half: true, placeholder: "+7 900 000-00-00" },
      { kind: "email", id: "email", label: "E-mail", half: true, placeholder: "name@mail.ru" },
      { kind: "heading", id: "h-measure", label: "Параметры", hint: "Если какой-то обхват не знаете — оставьте поле пустым." },
      { kind: "number", id: "heightCm", label: "Рост", unit: "см", half: true, min: 50, max: 250 },
      { kind: "number", id: "weightKg", label: "Вес", unit: "кг", half: true, min: 20, max: 350 },
      { kind: "number", id: "wrist", label: "Обхват запястья", unit: "см", half: true, min: 5, max: 40 },
      { kind: "number", id: "hips", label: "Обхват бёдер", unit: "см", half: true, min: 40, max: 250 },
      { kind: "number", id: "waist", label: "Обхват талии", unit: "см", half: true, min: 40, max: 250 },
      {
        kind: "number",
        id: "chest",
        label: "Обхват груди",
        unit: "см",
        half: true,
        min: 40,
        max: 250,
        hint: "Измеряется на уровне подмышечных впадин по наиболее выступающим точкам груди.",
      },
      { kind: "heading", id: "h-reason", label: "Ваш запрос" },
      {
        kind: "textarea",
        id: "reason",
        label: "Что послужило поводом для обращения?",
        hint: "Начните с проблемы, которая наиболее сильно ухудшает качество Вашей жизни.",
        rows: 4,
      },
      {
        kind: "textarea",
        id: "complaints",
        label: "Что Вас беспокоит (жалобы и симптомы)? Когда произошло ухудшение самочувствия или состояния? В чём оно проявилось?",
        rows: 4,
      },
      {
        kind: "textarea",
        id: "minorSymptoms",
        label:
          "Опишите самые незначительные, на первый взгляд неважные, болезненные или дискомфортные состояния и ощущения за последний год или больше.",
        rows: 4,
      },
    ],
  },
  {
    id: "medical",
    title: "Медицинские данные",
    short: "Здоровье",
    intro: "Подробно перечислите выявленные заболевания. Если заболеваний в группе нет — оставьте поле пустым.",
    fields: [
      disease("skin", "Кожные заболевания и другие высыпания на коже", "Псориаз, атопический дерматит, экзема, витилиго и т.д."),
      disease("gi", "Заболевания желудочно-кишечного тракта", "Колит, гастроэзофагеальная рефлюксная болезнь, изжога, язва, гастрит и т.д."),
      disease("liver", "Заболевания печени", "Гепатоз, гепатит и т.д."),
      disease("gallbladder", "Заболевания желчного пузыря", "Дискинезия желчевыводящих путей, желчекаменная болезнь, холецистит и т.д."),
      disease("pancreas", "Заболевания поджелудочной железы", "Камни, кальцификаты, панкреатит, киста и т.д."),
      disease("urinary", "Заболевания мочеполовой системы", "Заболевания почек, ураты, цистит, мочекаменная болезнь, пиелонефрит и т.д."),
      disease(
        "musculoskeletal",
        "Заболевания опорно-двигательного аппарата",
        "Артрит, артроз, остеохондроз, подагра, дистрофия мышц, ревматизм и т.д.",
      ),
      disease("cardio", "Сердечно-сосудистые заболевания"),
      disease("pressure", "Артериальное давление", "Повышенное / пониженное."),
      disease("venous", "Заболевания венозной системы", "Варикозное расширение вен и т.д."),
      disease("blood", "Болезни системы крови", "Анемия и т.д."),
      disease("endocrine", "Эндокринные заболевания", "Заболевания щитовидной железы, надпочечников, сахарный диабет 1 и 2 типа и т.д."),
      disease("ent", "Заболевания ЛОР-органов"),
      { kind: "heading", id: "h-other", label: "Другие настоящие или перенесённые заболевания" },
      disease("chronic", "Хронические", "С какого года, остаточные проявления."),
      disease("acute", "Острые", "С какого года, проявления."),
      disease("surgeries", "Операции", "Дата проведения, плановая/экстренная, осложнения, реабилитация."),
      {
        kind: "heading",
        id: "h-family",
        label: "Семейная история болезней и наследственности",
        hint: "Родители, дедушки и бабушки, братья и сёстры, тёти и дяди и т.д.",
      },
      disease("familyMother", "Мама и родственники по материнской линии"),
      disease("familyFather", "Отец и родственники по отцовской линии"),
    ],
  },
  {
    id: "wellbeing",
    title: "Анкета: самочувствие",
    short: "Самочувствие",
    intro: "Отметьте «Да» или «Нет» и, если есть что добавить, опишите подробнее.",
    fields: [
      yesno(1, "s01", "Бывает ли у Вас повышенная раздражительность, ощущение агрессивности, раздражения по пустякам, уныние?"),
      yesno(2, "s02", "Часты ли случаи нервозности (внутреннего напряжения, суетливости, беспокойства и т.д.)?"),
      yesno(3, "s03", "Тревожность (приступы паники, навязчивые мысли и т.д.)"),
      yesno(
        4,
        "s04",
        "Чувствуете ли Вы физическое истощение / упадок жизненных сил / опустошение?",
        "Общее снижение работоспособности, пониженная активность, отсутствие интереса к хобби, сниженная самооценка, неудовлетворённость сделанным, достигнутым, необходимость заставлять себя проявлять активность и т.д.",
      ),
      yesno(
        5,
        "s05",
        "Замечаете ли Вы частое сниженное настроение, апатию?",
        "Чувство подавленности, грусти, отсутствие стимулов, колебания настроения, чувство бесполезности.",
      ),
      yesno(6, "s06", "Наблюдаете ли Вы у себя непереносимость даже лёгких стрессов? Бывает ли тремор во время стрессовых ситуаций?"),
      yesno(
        7,
        "s07",
        "Есть ли у Вас уменьшение роста волос, бровей, ресниц? Алопеция (облысение, выпадение волос)?",
        undefined,
        "Если да, то с какого года? Подробно",
      ),
      yesno(8, "s08", "Бывают ли у Вас головокружения или обмороки?"),
      yesno(9, "s09", "Бывает ли у Вас субфебрильная температура?"),
      surveyText(10, "s10", "Аппетит", "Хороший, избирательный, сниженный, постоянный голод."),
      yesno(11, "s11", "Есть ли у Вас налёт на языке?", "Укажите расположение (боковые части / корень / центр) и цвет налёта."),
      yesno(12, "s12", "Аллергические реакции на пищевые продукты"),
      surveyText(13, "s13", "Как часто за последний год Вы болели простудными заболеваниями?"),
      yesno(14, "s14", "Принимали ли антибиотики за последний год?"),
      yesno(15, "s15", "Вы придерживаетесь определённой системы питания?", "Вегетарианство, религиозные диеты, палео и т.д."),
      yesno(16, "s16", "Газообразование, вздутие, тяжесть после приёма пищи / конкретных продуктов"),
      yesno(17, "s17", "Бывает ли тошнота / рвота? Отрыжки? Частая икота? Изжога?"),
      surveyText(18, "s18", "Любимые продукты, блюда"),
      surveyText(19, "s19", "Нелюбимые продукты, блюда"),
      yesno(20, "s20", "Есть ли тяга или отвращение к сладкому / солёному / мясу и субпродуктам?"),
    ],
  },
  {
    id: "lifestyle",
    title: "Анкета: сон и образ жизни",
    short: "Образ жизни",
    fields: [
      surveyText(21, "s21", "Сколько часов в день Вы спите?", undefined, true, "например, 7–8"),
      surveyText(22, "s22", "В какое время чаще всего просыпаетесь?", undefined, true, "например, 7:00"),
      surveyText(23, "s23", "В какое время Вы чаще всего ложитесь спать?", undefined, true, "например, 23:30"),
      yesno(
        24,
        "s24",
        "Проблемы со сном?",
        "Трудности с засыпанием, на протяжении сна, с ранним пробуждением, чувство усталости, плохой сон, бессонница и т.д.",
      ),
      yesno(25, "s25", "Есть ли сонливость, повышенная потребность во сне, частое ощущение усталости?"),
      yesno(26, "s26", "Есть ли у Вас двигательная активность в течение дня?", "Прогулки пешком, активный физический труд и т.д."),
      yesno(
        27,
        "s27",
        "Занимаетесь ли Вы спортом или другими видами физической активности?",
        "Вид тренировок, стаж, количество тренировок в неделю.",
      ),
      yesno(
        28,
        "s28",
        "Есть ли боли в суставах и мышечные боли?",
        "Боли в нижней части спины, боли в суставах, боли в пояснице, боли по всей спине и т.д.",
      ),
      yesno(29, "s29", "Вы ощущаете снижение мышечной силы?", "Ощущение слабости, не связанное с занятиями спортом."),
      yesno(30, "s30", "Есть ли у Вас бородавки, папилломы, большое количество родинок, красные сосудистые звёздочки?"),
      yesno(31, "s31", "Есть ли у Вас следы от зубов по бокам языка, сухость кожи, отёки?"),
      yesno(32, "s32", "Есть ли у Вас круги под глазами?", "Красные / синие / чёрно-синие."),
      surveyText(
        33,
        "s33",
        "Опишите Ваши ногти и лунки на них. Есть ли продольные полосы на подушечках пальцев? Облезает ли кожа на пальцах?",
      ),
      yesno(
        34,
        "s34",
        "Присутствует ли повышенная потливость? Мокрая голова во сне? Едкий запах пота?",
        "Неожиданные / внезапные периоды повышенного потоотделения, приливы жара, независимые от степени напряжения.",
      ),
      yesno(35, "s35", "Беспокоит ли Вас частое дневное мочеиспускание? Бывают ли у Вас затруднения при мочеиспускании?"),
      surveyText(36, "s36", "Как часто у Вас стул? Поносы / запоры?", "Ежедневно / раз в 2 дня и т.д."),
      yesno(37, "s37", "Есть ли у Вас дети?", undefined, "Укажите год рождения"),
      yesno(38, "s38", "Есть ли у Вас домашнее животное?"),
      yesno(39, "s39", "Вы курите?"),
      surveyText(40, "s40", "Как часто и какие алкогольные напитки Вы употребляете?"),
    ],
  },
  {
    id: "meds",
    title: "Лекарства и добавки",
    short: "Лекарства",
    intro: "Укажите названия и, если помните, дозировки.",
    fields: [
      { kind: "heading", id: "h-meds", label: "Лекарственные средства, которые Вы принимаете" },
      { kind: "textarea", id: "medsConstant", label: "На постоянной основе", rows: 2 },
      { kind: "textarea", id: "medsSeasonal", label: "Сезонно", rows: 2 },
      { kind: "textarea", id: "medsEpisodic", label: "Эпизодически", rows: 2 },
      { kind: "textarea", id: "medsExacerbation", label: "По факту обострения", rows: 2 },
      { kind: "heading", id: "h-vitamins", label: "Витаминно-минеральные комплексы, которые Вы принимаете" },
      { kind: "checkbox", id: "vitaminsNone", label: "Не принимаю витаминно-минеральные комплексы" },
      { kind: "textarea", id: "vitaminsConstant", label: "На постоянной основе", rows: 2, showIf: { id: "vitaminsNone", equals: "false" } },
      { kind: "textarea", id: "vitaminsSeasonal", label: "Сезонно", rows: 2, showIf: { id: "vitaminsNone", equals: "false" } },
      { kind: "heading", id: "h-supplements", label: "БАДы, которые Вы принимаете" },
      { kind: "checkbox", id: "supplementsNone", label: "Не принимаю БАДы" },
      { kind: "textarea", id: "supplements", label: "Наименование", rows: 2, showIf: { id: "supplementsNone", equals: "false" } },
      { kind: "heading", id: "h-extra", label: "Дополнительно" },
      {
        kind: "textarea",
        id: "extraInfo",
        label: "Есть ли ещё информация, которую Вы бы хотели рассказать в связи с обращением?",
        rows: 4,
      },
    ],
  },
  {
    id: "weight",
    title: "Опыт похудения / набора веса",
    short: "Вес",
    fields: [
      {
        kind: "choice",
        id: "weightGoal",
        label: "Стоит ли перед Вами цель снизить или набрать вес?",
        hint: "Этот раздел заполняется, только если такая цель есть.",
        options: [
          { value: "yes", label: "Да" },
          { value: "no", label: "Нет" },
        ],
      },
      {
        kind: "textarea",
        id: "weightExperience",
        label: "Максимально подробно расскажите о Вашем опыте похудения / набора веса.",
        hint: "Сколько времени Вы пытаетесь похудеть / набрать вес? Какие способы пробовали? Прибегали ли к помощи специалистов? Если да, то какой тактики придерживались?",
        rows: 6,
        showIf: { id: "weightGoal", equals: "yes" },
      },
      {
        kind: "textarea",
        id: "weightPsychology",
        label: "Считаете ли Вы, что в Вашем случае проблема с лишним весом / дефицитом веса частично или полностью имеет психологические причины?",
        hint: "Заедаете ли Вы стресс или наоборот едите ещё меньше? Компенсируете ли Вы едой какие-то эмоции или чувства? Испытываете ли Вы чувство вины?",
        rows: 6,
        showIf: { id: "weightGoal", equals: "yes" },
      },
    ],
  },
  {
    id: "diary",
    title: "Дневник питания",
    short: "Дневник",
    intro: "Подробно опишите Ваш рацион за 3 дня: 2 будних дня и 1 выходной день.",
    fields: [
      { kind: "note", id: "diary-guide", label: "diary-guide", tone: "info" },
      { kind: "heading", id: "h-day1", label: "День 1 — будний" },
      { kind: "date", id: "day1Date", label: "Дата", half: true },
      { kind: "textarea", id: "day1", label: "Рацион за день", rows: 10, placeholder: "7:15 пробуждение\n7:50 стакан воды 200 мл\n8:05 завтрак…" },
      { kind: "heading", id: "h-day2", label: "День 2 — будний" },
      { kind: "date", id: "day2Date", label: "Дата", half: true },
      { kind: "textarea", id: "day2", label: "Рацион за день", rows: 10 },
      { kind: "heading", id: "h-day3", label: "День 3 — выходной" },
      { kind: "date", id: "day3Date", label: "Дата", half: true },
      { kind: "textarea", id: "day3", label: "Рацион за день", rows: 10 },
    ],
  },
  {
    id: "labs",
    title: "Анализы и медицинские обследования",
    short: "Анализы",
    intro:
      "Вы можете приложить результаты Ваших анализов, расшифровки результатов УЗИ и т.д. давностью не более 3 месяцев, а также наиболее важные результаты анализов, которые выходили за референсные значения за всё время (не в период ОРЗ, ОРВИ и гриппа).",
    fields: [
      {
        kind: "note",
        id: "labs-files",
        tone: "info",
        label: "Файлы анализов на сайт не загружаются — приложите их к сообщению вместе с PDF-анкетой, когда будете её отправлять.",
      },
      {
        kind: "textarea",
        id: "labs",
        label: "Комментарий к анализам",
        hint: "Какие анализы прикладываете, что выходило за референсные значения, какие обследования проходили.",
        rows: 5,
      },
    ],
  },
  {
    id: "photos",
    title: "Фотографии",
    short: "Фото",
    intro:
      "Фотографии позволяют отслеживать положительную динамику. Предоставляются при желании или необходимости (например, кожные заболевания, фото «до» похудения / набора веса).",
    fields: [
      { kind: "note", id: "photo-guide", label: "photo-guide", tone: "info" },
      { kind: "textarea", id: "photosComment", label: "Комментарий к фотографиям", rows: 3 },
    ],
  },
];

export const STORAGE_KEY = "nutrition.anketa.v2";
export const STORAGE_STEP_KEY = "nutrition.anketa.v2.step";

/** Поля, которые реально вводит пользователь (без заголовков и подсказок). */
export function inputFields(step: Step) {
  return step.fields.filter((f) => f.kind !== "heading" && f.kind !== "note");
}

export function isVisible(field: Field, values: Values): boolean {
  if (!field.showIf) return true;
  const raw = values[field.showIf.id];
  const value = typeof raw === "boolean" ? String(raw) : raw ?? "";
  // Для чекбоксов «не отмечен» = "false", даже если значение ещё не задано.
  if (field.showIf.equals === "false" && value === "") return true;
  return value === field.showIf.equals;
}

export function str(values: Values, id: string): string {
  const v = values[id];
  return typeof v === "string" ? v : "";
}

/** Ошибки обязательных полей шага. */
export function validateStep(step: Step, values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of step.fields) {
    if (!("required" in field) || !field.required || !isVisible(field, values)) continue;
    if (!str(values, field.id).trim()) errors[field.id] = "Заполните это поле";
  }
  if (step.id === "general") {
    const email = str(values, "email").trim();
    if (!str(values, "phone").trim() && !email) {
      errors.phone = "Укажите телефон или e-mail, чтобы с Вами можно было связаться";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Проверьте адрес e-mail";
    }
  }
  return errors;
}

/** Сколько полей шага заполнено — для индикатора прогресса. */
export function stepProgress(step: Step, values: Values): { filled: number; total: number } {
  const fields = inputFields(step).filter((f) => isVisible(f, values));
  const filled = fields.filter((f) => {
    const v = values[f.id];
    return typeof v === "boolean" ? v : Boolean(v && String(v).trim());
  }).length;
  return { filled, total: fields.length };
}
