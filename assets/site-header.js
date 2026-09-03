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

  // ---- persisted language preference (shared across all Era 8 pages) ----
  var LANG_STORE_KEY = 'era8_lang';
  function savedLang() {
    try { return window.localStorage.getItem(LANG_STORE_KEY); } catch (e) { return null; }
  }
  function saveLang(code) {
    try { window.localStorage.setItem(LANG_STORE_KEY, code); } catch (e) {}
  }

  // ---- header's own UI strings (profile dropdown + Guest chip), translated ----
  // Keyed by the current language; falls back to English for any missing entry.
  var HDR_STR = {
    en: { adminPortal:'Admin Portal', preview:'preview', profile:'Profile', logout:'Log out', signin:'Sign in', guest:'Guest', note:'Preview build — editing & sign-in activate when hosted.' },
    es: { adminPortal:'Portal de administración', preview:'vista previa', profile:'Perfil', logout:'Cerrar sesión', signin:'Iniciar sesión', guest:'Invitado', note:'Compilación de vista previa — la edición y el inicio de sesión se activan al alojar.' },
    fr: { adminPortal:"Portail d'administration", preview:'aperçu', profile:'Profil', logout:'Se déconnecter', signin:'Se connecter', guest:'Invité', note:"Version aperçu — l'édition et la connexion s'activent une fois hébergé." },
    ko: { adminPortal:'관리자 포털', preview:'미리보기', profile:'프로필', logout:'로그아웃', signin:'로그인', guest:'게스트', note:'미리보기 빌드 — 편집 및 로그인은 호스팅 시 활성화됩니다.' },
    ja: { adminPortal:'管理ポータル', preview:'プレビュー', profile:'プロフィール', logout:'ログアウト', signin:'サインイン', guest:'ゲスト', note:'プレビュー版 — 編集とサインインはホスティング時に有効化。' },
    zh_hk: { adminPortal:'管理入口', preview:'預覽', profile:'個人檔案', logout:'登出', signin:'登入', guest:'訪客', note:'預覽版本 — 編輯與登入將於託管後啟用。' },
    zh_cn: { adminPortal:'管理入口', preview:'预览', profile:'个人资料', logout:'登出', signin:'登录', guest:'访客', note:'预览版本 — 编辑与登录将于托管后启用。' },
    pt: { adminPortal:'Portal de administração', preview:'prévia', profile:'Perfil', logout:'Sair', signin:'Entrar', guest:'Convidado', note:'Compilação de prévia — edição e login ativam ao hospedar.' },
    sv: { adminPortal:'Adminportal', preview:'förhandsvisning', profile:'Profil', logout:'Logga ut', signin:'Logga in', guest:'Gäst', note:'Förhandsversion — redigering och inloggning aktiveras vid hosting.' },
    fi: { adminPortal:'Ylläpitoportaali', preview:'esikatselu', profile:'Profiili', logout:'Kirjaudu ulos', signin:'Kirjaudu sisään', guest:'Vieras', note:'Esikatseluversio — muokkaus ja kirjautuminen aktivoituvat isännöitäessä.' },
    nb: { adminPortal:'Adminportal', preview:'forhåndsvisning', profile:'Profil', logout:'Logg ut', signin:'Logg inn', guest:'Gjest', note:'Forhåndsversjon — redigering og innlogging aktiveres ved hosting.' },
    nl: { adminPortal:'Beheerportaal', preview:'voorbeeld', profile:'Profiel', logout:'Uitloggen', signin:'Inloggen', guest:'Gast', note:'Voorbeeldversie — bewerken en inloggen activeren bij hosting.' },
    de: { adminPortal:'Admin-Portal', preview:'Vorschau', profile:'Profil', logout:'Abmelden', signin:'Anmelden', guest:'Gast', note:'Vorschau-Build — Bearbeiten und Anmelden werden beim Hosting aktiviert.' },
    ar: { adminPortal:'بوابة الإدارة', preview:'معاينة', profile:'الملف الشخصي', logout:'تسجيل الخروج', signin:'تسجيل الدخول', guest:'زائر', note:'إصدار معاينة — التحرير وتسجيل الدخول يُفعّلان عند الاستضافة.' },
    si: { adminPortal:'පරිපාලක ද්වාරය', preview:'පෙරදසුන', profile:'පැතිකඩ', logout:'පිටවීම', signin:'පිවිසෙන්න', guest:'අමුත්තා', note:'පෙරදසුන් අනුවාදය — සංස්කරණය සහ පිවිසීම සත්කාරකත්වයේදී සක්‍රිය වේ.' },
    ta: { adminPortal:'நிர்வாக போர்டல்', preview:'முன்னோட்டம்', profile:'சுயவிவரம்', logout:'வெளியேறு', signin:'உள்நுழை', guest:'விருந்தினர்', note:'முன்னோட்ட பதிப்பு — திருத்தம் மற்றும் உள்நுழைவு ஹோஸ்ட் செய்யும்போது செயல்படும்.' },
    hi: { adminPortal:'व्यवस्थापक पोर्टल', preview:'पूर्वावलोकन', profile:'प्रोफ़ाइल', logout:'लॉग आउट', signin:'साइन इन', guest:'अतिथि', note:'पूर्वावलोकन बिल्ड — संपादन और साइन-इन होस्ट होने पर सक्रिय होते हैं।' },
    da: { adminPortal:'Adminportal', preview:'forhåndsvisning', profile:'Profil', logout:'Log ud', signin:'Log ind', guest:'Gæst', note:'Forhåndsversion — redigering og login aktiveres ved hosting.' },
    ru: { adminPortal:'Портал администратора', preview:'предпросмотр', profile:'Профиль', logout:'Выйти', signin:'Войти', guest:'Гость', note:'Предварительная сборка — редактирование и вход активируются при размещении.' },
    it: { adminPortal:'Portale di amministrazione', preview:'anteprima', profile:'Profilo', logout:'Esci', signin:'Accedi', guest:'Ospite', note:'Build di anteprima — modifica e accesso si attivano con l\'hosting.' }
  };
  function ht(key) {
    var lang = (langCfg && langCfg.current) || savedLang() || 'en';
    var tbl = HDR_STR[lang] || HDR_STR.en;
    return (tbl && tbl[key] !== undefined) ? tbl[key] : HDR_STR.en[key];
  }

  // ---- breadcrumb page names, keyed by filename ----
  // The brand renders "◆ ERA 8 COMMAND › <page>". Home (index.html) shows no crumb.
  // A page can override with <body data-page-name="…"> or SiteHeader.setPageName().
  var PAGE_NAMES = {
    'index.html': null,                                   // home — no crumb
    'tme_command_center.html': 'The Mightiest Empire',
    'desolate_desert.html': 'Desolate Desert',
    'primordial_conflict_dashboard.html': 'Primordial Conflict',
    'kvk_history.html': 'KvK History',
    'horse_breeding.html': 'Horse Breeding',
    'behemoth_conquest.html': 'Behemoth Conquest',
    'day6_showdown_flyer.html': 'Day 6 Showdown',
    'order_workshop_flyer.html': 'Order Workshop',
    'golden_expedition_flyer.html': 'Golden Expedition',
    'login.html': 'Sign In',
    'profile.html': 'Profile'
  };
  var pageNameOverride = null;

  function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]);
    });
  }

  function currentPageName() {
    if (pageNameOverride !== null) return pageNameOverride;
    var attr = document.body && document.body.getAttribute('data-page-name');
    if (attr) return attr;
    var file = (location.pathname.split('/').pop() || 'index.html');
    if (file === '' ) file = 'index.html';
    // admin/index.html collides with home's "index.html"; disambiguate by parent dir.
    if (file === 'index.html') {
      var parts = location.pathname.split('/').filter(Boolean);
      var dir = parts.length >= 2 ? parts[parts.length - 2] : '';
      if (dir === 'admin') return 'Admin Portal';
      if (dir === 'glossary') return 'Glossary';
      if (dir === 'marches') return 'My Marches';
    }
    return PAGE_NAMES.hasOwnProperty(file) ? PAGE_NAMES[file] : null;
  }

  // ---- scoped styles ----
  var CSS =
    /* full-bleed even when the page <body> has horizontal padding (index, kvk_history) */
    '.ehdr{position:sticky;top:0;z-index:1000;box-sizing:border-box;width:100vw;margin-left:calc(50% - 50vw);' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'padding:8px 16px;background:rgba(10,12,20,0.92);backdrop-filter:blur(8px);' +
      'border-bottom:2px solid var(--kvk-accent-dim,#a17e2f);font-family:"Barlow Condensed",sans-serif;}' +
    '.ehdr a{text-decoration:none;color:inherit;}' +
    '.ehdr-crumbs{display:flex;align-items:center;gap:9px;min-width:0;}' +
    '.ehdr-brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:1.5px;' +
      'text-transform:uppercase;font-size:15px;color:var(--text-primary,#e8eaf0);flex:0 0 auto;}' +
    '.ehdr-brand .ehdr-mark{color:var(--kvk-accent,#d4a843);font-size:18px;line-height:1;}' +
    /* 90° chevron drawn from borders — crisp thin ">" */
    '.ehdr-chevron{flex:0 0 auto;width:6px;height:6px;border-top:2px solid var(--text-muted,#565c72);' +
      'border-right:2px solid var(--text-muted,#565c72);transform:rotate(45deg);margin:0 2px;}' +
    '.ehdr-page{font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:13px;' +
      'color:var(--text-secondary,#8a90a5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
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
    items.push('<a class="ehdr-mi" href="' + href('admin/index.html') + '">🛠️ <span>' + escapeHTML(ht('adminPortal')) + '</span><span class="ehdr-badge">' + escapeHTML(ht('preview')) + '</span></a>');
    items.push('<a class="ehdr-mi" href="' + href('admin/profile.html') + '">👤 <span>' + escapeHTML(ht('profile')) + '</span></a>');
    items.push('<div class="ehdr-sep"></div>');
    if (isAuthed) {
      items.push('<div class="ehdr-mi" data-ehdr-action="logout">🚪 <span>' + escapeHTML(ht('logout')) + '</span></div>');
    } else {
      items.push('<a class="ehdr-mi" href="' + href('admin/login.html') + '">🔑 <span>' + escapeHTML(ht('signin')) + '</span></a>');
    }
    items.push('<div class="ehdr-note">' + escapeHTML(ht('note')) + '</div>');
    return items.join('');
  }

  function render() {
    var u = user();
    var name = authed() ? (u.displayName || u.username || 'Commander') : ht('guest');
    var avatar = (u && u.avatar) ? u.avatar : '👤';

    var pageName = currentPageName();
    var crumb = pageName
      ? '<span class="ehdr-chevron" aria-hidden="true"></span><span class="ehdr-page">' + escapeHTML(pageName) + '</span>'
      : '';

    var bar = document.createElement('div');
    bar.className = 'ehdr';
    bar.innerHTML =
      '<div class="ehdr-crumbs">' +
        '<a class="ehdr-brand" href="' + href('index.html') + '">' +
          '<span class="ehdr-mark">◆</span><span>Era 8 Command</span></a>' +
        crumb +
      '</div>' +
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
      saveLang(langSel.value); // remember across pages/visits
      if (langCfg && typeof langCfg.onChange === 'function') langCfg.onChange(langSel.value);
      if (langCfg) langCfg.current = langSel.value;
      refreshHeaderStrings(); // re-translate the header's own labels
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

  // Re-translate the header's own labels (profile menu + Guest chip) in place.
  function refreshHeaderStrings() {
    var menu = document.getElementById('ehdrMenu');
    if (menu) {
      menu.innerHTML = buildMenu();
      var logout = menu.querySelector('[data-ehdr-action="logout"]');
      if (logout) logout.addEventListener('click', function () {
        if (window.Auth) window.Auth.logout();
        location.reload();
      });
    }
    if (!authed()) {
      var nameEl = document.querySelector('.ehdr-name');
      if (nameEl) nameEl.textContent = ht('guest');
    }
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
      var current = cfg.current || cfg.codes[0];
      // Restore a previously chosen language (if this page supports it) so the
      // preference persists across pages and return visits.
      var saved = savedLang();
      var applySaved = saved && saved !== current && cfg.codes.indexOf(saved) !== -1;
      if (applySaved) current = saved;
      langCfg = { codes: cfg.codes.slice(), current: current, onChange: cfg.onChange };
      renderLang();
      refreshHeaderStrings(); // translate the header's own labels to the active language
      // Tell the page to actually switch into the restored language on load.
      if (applySaved && typeof cfg.onChange === 'function') cfg.onChange(current);
    },
    setCurrentLanguage: function (code) {
      if (!langCfg) return;
      langCfg.current = code;
      var sel = document.getElementById('ehdrLangSel');
      if (sel) sel.value = code;
      refreshHeaderStrings();
    },
    // Override the breadcrumb page name (else it's derived from the URL/PAGE_NAMES).
    setPageName: function (name) {
      pageNameOverride = name;
      var el = document.querySelector('.ehdr-page');
      var crumbs = document.querySelector('.ehdr-crumbs');
      if (!crumbs) return;
      if (name) {
        if (!el) {
          crumbs.insertAdjacentHTML('beforeend',
            '<span class="ehdr-chevron" aria-hidden="true"></span><span class="ehdr-page"></span>');
          el = crumbs.querySelector('.ehdr-page');
        }
        el.textContent = name;
      } else if (el) {
        var chev = crumbs.querySelector('.ehdr-chevron');
        if (chev) chev.remove();
        el.remove();
      }
    },
    LANG_NAMES: LANG_NAMES
  };
})();
