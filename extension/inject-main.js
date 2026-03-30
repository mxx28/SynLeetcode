/* global window, document */
(function () {
  function findSubmissionIdDeep(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return null;
    const raw = obj.submissionId;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw)) return raw;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') {
        const f = findSubmissionIdDeep(v, depth + 1);
        if (f != null) return f;
      }
    }
    return null;
  }

  if (window.__SYN_LEETCODE_FETCH_PATCH__) return;
  window.__SYN_LEETCODE_FETCH_PATCH__ = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const res = await origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : input && input.url;
      if (!url || !String(url).includes('graphql')) return res;

      let op = '';
      if (init && typeof init.body === 'string') {
        try {
          const j = JSON.parse(init.body);
          op = (j.operationName || j.query || '').toString();
        } catch (_) {}
      }

      const clone = res.clone();
      clone
        .json()
        .then((data) => {
          const pickSid = (d) => {
            if (!d || !d.data) return null;
            const root = d.data;
            return (
              root.submitSubmission?.submissionId ??
              root.submitCodeSubmission?.submissionId ??
              root.submit?.submissionId ??
              findSubmissionIdDeep(root)
            );
          };

          const sid = pickSid(data);
          const bodyStr = data && JSON.stringify(data);
          const looksSubmit =
            /submit/i.test(op) ||
            (bodyStr && bodyStr.includes('submitSubmission')) ||
            (bodyStr && bodyStr.includes('submitCodeSubmission'));

          if (sid != null && looksSubmit) {
            const id = Number(sid);
            window.postMessage(
              {
                source: 'syn-leetcode',
                kind: 'submit-id',
                submissionId: id,
              },
              '*',
            );
            try {
              document.dispatchEvent(
                new CustomEvent('syn-leetcode-submit', {
                  bubbles: true,
                  composed: true,
                  detail: { submissionId: id },
                }),
              );
            } catch (_) {}
          }
        })
        .catch(() => {});

      return res;
    } catch (_) {
      return res;
    }
  };
})();
