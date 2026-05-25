import { defineMiddleware } from "astro:middleware";
import { runInEditMode } from "./context";
import { EDIT_PREFIX } from "./constants";

export const onRequest = defineMiddleware((ctx, next) => {
  if (ctx.url.pathname.startsWith(EDIT_PREFIX)) {
    return runInEditMode(() => next());
  }
  return next();
});
