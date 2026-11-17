#!/usr/bin/env node
// Builds the Android APKs with EAS, downloads them and saves them with the
// app version in the file name, because EAS always names downloads
// application-<build id>.apk. Run it with `pnpm release:android`.
//
// Usage:
//   pnpm release:android                     builds the preview APK (arm64 and 32-bit)
//   pnpm release:android --dry-run           prints the planned file name

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(rootDir, 'apps', 'app');
const outDir = path.join(rootDir, 'release', 'android');

/** EAS profile name to the suffix of the saved file name. Only the 52 MB build (arm64 + 32-bit) is published. */
const PROFILES = {
  preview: '',
};

function parseArgs(argv) {
  const options = { profiles: [], dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--profile') {
      i += 1;
      options.profiles.push(argv[i]);
    } else if (arg.startsWith('--profile=')) {
      options.profiles.push(arg.slice('--profile='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  for (const profile of options.profiles) {
    if (!Object.hasOwn(PROFILES, profile)) {
      throw new Error(
        `Unknown profile "${profile}". Use one of: ${Object.keys(PROFILES).join(', ')}.`,
      );
    }
  }
  if (options.profiles.length === 0) {
    options.profiles = Object.keys(PROFILES);
  }
  return options;
}

function fileNameFor(version, profile) {
  return `MemoryJournal-v${version}-android${PROFILES[profile]}.apk`;
}

async function readVersion() {
  const raw = await readFile(path.join(appDir, 'package.json'), 'utf8');
  const { version } = JSON.parse(raw);
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('apps/app/package.json has no version.');
  }
  return version;
}

function warnIfNotTagged(version) {
  try {
    const tag = execFileSync('git', ['describe', '--tags', '--exact-match', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (tag !== `v${version}`) {
      console.warn(`Warning: HEAD is tagged ${tag}, not v${version}.`);
    }
  } catch {
    console.warn(
      `Warning: HEAD is not tagged v${version}. Tag the release commit before building.`,
    );
  }
}

/** Starts an EAS build, waits for it to finish and returns its id and artifact URL. */
function runEasBuild(profile) {
  const command = [
    'npx',
    '--yes',
    'eas-cli',
    'build',
    '--platform',
    'android',
    '--profile',
    profile,
    '--json',
    '--non-interactive',
  ].join(' ');

  return new Promise((resolve, reject) => {
    // Progress goes to stderr and the JSON result to stdout.
    const child = spawn(command, {
      cwd: appDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`EAS build for "${profile}" exited with code ${code}.`));
        return;
      }
      try {
        resolve(parseBuildResult(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseBuildResult(stdout) {
  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end <= start) {
    throw new Error('EAS did not return a JSON build result.');
  }
  const [build] = JSON.parse(stdout.slice(start, end + 1));
  if (!build || build.status !== 'FINISHED') {
    throw new Error(`EAS build ended with status ${build?.status ?? 'unknown'}.`);
  }
  const url = build.artifacts?.buildUrl;
  if (typeof url !== 'string') {
    throw new Error(`EAS build ${build.id} has no downloadable artifact.`);
  }
  return { id: build.id, url };
}

/** Downloads a file and returns its SHA-256 as hex. */
async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with HTTP ${response.status}.`);
  }
  const hash = createHash('sha256');
  await pipeline(
    Readable.fromWeb(response.body),
    async function* hashing(source) {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    },
    createWriteStream(file),
  );
  return hash.digest('hex');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: pnpm release:android [--dry-run]');
    return;
  }

  const version = await readVersion();
  console.log(`Memory Journal v${version}`);

  if (options.dryRun) {
    for (const profile of options.profiles) {
      console.log(`${profile} -> ${path.join(outDir, fileNameFor(version, profile))}`);
    }
    return;
  }

  warnIfNotTagged(version);
  await mkdir(outDir, { recursive: true });

  const results = [];
  for (const profile of options.profiles) {
    console.log(`\nBuilding "${profile}" with EAS. This can take a while.`);
    const build = await runEasBuild(profile);
    const fileName = fileNameFor(version, profile);
    const file = path.join(outDir, fileName);
    console.log(`Downloading build ${build.id} as ${fileName}`);
    const sha256 = await download(build.url, file);
    const { size } = await stat(file);
    results.push({ fileName, sha256, megabytes: (size / 1024 / 1024).toFixed(1) });
  }

  const checksums = results.map((r) => `${r.sha256}  ${r.fileName}`).join('\n');
  await writeFile(path.join(outDir, 'SHA256SUMS.txt'), `${checksums}\n`);

  console.log(`\nSaved in ${outDir}`);
  for (const r of results) {
    console.log(`${r.fileName}  ${r.megabytes} MB`);
  }
  console.log(`\nSHA-256:\n${checksums}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
