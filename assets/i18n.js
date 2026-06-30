/* ============================================================
   i18n — Era 8 Command (shared helper for NEW static pages)
   ------------------------------------------------------------
   A tiny translation engine distilled from the Behemoth / Day 6
   flyers, so future pages get language switching + the shared
   header dropdown from one init call — instead of hand-rolling
   another switcher.

   NOT retrofitted onto existing pages: Behemoth, Day 6, Order
   Workshop, and TME already have working, fully-translated
   engines (and TME is React). This is for pages built from here on.

   ── Markup ──────────────────────────────────────────────────
     <h1 data-i18n="title">Default English</h1>      ← innerHTML
     <text data-i18n-svg="label">EN</text>            ← textContent (SVG safe)
   English is the DOM's authored content; it is snapshotted at
   init and restored when switching back to 'en' (so you only
   author non-English strings in TRANSLATIONS).

   ── Usage ───────────────────────────────────────────────────
     <script src="../assets/auth.js"></script>
     <script src="../assets/i18n.js"></script>
     <script src="../assets/site-header.js"></script>
     <script>
       I18n.init({
         languages: ['en','es','fr'],         // 'en' first = the authored DOM
         translations: {                       // EN omitted (it's the DOM)
           es: { title: 'Título', ... },
           fr: { title: 'Titre', ... }
         },
         rtl: ['ar'],                          // optional; sets dir="rtl"
         onAfter: function (lang) { ...re-run countdowns, etc... }  // optional
       });
     </script>
   I18n auto-registers with SiteHeader.setLanguages so the header
   dropdown drives it; no extra wiring. Call I18n.set('fr') to
   switch programmatically.
   ============================================================ */
(function (global) {
  'use strict';

  var cfg = null;       // resolved config
  var enSnap = {};      // authored-English snapshot, keyed by data-i18n / data-i18n-svg
  var current = 'en';

  function snapshotEnglish() {
    enSnap = {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      enSnap['h:' + el.getAttribute('data-i18n')] = el.innerHTML;
    });
    document.querySelectorAll('[data-i18n-svg]').forEach(function (el) {
      enSnap['s:' + el.getAttribute('data-i18n-svg')] = el.textContent;
    });
  }

  function applyHTML(get) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get('h', el.getAttribute('data-i18n'));
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-svg]').forEach(function (el) {
      var v = get('s', el.getAttribute('data-i18n-svg'));
      if (v !== undefined) el.textContent = v;
    });
  }

  function setLang(lang) {
    if (!cfg) return;
    current = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', cfg.rtlSet[lang] ? 'rtl' : 'ltr');

    if (lang === 'en') {
      applyHTML(function (kind, key) { return enSnap[kind + ':' + key]; });
    } else {
      var t = cfg.translations[lang];
      if (!t) return;
      // data-i18n and data-i18n-svg share one flat key namespace per language
      applyHTML(function (kind, key) { return t[key]; });
    }

    if (typeof cfg.onAfter === 'function') {
      try { cfg.onAfter(lang); } catch (e) { console.error('i18n onAfter failed', e); }
    }
    if (global.SiteHeader && global.SiteHeader.setCurrentLanguage) {
      global.SiteHeader.setCurrentLanguage(lang);
    }
  }

  // Register with the shared header dropdown, retrying until it loads
  // (site-header.js may parse after this script on some pages).
  function registerWithHeader() {
    var tries = 0;
    (function reg() {
      if (global.SiteHeader && global.SiteHeader.setLanguages) {
        global.SiteHeader.setLanguages({
          codes: cfg.languages.slice(),
          current: current,
          onChange: setLang
        });
      } else if (tries++ < 50) {
        setTimeout(reg, 50);
      }
    })();
  }

  var I18n = {
    /**
     * init({ languages, translations, rtl?, onAfter?, initial? })
     *  - languages:    array of codes; first should be 'en' (the authored DOM)
     *  - translations: { <lang>: { <key>: html }, ... } — omit 'en'
     *  - rtl:          optional array of codes that need dir="rtl"
     *  - onAfter:      optional fn(lang) run after each switch
     *  - initial:      optional starting language (default 'en')
     */
    init: function (opts) {
      opts = opts || {};
      cfg = {
        languages: opts.languages || ['en'],
        translations: opts.translations || {},
        onAfter: opts.onAfter,
        rtlSet: (opts.rtl || []).reduce(function (m, c) { m[c] = true; return m; }, {})
      };
      current = opts.initial || 'en';

      var go = function () {
        snapshotEnglish();
        registerWithHeader();
        if (current !== 'en') setLang(current);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', go);
      } else {
        go();
      }
    },

    set: function (lang) { setLang(lang); },
    current: function () { return current; }
  };

  global.I18n = I18n;
})(window);
