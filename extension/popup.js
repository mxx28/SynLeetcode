const state = document.getElementById('state');
const openOptions = document.getElementById('openOptions');

openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const iconRepo =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M2 12v4c0 2.2 4.5 4 10 4s10-1.8 10-4v-4M2 8v4c0 2.2 4.5 4 10 4s10-1.8 10-4V8"/></svg>';

const iconOk =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

const iconErr =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';

/** Turn raw GitHub API errors into a short line + optional truncated detail */
function parseGithubError(raw) {
  const str = String(raw || '');
  let friendly = 'Could not reach GitHub or write the file.';
  let detail = str.trim();

  const jsonMatch = str.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[0]);
      if (j.message) friendly = j.message;
    } catch (_) {
      /* keep default */
    }
  }

  if (/PUT 404|GET 404|GET branch 404|status["']?\s*:\s*["']?404|404:/i.test(str)) {
    friendly =
      'Repository or branch not found (404). Create an empty repository on GitHub yourself first — this extension does not create repos. Then check owner, repo name, and branch in settings.';
  } else if (/403|Forbidden/i.test(str)) {
    friendly = 'Permission denied (403). Check that your token can write to this repository.';
  } else if (/401|Unauthorized/i.test(str)) {
    friendly = 'Unauthorized (401). Your token may be expired or revoked.';
  } else if (/No GitHub token/i.test(str)) {
    friendly = 'No GitHub token. Add a PAT in settings.';
  }

  if (detail.length > 140) {
    detail = `${detail.slice(0, 140)}…`;
  }

  return { friendly, detail: escapeHtml(detail) };
}

chrome.storage.local
  .get(['enabled', 'githubOwner', 'githubRepo', 'lastSyncAt', 'lastSyncPath', 'lastSyncOk', 'lastSyncError'])
  .then((s) => {
    if (s.enabled === false) {
      state.innerHTML = '<p class="hint-muted">Auto-sync is off. Turn it on in settings when you are ready.</p>';
      return;
    }
    if (!s.githubOwner || !s.githubRepo) {
      state.innerHTML =
        '<p class="hint-warn">Add your GitHub token and repository in settings first.</p>';
      return;
    }

    const repo = `${escapeHtml(s.githubOwner)}/${escapeHtml(s.githubRepo)}`;
    let inner = `<div class="repo-pill">${iconRepo}<span>${repo}</span></div>`;

    if (s.lastSyncAt) {
      const t = new Date(s.lastSyncAt).toLocaleString();
      if (s.lastSyncOk) {
        const path = escapeHtml(s.lastSyncPath || '');
        inner += `<div class="status-block ok">${iconOk}<div><div class="time">Last sync · ${escapeHtml(t)}</div><div class="path">${path}</div></div></div>`;
      } else {
        const { friendly, detail } = parseGithubError(s.lastSyncError);
        inner += `<div class="status-block err">${iconErr}<div><div class="time">${escapeHtml(t)}</div><div class="friendly">${escapeHtml(friendly)}</div><div class="detail">${detail}</div></div></div>`;
      }
    } else {
      inner +=
        '<p class="hint-muted">No sync yet. Solve a problem and get <strong>Accepted</strong>.</p>';
      inner += '<p id="syn-verify" class="hint-sub">Checking GitHub…</p>';
    }

    state.innerHTML = inner;

    if (s.enabled !== false && s.githubOwner && s.githubRepo && !s.lastSyncAt) {
      chrome.runtime.sendMessage({ type: 'syn-verify-github' }, (resp) => {
        const line = document.getElementById('syn-verify');
        if (!line) return;
        if (chrome.runtime.lastError) {
          line.textContent = 'Could not check GitHub. Try again or open settings.';
          line.className = 'hint-warn hint-below';
          return;
        }
        if (resp?.ok) {
          line.remove();
          return;
        }
        const { friendly } = parseGithubError(resp?.error || '');
        line.textContent = friendly;
        line.className = 'hint-warn hint-below';
      });
    }
  });
