import { AsyncLocalStorage } from "node:async_hooks";
import { EDIT_PREFIX } from "./constants";

type CmsContext = {
  editMode: boolean;
};

const storage = new AsyncLocalStorage<CmsContext>();

export function runInEditMode<T>(fn: () => T): T {
  return storage.run({ editMode: true }, fn);
}

export function getRoutePrefix(): string {
  return storage.getStore()?.editMode ? EDIT_PREFIX : "";
}
