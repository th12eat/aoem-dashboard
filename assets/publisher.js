/* ============================================================
   Publisher — Era 8 Command (PREVIEW BUILD)
   ------------------------------------------------------------
   Reads data files (safe, public) and PREPARES writes, but the
   actual GitHub write is locked behind PUBLISH_ENABLED=false AND
   is not bound to any button's click. Two independent locks.

   - load(path)            → fetch + parse JSON (REAL, read-only)
   - preview(path, obj)    → returns { json, diff } for display (REAL)
   - publish(path,obj,msg) → full GitHub Contents API write
                             (WRITTEN, but refuses while locked)

   Going live later = (1) flip PUBLISH_ENABLED, (2) supply a token
   via setToken(), (3) attach publish() to the Publish button. No
   logic needs to be written — it already lives here.

   Security: no token is stored in this file or the repo. setToken()
   keeps it in memory only (cleared on reload). The eventual hosted
   build moves the token server-side; this client code stays the same.
   ============================================================ */
(function (global) {
  'use strict';

  var REPO = { owner: 'th12eat', repo: 'aoem-dashboard', branch: 'main' };
  var API = 'https://api.github.com';

  // ---- locks -------------------------------------------------
  var PUBLISH_ENABLED = false;   // master switch; stays false in preview
  var _token = null;             // in-memory only; never persisted here

  // ---- UTF-8-safe base64 (player names contain CJK 時宗, [JAN], etc.) ----
  // Naive btoa(JSON.stringify(...)) throws on non-Latin1 — these don't.
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\n/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function ghHeaders() {
    var h = { 'Accept': 'application/vnd.github+json' };
    if (_token) h['Authorization'] = 'Bearer ' + _token;
    return h;
  }

  var Publisher = {
    REPO: REPO,

    isPublishEnabled: function () { return PUBLISH_ENABLED && !!_token; },

    // Token lives in memory only for the session. No localStorage here.
    setToken: function (t) { _token = t || null; },
    clearToken: function () { _token = null; },

    /**
     * READ (public, no token needed). Returns parsed JSON or null.
     * Mirrors the fetchJSON idiom already used in app/index.html.
     */
    load: function (path) {
      return fetch('../' + path.replace(/^\/+/, ''))
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function (e) { console.error('Publisher.load ' + path + ' failed', e); return null; });
    },

    /**
     * PREVIEW (real). Returns the exact JSON string that WOULD be written,
     * plus a naive line diff against the currently-published version.
     */
    preview: function (path, obj) {
      var nextStr = JSON.stringify(obj, null, 2) + '\n';
      return Publisher.load(path).then(function (cur) {
        var curStr = cur ? (JSON.stringify(cur, null, 2) + '\n') : '';
        return { json: nextStr, diff: simpleDiff(curStr, nextStr) };
      });
    },

    /**
     * GET the current file sha + decoded content (needed before a PUT).
     * Returns { sha, data } ; sha=null when the file does not exist yet.
     */
    ghGet: function (path) {
      var url = API + '/repos/' + REPO.owner + '/' + REPO.repo +
                '/contents/' + path + '?ref=' + REPO.branch;
      return fetch(url, { headers: ghHeaders() }).then(function (r) {
        if (r.status === 404) return { sha: null, data: null };
        if (!r.ok) throw new Error('GET ' + path + ': ' + r.status);
        return r.json().then(function (j) {
          return { sha: j.sha, data: JSON.parse(b64ToUtf8(j.content)) };
        });
      });
    },

    /**
     * PUBLISH — the complete GitHub Contents API write. Fully written, but:
     *   1. refuses unless PUBLISH_ENABLED && a token is set, and
     *   2. is not attached to any UI control in the preview build.
     * When enabled: GET sha → PUT base64(UTF-8 JSON) → returns new sha.
     */
    publish: function (path, obj, message) {
      if (!Publisher.isPublishEnabled()) {
        return Promise.reject(new Error(
          'Publishing is disabled in this preview build (activates when hosted).'));
      }
      return Publisher.ghGet(path).then(function (cur) {
        var url = API + '/repos/' + REPO.owner + '/' + REPO.repo + '/contents/' + path;
        var body = {
          message: message || ('Update ' + path),
          branch: REPO.branch,
          content: utf8ToB64(JSON.stringify(obj, null, 2) + '\n')
        };
        if (cur.sha) body.sha = cur.sha;   // omit only when creating a new file
        return fetch(url, {
          method: 'PUT',
          headers: ghHeaders(),
          body: JSON.stringify(body)
        }).then(function (r) {
          if (!r.ok) return r.text().then(function (t) {
            throw new Error('PUT ' + path + ': ' + r.status + ' ' + t);
          });
          return r.json().then(function (j) { return j.content.sha; });
        });
      });
    },

    /** Test a token by reading repo metadata. Used by the (future) token UI. */
    testToken: function () {
      var url = API + '/repos/' + REPO.owner + '/' + REPO.repo;
      return fetch(url, { headers: ghHeaders() }).then(function (r) {
        if (!r.ok) throw new Error('Token test failed: ' + r.status);
        return r.json();
      });
    },

    // expose the encoders for any future archive tooling / tests
    _utf8ToB64: utf8ToB64,
    _b64ToUtf8: b64ToUtf8
  };

  // Minimal line-level diff for the preview panel (added/removed markers).
  function simpleDiff(a, b) {
    var al = a ? a.split('\n') : [], bl = b ? b.split('\n') : [];
    var out = [], i = 0, max = Math.max(al.length, bl.length);
    for (; i < max; i++) {
      var x = al[i], y = bl[i];
      if (x === y) { if (x !== undefined) out.push('  ' + x); }
      else {
        if (x !== undefined) out.push('- ' + x);
        if (y !== undefined) out.push('+ ' + y);
      }
    }
    return out.join('\n');
  }

  global.Publisher = Publisher;
})(window);
