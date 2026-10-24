import type { APIRoute } from "astro";

// Конфигурация админки (Sveltia / Decap CMS). Генерируется при сборке, чтобы
// имя репозитория подставлялось автоматически из GitHub Actions.
// YAML — надмножество JSON, поэтому отдаём JSON.

const repo = process.env.GITHUB_REPOSITORY || "OWNER/REPO";
const branch = process.env.CMS_BRANCH || "master";

const photoField = (name: string, label: string) => ({
  name,
  label,
  widget: "image",
  required: false,
  media_folder: "/src/assets/photos",
  public_folder: "/src/assets/photos",
  hint: "Фото хранятся в src/assets/photos и автоматически сжимаются при сборке.",
});

const config = {
  backend: { name: "github", repo, branch, commit_messages: { create: "Новая статья: {{slug}}", update: "Правка: {{slug}}", delete: "Удаление: {{slug}}" } },
  media_folder: "/src/assets/blog",
  public_folder: "../../assets/blog",
  site_url: "../",
  display_url: "../",
  slug: { encoding: "ascii", clean_accents: true, sanitize_replacement: "-" },
  collections: [
    {
      name: "blog",
      label: "Блог",
      label_singular: "статью",
      folder: "src/content/blog",
      create: true,
      extension: "md",
      format: "frontmatter",
      slug: "{{slug}}",
      summary: "{{title}} — {{date}}",
      sortable_fields: ["date", "title"],
      media_folder: "/src/assets/blog",
      public_folder: "../../assets/blog",
      fields: [
        { name: "title", label: "Заголовок", widget: "string" },
        { name: "description", label: "Краткое описание", widget: "text", required: false, hint: "1–2 предложения: показываются в карточке статьи и в поисковиках." },
        { name: "date", label: "Дата", widget: "datetime", format: "YYYY-MM-DD", time_format: false },
        { name: "cover", label: "Обложка", widget: "image", required: false },
        { name: "coverAlt", label: "Описание обложки", widget: "string", required: false, hint: "Что изображено — для незрячих читателей и поисковиков." },
        { name: "tags", label: "Темы", widget: "list", required: false, default: [] },
        { name: "draft", label: "Черновик (не публиковать)", widget: "boolean", default: false, required: false },
        { name: "body", label: "Текст статьи", widget: "markdown", hint: "Ссылки на страницы сайта пишите от корня: /anketa/, /blog/" },
      ],
    },
    {
      name: "site",
      label: "Страницы сайта",
      files: [
        {
          name: "settings",
          label: "Контакты и общие настройки",
          file: "src/content/site/settings.json",
          fields: [
            { name: "ownerName", label: "Имя (в шапке и подвале)", widget: "string" },
            { name: "role", label: "Специализация", widget: "string" },
            { name: "siteTitle", label: "Заголовок сайта (вкладка браузера, поисковики)", widget: "string" },
            { name: "description", label: "Описание сайта для поисковиков", widget: "text" },
            { name: "telegram", label: "Telegram (логин без @)", widget: "string", hint: "Сюда клиенты отправляют анкету." },
            { name: "email", label: "E-mail", widget: "string" },
            { name: "phone", label: "Телефон", widget: "string", required: false },
            { name: "instagram", label: "Ссылка на Instagram", widget: "string", required: false },
            { name: "city", label: "Город / формат работы", widget: "string" },
            { name: "responseTime", label: "Срок ответа", widget: "string" },
            { name: "disclaimer", label: "Медицинский дисклеймер (подвал)", widget: "text" },
          ],
        },
        {
          name: "home",
          label: "Главная страница",
          file: "src/content/site/home.json",
          fields: [
            {
              name: "hero",
              label: "Первый экран",
              widget: "object",
              fields: [
                { name: "eyebrow", label: "Надзаголовок", widget: "string" },
                { name: "title", label: "Заголовок", widget: "string" },
                { name: "text", label: "Текст", widget: "text" },
                { name: "primaryCta", label: "Главная кнопка", widget: "string" },
                { name: "secondaryCta", label: "Вторая кнопка", widget: "string" },
                photoField("photo", "Фото"),
                { name: "badges", label: "Преимущества под кнопками", widget: "list" },
              ],
            },
            {
              name: "help",
              label: "С чем помогу",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                { name: "intro", label: "Вступление", widget: "text" },
                photoField("photo", "Фото"),
                {
                  name: "items",
                  label: "Карточки",
                  widget: "list",
                  fields: [
                    { name: "title", label: "Заголовок", widget: "string" },
                    { name: "text", label: "Текст", widget: "text" },
                  ],
                },
              ],
            },
            {
              name: "about",
              label: "Обо мне",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                photoField("photo", "Фото"),
                { name: "text", label: "Текст (абзацы через пустую строку)", widget: "text" },
                {
                  name: "facts",
                  label: "Цифры",
                  widget: "list",
                  fields: [
                    { name: "value", label: "Значение", widget: "string" },
                    { name: "label", label: "Подпись", widget: "string" },
                  ],
                },
              ],
            },
            {
              name: "process",
              label: "Как проходит работа",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                photoField("photo", "Фото"),
                {
                  name: "steps",
                  label: "Шаги",
                  widget: "list",
                  fields: [
                    { name: "title", label: "Название", widget: "string" },
                    { name: "text", label: "Описание", widget: "text" },
                  ],
                },
              ],
            },
            {
              name: "results",
              label: "Что вы получите",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                photoField("photo", "Фото"),
                { name: "text", label: "Текст", widget: "text" },
                { name: "items", label: "Пункты", widget: "list" },
              ],
            },
            {
              name: "services",
              label: "Форматы работы и цены",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                { name: "intro", label: "Вступление", widget: "text" },
                {
                  name: "items",
                  label: "Форматы",
                  widget: "list",
                  fields: [
                    { name: "title", label: "Название", widget: "string" },
                    { name: "duration", label: "Длительность", widget: "string" },
                    { name: "price", label: "Цена", widget: "string", required: false, hint: "Пусто — покажется «Стоимость — по запросу»." },
                    { name: "features", label: "Что входит", widget: "list" },
                    { name: "highlighted", label: "Выделить как популярный", widget: "boolean", required: false },
                  ],
                },
              ],
            },
            {
              name: "testimonials",
              label: "Отзывы",
              widget: "object",
              hint: "Блок появится на сайте, когда будет добавлен хотя бы один отзыв. Публикуйте только реальные отзывы с согласия клиентов.",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                {
                  name: "items",
                  label: "Отзывы",
                  widget: "list",
                  required: false,
                  fields: [
                    { name: "name", label: "Имя клиента", widget: "string" },
                    { name: "text", label: "Текст отзыва", widget: "text" },
                  ],
                },
              ],
            },
            {
              name: "faq",
              label: "Частые вопросы",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                {
                  name: "items",
                  label: "Вопросы",
                  widget: "list",
                  fields: [
                    { name: "q", label: "Вопрос", widget: "string" },
                    { name: "a", label: "Ответ", widget: "text" },
                  ],
                },
              ],
            },
            {
              name: "cta",
              label: "Блок «Начнём с анкеты»",
              widget: "object",
              fields: [
                { name: "title", label: "Заголовок", widget: "string" },
                { name: "text", label: "Текст", widget: "text" },
                photoField("photo", "Фото"),
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(config, null, 2), {
    headers: { "Content-Type": "application/yaml; charset=utf-8" },
  });
