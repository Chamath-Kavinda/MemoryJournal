import { existsSync } from 'node:fs';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
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

// Build-time injection for the Google desktop sign-in client (used by CI releases and by local
// installer builds). Values set in the shell win; otherwise apps/desktop/.env is read here, because
// a packaged app cannot see that file at runtime (main.ts only reads it in development).
// When a variable is still not set, main.js reads it from process.env at runtime.
// Google does not treat a desktop-app client secret as confidential.
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const define = {};
for (const key of ['MJ_GOOGLE_DESKTOP_CLIENT_ID', 'MJ_GOOGLE_DESKTOP_CLIENT_SECRET']) {
  if (process.env[key]) define[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

await build({ ...shared, define, entryPoints: ['src/main.ts'], outfile: 'dist/main.js' });
await build({ ...shared, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.js' });
