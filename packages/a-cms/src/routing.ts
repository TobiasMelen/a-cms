import type { Page, PageReference } from "./data/types";

export function getAncestry(
  page: Page,
  byContentId: Map<PageReference, Page>,
): Page[] {
  const ancestry: Page[] = [];
  const visited = new Set<PageReference>();
  let current: Page | undefined = page;
  while (current) {
    if (visited.has(current.contentId)) {
      throw new Error(
        `a-cms: circular parent reference at "${current.contentId}"`,
      );
    }
    visited.add(current.contentId);
    ancestry.unshift(current);
    current = current.parent ? byContentId.get(current.parent) : undefined;
  }
  return ancestry;
}

export function buildUrlMap(pages: Page[]): Map<string, Page> {
  const byContentId = new Map(pages.map((p) => [p.contentId, p]));
  const urlMap = new Map<string, Page>();
  for (const page of pages) {
    const segments = getAncestry(page, byContentId)
      .map((p) => p.slug)
      .filter(Boolean);
    urlMap.set(segments.join("/"), page);
  }
  return urlMap;
}
