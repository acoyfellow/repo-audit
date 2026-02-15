// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://repo-audit.coey.dev',
  output: 'server',
  adapter: cloudflare({
    // Avoid interactive Cloudflare account prompts during `astro dev`.
    // For Workers AI testing, use `npm run dev:cf` (wrangler remote dev).
    platformProxy: { enabled: false },
  }),
  integrations: [react(), tailwind(), sitemap()],
  // We don't use sessions in this app; keep dev/prod simple by avoiding KV bindings.
  session: { driver: 'memory' },
});
