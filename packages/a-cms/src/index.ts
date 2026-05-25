import type { AstroIntegration } from "astro";
import react from "@astrojs/react";
import { join } from "node:path";
import { getAll } from "./data/flat-file";
import { refreshCache } from "./cache";
import { buildUrlMap } from "./routing";
import { CMS_DIR, TEMPLATES_DIR, EDIT_PREFIX, API_PREFIX } from "./constants";

export type { Page, PageReference } from "./data/repository";
export { resolve, route } from "./resolve";

type Options = {
  root?: string;
  enableEditUI?: boolean;
};

export default function aCms(
  options: Options = { enableEditUI: true },
): AstroIntegration[] {
  return [
    react(),
    {
      name: "a-cms",
      hooks: {
        "astro:config:setup": async ({
          config,
          injectRoute,
          updateConfig,
          addWatchFile,
          addMiddleware,
          logger,
        }) => {
          const root = options.root ?? config.root.pathname;

          const pages = await getAll(root);
          const urlMap = buildUrlMap(pages);
          const templatesDir = join(root, CMS_DIR, TEMPLATES_DIR);
          const templateIds = [...new Set(pages.map((p) => p.templateId))];

          await refreshCache(root);

          const routeData = Array.from(urlMap.entries()).map(
            ([slug, page]) => ({
              slug,
              page,
            }),
          );

          const templateImports = templateIds
            .map(
              (id, i) =>
                `import T${i}, { pageProps as S${i} } from "${join(templatesDir, `${id}.astro`)}";`,
            )
            .join("\n");
          const templateMap = templateIds
            .map((id, i) => `"${id}": T${i}`)
            .join(", ");
          const schemaMap = templateIds
            .map((id, i) => `"${id}": S${i}`)
            .join(", ");

          updateConfig({
            vite: {
              plugins: [
                {
                  name: "a-cms-virtual",
                  resolveId(id) {
                    if (id === "virtual:a-cms/routes")
                      return "\0virtual:a-cms/routes";
                    if (id === "virtual:a-cms/templates")
                      return "\0virtual:a-cms/templates";
                  },
                  load(id) {
                    if (id === "\0virtual:a-cms/routes") {
                      return `export const routes = ${JSON.stringify(routeData)};`;
                    }
                    if (id === "\0virtual:a-cms/templates") {
                      return `${templateImports}\nexport const templates = { ${templateMap} };\nexport const schemas = { ${schemaMap} };`;
                    }
                  },
                },
              ],
            },
          });

          injectRoute({
            pattern: "/[...slug]",
            entrypoint: join(import.meta.dirname, "pages", "[...slug].astro"),
          });

          if (options.enableEditUI) {
            addWatchFile(join(root, CMS_DIR, "content"));
            addMiddleware({
              entrypoint: join(import.meta.dirname, "middleware.ts"),
              order: "pre",
            });

            injectRoute({
              pattern: `${EDIT_PREFIX}/[...slug]`,
              entrypoint: join(
                import.meta.dirname,
                "pages",
                "edit",
                "[...slug].astro",
              ),
            });

            injectRoute({
              pattern: `${API_PREFIX}/move`,
              entrypoint: join(import.meta.dirname, "pages", "api", "move.ts"),
            });

            injectRoute({
              pattern: `${API_PREFIX}/save`,
              entrypoint: join(import.meta.dirname, "pages", "api", "save.ts"),
            });
          }

          logger.info(`a-cms loaded (templates: ${templateIds.join(", ")})`);
        },
      },
    },
  ];
}
