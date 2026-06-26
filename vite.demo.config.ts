import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Dev server config for the interactive demo (separate from library build). */
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'demo'),
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: [resolve(__dirname)],
    },
  },
});
