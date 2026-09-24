import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    server: {
      watch: {
        ignored: ['**/.npm-cache/**', '**/.pnpm-store/**', '**/.vercel/**', '**/.workbuddy/**', '**/test-results/**', '**/playwright-report/**'],
      },
    },
    build: {
      target: 'safari13',
    },
    resolve: {
      alias: {
        '@': new URL('.', import.meta.url).pathname,
      },
    },
  },
});
