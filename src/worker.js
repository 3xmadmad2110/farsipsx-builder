import { ADMIN_HTML } from './admin-ui.js';

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
