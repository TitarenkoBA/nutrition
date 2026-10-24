import type { ImageMetadata } from "astro";
import settings from "../content/site/settings.json";

export { settings };

/** Ссылка внутри сайта с учётом base (подпапки на GitHub Pages). */
export function url(path = "/"): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

/** Логин Telegram без @ и без ссылки — на случай, если в админке вставили t.me/... */
export function telegramUsername(value = settings.telegram): string {
  return value
    .trim()
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

export function telegramLink(text?: string): string {
  const user = telegramUsername();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://t.me/${user}${query}`;
}

export function mailtoLink(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  // URLSearchParams кодирует пробелы как "+", почтовые клиенты ждут %20.
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${settings.email.trim()}${query ? `?${query}` : ""}`;
}

const photos = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*.{jpg,jpeg,png,webp}", {
  eager: true,
});

/**
 * Фото из src/assets/photos по имени файла. CMS может сохранить полный путь,
 * поэтому берём только имя файла.
 */
export function photo(name: string | undefined): ImageMetadata | undefined {
  if (!name) return undefined;
  const file = name.split("/").pop();
  const entry = Object.entries(photos).find(([path]) => path.endsWith(`/${file}`));
  return entry?.[1].default;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Абзацы из текста с пустыми строками между ними (так удобно редактировать в CMS). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
