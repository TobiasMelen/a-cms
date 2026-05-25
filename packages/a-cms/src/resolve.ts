import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, PageReference } from "./data/repository";
import { CACHE_DIR, CACHE_FILE } from "./constants";
import { getRoutePrefix } from "./context";

function loadPages(): Page[] {
  const raw = readFileSync(join(process.cwd(), CACHE_DIR, CACHE_FILE), "utf-8");
  return JSON.parse(raw);
}

export function resolve(ref: PageReference): Page {
  const pages = loadPages();
  const page = pages.find((p) => p.id === ref);
  if (!page) throw new Error(`a-cms: page not found for reference "${ref}"`);
  return page;
}

export function route(ref: PageReference): string {
  const pages = loadPages();
  const byId = new Map(pages.map((p) => [p.id, p]));
  const segments: string[] = [];
  let current = byId.get(ref);
  if (!current) throw new Error(`a-cms: page not found for reference "${ref}"`);
  while (current) {
    if (current.slug) segments.unshift(current.slug);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return getRoutePrefix() + "/" + segments.join("/");
}

export function findPageBySlug(slug: string): Page | null {
  const pages = loadPages();
  const byId = new Map(pages.map((p) => [p.id, p]));
  for (const page of pages) {
    const segments: string[] = [];
    let current: Page | undefined = page;
    while (current) {
      if (current.slug) segments.unshift(current.slug);
      current = current.parent ? byId.get(current.parent) : undefined;
    }
    if (segments.join("/") === slug) return page;
  }
  return null;
}

export function buildTree() {
  const pages = loadPages();
  const items: Record<string, { index: string; isFolder: boolean; children: string[]; data: string }> = {
    root: {
      index: "root",
      isFolder: true,
      children: pages.filter((p) => !p.parent).map((p) => p.id),
      data: "Pages",
    },
  };
  const urls: Record<string, string> = {};
  for (const p of pages) {
    items[p.id] = {
      index: p.id,
      isFolder: p.children.length > 0,
      children: p.children,
      data: p.name,
    };
    urls[p.id] = route(p.id as PageReference);
  }
  return { items, urls };
}
