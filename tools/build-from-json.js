// Entry point used by GitHub Actions: reads a JSON build request and builds/signs the APK.
import fs from 'node:fs';
import { buildApk } from './build-apk.js';

const file = process.argv[2] || 'build-input.json';
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = buildApk(b);

console.log(r.log);
console.log('APK_FILE=' + r.file);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `apk_file=${r.file}\n`);
}
