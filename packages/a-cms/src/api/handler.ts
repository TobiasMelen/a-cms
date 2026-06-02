import type { APIRoute } from "astro";
import app from "./app";
import { API_PREFIX } from "../constants";

export const prerender = false;

export const ALL: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(API_PREFIX, "");
  return app.fetch(new Request(url, request));
};
