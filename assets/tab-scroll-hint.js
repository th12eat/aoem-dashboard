/* tab-scroll-hint.js — mobile scroll cue for horizontally-overflowing tab bars.
 *
 * Drop-in: <script src="../assets/tab-scroll-hint.js" defer></script>
 * Works on any bar matching .tabs or .tab-bar (React or static markup).
 *
 * For each bar it appends two fixed-position arrow overlays to <body> (so
 * framework re-renders of the bar never remove them), positions them over the
 * bar's left/right edges, and shows an arrow only when the bar can still be
 * scrolled that direction. Desktop bars that fit never trigger it.
 */
(function () {
  "use strict";
  var SELECTOR = ".tabs, .tab-bar";
  var EPS = 4; // px slack so a fully-scrolled bar doesn't flicker

  function makeHint(dir) {
    var el = document.createElement("div");
    el.className = "tab-scroll-hint hint-" + dir;
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--hint-nudge", dir === "left" ? "-2px" : "2px");
    // glyph in a span nudged up ~2px: the ‹ › chevrons render low in their line
    // box, so this optically centers them with the tab text. (Element itself
    // keeps the translateX pulse animation.)
    var g = document.createElement("span");
    g.className = "tsh-glyph";
    g.textContent = dir === "left" ? "‹" : "›"; // ‹ ›
    el.appendChild(g);
    document.body.appendChild(el);
    return el;
  }

  function track(bar) {
    if (bar.__hintTracked) return;
    bar.__hintTracked = true;

    // Fallback for browsers without `justify-content: safe center`: when the bar
    // overflows, `center` would clip the first tab unreachably. Detect that (first
    // tab starts left of the bar with scrollLeft 0) and pin start alignment.
    (function ensureStartVisible() {
      var first = bar.querySelector("button, a, .tab, .tab-btn");
      if (!first) return;
      var overflow = bar.scrollWidth - bar.clientWidth > EPS;
      if (overflow && bar.scrollLeft === 0) {
        var fr = first.getBoundingClientRect(), br = bar.getBoundingClientRect();
        if (fr.left < br.left - 1) bar.style.justifyContent = "flex-start";
      }
    })();
    var left = makeHint("left");
    var right = makeHint("right");

    function update() {
      var canScroll = bar.scrollWidth - bar.clientWidth > EPS;
      if (!canScroll) {
        left.classList.remove("is-visible");
        right.classList.remove("is-visible");
        return;
      }
      var r = bar.getBoundingClientRect();
      // vertically center each arrow on the bar
      var h = 30;
      var top = Math.round(r.top + (r.height - h) / 2);
      [left, right].forEach(function (el) { el.style.top = top + "px"; el.style.height = h + "px"; });
      left.style.left = Math.round(r.left) + "px";
      right.style.left = Math.round(r.right - 26) + "px";

      var atStart = bar.scrollLeft <= EPS;
      var atEnd = bar.scrollLeft >= (bar.scrollWidth - bar.clientWidth - EPS);
      left.classList.toggle("is-visible", !atStart);
      right.classList.toggle("is-visible", !atEnd);
    }

    bar.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true }); // reposition on page scroll
    // re-check after fonts/layout settle
    update();
    setTimeout(update, 200);
    setTimeout(update, 800);
    bar.__hintUpdate = update;
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(track);
  }

  function init() {
    scan();
    // React pages mount their bar after first paint — watch for it.
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { scan(); });
      mo.observe(document.body, { childList: true, subtree: true });
      // stop observing after 8s; by then any tab bar exists
      setTimeout(function () { mo.disconnect(); }, 8000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
