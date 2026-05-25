import type { Page } from "./data/repository";

export function buildUrlMap(pages: Page[]): Map<string, Page> {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const urlMap = new Map<string, Page>();

  for (const page of pages) {
    const segments: string[] = [];
    let current: Page | undefined = page;
    while (current) {
      if (current.slug) segments.unshift(current.slug);
      current = current.parent ? byId.get(current.parent) : undefined;
    }
    urlMap.set(segments.join("/"), page);
  }

  return urlMap;
}
