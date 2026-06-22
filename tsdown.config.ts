import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'date-fns'],
  platform: 'neutral',
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.mjs' : '.cjs',
    };
  },
  hooks: {
    'build:done': async () => {
      await copyFile(
        resolve('src/styles/gantt.css'),
        resolve('dist/styles.css'),
      );
    },
  },
});
