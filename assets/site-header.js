/* ============================================================
   Site Header — Era 8 Command
   ------------------------------------------------------------
   Injects a slim, consistent top bar on every page:
     left  → site title (links to the home hub)
     right → profile chip + dropdown (Admin Portal / Profile /
             Sign in or Log out, depending on Auth state)

   Self-contained (scoped styles, .ehdr-* classes) so it never
   collides with a page's own header. Depends on Auth (auth.js)
   if present; degrades to a "Guest / Sign in" chip otherwise.

   Usage — one line near the end of <body>:
     <script src="<root>/assets/auth.js"></script>
     <script src="<root>/assets/site-header.js"></script>
   Root depth is auto-detected, so the same include works from
   /, /dashboards, /flyers, /admin, etc.
   ============================================================ */
(function () {
  'use strict';

  // ---- work out the path back to repo root from this script's src ----
  function rootPrefix() {
    var s = document.currentScript;
    if (s && s.src) {
      // .../assets/site-header.js  → strip "assets/site-header.js"
      return s.src.replace(/assets\/site-header\.js.*$/, '');
    }
    return '';
  }
  var ROOT = rootPrefix();
  var href = function (p) { return ROOT + p; };

  // ---- canonical language display names (native, short enough for the chip) ----
  // Pages register only the codes they support; names come from here so the
  // dropdown looks identical everywhere. Add codes here as new langs appear.
  var LANG_NAMES = {
    en: 'English', es: 'Español', fr: 'Français', ko: '한국어', ja: '日本語',
    zh: '中文', zh_hk: '中文（繁）', zh_cn: '中文（简）', pt: 'Português',
    de: 'Deutsch', it: 'Italiano', ru: 'Русский', ar: 'العربية', da: 'Dansk',
    nl: 'Nederlands', sv: 'Svenska', fi: 'Suomi', nb: 'Norsk', si: 'සිංහල',
    ta: 'தமிழ்', hi: 'हिन्दी'
  };

  // language config registered by the current page (null = no switcher shown)
  var langCfg = null; // { codes:[...], current, onChange }

  // ---- scoped styles ----
  var CSS =
    '.ehdr{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;' +
      'padding:8px 16px;background:rgba(10,12,20,0.92);backdrop-filter:blur(8px);' +
      'border-bottom:2px solid var(--kvk-accent-dim,#a17e2f);font-family:"Barlow Condensed",sans-serif;}' +
    '.ehdr a{text-decoration:none;color:inherit;}' +
    '.ehdr-brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:1.5px;' +
      'text-transform:uppercase;font-size:15px;color:var(--text-primary,#e8eaf0);}' +
    '.ehdr-brand .ehdr-mark{color:var(--kvk-accent,#d4a843);font-size:18px;}' +
    '.ehdr-right{position:relative;display:flex;align-items:center;gap:8px;}' +
    '.ehdr-lang{display:none;align-items:center;gap:6px;border:1px solid var(--border,#1e2435);' +
      'background:var(--bg-card,#11141f);border-radius:20px;padding:3px 6px 3px 10px;color:var(--text-secondary,#8a90a5);}' +
    '.ehdr-lang.on{display:flex;}' +
    '.ehdr-lang .ehdr-globe{font-size:13px;opacity:0.8;line-height:1;}' +
    '.ehdr-lang select{appearance:none;-webkit-appearance:none;background:transparent;border:none;outline:none;cursor:pointer;' +
      'color:var(--text-secondary,#8a90a5);font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:13px;' +
      'letter-spacing:0.5px;padding:2px 16px 2px 2px;}' +
    '.ehdr-lang select:hover{color:var(--text-primary,#e8eaf0);}' +
    '.ehdr-lang select option{background:var(--bg-card,#11141f);color:var(--text-primary,#e8eaf0);}' +
    '.ehdr-lang .ehdr-caret{margin-left:-14px;pointer-events:none;}' +
    '.ehdr-chip{display:flex;align-items:center;gap:8px;cursor:pointer;border:1px solid var(--border,#1e2435);' +
      'background:var(--bg-card,#11141f);border-radius:20px;padding:4px 10px 4px 5px;color:var(--text-secondary,#8a90a5);}' +
    '.ehdr-chip:hover{border-color:var(--kvk-accent-dim,#a17e2f);}' +
    '.ehdr-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(var(--kvk-accent-rgb,212,168,67),0.18);font-size:13px;}' +
    '.ehdr-name{font-weight:600;font-size:13px;letter-spacing:0.5px;}' +
    '.ehdr-caret{font-size:9px;opacity:0.7;}' +
    '.ehdr-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:180px;background:var(--bg-card,#11141f);' +
      'border:1px solid var(--border,#1e2435);border-radius:10px;padding:6px;display:none;' +
      'box-shadow:0 10px 30px rgba(0,0,0,0.45);}' +
    '.ehdr-menu.open{display:block;}' +
    '.ehdr-menu .ehdr-mi{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;' +
      'font-size:13px;color:var(--text-secondary,#8a90a5);letter-spacing:0.5px;cursor:pointer;}' +
    '.ehdr-menu .ehdr-mi:hover{background:var(--bg-card2,#161a28);color:var(--text-primary,#e8eaf0);}' +
    '.ehdr-menu .ehdr-sep{height:1px;background:var(--border,#1e2435);margin:5px 4px;}' +
    '.ehdr-menu .ehdr-note{padding:6px 10px 8px;font-size:10.5px;color:var(--text-muted,#565c72);letter-spacing:0.5px;}' +
    '.ehdr-badge{margin-left:auto;font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;' +
      'background:rgba(var(--kvk-accent-rgb,212,168,67),0.16);color:var(--kvk-accent,#d4a843);padding:1px 6px;border-radius:4px;}';

  function injectStyles() {
    var st = document.createElement('style');
    st.setAttribute('data-ehdr', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function authed() { return !!(window.Auth && window.Auth.isAuthed()); }
  function user() {
    if (window.Auth && window.Auth.currentUser) return window.Auth.currentUser();
    return { displayName: 'Guest', avatar: '👤', role: '' };
  }

  function buildMenu() {
    var isAuthed = authed();
    var items = [];
    items.push('<a class="ehdr-mi" href="' + href('admin/index.html') + '">🛠️ <span>Admin Portal</span><span class="ehdr-badge">preview</span></a>');
    items.push('<a class="ehdr-mi" href="' + href('admin/profile.html') + '">👤 <span>Profile</span></a>');
    items.push('<div class="ehdr-sep"></div>');
    if (isAuthed) {
      items.push('<div class="ehdr-mi" data-ehdr-action="logout">🚪 <span>Log out</span></div>');
    } else {
      items.push('<a class="ehdr-mi" href="' + href('admin/login.html') + '">🔑 <span>Sign in</span></a>');
    }
    items.push('<div class="ehdr-note">Preview build — editing & sign-in activate when hosted.</div>');
    return items.join('');
  }

  function render() {
    var u = user();
    var name = authed() ? (u.displayName || u.username || 'Commander') : 'Guest';
    var avatar = (u && u.avatar) ? u.avatar : '👤';

    var bar = document.createElement('div');
    bar.className = 'ehdr';
    bar.innerHTML =
      '<a class="ehdr-brand" href="' + href('index.html') + '">' +
        '<span class="ehdr-mark">◆</span><span>Era 8 Command</span></a>' +
      '<div class="ehdr-right">' +
        '<div class="ehdr-lang" id="ehdrLang">' +
          '<span class="ehdr-globe" aria-hidden="true">🌐</span>' +
          '<select id="ehdrLangSel" aria-label="Language"></select>' +
          '<span class="ehdr-caret">▼</span>' +
        '</div>' +
        '<div class="ehdr-chip" id="ehdrChip">' +
          '<span class="ehdr-av">' + avatar + '</span>' +
          '<span class="ehdr-name">' + name + '</span>' +
          '<span class="ehdr-caret">▼</span>' +
        '</div>' +
        '<div class="ehdr-menu" id="ehdrMenu">' + buildMenu() + '</div>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);

    // language dropdown: change fires the page's registered handler
    var langSel = bar.querySelector('#ehdrLangSel');
    langSel.addEventListener('change', function () {
      if (langCfg && typeof langCfg.onChange === 'function') langCfg.onChange(langSel.value);
      if (langCfg) langCfg.current = langSel.value;
    });
    renderLang(); // reflect any config registered before the header mounted

    var chip = bar.querySelector('#ehdrChip');
    var menu = bar.querySelector('#ehdrMenu');
    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function () { menu.classList.remove('open'); });

    var logout = menu.querySelector('[data-ehdr-action="logout"]');
    if (logout) logout.addEventListener('click', function () {
      if (window.Auth) window.Auth.logout();
      location.reload();
    });
  }

  // (re)build the language dropdown from langCfg; hides it when none registered
  function renderLang() {
    var wrap = document.getElementById('ehdrLang');
    var sel = document.getElementById('ehdrLangSel');
    if (!wrap || !sel) return; // header not mounted yet — render() calls this on mount
    if (!langCfg || !langCfg.codes || !langCfg.codes.length) {
      wrap.classList.remove('on');
      return;
    }
    sel.innerHTML = langCfg.codes.map(function (code) {
      return '<option value="' + code + '">' + (LANG_NAMES[code] || code.toUpperCase()) + '</option>';
    }).join('');
    if (langCfg.current) sel.value = langCfg.current;
    wrap.classList.add('on');
  }

  function init() { injectStyles(); render(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- public API ----------------------------------------------------------
  // Pages register their available languages; the header renders one uniform
  // dropdown next to the profile chip. Safe to call before or after mount.
  //   SiteHeader.setLanguages({ codes:['en','fr',...], current:'en', onChange: fn })
  //   SiteHeader.setCurrentLanguage('fr')   // reflect an external change
  window.SiteHeader = {
    setLanguages: function (cfg) {
      if (!cfg || !cfg.codes) { langCfg = null; renderLang(); return; }
      langCfg = { codes: cfg.codes.slice(), current: cfg.current || cfg.codes[0], onChange: cfg.onChange };
      renderLang();
    },
    setCurrentLanguage: function (code) {
      if (!langCfg) return;
      langCfg.current = code;
      var sel = document.getElementById('ehdrLangSel');
      if (sel) sel.value = code;
    },
    LANG_NAMES: LANG_NAMES
  };
})();
