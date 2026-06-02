import { defineMiddleware } from "astro:middleware";
import { runInEditMode } from "./context";
import { repositoryContext } from "./data/context";
import { repoImpl } from "./data/repository";
import { EDIT_PREFIX } from "./constants";

export const onRequest = defineMiddleware((ctx, next) => {
  const runWithRepo = () => repositoryContext.run(repoImpl, next);

  if (ctx.url.pathname.startsWith(EDIT_PREFIX)) {
    return runInEditMode(runWithRepo);
  }
  return runWithRepo();
});
