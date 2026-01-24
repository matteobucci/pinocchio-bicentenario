// @ts-check
import { defineConfig } from 'astro/config';
import decapCmsOauth from 'astro-decap-cms-oauth';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [decapCmsOauth()],
  adapter: vercel(),
});