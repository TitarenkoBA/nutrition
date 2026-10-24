// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// Адрес сайта на GitHub Pages вычисляется из имени репозитория:
// owner/repo           -> https://owner.github.io/repo/
// owner/owner.github.io -> https://owner.github.io/
// Локально можно переопределить через SITE и BASE.
const [owner = "user", repo = "site"] = (process.env.GITHUB_REPOSITORY || "").split("/");
const isUserPage = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;

const site = process.env.SITE || `https://${owner.toLowerCase()}.github.io`;
const base = process.env.BASE ?? (process.env.GITHUB_REPOSITORY && !isUserPage ? `/${repo}` : "/");

// В статьях блога ссылки пишутся от корня сайта ("/anketa/").
// На GitHub Pages сайт живёт в подпапке, поэтому добавляем к ним base.
function rehypeBaseLinks() {
  const prefix = base.replace(/\/$/, "");
  /** @param {any} node */
  const walk = (node) => {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties?.href;
      if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) {
        node.properties.href = prefix + href;
      }
    }
    if (node.type === "element" && node.tagName === "a") {
      const href = String(node.properties?.href || "");
      if (/^https?:\/\//.test(href)) {
        node.properties.target = "_blank";
        node.properties.rel = "noopener noreferrer";
      }
    }
    node.children?.forEach(walk);
  };
  return (/** @type {any} */ tree) => walk(tree);
}

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  markdown: {
    rehypePlugins: [rehypeBaseLinks],
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !/\/(kabinet|admin)\//.test(page),
    }),
  ],
  image: {
    // AVIF не используем: достаточно WebP, и так меньше нагрузки на сборку.
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
