declare module "virtual:a-cms/templates" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  import type { ZodObject } from "zod";
  export const templates: Record<string, AstroComponentFactory>;
  export const schemas: Record<string, ZodObject<any>>;
}

declare module "astro:middleware" {
  import type { APIContext } from "astro";
  type MiddlewareNext = () => Promise<Response> | Response;
  type MiddlewareHandler = (context: APIContext, next: MiddlewareNext) => Promise<Response> | Response | Promise<void> | void;
  export function defineMiddleware(fn: MiddlewareHandler): MiddlewareHandler;
}

declare module "a-cms:repository" {
  import type { ContentRepository } from "./data/types";
  const repo: ContentRepository;
  export default repo;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
