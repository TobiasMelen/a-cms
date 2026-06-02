import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, PageReference } from "./data/types";
import { CMS_DIR, CONTENT_DIR } from "./constants";
import { getRoutePrefix } from "./context";
import { getAncestry } from "./routing";

function loadPages(): Page[] {
  const contentDir = join(process.cwd(), CMS_DIR, CONTENT_DIR);
  const pages: Page[] = [];
  const templateDirs = readdirSync(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = readdirSync(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(readFileSync(join(contentDir, dir.name, file), "utf-8"));
      pages.push({
        versionId: data.versionId,
        contentId: data.contentId,
        name: data.name,
        slug: data.slug,
        sortKey: data.sortKey,
        templateId: dir.name,
        parent: data.parentId ?? null,
        children: [],
        props: data.props ?? {},
        draft: !data.published,
        published: data.published,
        created: data.created,
        updated: data.updated,
        publishedDate: data.publishedDate ?? null,
      });
    }
  }

  pages.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  for (const page of pages) {
    if (page.parent) {
      const parent = pages.find((p) => p.contentId === page.parent);
      if (parent) parent.children.push(page.contentId);
    }
  }

  return pages;
}

export function resolve(ref: PageReference): Page {
  const pages = loadPages();
  const page = pages.find((p) => p.contentId === ref);
  if (!page) throw new Error(`a-cms: page not found for reference "${ref}"`);
  return page;
}

export function route(ref: PageReference): string {
  const pages = loadPages();
  const byContentId = new Map(pages.map((p) => [p.contentId, p]));
  const page = byContentId.get(ref);
  if (!page) throw new Error(`a-cms: page not found for reference "${ref}"`);
  const segments = getAncestry(page, byContentId)
    .map((p) => p.slug)
    .filter(Boolean);
  return getRoutePrefix() + "/" + segments.join("/");
}
