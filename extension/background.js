function isLeetcodeProblemSubmitUrl(url) {
  try {
    const u = new URL(url);
    if (!/\/submit(\/|$|\?)/.test(u.pathname)) return false;
    if (!u.pathname.startsWith('/problems/')) return false;
    const h = u.hostname;
    if (h === 'leetcode.com') return true;
    if (h === 'leetcode.cn' || h.endsWith('.leetcode.cn')) return true;
    if (h === 'lingkou.xyz' || h.endsWith('.lingkou.xyz')) return true;
    return false;
  } catch (_) {
    return false;
  }
}

const LANG_EXT = {
  python: 'py',
  python3: 'py',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  javascript: 'js',
  typescript: 'ts',
  c: 'c',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  php: 'php',
  dart: 'dart',
  scala: 'scala',
  mysql: 'sql',
  mssql: 'sql',
  oraclesql: 'sql',
};

function extFromLang(detail) {
  const name = (detail?.lang?.name || '').toLowerCase();
  const verbose = (detail?.lang?.verboseName || '').toLowerCase();
  if (LANG_EXT[name]) return LANG_EXT[name];
  if (verbose.includes('python')) return 'py';
  if (verbose.includes('c++') || verbose.includes('cpp')) return 'cpp';
  if (verbose.includes('java') && !verbose.includes('javascript')) return 'java';
  if (verbose.includes('javascript')) return 'js';
  if (verbose.includes('typescript')) return 'ts';
  if (verbose.includes('go')) return 'go';
  if (verbose.includes('rust')) return 'rs';
  if (verbose.includes('ruby')) return 'rb';
  if (verbose.includes('swift')) return 'swift';
  if (verbose.includes('kotlin')) return 'kt';
  if (verbose.includes('php')) return 'php';
  if (verbose.includes('dart')) return 'dart';
  if (verbose.includes('scala')) return 'scala';
  if (verbose.includes('c#') || name === 'csharp') return 'cs';
  return 'txt';
}

function sanitizePathPart(s) {
  return String(s || '')
    .replace(/[\\/]+/g, '-')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 120);
}

const SYNC_DAILY_STATS_MAX_DAYS = 14;

function localDateKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDifficultyForStats(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (/简单|easy/.test(s)) return 'easy';
  if (/中等|medium/.test(s)) return 'medium';
  if (/困难|hard/.test(s)) return 'hard';
  if (s.includes('easy')) return 'easy';
  if (s.includes('medium')) return 'medium';
  if (s.includes('hard')) return 'hard';
  return null;
}

function pruneDailyStatsMap(map, maxKeep) {
  const keys = Object.keys(map).sort();
  while (keys.length > maxKeep) {
    delete map[keys.shift()];
  }
}

/** One write: today’s difficulty counts + lifetime unique problem count (same key = one problem). */
async function recordSyncStatsAfterSuccess(question) {
  const slug = sanitizePathPart(question?.titleSlug || 'unknown');
  const fid = sanitizePathPart(question?.questionFrontendId || '0');
  const uniqueKey = `${fid}__${slug}`;
  const bucket = normalizeDifficultyForStats(question?.difficulty);
  const dayKey = localDateKey();

  const { syncDailyStats = {}, syncLifetimeStats = {} } = await chrome.storage.local.get([
    'syncDailyStats',
    'syncLifetimeStats',
  ]);

  const nextDaily = { ...syncDailyStats };
  pruneDailyStatsMap(nextDaily, SYNC_DAILY_STATS_MAX_DAYS);

  const prevDay = nextDaily[dayKey];
  const day = {
    easy: Number(prevDay?.easy) || 0,
    medium: Number(prevDay?.medium) || 0,
    hard: Number(prevDay?.hard) || 0,
    other: Number(prevDay?.other) || 0,
    seen: { ...(prevDay?.seen || {}) },
  };

  let lifetimeCount = Number(syncLifetimeStats.count) || 0;
  const lifetimeSeen = { ...(syncLifetimeStats.seen || {}) };
  if (!lifetimeSeen[uniqueKey]) {
    lifetimeSeen[uniqueKey] = 1;
    lifetimeCount += 1;
  }

  if (!day.seen[uniqueKey]) {
    day.seen[uniqueKey] = 1;
    if (bucket === 'easy') day.easy += 1;
    else if (bucket === 'medium') day.medium += 1;
    else if (bucket === 'hard') day.hard += 1;
    else day.other += 1;
  }

  nextDaily[dayKey] = day;

  await chrome.storage.local.set({
    syncDailyStats: nextDaily,
    syncLifetimeStats: { count: lifetimeCount, seen: lifetimeSeen },
  });
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function loadSettings() {
  const s = await chrome.storage.local.get([
    'githubToken',
    'githubOwner',
    'githubRepo',
    'githubBranch',
    'pathPrefix',
    'enabled',
  ]);
  return {
    token: (s.githubToken || '').trim(),
    owner: (s.githubOwner || '').trim(),
    repo: (s.githubRepo || '').trim(),
    branch: (s.githubBranch || 'main').trim() || 'main',
    pathPrefix: (s.pathPrefix || 'leetcode').replace(/^\/+|\/+$/g, ''),
    enabled: s.enabled !== false,
  };
}

function githubContentsPath(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

const GITHUB_RETRY_HTTP = new Set([408, 429, 500, 502, 503, 504]);

async function githubGetFileSha(token, owner, repo, path, branch) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${githubContentsPath(path)}?ref=${encodeURIComponent(branch)}`;
  const delays = [400, 900, 1800];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(url, { headers: githubHeaders(token) });
    if (res.status === 404) return null;
    if (!res.ok && attempt < delays.length && GITHUB_RETRY_HTTP.has(res.status)) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub GET ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = await res.json();
    return j.sha || null;
  }
  throw new Error('GitHub GET: exhausted retries');
}

/** GET repo + branch; throws with message body on failure (for options/popup verify). */
async function githubVerifyRepoAndBranch(cfg) {
  if (!cfg.token) {
    throw new Error('No GitHub token. Add one in settings.');
  }
  if (!cfg.owner || !cfg.repo) {
    throw new Error('Missing owner or repository name.');
  }
  const owner = encodeURIComponent(cfg.owner);
  const repo = encodeURIComponent(cfg.repo);
  const branch = encodeURIComponent(cfg.branch);
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(repoUrl, { headers: githubHeaders(cfg.token) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub GET ${res.status}: ${t.slice(0, 240)}`);
  }
  const brUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
  const res2 = await fetch(brUrl, { headers: githubHeaders(cfg.token) });
  if (!res2.ok) {
    const t = await res2.text();
    throw new Error(`GitHub GET branch ${res2.status}: ${t.slice(0, 240)}`);
  }
}

async function githubPutFile(token, owner, repo, path, branch, content, message, sha) {
  const body = {
    message,
    content: utf8ToBase64(content),
    branch,
  };
  if (sha) body.sha = sha;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${githubContentsPath(path)}`;
  const delays = [400, 900, 1800];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok && attempt < delays.length && GITHUB_RETRY_HTTP.has(res.status)) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub PUT ${res.status}: ${t.slice(0, 300)}`);
    }
    return res.json();
  }
  throw new Error('GitHub PUT: exhausted retries');
}

async function pushSubmission(payload) {
  const cfg = await loadSettings();
  if (!cfg.enabled) return { skipped: true, reason: 'disabled' };
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    return { skipped: true, reason: 'missing-config' };
  }

  const detail = payload.detail;
  const q = detail.question || {};
  const slug = sanitizePathPart(q.titleSlug || payload.questionSlug || 'unknown');
  const fid = sanitizePathPart(q.questionFrontendId || '0');
  const title = q.title || slug;
  const ext = extFromLang(detail);
  const relPath = `${cfg.pathPrefix}/${fid}-${slug}.${ext}`;
  const code = detail.code || '';
  const msg = `SyncLeetcode: ${title} (${slug})`;

  const sha = await githubGetFileSha(cfg.token, cfg.owner, cfg.repo, relPath, cfg.branch);
  await githubPutFile(cfg.token, cfg.owner, cfg.repo, relPath, cfg.branch, code, msg, sha);

  await recordSyncStatsAfterSuccess(q);

  await chrome.storage.local.set({
    lastSyncAt: Date.now(),
    lastSyncPath: relPath,
    lastSyncOk: true,
    lastSyncError: '',
  });

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'SyncLeetcode',
    message: `Synced: ${relPath}`,
  });

  return { ok: true, path: relPath };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'sync-push-github') {
    pushSubmission(msg.payload)
      .then((r) => sendResponse(r))
      .catch((e) => {
        const err = e instanceof Error ? e.message : String(e);
        chrome.storage.local.set({
          lastSyncAt: Date.now(),
          lastSyncOk: false,
          lastSyncError: err,
        });
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'SyncLeetcode sync failed',
          message: err.slice(0, 180),
        });
        sendResponse({ ok: false, error: err });
      });
    return true;
  }
  if (msg?.type === 'sync-verify-github') {
    loadSettings()
      .then((cfg) => githubVerifyRepoAndBranch(cfg))
      .then(() => sendResponse({ ok: true }))
      .catch((e) => {
        const err = e instanceof Error ? e.message : String(e);
        sendResponse({ ok: false, error: err });
      });
    return true;
  }
  return false;
});

function extractSlugFromSubmitUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/problems\/([^/]+)\/submit\/?/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.method !== 'POST') return;
    if (!isLeetcodeProblemSubmitUrl(details.url)) return;
    const slug = extractSlugFromSubmitUrl(details.url);
    if (!slug || details.tabId == null || details.tabId < 0) return;

    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, { type: 'sync-request-sync-slug', questionSlug: slug }, () => {
        void chrome.runtime.lastError;
      });
    }, 2200);
  },
  {
    urls: [
      'https://leetcode.com/problems/*',
      'https://leetcode.cn/problems/*',
      'https://*.lingkou.xyz/problems/*',
      'https://lingkou.xyz/problems/*',
    ],
    types: ['xmlhttprequest'],
  },
);
