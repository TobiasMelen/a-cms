import type { Falsy } from "./type-guards";

export function cn(...classes: (string | Falsy)[]) {
  return classes.filter(Boolean).join(" ");
}
