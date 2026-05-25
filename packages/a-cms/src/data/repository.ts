declare const __brand: unique symbol;
export type PageReference = string & { readonly [__brand]: "PageReference" };

export type Page<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: PageReference;
  name: string;
  slug: string;
  sortKey: string;
  templateId: string;
  parent: PageReference | null;
  children: PageReference[];
  props: T;
};
