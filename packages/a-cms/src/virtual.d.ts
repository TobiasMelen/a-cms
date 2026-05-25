declare module "virtual:a-cms/routes" {
  import type { Page } from "a-cms";
  export const routes: { slug: string; page: Page }[];
}

declare module "virtual:a-cms/templates" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  import type { ZodObject } from "zod";
  export const templates: Record<string, AstroComponentFactory>;
  export const schemas: Record<string, ZodObject<any>>;
}
