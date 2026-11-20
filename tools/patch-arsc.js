// ویرایش رشتهها در resources.arsc باینری بدون ساختن مجدد R.java
// استفاده: node patch-arsc.js <resources.arsc> <oldLabel> <newLabel>
import fs from 'node:fs';

const [, , file, oldLabel, newLabel] = process.argv;
if (!file || !oldLabel || !newLabel) {
  console.error('usage: node patch-arsc.js <resources.arsc> <oldLabel> <newLabel>');
  process.exit(2);
}

const buf = fs.readFileSync(file);
const u16 = (o) => buf.readUInt16LE(o);
const u32 = (o) => buf.readUInt32LE(o);

if (u16(0) !== 0x0002) throw new Error('not an ARSC file');

// RES_TABLE_TYPE header is 12 bytes; the global string pool follows it.
const poolOff = 12;
if (u16(poolOff) !== 0x0001) throw new Error('global string pool not found');

const pSize = u32(poolOff + 4);
const count = u32(poolOff + 8);
const styleCount = u32(poolOff + 12);
const flags = u32(poolOff + 16);
const stringsStart = u32(poolOff + 20);
const isUtf8 = (flags & 0x100) !== 0;

function readVarLen(at) {
  let v = buf[at++] & 0xff;
  if (v & 0x80) v = ((v & 0x7f) << 8) | (buf[at++] & 0xff);
  return [v, at];
}

const entries = [];
for (let i = 0; i < count; i++) {
  const rel = u32(poolOff + 28 + i * 4);
  let at = poolOff + stringsStart + rel;
  let text;
  if (isUtf8) {
    // ARSC UTF-8 pool: first varint = UTF-16 length, second = UTF-8 byte length.
    const [, a1] = readVarLen(at);
    const [byteLen, a2] = readVarLen(a1);
    text = buf.toString('utf8', a2, a2 + byteLen);
  } else {
    const len = u16(at);
    text = buf.toString('utf16le', at + 2, at + 2 + len * 2);
  }
  entries.push(text);
}

const replaced = entries.filter((s) => s === oldLabel).length;
if (replaced === 0) {
  console.log(JSON.stringify({ ok: true, replaced: 0, strings: count }));
  process.exit(0);
}
for (let i = 0; i < entries.length; i++) if (entries[i] === oldLabel) entries[i] = newLabel;

const enc = (s) => {
  if (isUtf8) {
    const b = Buffer.from(s, 'utf8');
    const head = [];
    if (s.length < 0x80) head.push(s.length);
    else head.push((s.length >> 8) | 0x80, s.length & 0xff);
    if (b.length < 0x80) head.push(b.length);
    else head.push((b.length >> 8) | 0x80, b.length & 0xff);
    return Buffer.concat([Buffer.from(head), b, Buffer.from([0])]);
  }
  const b = Buffer.from(s, 'utf16le');
  const head = Buffer.alloc(2);
  head.writeUInt16LE(s.length, 0);
  return Buffer.concat([head, b, Buffer.from([0, 0])]);
};

const offsets = [];
const chunks = [];
let cursor = 0;
for (const text of entries) {
  offsets.push(cursor);
  const c = enc(text);
  chunks.push(c);
  cursor += c.length;
}
const pad = (4 - (cursor % 4)) % 4;
const data = Buffer.concat([...chunks, Buffer.alloc(pad)]);
const newPoolSize = 28 + count * 4 + data.length;
const newPool = Buffer.alloc(newPoolSize);
buf.copy(newPool, 0, poolOff, poolOff + 28);
newPool.writeUInt32LE(newPoolSize, 4);
newPool.writeUInt32LE(28 + count * 4, 20);
newPool.writeUInt32LE(styleCount ? 28 + count * 4 + data.length : 0, 24);
for (let i = 0; i < count; i++) newPool.writeUInt32LE(offsets[i], 28 + i * 4);
data.copy(newPool, 28 + count * 4);

const prefix = Buffer.alloc(poolOff);
buf.copy(prefix, 0, 0, poolOff);
const suffix = Buffer.alloc(buf.length - (poolOff + pSize));
buf.copy(suffix, 0, poolOff + pSize, buf.length);

const out = Buffer.concat([prefix, newPool, suffix]);
out.writeUInt32LE(out.length, 4);
fs.writeFileSync(file, out);
console.log(JSON.stringify({ ok: true, replaced, strings: count }));
