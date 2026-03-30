const MSG = 'sync-leetcode';

/** leetcode.com — legacy list field */
const GET_SUBMISSIONS_US = `
query QuestionSubmissionListForSlug($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!, $lang: Int, $status: Int) {
  questionSubmissionList(
    offset: $offset
    limit: $limit
    lastKey: $lastKey
    questionSlug: $questionSlug
    lang: $lang
    status: $status
  ) {
    lastKey
    hasNext
    submissions {
      id
      status
      statusDisplay
      timestamp
    }
  }
}`;

/** leetcode.cn — uses submissionList + SubmissionStatusEnum */
const GET_SUBMISSIONS_CN = `
query SubmissionListForSlugCn(
  $offset: Int!
  $limit: Int!
  $lastKey: String
  $questionSlug: String!
  $status: SubmissionStatusEnum
) {
  submissionList(
    offset: $offset
    limit: $limit
    lastKey: $lastKey
    questionSlug: $questionSlug
    status: $status
  ) {
    lastKey
    hasNext
    submissions {
      id
      status
      statusDisplay
      timestamp
      isPending
    }
  }
}`;

/** CN fallback when enum value or status filter differs */
const GET_SUBMISSIONS_CN_UNFILTERED = `
query SubmissionListCnUnfiltered($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
  submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
    lastKey
    hasNext
    submissions {
      id
      status
      statusDisplay
      timestamp
      isPending
    }
  }
}`;

const GET_SUBMISSION_DETAILS_US = `
query SubmissionDetailsUs($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    code
    timestamp
    statusCode
    statusDisplay
    lang {
      name
      verboseName
    }
    question {
      questionFrontendId
      title
      titleSlug
      difficulty
    }
  }
}`;

const GET_SUBMISSION_DETAILS_CN = `
query SubmissionDetailCn($submissionId: ID!) {
  submissionDetail(submissionId: $submissionId) {
    code
    timestamp
    statusDisplay
    lang
    langVerboseName
    question {
      questionId
      title
      titleSlug
    }
  }
}`;

const GET_QUESTION_FRONTEND_ID = `
query SyncQuestionFrontendId($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    difficulty
  }
}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** CN / domestic stack (leetcode.cn, *.lingkou.xyz) — same GraphQL shape as CN */
function isCnHost() {
  const h = window.location.hostname;
  return (
    h === 'leetcode.cn' ||
    h.endsWith('.leetcode.cn') ||
    h === 'lingkou.xyz' ||
    h.endsWith('.lingkou.xyz')
  );
}

function isAllowedPostMessageOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    if (h === 'leetcode.com') return true;
    if (h === 'leetcode.cn' || h.endsWith('.leetcode.cn')) return true;
    if (h === 'lingkou.xyz' || h.endsWith('.lingkou.xyz')) return true;
    return false;
  } catch (_) {
    return false;
  }
}

function titleSlugFromPath() {
  const m = window.location.pathname.match(/\/problems\/([^/]+)/);
  return m ? m[1] : null;
}

function getCsrf() {
  const m = document.cookie.match(/csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1].trim()) : '';
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504, 522, 523, 524]);

async function graphqlRequest(query, variables) {
  const delays = [600, 1200, 2400, 4000];
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrftoken': getCsrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ query, variables }),
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        lastErr = new Error(`GraphQL response not JSON (HTTP ${res.status})`);
        if (attempt < delays.length && (!res.ok || RETRYABLE_HTTP.has(res.status))) {
          await sleep(delays[attempt]);
          continue;
        }
        throw lastErr;
      }

      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < delays.length && RETRYABLE_HTTP.has(res.status)) {
          await sleep(delays[attempt]);
          continue;
        }
        throw lastErr;
      }

      if (json.errors && json.errors.length) {
        const msg = json.errors.map((e) => e.message).join('; ');
        lastErr = new Error(msg || 'GraphQL error');
        if (
          attempt < delays.length &&
          /timeout|522|503|502|Service|Throttl|rate|Try again|Internal|temporar/i.test(msg)
        ) {
          await sleep(delays[attempt]);
          continue;
        }
        throw lastErr;
      }
      return json.data;
    } catch (e) {
      lastErr = e;
      const netFail = e instanceof TypeError;
      if (attempt < delays.length && netFail) {
        await sleep(delays[attempt]);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/** Map CN statusDisplay to US-style statusCode for shared wait logic */
function cnDisplayToStatusCode(display) {
  const t = (display || '').trim();
  if (!t) return null;
  if (t === '通过' || /^accepted$/i.test(t)) return 10;
  if (/Wrong|错误|超出|超时|TLE|WA|RE|CE|失败|Error|Limit/i.test(t)) {
    return 11;
  }
  if (/待|评测中|Pending|Judging|排队|Waiting|Submitting|提交/i.test(t)) {
    return null;
  }
  return 11;
}

function normalizeCnDetail(raw) {
  if (!raw) return null;
  const code = cnDisplayToStatusCode(raw.statusDisplay);
  return {
    code: raw.code,
    timestamp: raw.timestamp,
    statusCode: code,
    statusDisplay: raw.statusDisplay,
    lang: {
      name: raw.lang,
      verboseName: raw.langVerboseName || raw.lang,
    },
    question: {
      questionFrontendId: raw.question?.questionFrontendId,
      title: raw.question?.title,
      titleSlug: raw.question?.titleSlug,
      difficulty: raw.question?.difficulty,
    },
  };
}

async function enrichQuestionFrontendId(detail) {
  if (!detail || !detail.question) return detail;
  const slug = detail.question.titleSlug;
  if (!slug) return detail;
  if (detail.question.questionFrontendId != null && detail.question.difficulty != null) return detail;
  try {
    const data = await graphqlRequest(GET_QUESTION_FRONTEND_ID, { titleSlug: slug });
    const q = data?.question;
    if (q?.questionFrontendId != null && detail.question.questionFrontendId == null) {
      detail.question.questionFrontendId = q.questionFrontendId;
    }
    if (!detail.question.title && q?.title) {
      detail.question.title = q.title;
    }
    if (q?.difficulty != null && detail.question.difficulty == null) {
      detail.question.difficulty = q.difficulty;
    }
  } catch (_) {
    /* optional */
  }
  return detail;
}

async function fetchSubmissionById(submissionId) {
  const sid = String(submissionId);
  if (isCnHost()) {
    const data = await graphqlRequest(GET_SUBMISSION_DETAILS_CN, { submissionId: sid });
    return normalizeCnDetail(data?.submissionDetail);
  }
  const data = await graphqlRequest(GET_SUBMISSION_DETAILS_US, {
    submissionId: parseInt(sid, 10),
  });
  return data?.submissionDetails || null;
}

async function fetchLatestAcceptedId(questionSlug) {
  if (isCnHost()) {
    try {
      const data = await graphqlRequest(GET_SUBMISSIONS_CN, {
        offset: 0,
        limit: 20,
        lastKey: null,
        questionSlug,
        status: 'AC',
      });
      const list = data?.submissionList?.submissions;
      if (list && list.length) return Number(list[0].id);
    } catch (_) {
      /* fall through: enum or schema differ */
    }
    const data = await graphqlRequest(GET_SUBMISSIONS_CN_UNFILTERED, {
      offset: 0,
      limit: 30,
      lastKey: null,
      questionSlug,
    });
    const list = data?.submissionList?.submissions;
    if (!list || !list.length) return null;
    const ac = list.find(
      (s) =>
        s.statusDisplay === '通过' ||
        /^accepted$/i.test((s.statusDisplay || '').trim()) ||
        Number(s.status) === 10,
    );
    return Number((ac || list[0]).id);
  }

  const data = await graphqlRequest(GET_SUBMISSIONS_US, {
    questionSlug,
    limit: 20,
    offset: 0,
    lastKey: null,
    status: 10,
  });
  const list = data?.questionSubmissionList?.submissions;
  if (!list || !list.length) return null;
  return Number(list[0].id);
}

async function waitForAccepted(submissionId, { maxAttempts = 40, intervalMs = 550 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const detail = await fetchSubmissionById(submissionId);
    if (!detail) {
      await sleep(intervalMs);
      continue;
    }
    if (detail.statusCode === 10) return detail;
    if (detail.statusCode >= 11 && detail.statusCode <= 20) return null;
    await sleep(intervalMs);
  }
  return null;
}

let lastHandledId = null;
let pendingSlugTimer = null;

function debouncedSyncBySlug(questionSlug) {
  if (pendingSlugTimer) clearTimeout(pendingSlugTimer);
  pendingSlugTimer = setTimeout(() => {
    pendingSlugTimer = null;
    syncBySlug(questionSlug);
  }, 1800);
}

async function syncBySlug(questionSlug) {
  try {
    const id = await fetchLatestAcceptedId(questionSlug);
    if (!id || id === lastHandledId) return;
    const detail = await waitForAccepted(id);
    if (!detail || detail.statusCode !== 10) return;
    const submittedAt = (detail.timestamp || 0) * 1000;
    if (Date.now() - submittedAt > 120000) return;
    lastHandledId = id;
    await enrichQuestionFrontendId(detail);
    chrome.runtime.sendMessage({
      type: 'sync-push-github',
      payload: { detail, questionSlug },
    });
  } catch (e) {
    console.warn('[SyncLeetcode]', e);
  }
}

async function syncBySubmissionId(submissionId) {
  try {
    if (!submissionId || submissionId === lastHandledId) return;
    const detail = await waitForAccepted(submissionId);
    if (!detail || detail.statusCode !== 10) return;
    const submittedAt = (detail.timestamp || 0) * 1000;
    if (Date.now() - submittedAt > 180000) return;
    lastHandledId = submissionId;
    await enrichQuestionFrontendId(detail);
    chrome.runtime.sendMessage({
      type: 'sync-push-github',
      payload: { detail, questionSlug: detail.question?.titleSlug || titleSlugFromPath() },
    });
  } catch (e) {
    console.warn('[SyncLeetcode]', e);
  }
}

function onSubmitId(submissionId) {
  const sid = Number(submissionId);
  if (!Number.isFinite(sid)) return;
  syncBySubmissionId(sid);
}

window.addEventListener('message', (event) => {
  if (!isAllowedPostMessageOrigin(event.origin)) return;
  const d = event.data;
  if (!d || d.source !== MSG || d.kind !== 'submit-id') return;
  onSubmitId(d.submissionId);
});

document.addEventListener('sync-leetcode-submit', (event) => {
  const sid = event.detail && event.detail.submissionId;
  onSubmitId(sid);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'sync-request-sync-slug' && msg.questionSlug) {
    debouncedSyncBySlug(msg.questionSlug);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
