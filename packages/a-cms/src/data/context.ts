import { AsyncLocalStorage } from "node:async_hooks";
import type { ContentRepository } from "./types";

export const repositoryContext = new AsyncLocalStorage<ContentRepository>();
