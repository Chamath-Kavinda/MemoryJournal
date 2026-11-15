// Writes the placeholder tray icons: apps/desktop/assets/tray.png (16x16) and tray@2x.png (32x32).
// Run with `node scripts/make-tray-icons.mjs`. Replace the PNGs with the real artwork whenever it
// exists; Electron picks tray@2x.png on high-density screens by its name.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { mkdirSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';
import { deflateSync } from 'node:zlib';

const ACCENT = [79, 70, 229];
const WHITE = [255, 255, 255];
const SUPERSAMPLE = 4;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A filled circle with a white dot in the middle, smoothed by supersampling. */
function pixel(x, y, size) {
  let covered = 0;
  let white = 0;
  for (let sy = 0; sy < SUPERSAMPLE; sy++) {
    for (let sx = 0; sx < SUPERSAMPLE; sx++) {
      const px = x + (sx + 0.5) / SUPERSAMPLE - size / 2;
      const py = y + (sy + 0.5) / SUPERSAMPLE - size / 2;
      const distance = Math.hypot(px, py);
      if (distance <= size * 0.47) {
        covered++;
        if (distance <= size * 0.18) white++;
      }
    }
  }
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  if (covered === 0) return [0, 0, 0, 0];
  const mix = white / covered;
  const color = ACCENT.map((channel, i) => Math.round(channel + (WHITE[i] - channel) * mix));
  return [...color, Math.round((covered / samples) * 255)];
}

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (let x = 0; x < size; x++) row.push(...pixel(x, y, size));
    rows.push(Buffer.from(row));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/tray.png', import.meta.url), png(16));
writeFileSync(new URL('../assets/tray@2x.png', import.meta.url), png(32));
console.log('Wrote assets/tray.png and assets/tray@2x.png');
