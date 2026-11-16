import process from 'node:process';
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

// Build-time injection for the Google desktop sign-in client (used by CI releases).
// When a variable is not set while building, main.js still reads it from process.env at runtime.
// Google does not treat a desktop-app client secret as confidential.
const define = {};
for (const key of ['MJ_GOOGLE_DESKTOP_CLIENT_ID', 'MJ_GOOGLE_DESKTOP_CLIENT_SECRET']) {
  if (process.env[key]) define[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

await build({ ...shared, define, entryPoints: ['src/main.ts'], outfile: 'dist/main.js' });
await build({ ...shared, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.js' });
