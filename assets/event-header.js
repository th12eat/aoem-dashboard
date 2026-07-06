/* ============================================================
   event-header.js — Era 8 Command
   ------------------------------------------------------------
   Renders the standard Behemoth-style event meta block into a
   target element:
     • Start | End | Timezone box (centered, shrink-to-content)
     • live countdown (days/hours/min/sec)
     • a STAGE INDICATOR label that shows the current phase and
       flips to "Event Complete" once the end date passes
     • an iCal button (stub-friendly)

   All values are config-driven so pages stay declarative and the
   admin panel can later feed the same config shape.

   ── Usage ───────────────────────────────────────────────────
     <div id="evtMeta"></div>
     ...
     <script src="../assets/event-header.js"></script>
     <script>
       EventHeader.mount('#evtMeta', {
         startISO: '2026-06-22T00:00:00Z',   // optional
         endISO:   '2026-06-30T00:00:00Z',   // optional
         startLabel: 'Jun 22',                // shown in the box
         endLabel:   'Jun 30',
         timezone:   'UTC+0',
         // stages drive the indicator; each {fromISO, label}. The
         // current stage = last one whose fromISO <= now. After endISO
         // the label becomes "Event Complete".
         stages: [
           { fromISO:'2026-06-22T00:00:00Z', label:'Day 1 — Scouting' },
           { fromISO:'2026-06-24T00:00:00Z', label:'Day 3 — Battle' }
         ],
         // ical: pass a function returning an ICS string to enable a real
         // download, or { stub:true } to show a disabled "coming soon" pill.
         ical: { stub:true, label:'Add to Calendar' }
       });
   The component is theme-aware (uses --kvk-accent via the page's
   data-kvk). Call EventHeader.refresh() after changing config.
   ============================================================ */
(function (global) {
  'use strict';

  var CSS_ID = 'evt-header-css';
  var CSS =
    '.evt-meta{display:flex;flex-direction:column;align-items:center;gap:0;}' +
    '.evt-timerow{margin-top:18px;display:inline-flex;align-items:center;gap:16px;' +
      'background:rgba(var(--kvk-accent-rgb,212,168,67),0.10);border:1px solid var(--kvk-accent-dim,#a17e2f);' +
      'border-radius:8px;padding:8px 22px;}' +
    '.evt-timerow .evt-cell{text-align:center;}' +
    '.evt-timerow .evt-label{font-family:var(--font-ui,"Barlow Condensed",sans-serif);font-weight:600;' +
      'font-size:var(--fs-sub,12px);letter-spacing:2px;text-transform:uppercase;color:var(--kvk-accent,#d4a843);}' +
    '.evt-timerow .evt-val{font-family:var(--font-display,"Bebas Neue",sans-serif);font-size:var(--fs-h2,24px);' +
      'color:var(--text-primary,#e8eaf0);letter-spacing:1px;}' +
    '.evt-timerow .evt-div{width:1px;height:30px;background:var(--kvk-accent-dim,#a17e2f);}' +
    '.evt-countdown{display:flex;justify-content:center;gap:16px;margin-top:16px;flex-wrap:wrap;}' +
    '.evt-cd{text-align:center;min-width:56px;}' +
    '.evt-cd .v{font-family:var(--font-display,"Bebas Neue",sans-serif);font-size:var(--fs-stat,32px);' +
      'color:var(--kvk-accent,#d4a843);line-height:1;}' +
    '.evt-cd .u{font-family:var(--font-ui,"Barlow Condensed",sans-serif);font-size:var(--fs-micro,11px);' +
      'letter-spacing:1px;text-transform:uppercase;color:var(--text-muted,#565c72);}' +
    '.evt-stage{font-family:var(--font-ui,"Barlow Condensed",sans-serif);font-size:var(--fs-sub,12px);' +
      'letter-spacing:2px;text-transform:uppercase;color:var(--text-secondary,#8a90a5);margin-top:8px;text-align:center;}' +
    '.evt-stage b{color:var(--kvk-accent,#d4a843);font-weight:700;}' +
    '.evt-ical{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:14px auto 0;' +
      'padding:8px 16px;background:var(--bg-card,#11141f);border:1px solid var(--kvk-accent-dim,#a17e2f);' +
      'border-radius:999px;cursor:pointer;transition:background .15s;max-width:90%;}' +
    '.evt-ical:hover{background:rgba(var(--kvk-accent-rgb,212,168,67),0.12);}' +
    '.evt-ical[disabled]{cursor:default;opacity:0.65;}' +
    '.evt-ical .ico{font-size:16px;line-height:1;flex-shrink:0;}' +
    '.evt-ical .lbl{font-family:var(--font-ui,"Barlow Condensed",sans-serif);font-size:var(--fs-label,13px);' +
      'font-weight:700;letter-spacing:0.5px;color:var(--kvk-accent,#d4a843);line-height:1.2;}';

  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID; st.textContent = CSS;
    document.head.appendChild(st);
  }

  var state = { el: null, cfg: null, timer: null };

  function pad(n) { return String(n).padStart(2, '0'); }

  // current stage label, or "Event Complete" past endISO
  function stageLabel(cfg, now) {
    if (cfg.forceComplete) return cfg.completeLabel || 'Event Complete';
    if (cfg.endISO && now >= Date.parse(cfg.endISO)) return cfg.completeLabel || 'Event Complete';
    if (cfg.startISO && now < Date.parse(cfg.startISO)) return cfg.pendingLabel || 'Event Not Started';
    if (cfg.stages && cfg.stages.length) {
      var cur = null;
      for (var i = 0; i < cfg.stages.length; i++) {
        var f = Date.parse(cfg.stages[i].fromISO);
        if (!isNaN(f) && now >= f) cur = cfg.stages[i];
      }
      if (cur) return cur.label;
      return cfg.stages[0].label; // before first stage boundary but after start
    }
    return cfg.liveLabel || 'Event Live';
  }

  function tick() {
    var cfg = state.cfg, root = state.el;
    if (!cfg || !root) return;
    var now = Date.now();

    // countdown target: start (if not begun) else end
    var target = null, prefix = '';
    if (cfg.startISO && now < Date.parse(cfg.startISO)) { target = Date.parse(cfg.startISO); }
    else if (cfg.endISO && now < Date.parse(cfg.endISO)) { target = Date.parse(cfg.endISO); }

    var cd = root.querySelector('.evt-countdown');
    if (target && cd) {
      var diff = Math.max(0, target - now);
      setText(root, '.evt-cd-d', String(Math.floor(diff / 86400000)));
      setText(root, '.evt-cd-h', pad(Math.floor((diff % 86400000) / 3600000)));
      setText(root, '.evt-cd-m', pad(Math.floor((diff % 3600000) / 60000)));
      setText(root, '.evt-cd-s', pad(Math.floor((diff % 60000) / 1000)));
      cd.style.display = '';
    } else if (cd) {
      cd.style.display = 'none'; // no dates yet, or event over
    }

    var stage = root.querySelector('.evt-stage');
    if (stage) stage.innerHTML = '<b>' + escapeHTML(stageLabel(cfg, now)) + '</b>';
  }

  function setText(root, sel, v) { var e = root.querySelector(sel); if (e) e.textContent = v; }
  function escapeHTML(s) { return String(s).replace(/[&<>]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }

  function render() {
    var cfg = state.cfg, root = state.el;
    injectCSS();
    root.classList.add('evt-meta');

    var hasDates = cfg.startLabel || cfg.endLabel || cfg.timezone;
    var box = '';
    if (hasDates) {
      var cells = [];
      if (cfg.startLabel) cells.push('<div class="evt-cell"><div class="evt-label">' + escapeHTML(cfg.startLabelText || 'Starts') + '</div><div class="evt-val">' + escapeHTML(cfg.startLabel) + '</div></div>');
      if (cfg.endLabel)   cells.push('<div class="evt-cell"><div class="evt-label">' + escapeHTML(cfg.endLabelText || 'Ends') + '</div><div class="evt-val">' + escapeHTML(cfg.endLabel) + '</div></div>');
      if (cfg.timezone)   cells.push('<div class="evt-cell"><div class="evt-label">' + escapeHTML(cfg.timezoneLabelText || 'Timezone') + '</div><div class="evt-val">' + escapeHTML(cfg.timezone) + '</div></div>');
      box = '<div class="evt-timerow">' + cells.join('<div class="evt-div"></div>') + '</div>';
    }

    var countdown =
      '<div class="evt-countdown">' +
        '<div class="evt-cd"><div class="v evt-cd-d">--</div><div class="u">Days</div></div>' +
        '<div class="evt-cd"><div class="v evt-cd-h">--</div><div class="u">Hours</div></div>' +
        '<div class="evt-cd"><div class="v evt-cd-m">--</div><div class="u">Min</div></div>' +
        '<div class="evt-cd"><div class="v evt-cd-s">--</div><div class="u">Sec</div></div>' +
      '</div>';

    var stage = '<div class="evt-stage"></div>';

    var ical = '';
    if (cfg.ical) {
      var label = cfg.ical.label || 'Add to Calendar';
      var dis = cfg.ical.stub ? ' disabled title="Calendar export coming soon"' : '';
      ical = '<button type="button" class="evt-ical"' + dis + '>' +
               '<span class="ico" aria-hidden="true">📅</span>' +
               '<span class="lbl">' + escapeHTML(label) + (cfg.ical.stub ? ' (soon)' : '') + '</span>' +
             '</button>';
    }

    root.innerHTML = box + countdown + stage + ical;

    // wire a real ical download if a generator was supplied
    if (cfg.ical && !cfg.ical.stub && typeof cfg.ical.build === 'function') {
      var btn = root.querySelector('.evt-ical');
      if (btn) btn.addEventListener('click', function () {
        var ics = cfg.ical.build();
        var blob = new Blob([ics], { type: 'text/calendar' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (cfg.ical.filename || 'event') + '.ics';
        a.click();
      });
    }

    tick();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
  }

  var EventHeader = {
    mount: function (selector, cfg) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) { console.error('EventHeader.mount: target not found', selector); return; }
      state.el = el; state.cfg = cfg || {};
      render();
    },
    refresh: function (cfg) { if (cfg) state.cfg = cfg; render(); },
    setConfig: function (patch) { Object.assign(state.cfg, patch); render(); }
  };

  global.EventHeader = EventHeader;
})(window);
