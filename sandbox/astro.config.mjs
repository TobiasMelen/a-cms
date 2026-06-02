// @ts-check
import { defineConfig } from "astro/config";
import aCms from "a-cms";
import oxlint from "vite-plugin-oxlint";

// https://astro.build/config
export default defineConfig({
  integrations: [aCms({ enableEditUI: true })],
  vite: {
    plugins: [oxlint()],
  },
});
