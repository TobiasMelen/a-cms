import type { AstroIntegration } from "astro";
import react from "@astrojs/react";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { CMS_DIR, TEMPLATES_DIR, EDIT_PREFIX, API_PREFIX } from "./constants";

export type { Page, Content, PageReference } from "./data/types";
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
          addMiddleware,
          logger,
          isRestart,
        }) => {
          const root = config.root.pathname;

          const templatesDir = join(root, CMS_DIR, TEMPLATES_DIR);
          const templateIds = (await readdir(templatesDir))
            .filter((f) => f.endsWith(".astro"))
            .map((f) => f.replace(/\.astro$/, ""));

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

          if (!isRestart) {
            updateConfig({
              vite: {
                resolve: {
                  alias: {
                    "a-cms:repository": new URL("./data/flat-file.ts", import.meta.url).pathname,
                  },
                },
                plugins: [
                  {
                    name: "a-cms-virtual",
                    resolveId(id) {
                      if (id === "virtual:a-cms/templates")
                        return "\0virtual:a-cms/templates";
                    },
                    load(id) {
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
              entrypoint: new URL("./render/static.astro", import.meta.url),
            });

            if (options.enableEditUI) {
              addMiddleware({
                entrypoint: new URL("./middleware.ts", import.meta.url),
                order: "pre",
              });

              injectRoute({
                pattern: `${EDIT_PREFIX}/[...slug]`,
                entrypoint: new URL("./render/edit.astro", import.meta.url),
              });

              injectRoute({
                pattern: `${API_PREFIX}/[...path]`,
                entrypoint: new URL("./api/handler.ts", import.meta.url),
              });
            }
          }

          logger.info(`a-cms loaded (templates: ${templateIds.join(", ")})`);
        },
      },
    },
  ];
}
