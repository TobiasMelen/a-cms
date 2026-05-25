// @ts-check
import { defineConfig } from 'astro/config';
import aCms from 'a-cms';

// https://astro.build/config
export default defineConfig({
  integrations: [aCms({enableEditUI: true})],
});
