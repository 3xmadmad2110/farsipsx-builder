// بازبستهبندی APK با فشردهسازیorrect:全部 فایلها فشرده میشوند مگر AndroidManifest.xml
// و کتابخانههای .so (که باید ذخیرهشده بمانند). بدون وابستگی به ابزار خارجی.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [, , extractedDir, outFile] = process.argv;
if (!extractedDir || !outFile) {
  console.error('usage: repack-zip.js <extracted-dir> <out.apk>');
  process.exit(2);
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function listFiles(dir, prefix = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + e.name : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, rel, out);
    else if (e.isFile()) out.push({ rel, full });
  }
  return out;
}

//.history ثابت و معتبر (1980-01-01)
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

const files = listFiles(extractedDir).filter(({ rel }) =>
  !/^META-INF\/(.*\.(SF|RSA|DSA|EC)|MANIFEST\.MF)$/i.test(rel)
);
files.sort((a, b) => (a.rel === 'AndroidManifest.xml' ? -1 : b.rel === 'AndroidManifest.xml' ? 1 : a.rel.localeCompare(b.rel)));

const locals = [];
const centrals = [];
let offset = 0;

for (const { rel, full } of files) {
  const name = Buffer.from(rel, 'utf8');
  const raw = fs.readFileSync(full);
  // Android 11+ requires resources.arsc stored uncompressed and 4-byte aligned.
  const store = rel === 'AndroidManifest.xml' || rel === 'resources.arsc' || /\.so$/i.test(rel);
  const data = store ? raw : zlib.deflateRawSync(raw, { level: 9 });
  const crc = crc32(raw);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(store ? 0 : 8, 8);
  lh.writeUInt16LE(DOS_TIME, 10);
  lh.writeUInt16LE(DOS_DATE, 12);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(data.length, 18);
  lh.writeUInt32LE(raw.length, 22);
  lh.writeUInt16LE(name.length, 26);
  lh.writeUInt16LE(0, 28);
  locals.push(lh, name, data);

  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0, 8);
  cd.writeUInt16LE(store ? 0 : 8, 10);
  cd.writeUInt16LE(DOS_TIME, 12);
  cd.writeUInt16LE(DOS_DATE, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(raw.length, 24);
  cd.writeUInt16LE(name.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(offset, 42);
  centrals.push(cd, name);

  offset += lh.length + name.length + data.length;
}

const cdSize = centrals.reduce((n, b) => n + b.length, 0);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cdSize, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const fd = fs.openSync(outFile, 'w');
let at = 0;
for (const b of [...locals, ...centrals, eocd]) {
  fs.writeSync(fd, b, 0, b.length, at);
  at += b.length;
}
fs.closeSync(fd);
console.log(`repacked ${files.length} entries -> ${outFile} (${at} bytes)`);
