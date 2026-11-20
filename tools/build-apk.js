// ساخت APK نهایی از فایل بیس: تعویض پکیج، نام، آیکون + امضا
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const WIN = process.platform === 'win32';
const ext = (n) => WIN ? n + '.exe' : n;

// Every path is overridable by env vars so the same script runs locally (Windows)
// and inside the GitHub Actions Ubuntu runner.
const JBR = process.env.JAVA_HOME || (WIN ? 'C:\\Program Files\\Android\\Android Studio\\jbr' : '');
const JAVA = process.env.JAVA_BIN || path.join(JBR, 'bin', ext('java'));
const JAR = process.env.JAR_BIN || path.join(JBR, 'bin', ext('jar'));
const APKTOOL = path.join(ROOT, 'tools', 'apktool_3.0.3.jar');
const ANDROID_SDK = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || 'C:\\Android\\Sdk';
const BUILD_TOOLS = process.env.ANDROID_BUILD_TOOLS || path.join(ANDROID_SDK, 'build-tools', '36.0.0');
const ZIPALIGN = process.env.ZIPALIGN || path.join(BUILD_TOOLS, ext('zipalign'));
const APKSIGNER = process.env.APKSIGNER || path.join(BUILD_TOOLS, ext('apksigner'));
const PATCHER = path.join(ROOT, 'tools', 'patch-manifest.js');
const ARSC_PATCHER = path.join(ROOT, 'tools', 'patch-arsc.js');
const SIGNING_PROPS = process.env.SIGNING_PROPS ||
  'C:\\Users\\pc\\AndroidStudioProjects\\bully\\platforms\\android\\armsx2_keystore.properties';

function run(cmd, args, cwd) {
  const qarg = (a) => /\s/.test(String(a)) ? '"' + a + '"' : a;
  const env = {
    ...process.env,
    JAVA_HOME: JBR || process.env.JAVA_HOME || '',
    PATH: (JBR ? path.join(JBR, 'bin') + path.delimiter : '') + (process.env.PATH || '')
  };
  const r = spawnSync(qarg(cmd), args.map(qarg), {
    cwd, shell: true, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, env
  });
  const out = ((r.stdout || '') + '\n' + (r.stderr || '')).trim();
  if (r.status !== 0) throw new Error(cmd + ' failed (' + r.status + '):\n' + out.slice(-3000));
  return out;
}

function readSigning() {
  // On CI the keystore comes from GitHub Secrets instead of a local properties file.
  if (process.env.KEYSTORE_FILE && process.env.KEYSTORE_PASS) {
    return {
      ks: process.env.KEYSTORE_FILE,
      storePass: process.env.KEYSTORE_PASS,
      alias: process.env.KEY_ALIAS || 'farsipsx',
      keyPass: process.env.KEY_PASS || process.env.KEYSTORE_PASS
    };
  }
  const txt = fs.readFileSync(SIGNING_PROPS, 'utf8');
  const get = (k) => (txt.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
  const dir = path.dirname(SIGNING_PROPS);
  return {
    ks: path.join(dir, get('storeFile')),
    storePass: get('storePassword'),
    alias: get('keyAlias'),
    keyPass: get('keyPassword')
  };
}

function safe(s) { return s.replace(/[^a-zA-Z0-9._-]/g, '_'); }

function replaceIcons(decoded, iconBase64) {
  const icon = Buffer.from(iconBase64, 'base64');
  const found = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/ic_launcher.*\.png$/i.test(e.name)) { fs.writeFileSync(p, icon); found.push(p); }
    }
  };
  walk(path.join(decoded, 'res'));
  if (!found.length) throw new Error('هیچ آیکون ic_launcher در فایل بیس پیدا نشد');
  return found.length;
}

export function buildApk({ baseFile, packageName, appName, oldPackage, oldLabel, iconBase64 }) {
  const pkg = safe(packageName || '');
  if (!pkg || !pkg.includes('.')) throw new Error('package نامعتبر است');
  if (!fs.existsSync(baseFile)) throw new Error('فایل بیس پیدا نشد: ' + baseFile);

  const work = path.join(ROOT, 'work', pkg);
  const outDir = path.join(ROOT, 'out');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const log = [];
  let sourceApk = baseFile;

  if (iconBase64) {
    // apktool فقط برای پیدا کردن آیکونها با 이름 خوانا使用 میشود.
    // پکیج بعداً با پچ باینری عوض میشود تا R.java دستنخورده بماند.
    const decoded = path.join(work, 'decoded');
    log.push('decode for icon...');
    run(JAVA, ['-jar', APKTOOL, 'decode', '-f', '-o', decoded, baseFile], ROOT);
    log.push('icons replaced: ' + replaceIcons(decoded, iconBase64));
    sourceApk = path.join(work, 'rebuilt.apk');
    log.push('rebuild resources...');
    run(JAVA, ['-jar', APKTOOL, 'build', '-f', '-o', sourceApk, decoded], ROOT);
  } else {
    log.push('icon skipped (no file uploaded)');
  }

  const extracted = path.join(work, 'extracted');
  fs.mkdirSync(extracted, { recursive: true });
  log.push('extract...');
  // JDK's jar understands ZIP on both Windows and Linux; tar does not on Linux.
  run(JAR, ['-xf', path.resolve(ROOT, sourceApk)], extracted);

  const manifest = path.join(extracted, 'AndroidManifest.xml');
  if (!fs.existsSync(manifest)) throw new Error('AndroidManifest.xml داخل فایل بیس نیست');

  log.push('patch manifest...');
  log.push(run('node', [
    PATCHER, manifest,
    oldPackage || 'com.farsipsx.base', packageName,
    oldLabel || 'FarsiPSX', appName || packageName
  ], ROOT));

  // application-label در مانیفست به resource_id اشاره میکند؛ متن واقعی در resources.arsc است.
  const arsc = path.join(extracted, 'resources.arsc');
  if (fs.existsSync(arsc) && (oldLabel || 'FarsiPSX') !== (appName || packageName)) {
    log.push('patch resources.arsc...');
    log.push(run('node', [ARSC_PATCHER, arsc, oldLabel || 'FarsiPSX', appName || packageName], ROOT));
  }

  const zip = path.join(outDir, pkg + '.unsigned.zip');
  const unsigned = path.join(outDir, pkg + '.unsigned.apk');
  const aligned = path.join(outDir, pkg + '.aligned.apk');
  for (const f of [zip, unsigned, aligned]) fs.rmSync(f, { force: true });

  // فشردهسازی معمولی بهجز مانیفست و .so تا حجم APK زیر حد ۱۰۰ مگابایت بازار بماند.
  run('node', [path.join(ROOT, 'tools', 'repack-zip.js'), extracted, zip], ROOT);
  fs.copyFileSync(zip, unsigned);
  run(ZIPALIGN, ['-f', '4', unsigned, aligned], ROOT);

  const sign = readSigning();
  const final = path.join(outDir, pkg + '.apk');
  fs.rmSync(final, { force: true });
  run(APKSIGNER, [
    'sign', '--ks', sign.ks,
    '--ks-pass', 'pass:' + sign.storePass,
    '--key-pass', 'pass:' + sign.keyPass,
    '--out', final, aligned
  ], ROOT);

  log.push('verify...');
  log.push(run(APKSIGNER, ['verify', '--print-certs', final], ROOT).slice(-400));

  // پاک کردن فایلهای میانی
  for (const f of [zip, unsigned, aligned]) fs.rmSync(f, { force: true });

  return { ok: true, url: '/out/' + pkg + '.apk', file: final, log: log.join('\n') };
}
