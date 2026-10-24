/** Поиск по справочнику: нормализация русского текста, витаминов (B12 = В12) и подсветка. */

export type EntryType = "indicator" | "cheat" | "schedule" | "compat";

export interface Entry {
  id: string;
  type: EntryType;
  audience?: "adults" | "kids";
  section: string;
  name: string;
  abbr?: string;
  description?: string;
  important?: string[];
  synonyms?: string;
  ranges?: [string, string][];
  ageTable?: [string, string][];
  extraTable?: { title: string; rows: [string, string][] };
  lowLabel?: string;
  highLabel?: string;
  highIntro?: string;
  low?: string[];
  high?: string[];
  rows?: [string, string][];
  synergists?: string;
  antagonists?: string;
  comment?: string;
  check?: string;
}

export interface Handbook {
  title: string;
  sources: string[];
  disclaimer: string;
  entries: Entry[];
}

// Кириллица, похожая на латиницу в обозначениях витаминов: «В12» → «b12», «Д3» → «d3».
const LETTER_MAP: Record<string, string> = {
  а: "a",
  в: "b",
  с: "c",
  д: "d",
  е: "e",
  к: "k",
  a: "a",
  b: "b",
  c: "c",
  d: "d",
  e: "e",
  k: "k",
};

/**
 * Нормализация с сохранением длины строки (символ в символ),
 * чтобы найденные позиции можно было подсветить в исходном тексте.
 */
export function normalize(text: string): string {
  const lower = text.toLowerCase().replace(/ё/g, "е");
  let out = "";
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const prev = lower[i - 1] ?? " ";
    const next = lower[i + 1] ?? "";
    const isLetterToken = /[\da-zа-я]/.test(prev) === false && /\d/.test(next);
    // «витамин д» / «витамин d» — одиночная буква после слова «витамин(ы)»
    const afterVitamin = /витамин(ы|ов)? $/.test(lower.slice(Math.max(0, i - 10), i)) && !/[a-zа-я]/.test(next);
    out += (isLetterToken || afterVitamin) && LETTER_MAP[ch] ? LETTER_MAP[ch] : ch;
  }
  return out;
}

export function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export type Scope = "all" | "low" | "high";

/** Текст записи по частям — чтобы показывать, где найдено совпадение. */
export function entryParts(entry: Entry): Record<string, string> {
  const rows = (pairs?: [string, string][]) => (pairs ?? []).map((p) => p.join(" ")).join(" ");
  return {
    name: [entry.name, entry.abbr, entry.synonyms].filter(Boolean).join(" "),
    about: [entry.description, ...(entry.important ?? []), entry.highIntro, entry.comment, entry.synergists, entry.antagonists]
      .filter(Boolean)
      .join(" "),
    values: [rows(entry.ranges), rows(entry.ageTable), rows(entry.extraTable?.rows), rows(entry.rows)].join(" "),
    low: (entry.low ?? []).join(" "),
    high: (entry.high ?? []).join(" "),
  };
}

export interface Match {
  entry: Entry;
  score: number;
  where: string[];
}

const WHERE_LABELS: Record<string, string> = {
  name: "название",
  about: "описание",
  values: "нормы",
  low: "понижение",
  high: "повышение",
};

export function search(entries: Entry[], query: string, scope: Scope): Match[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return entries.map((entry) => ({ entry, score: 0, where: [] }));

  const results: Match[] = [];
  for (const entry of entries) {
    const parts = Object.fromEntries(Object.entries(entryParts(entry)).map(([k, v]) => [k, normalize(v)]));
    const searchable =
      scope === "low" ? { low: parts.low } : scope === "high" ? { high: parts.high } : parts;
    const haystack = Object.values(searchable).join(" \u0000 ");
    if (!tokens.every((t) => haystack.includes(t))) continue;

    let score = 0;
    const where = new Set<string>();
    for (const [key, text] of Object.entries(searchable)) {
      for (const t of tokens) {
        if (text.includes(t)) {
          where.add(WHERE_LABELS[key]);
          score += key === "name" ? (normalize(entry.name).startsWith(t) ? 50 : 20) : 3;
        }
      }
    }
    results.push({ entry, score, where: [...where] });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Разбивает текст на куски для подсветки совпадений. */
export function highlight(text: string, tokens: string[]): Array<{ text: string; hit: boolean }> {
  if (!tokens.length || !text) return [{ text, hit: false }];
  const norm = normalize(text);
  const marks = new Array<boolean>(text.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    while (t && (from = norm.indexOf(t, from)) !== -1) {
      for (let i = from; i < from + t.length; i++) marks[i] = true;
      from += t.length;
    }
  }
  const out: Array<{ text: string; hit: boolean }> = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === marks[i]) last.text += text[i];
    else out.push({ text: text[i], hit: marks[i] });
  }
  return out;
}
