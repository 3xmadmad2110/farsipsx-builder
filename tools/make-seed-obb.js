/**
 * Creates the small "seed/manifest" OBB that lives at:
 *   Android/obb/<package>/main.<versionCode>.<package>.obb
 *
 * The app reads this seed, downloads the real game from gameUrl, then rewrites the
 * same OBB as: [game bytes][BIOS bytes][8-byte LE BIOS size]["FPSXBIOS"].
 *
 * Usage (PowerShell / cmd):
 *   node tools/make-seed-obb.js --game https://HOST/game.bin --console PS1 \
 *        --bios C:\bios\scph1001.bin --out out/bully-manifest.obb
 *
 * Or reference a hosted BIOS instead of embedding it:
 *   node tools/make-seed-obb.js --game https://HOST/game.bin --console PS2 \
 *        --bios-url https://HOST/bios/ps2.bin --out out/sh2-manifest.obb
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const gameUrl = arg('game');
const consoleType = (arg('console', 'PS1')).toUpperCase();
const biosFile = arg('bios');
const biosUrl = arg('bios-url');
const out = arg('out', 'manifest.obb');

if (!gameUrl) {
  console.error('Missing --game <url>');
  process.exit(1);
}
if (!biosFile && !biosUrl) {
  console.error('Provide either --bios <file> or --bios-url <url>');
  process.exit(1);
}

const seed = {
  gameUrl,
  console: consoleType,
  biosUrl: biosUrl || '',
  bios: biosFile ? fs.readFileSync(biosFile).toString('base64') : ''
};

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(seed));

console.log(`wrote ${out} (${fs.statSync(out).size} bytes, console=${consoleType})`);
console.log('Upload it next to game.obb as: manifest.obb');
