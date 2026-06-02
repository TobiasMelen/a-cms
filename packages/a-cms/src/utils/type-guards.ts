export type Falsy = null | undefined | false | 0 | "";

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export function isNonFalsy<T>(value: T | Falsy): value is T {
  return Boolean(value);
}
