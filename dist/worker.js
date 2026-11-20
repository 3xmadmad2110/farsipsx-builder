
const ADMIN_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>پنل مدیریت بازیها</title>
<style>
  :root { --bg:#08080a; --panel:#141418; --line:#26262d; --red:#e60012; --txt:#f2f2f4; --dim:#8b8b95; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--txt); font:14px/1.6 system-ui,Tahoma,sans-serif; }
  header { display:flex; align-items:center; gap:14px; padding:14px 22px; border-bottom:1px solid var(--line); background:#101014; }
  header .dot { width:11px; height:11px; border-radius:50%; background:var(--red); box-shadow:0 0 12px var(--red); }
  header h1 { font-size:17px; margin:0; font-weight:600; }
  #status { margin-right:auto; color:var(--dim); font-size:12px; }
  .wrap { display:flex; min-height:calc(100vh - 53px); }
  nav { width:210px; flex:none; border-left:1px solid var(--line); background:#0d0d10; padding:14px 10px; }
  nav button { display:block; width:100%; text-align:right; padding:10px 14px; margin:3px 0; border:0; border-radius:8px; background:transparent; color:var(--dim); cursor:pointer; font:inherit; }
  nav button:hover { background:#1a1a20; color:var(--txt); }
  nav button.active { background:var(--red); color:#fff; }
  main { flex:1; padding:22px 28px; max-width:1000px; }
  section { display:none; }
  section.active { display:block; }
  h2 { font-size:19px; margin:0 0 6px; }
  .hint { color:var(--dim); font-size:12px; margin-bottom:14px; }
  textarea { width:100%; height:52vh; background:var(--panel); color:#d8d8de; border:1px solid var(--line); border-radius:10px; padding:14px; font:12px/1.5 Consolas,monospace; direction:ltr; text-align:left; }
  .bar { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
  button.act { padding:9px 16px; border:0; border-radius:8px; background:var(--red); color:#fff; cursor:pointer; font:inherit; }
  button.act.alt { background:#26262e; color:var(--txt); }
  pre { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; font-size:12px; direction:ltr; text-align:left; overflow:auto; white-space:pre-wrap; }
  label { display:block; margin:8px 0 4px; color:var(--dim); font-size:12px; }
  input[type=text], select { width:100%; padding:9px 12px; background:var(--panel); color:var(--txt); border:1px solid var(--line); border-radius:8px; font:inherit; }
  input[type=file] { color:var(--dim); font-size:12px; }
  a.dl { display:inline-block; margin-top:12px; padding:10px 16px; background:#1d7a3d; color:#fff; border-radius:8px; text-decoration:none; }
</style>
</head>
<body>
<header><span class="dot"></span><h1>پنل مدیریت بازیها — FarsiPSX</h1><span id="status">...</span></header>
<div class="wrap">
<nav>
  <button data-sec="games" class="active">بازیها</button>
  <button data-sec="servers">لینکهای چندسروره</button>
  <button data-sec="appearance">ظاهر</button>
  <button data-sec="texts">متنها</button>
  <button data-sec="messages">پیغامها</button>
  <button data-sec="templates">قالبها</button>
  <button data-sec="builder">ساخت APK</button>
  <button data-sec="publish">انتشار</button>
</nav>
<main>
  <section data-sec="games" class="active"><h2>بازیها</h2><div class="hint">کلید هر بازی اسم پکیج آن است. فقط همین لیست توسط تمام APKها خوانده میشود.</div><textarea id="games"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="servers"><h2>لینکهای چندسروره</h2><div class="hint">الویت عددی: کمتر = زودتر امتحان میشود.</div><textarea id="servers"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="appearance"><h2>ظاهر</h2><div class="hint">رنگها و تم پلیاستیشن. بدون APK جدید، با انتشار به All برنامهها میرسد.</div><textarea id="appearance"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="texts"><h2>متنها</h2><div class="hint">رشتههای قابل ویرایش (فارسی / انگلیسی).</div><textarea id="texts"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="messages"><h2>پیغامها</h2><div class="hint">پیغام قفل بازار و نصب غیربازار.</div><textarea id="messages"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="templates"><h2>قالبها / ساخت APK</h2><div class="hint">قالب = آرشیو سورس Gradle مخصوص PS1 / PS2 داخل R2. ساخت واقعی بعد از تعیین build runner فعال میشود.</div><textarea id="templates"></textarea>
    <div class="bar"><button class="act" onclick="saveDraft()">ذخیره پیشنویس</button></div></section>

  <section data-sec="builder"><h2>ساخت APK از فایل بیس</h2>
    <div class="hint">فقط لوگو، اسم و پکیج عوض میشود؛ خروجی امضاشده همینجا تحویل داده میشود. فایل بیس را در پوشهٔ <code>base/</code> قرار دهید.</div>
    <label>فایل بیس</label><select id="baseFile"></select>
    <label>هسته شبیهساز</label><select id="emulator"><option value="PS1">PS1 (DuckStation)</option><option value="PS2" selected>PS2 (PCSX2)</option></select>
    <label>پکیج جدید (مثلاً com.farsipsx.bully)</label><input type="text" id="newPackage" value="com.farsipsx.bully">
    <label>اسم برنامه</label><input type="text" id="newName" value="Bully">
    <label>پکیج فایل بیس</label><input type="text" id="oldPackage" value="com.farsipsx.base">
    <label>اسم داخل فایل بیس</label><input type="text" id="oldLabel" value="FarsiPSX">
    <label>آیکون جدید (PNG) — فقط برای ساخت محلی</label><input type="file" id="iconFile" accept="image/png">
    <label>آدرس آیکون PNG (برای ساخت آنلاین)</label><input type="text" id="iconUrl" placeholder="https://.../icon.png">
    <div class="bar"><button class="act" onclick="buildApkLocal()">ساخت و تحویل APK</button><button class="act alt" onclick="loadStatus()">بازخوانی فایلها</button></div>
    <div id="apkLink"></div><pre id="buildLog" style="margin-top:12px">—</pre></section>

  <section data-sec="publish"><h2>انتشار</h2><div class="hint">پیشنویس را به config.json عمومی منتشر میکند. تمام APKها بلافاصله آپدیت میشوند.</div>
    <div class="bar"><button class="act" onclick="publish()">انتشار</button><button class="act alt" onclick="loadLive()">نمایش نسخه زنده</button></div>
    <pre id="live" style="margin-top:14px">—</pre></section>
</main>
</div>
<script>
var token = new URLSearchParams(location.search).get('token') || '';
var H = token ? { 'X-Admin-Token': token } : {};
var cfg = null;
var keys = ['games','servers','appearance','texts','messages','templates'];
function q(id) { return document.getElementById(id); }
function show(id) {
  document.querySelectorAll('section').forEach(function(s){ s.classList.toggle('active', s.dataset.sec === id); });
  document.querySelectorAll('nav button').forEach(function(b){ b.classList.toggle('active', b.dataset.sec === id); });
}
document.querySelectorAll('nav button').forEach(function(b){ b.onclick = function(){ show(b.dataset.sec); }; });
function fill(c) {
  cfg = c;
  keys.forEach(function(k){ q(k).value = JSON.stringify(c[k] || {}, null, 2); });
  q('status').textContent = 'پیشنویس بارگذاری شد';
}
function load() {
  fetch('/api/draft', { headers:H }).then(function(r){ return r.json(); }).then(fill)
    .catch(function(e){ q('status').textContent = 'خطا: ' + e.message; });
}
function collect() {
  var out = {};
  for (var i=0; i<keys.length; i++) {
    try { out[keys[i]] = JSON.parse(q(keys[i]).value); }
    catch (e) { alert('JSON نامعتبر در بخش: ' + keys[i]); return null; }
  }
  return out;
}
function saveDraft() {
  var body = collect(); if (!body) return;
  fetch('/api/draft', { method:'PUT', headers:Object.assign({'Content-Type':'application/json'}, H), body:JSON.stringify(body) })
    .then(function(r){ return r.json(); }).then(function(r){ q('status').textContent = r.ok ? 'ذخیره شد' : (r.error || 'خطا'); });
}
function publish() {
  fetch('/api/publish', { method:'POST', headers:H }).then(function(r){ return r.json(); })
    .then(function(r){ q('status').textContent = r.ok ? 'منتشر شد: ' + r.publishedAt : (r.error || 'خطا'); });
}
function loadLive() {
  fetch('/api/live').then(function(r){ return r.json(); }).then(function(c){ q('live').textContent = JSON.stringify(c, null, 2); });
}
function loadStatus() {
  fetch('/api/status').then(function(r){ return r.json(); }).then(function(s){
    var sel = q('baseFile'); sel.innerHTML = '';
    var list = s.bases.length ? s.bases : ['base.apk'];
    list.forEach(function(f){ var o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o); });
    q('status').textContent = 'آماده: ' + list.join(', ');
  });
}
function readIcon() {
  return new Promise(function(resolve){
    var f = q('iconFile').files[0];
    if (!f) return resolve(null);
    var r = new FileReader();
    r.onload = function(){ resolve(String(r.result).split(',')[1]); };
    r.readAsDataURL(f);
  });
}
function isOnline() {
  return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
}
function pollBuild(url, tries) {
  if (tries <= 0) {
    q('status').textContent = 'زمان پیگیری بیلد تمام شد — لینک Release را چک کنید';
    return;
  }
  fetch(url, { headers:H }).then(function(r){ return r.json(); }).then(function(s){
    if (s.status === 'done') {
      q('status').textContent = 'APK آماده شد';
      q('apkLink').innerHTML = '<a class="dl" href="' + s.url + '">دریافت APK</a>' +
        (s.htmlUrl ? ' <a class="dl" style="background:#26262e" href="' + s.htmlUrl + '">صفحه Release</a>' : '');
      q('buildLog').textContent = 'بیلد توسط GitHub Actions تمام شد. حجم: ' + (s.size ? Math.round(s.size/1048576) + ' MB' : '—');
      return;
    }
    q('status').textContent = 'وضعیت بیلد: ' + s.status + ' (' + tries + ')';
    q('buildLog').textContent = s.runUrl ? 'پیگیری: ' + s.runUrl : 'در صف قرار گرفت...';
    setTimeout(function(){ pollBuild(url, tries - 1); }, 5000);
  }).catch(function(e){ q('status').textContent = 'خطا در پیگیری: ' + e.message; });
}
function buildApkLocal() {
  q('status').textContent = 'در حال ساخت...';
  q('buildLog').textContent = 'لطفاً صبر کنید';
  q('apkLink').innerHTML = '';
  var req = { packageName: q('newPackage').value, appName: q('newName').value,
              oldPackage: q('oldPackage').value, oldLabel: q('oldLabel').value,
              emulator: q('emulator').value };
  var afterIcon = isOnline()
    ? Promise.resolve(null)
    : readIcon();
  afterIcon.then(function(icon){
    if (!isOnline()) req.iconBase64 = icon;
    else req.iconUrl = q('iconUrl').value.trim();
    req.base = q('baseFile').value;
    return fetch('/api/build', {
      method:'POST', headers:Object.assign({'Content-Type':'application/json'}, H),
      body:JSON.stringify(req)
    });
  }).then(function(r){ return r.json(); }).then(function(r){
    if (r.error) { q('status').textContent = 'خطا: ' + r.error; q('buildLog').textContent = r.stack || ''; return; }
    if (r.queued) {
      q('status').textContent = 'بیلد در GitHub Actions آغاز شد';
      q('buildLog').textContent = 'منتظر نتیجه...';
      pollBuild(r.statusUrl, 90);
      return;
    }
    q('status').textContent = 'APK آماده شد';
    q('apkLink').innerHTML = '<a class="dl" href="' + r.url + '">دریافت APK</a>';
    q('buildLog').textContent = r.log;
  }).catch(function(e){ q('status').textContent = 'خطا: ' + e.message; });
}
load(); loadStatus();
</script>
</body></html>`;

const DRAFT_KEY = 'config:draft';
const LIVE_KEY = 'config:live';

const DEFAULT_CONFIG = {
  version: 1,
  publishedAt: null,
  games: [],
  servers: [],
  appearance: {
    theme: 'ps5',
    primary: '#e60012',
    background: '#0a0a0c'
  },
  texts: { fa: {}, en: {} },
  templates: {
    PS1: { version: null, key: null, uploadedAt: null },
    PS2: { version: null, key: null, uploadedAt: null }
  },
  messages: {
    sideload: 'لطفاً بازی را از صفحهٔ آن در کافه بازار بخرید. ممنون از حمایتتان.',
    needPurchase: 'برای اجرای این بازی ابتدا آن را از بازار خریداری کنید.',
    downloadReady: 'دیتا آماده است. می‌توانید بازی را اجرا کنید.'
  }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS'
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });
}

function html(body) {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function authorized(request, env) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (email) return true;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Admin-Token');
  return Boolean(env.ADMIN_TOKEN && token === env.ADMIN_TOKEN);
}

function validate(cfg) {
  if (!cfg || typeof cfg !== 'object') return 'config must be an object';
  if (!Array.isArray(cfg.games)) return 'games must be an array';
  for (const g of cfg.games) {
    if (!g.package || !g.name) return 'every game needs "package" and "name"';
    if (!['PS1', 'PS2'].includes(g.console)) {
      return 'console must be PS1 or PS2 -> ' + g.package;
    }
  }
  if (!Array.isArray(cfg.servers)) return 'servers must be an array';
  for (const s of cfg.servers) {
    if (!s.url || typeof s.priority !== 'number') {
      return 'every server needs "url" and numeric "priority"';
    }
  }
  if (!cfg.templates || typeof cfg.templates !== 'object') return 'templates must be an object';
  return null;
}

async function readKey(env, key) {
  return (await env.CONFIG.get(key, 'json')) || null;
}

// ---------- GitHub build runner ----------

async function ghApi(env, apiPath, init = {}) {
  const repo = env.GH_REPO;      // "owner/repo"
  const token = env.GH_TOKEN;
  if (!repo || !token) throw new Error('GH_REPO / GH_TOKEN تنظیم نشدهاند');
  const res = await fetch(`https://api.github.com/repos/${repo}${apiPath}`, {
    method: init.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'farsipsx-panel',
      ...(init.headers || {})
    },
    body: init.body
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${data?.message || text.slice(0, 200)}`);
  return data;
}

function releaseTag(pkg) { return 'build-' + pkg; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // عمومی: تمام APKها این فایل را میخوانند
    if (path === '/config.json' && request.method === 'GET') {
      const live = await readKey(env, LIVE_KEY);
      const cfg = live || DEFAULT_CONFIG;
      return json(cfg, 200, { 'Cache-Control': 'public, max-age=60' });
    }

    if (path === '/api/live' && request.method === 'GET') {
      return json((await readKey(env, LIVE_KEY)) || DEFAULT_CONFIG);
    }

    // ناحیه مدیریتی
    if (path.startsWith('/api/') || path === '/admin') {
      if (!authorized(request, env)) {
        return json({ error: 'unauthorized' }, 401);
      }
    }

    if (path === '/admin') return html(ADMIN_HTML);

    if (path === '/api/draft' && request.method === 'GET') {
      return json((await readKey(env, DRAFT_KEY)) || DEFAULT_CONFIG);
    }

    if (path === '/api/draft' && request.method === 'PUT') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid JSON' }, 400);
      }
      const err = validate(body);
      if (err) return json({ error: err }, 400);
      await env.CONFIG.put(DRAFT_KEY, JSON.stringify({ ...DEFAULT_CONFIG, ...body, version: 1 }));
      return json({ ok: true });
    }

    if (path === '/api/publish' && request.method === 'POST') {
      const draft = await readKey(env, DRAFT_KEY);
      if (!draft) return json({ error: 'no draft to publish' }, 400);
      const err = validate(draft);
      if (err) return json({ error: err }, 400);
      const published = { ...draft, publishedAt: new Date().toISOString() };
      await env.CONFIG.put(LIVE_KEY, JSON.stringify(published));
      return json({ ok: true, publishedAt: published.publishedAt });
    }

    // ساخت APK از طریق GitHub Actions (همه مراحل آنلاین)
    if ((path === '/api/build' || path === '/api/build/all') && request.method === 'POST') {
      let b;
      try { b = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
      if (!b?.packageName || !b?.appName)
        return json({ error: 'packageName و appName لازماند' }, 400);

      const tag = releaseTag(b.packageName);
      const isPS1 = (b.emulator || b.console || '').toUpperCase() === 'PS1';
      try {
        await ghApi(env, '/actions/workflows/build-apk.yml/dispatches', {
          method: 'POST',
          body: JSON.stringify({
            ref: env.GH_BRANCH || 'main',
            inputs: {
              packageName: b.packageName,
              appName: b.appName,
              oldPackage: b.oldPackage || 'com.farsipsx.base',
              oldLabel: b.oldLabel || 'FarsiPSX',
              iconUrl: b.iconUrl || '',
              releaseTag: tag,
              baseChunks: isPS1 ? 'chunks-ps1' : 'chunks'
            }
          })
        });
        return json({
          ok: true, queued: true, tag,
          statusUrl: '/api/build-status?package=' + encodeURIComponent(b.packageName)
        });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }

    // وضعیت بیلد + لینک APK آماده
    if (path === '/api/build-status' && request.method === 'GET') {
      const pkg = url.searchParams.get('package');
      if (!pkg) return json({ error: 'package لازم است' }, 400);
      const tag = releaseTag(pkg);

      let release = null;
      try { release = await ghApi(env, `/releases/tags/${encodeURIComponent(tag)}`); } catch { /* not published yet */ }
      const asset = release?.assets?.find((a) => a.name === pkg + '.apk');
      if (asset) {
        return json({
          status: 'done', url: asset.browser_download_url,
          htmlUrl: release.html_url, size: asset.size
        });
      }

      let run = null;
      try {
        const runs = await ghApi(env, '/actions/workflows/build-apk.yml/runs?per_page=10');
        run = runs?.workflow_runs?.[0] || null;
      } catch { /* no runs yet */ }

      return json({
        status: !run ? 'queued' : (run.status === 'completed' ? 'failed' : 'running'),
        runStatus: run?.status || null,
        conclusion: run?.conclusion || null,
        runUrl: run?.html_url || null
      });
    }

    return json({ error: 'not found' }, 404);
  }
};
