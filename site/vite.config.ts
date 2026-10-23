import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 4317, strictPort: true },
  preview: { port: 4317, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
