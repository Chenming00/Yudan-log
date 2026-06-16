import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': new URL('.', import.meta.url).pathname,
      },
    },
  },
});
