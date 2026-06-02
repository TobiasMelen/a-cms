declare const __brand: unique symbol;
export type PageReference = string & { readonly [__brand]: "PageReference" };

export type Content<T extends Record<string, unknown> = Record<string, unknown>> = {
  versionId: string;
  contentId: PageReference;
  slug: string;
  sortKey: string;
  templateId: string;
  props: T;
  draft: boolean;
  published: boolean;
  created: string;
  updated: string;
  publishedDate: string | null;
};

export type Page<T extends Record<string, unknown> = Record<string, unknown>> = Content<T> & {
  name: string;
  parent: PageReference | null;
  children: PageReference[];
};

export interface ContentRepository {
  getAll(root: string, includeUnpublished?: boolean): Promise<Page[]>;
  getLatestDraft(root: string, contentId: PageReference): Promise<Page | null>;
  getPublishedVersion(root: string, contentId: PageReference): Promise<Page | null>;
  getByVersionId(root: string, versionId: string): Promise<Page | null>;
  getAllVersions(root: string, contentId: PageReference): Promise<Page[]>;
  move(
    root: string,
    contentId: PageReference,
    updates: { parentId?: PageReference | null; sortKey?: string }
  ): Promise<void>;
  update(
    root: string,
    versionId: string,
    updates: { props?: Record<string, unknown>; title?: string; slug?: string }
  ): Promise<string>;
  create(
    root: string,
    contentId: PageReference,
    templateId: string,
    updates: { props?: Record<string, unknown>; title?: string; slug?: string }
  ): Promise<string>;
  publish(root: string, versionId: string, contentId: string): Promise<void>;
  unpublish(root: string, versionId: string): Promise<void>;
  deleteVersion(root: string, versionId: string): Promise<void>;
}
