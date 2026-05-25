import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page, PageReference } from "./repository";
import { CMS_DIR, CONTENT_DIR } from "../constants";
import { uuid, sortKeyBetween } from "../utils";

export async function getAll(root: string): Promise<Page[]> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const pages: Page[] = [];
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      let needsWrite = false;
      if (!data.id) {
        data.id = uuid();
        needsWrite = true;
      }
      if (!data.sortKey) {
        data.sortKey = sortKeyBetween(null, null);
        needsWrite = true;
      }
      if (needsWrite) {
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
      }

      pages.push({
        id: data.id as PageReference,
        name: data.name,
        slug: data.slug,
        sortKey: data.sortKey,
        templateId: dir.name,
        parent: (data.parentId ?? null) as PageReference | null,
        children: [],
        props: data.props ?? {},
      });
    }
  }

  // Sort pages by sortKey so children arrays are ordered
  pages.sort((a, b) => a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

  for (const page of pages) {
    if (page.parent) {
      const parent = pages.find((p) => p.id === page.parent);
      if (parent) parent.children.push(page.id);
    }
  }

  return pages;
}

export async function update(
  root: string,
  id: PageReference,
  updates: { parentId?: PageReference | null; sortKey?: string; props?: Record<string, unknown> },
): Promise<void> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      if (data.id === id) {
        if ("parentId" in updates) data.parentId = updates.parentId;
        if ("sortKey" in updates) data.sortKey = updates.sortKey;
        if ("props" in updates) data.props = { ...data.props, ...updates.props };
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
        return;
      }
    }
  }
  throw new Error(`a-cms: page not found for id "${id}"`);
}
