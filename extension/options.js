/**
 * SyncLeetcode options page — reads/writes chrome.storage.local.
 *
 * Storage keys (must stay in sync with background.js loadSettings):
 * - githubToken     — GitHub PAT (never logged or sent outside GitHub API)
 * - githubOwner     — repo owner login or org name
 * - githubRepo      — repository name (slug in github.com/owner/REPO)
 * - githubBranch    — branch to commit to (e.g. main)
 * - pathPrefix      — directory inside repo root for solution files
 * - enabled         — if false, background skips push
 */

const $ = (id) => document.getElementById(id);

/** Load saved values into the form. */
async function load() {
  const s = await chrome.storage.local.get([
    'githubToken',
    'githubOwner',
    'githubRepo',
    'githubBranch',
    'pathPrefix',
    'enabled',
  ]);
  $('githubToken').value = s.githubToken || '';
  $('githubOwner').value = s.githubOwner || '';
  $('githubRepo').value = s.githubRepo || '';
  $('githubBranch').value = s.githubBranch || 'main';
  $('pathPrefix').value = s.pathPrefix || 'leetcode';
  $('enabled').checked = s.enabled !== false;
}

function setStatus(text, cls) {
  const el = $('status');
  el.textContent = text;
  el.className = cls || '';
}

$('save').addEventListener('click', async () => {
  await chrome.storage.local.set({
    githubToken: $('githubToken').value.trim(),
    githubOwner: $('githubOwner').value.trim(),
    githubRepo: $('githubRepo').value.trim(),
    githubBranch: $('githubBranch').value.trim() || 'main',
    pathPrefix: $('pathPrefix').value.trim() || 'leetcode',
    enabled: $('enabled').checked,
  });
  setStatus('Saved.', 'ok');
});

load().catch((e) => setStatus(String(e), 'err'));
