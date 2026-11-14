import { build } from 'esbuild';

// The preload runs sandboxed, so it must be a single CommonJS file that only requires "electron".
const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
};

await build({ ...shared, entryPoints: ['src/main.ts'], outfile: 'dist/main.js' });
await build({ ...shared, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.js' });
