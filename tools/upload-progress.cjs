// آپلود یک فایل با درصد پیشرفت قابل خواندن از فایل progress.
// اگر اتصال قطع شود یا پاسخ GitHub نرسد، چند بار自动 تلاش میکند.
// node tools/upload-progress.cjs <tag> <assetName> <localFile> <progressFile>
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const TOKEN = fs.readFileSync(path.join(ROOT, 'data/gh-token.txt'), 'utf8').trim();
const REPO = '3xmadmad2110/farsipsx-builder';
const [tag, name, localFile, progressFile] = process.argv.slice(2);
if (!tag || !name || !localFile || !progressFile) {
  console.error('usage: node tools/upload-progress.cjs <tag> <assetName> <localFile> <progressFile>');
  process.exit(2);
}
const size = fs.statSync(localFile).size;
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'farsipsx-upload'
};
const writeProgress = (done, attempt) => {
  fs.writeFileSync(progressFile,
    `${(done * 100 / size).toFixed(1)}% ${done}/${size} ${name}` +
    `${attempt > 1 ? ` (تلاش ${attempt})` : ''}\n`);
};
const note = (s) => fs.appendFileSync(progressFile, s + '\n');

async function getRelease() {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${encodeURIComponent(tag)}`, { headers: H });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rel = await res.json();
      if (!rel.id) throw new Error('release not found');
      return rel;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

function upload(rel, attempt) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'uploads.github.com',
      path: `/repos/${REPO}/releases/${rel.id}/assets?name=${encodeURIComponent(name)}`,
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/octet-stream', 'Content-Length': size }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        writeProgress(size, attempt);
        note(`RESPONSE ${res.statusCode} ${body.slice(0, 160)}`);
        if (res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode));
        let url;
        try { url = JSON.parse(body).browser_download_url; } catch { /* proxy without body */ }
        resolve(url || `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(name)}`);
      });
      res.on('aborted', () => reject(new Error('response aborted')));
    });
    req.on('error', reject);
    let done = 0;
    fs.createReadStream(localFile)
      .on('data', (c) => {
        done += c.length;
        if (done % (1024 * 1024) < c.length || done === size) writeProgress(done, attempt);
      })
      .on('error', reject)
      .pipe(req);
  });
}

(async () => {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      fs.writeFileSync(progressFile, '');
      const rel = await getRelease();
      const existing = (rel.assets || []).find((a) => a.name === name);
      if (existing) {
        await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${existing.id}`, {
          method: 'DELETE', headers: H
        }).catch(() => {});
      }
      const url = await upload(rel, attempt);
      note('DONE ' + url);
      console.log('DONE ' + url);
      return;
    } catch (e) {
      note(`RETRY ${attempt}: ${e.message}`);
      if (attempt === 4) { process.exitCode = 1; return; }
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
})().catch((e) => { note('ERROR ' + e.message); process.exitCode = 1; });
