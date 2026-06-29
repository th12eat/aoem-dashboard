/* ============================================================
   Auth — Era 8 Command (PREVIEW BUILD)
   ------------------------------------------------------------
   Clean interface so the UI never changes when the real auth
   lands at hosting time. Today's implementation is a cosmetic
   DEMO: it validates the form shape and flips a sessionStorage
   flag. NO real credential check, NO secret, NO token here.

   Swap path (later, no UI changes):
     login() internals → passphrase decrypts a stored token
     (WebCrypto AES-GCM/PBKDF2) → then real server-side auth.

   IMPORTANT: nothing in this file is wired to a click event yet.
   Pages call Auth.* explicitly only once we go live.
   ============================================================ */
(function (global) {
  'use strict';

  var SESSION_KEY = 'aoem_auth_session_v1';

  // Cosmetic placeholder profile shown after a demo login. At hosting
  // time this comes from the real account / token identity instead.
  var DEMO_PROFILE = {
    username: 'commander',
    displayName: 'Commander',
    role: 'Maintainer',
    server: 'Era 8',
    avatar: '🛡️'
  };

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }

  var Auth = {
    // Feature flag — real auth is intentionally OFF in the preview build.
    ENABLED: false,

    /**
     * Demo login. Returns { ok, profile?, reason? }.
     * Validates only that both fields are non-empty (shape check) and,
     * when ENABLED is false, refuses to actually authenticate.
     * The login page does NOT call this on submit yet.
     */
    login: function (username, password) {
      if (!username || !password) {
        return { ok: false, reason: 'Enter a username and password.' };
      }
      if (!Auth.ENABLED) {
        return { ok: false, reason: 'Sign-in activates when hosted (preview build).' };
      }
      // DEMO success path (only reachable once ENABLED flips true).
      var profile = Object.assign({}, DEMO_PROFILE, { username: username });
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch (e) {}
      return { ok: true, profile: profile };
    },

    isAuthed: function () {
      return !!readSession();
    },

    currentUser: function () {
      // In the preview build, return the demo profile so the profile page
      // has something to render. Replaced by real identity at hosting time.
      return readSession() || DEMO_PROFILE;
    },

    logout: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
  };

  global.Auth = Auth;
})(window);
