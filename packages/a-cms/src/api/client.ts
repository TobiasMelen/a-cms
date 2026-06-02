import { useMemo } from "react";
import { hc } from "hono/client";
import type { AppType } from "./app";
import { API_PREFIX } from "../constants";

export const useApiClient = () => {
  return useMemo(() => hc<AppType>(API_PREFIX), []);
};
