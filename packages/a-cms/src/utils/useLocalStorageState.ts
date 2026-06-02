import { useState, useEffect } from "react";
import { z } from "zod";

export function useLocalStorageState<T>(
  key: string | undefined,
  defaultValue: T,
  schema: z.ZodType<T>,
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined" || !key) return defaultValue;
    const raw = localStorage.getItem(key);
    return (raw && schema.safeParse(JSON.parse(raw))?.data) || defaultValue;
  });

  useEffect(() => {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
