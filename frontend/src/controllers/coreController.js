/* Migrated from active js/core.js; behavior retained. */
import { STATUS, statusKind, fetchJson } from "../status/messages.js";
import { searchService } from "../services/search/searchService.js";
import { CONTENT_TYPES } from "../../../shared/contentTypes.js";
import { installImageFallbacks } from "../utils/images.js";

/** Data files loaded on demand (S.loadScript), each split into its own chunk by Vite. */
var DATA_MODULES = {
  "data/nitnem-text.js": function () { return import("../data/nitnem-text.js"); },
  "data/search": function () { return import("../data/searchData.js"); },
};

export function initCore() {
"use strict";
  var S = (window.Sikhify = window.Sikhify || {});
  window.SikhifyData = window.SikhifyData || {};
  installImageFallbacks(); // broken artwork → symbolic emblem, never a broken image

  /* ------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------ */
  S.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
  S.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };
  S.norm = function (s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  };
  /** Case-insensitive, partial-word match: every word of `query` must appear in `text`. */
  S.matches = function (text, query) {
    var terms = S.norm(query).split(" ").filter(Boolean);
    if (!terms.length) return true;
    var hay = S.norm(text);
    return terms.every(function (t) { return hay.indexOf(t) !== -1; });
  };
  /** Wraps query matches in <mark>; `text` is escaped. */
  S.highlight = function (text, query) {
    var safe = S.esc(text);
    var terms = String(query || "").trim().split(/\s+/).filter(Boolean)
      .map(function (t) { return S.esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    if (!terms.length) return safe;
    return safe.replace(new RegExp("(" + terms.join("|") + ")", "gi"), "<mark>$1</mark>");
  };
  /** Reads `#key=value&key2=value2` style hash params. */
  S.hashParams = function () {
    var out = {};
    location.hash.replace(/^#/, "").split("&").forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf("=");
      if (i === -1) out[decodeURIComponent(pair)] = true;
      else out[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return out;
  };
  S.setHash = function (params, replace) {
    var str = Object.keys(params)
      .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    var url = location.pathname + location.search + (str ? "#" + str : "");
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  };
  S.pageUrl = function (hash) {
    return location.href.split("#")[0] + (hash ? "#" + hash : "");
  };
  S.loadScript = function (src) {
    if (DATA_MODULES[src]) return DATA_MODULES[src]().then(function () {});
    return new Promise(function (resolve, reject) {
      // Already on the page (static <script src>) or loaded earlier?
      var existing = [].some.call(document.scripts, function (s) {
        return s.dataset.src === src || (s.getAttribute("src") || "").split("?")[0] === src;
      });
      if (existing) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.dataset.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
  };
  /* ------------------------------------------------------------------
     Requests & status states (copy shared with the React status screens)
     ------------------------------------------------------------------ */
  /** fetch + JSON with a timeout; rejects with an error carrying `kind` (network, timeout, server…). */
  S.fetchJson = fetchJson;
  S.statusKind = statusKind;
  /**
   * Inline state for a failed request. Visitors see friendly copy for the kind of
   * failure — never URLs or error details.
   * opts: { error, title?, text?, actions? (HTML) }
   */
  S.statusHtml = function (opts) {
    var kind = statusKind(opts.error);
    var copy = STATUS[kind] || STATUS.server;
    var icon = kind === "network" ? "offline" : kind === "timeout" ? "clock" : "alert";
    return '<div class="sk-empty sk-status" role="alert" data-status="' + kind + '">' +
      '<span class="sk-status-icon" aria-hidden="true">' + S.icon(icon, 22) + "</span>" +
      '<p class="sk-empty-title">' + S.esc(opts.title || copy.title) + "</p>" +
      "<p>" + S.esc(opts.text || copy.reason || copy.text) + "</p>" +
      (opts.actions ? '<div class="sk-suggest">' + opts.actions + "</div>" : "") + "</div>";
  };

  S.formatTime = function (sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  };

  /* ------------------------------------------------------------------
     Storage helper — every key is prefixed "sikhify:" and JSON encoded.
     Fails silently (private mode, blocked storage).
     ------------------------------------------------------------------ */
  S.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem("sikhify:" + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem("sikhify:" + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
    remove: function (key) {
      try { localStorage.removeItem("sikhify:" + key); } catch (e) { /* storage unavailable */ }
    },
  };

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  var toastWrap;
  S.toast = function (message, kind) {
    if (!toastWrap) {
      toastWrap = document.createElement("div");
      toastWrap.className = "sk-toasts";
      toastWrap.setAttribute("role", "status");
      toastWrap.setAttribute("aria-live", "polite");
      document.body.appendChild(toastWrap);
    }
    var t = document.createElement("div");
    t.className = "sk-toast" + (kind === "error" ? " is-error" : "");
    t.textContent = message;
    toastWrap.appendChild(t);
    setTimeout(function () { t.classList.add("is-leaving"); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  };

  /* ------------------------------------------------------------------
     Copy & share
     ------------------------------------------------------------------ */
  S.copy = function (text, label) {
    var done = function () { S.toast((label || "Text") + " copied"); };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) ? done() : S.toast("Couldn't copy — please copy manually", "error"); });
    }
    legacyCopy(text) ? done() : S.toast("Couldn't copy — please copy manually", "error");
    return Promise.resolve();
  };
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  S.share = function (data) {
    if (navigator.share) {
      return navigator.share(data).catch(function (err) {
        if (err && err.name !== "AbortError") S.copy(data.url, "Link");
      });
    }
    return S.copy(data.url, "Link");
  };

  /* ------------------------------------------------------------------
     Dialog — native <dialog> gives Escape handling, focus containment and
     inert background. Content is passed as HTML (already escaped).
     ------------------------------------------------------------------ */
  var dlg, dlgBody, dlgTitle, lastFocus;
  S.dialog = {
    open: function (opts) {
      if (!dlg) {
        dlg = document.createElement("dialog");
        dlg.className = "sk-dialog";
        dlg.setAttribute("aria-labelledby", "sk-dialog-title");
        dlg.innerHTML =
          '<div class="sk-dialog-head"><h2 id="sk-dialog-title" class="sk-dialog-title"></h2>' +
          '<button type="button" class="sk-icon-btn" data-dialog-close aria-label="Close">' + S.icon("close") + "</button></div>" +
          '<div class="sk-dialog-body"></div>';
        document.body.appendChild(dlg);
        dlgBody = dlg.querySelector(".sk-dialog-body");
        dlgTitle = dlg.querySelector(".sk-dialog-title");
        dlg.addEventListener("click", function (e) {
          if (e.target === dlg || e.target.closest("[data-dialog-close]")) S.dialog.close();
        });
        dlg.addEventListener("close", function () {
          if (S.dialog.onClose) { var cb = S.dialog.onClose; S.dialog.onClose = null; cb(); }
          if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
        });
      }
      // Re-rendering an open dialog (e.g. after a language change) keeps the original return-focus target.
      if (!dlg.open) lastFocus = document.activeElement;
      dlgTitle.textContent = opts.title || "";
      dlgBody.innerHTML = opts.html || "";
      S.dialog.onClose = opts.onClose || null;
      if (!dlg.open) dlg.showModal();
      dlgBody.scrollTop = 0;
      return dlgBody;
    },
    close: function () { if (dlg && dlg.open) dlg.close(); },
    get body() { return dlgBody; },
  };

  /* ------------------------------------------------------------------
     Bookmarks — items: { id, type, title, subtitle, url, savedAt }
     ------------------------------------------------------------------ */
  S.bookmarks = {
    all: function () { return S.store.get("bookmarks", []); },
    has: function (id) { return S.bookmarks.all().some(function (b) { return b.id === id; }); },
    toggle: function (item) {
      var list = S.bookmarks.all();
      var exists = list.some(function (b) { return b.id === item.id; });
      if (exists) list = list.filter(function (b) { return b.id !== item.id; });
      else list.unshift(Object.assign({ savedAt: Date.now() }, item));
      S.store.set("bookmarks", list);
      S.toast(exists ? "Removed from bookmarks" : "Saved to My Bookmarks");
      document.dispatchEvent(new CustomEvent("sikhify:bookmarks"));
      return !exists;
    },
    ofType: function (types) {
      return S.bookmarks.all().filter(function (b) { return types.indexOf(b.type) !== -1; });
    },
  };
  /** Keeps every [data-bookmark-id] button's pressed state in sync. */
  S.syncBookmarkButtons = function (root) {
    (root || document).querySelectorAll("[data-bookmark-id]").forEach(function (btn) {
      var on = S.bookmarks.has(btn.dataset.bookmarkId);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      var label = btn.querySelector(".sk-btn-label");
      if (label) label.textContent = on ? "Saved" : "Bookmark";
    });
  };
  document.addEventListener("sikhify:bookmarks", function () { S.syncBookmarkButtons(); });

  /* ------------------------------------------------------------------
     Icons (inline SVG, inherit currentColor)
     ------------------------------------------------------------------ */
  var ICONS = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" stroke="none"/>',
    prev: '<path d="M6 5v14M19 5L9 12l10 7z"/>',
    next: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>',
    offline: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/><path d="M3 3l18 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  };
  S.icon = function (name, size) {
    size = size || 18;
    return '<svg class="sk-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ------------------------------------------------------------------
     Theme — site-wide dark mode (html.theme-dark), persisted.
     The <head> of every page applies the saved theme before paint.
     ------------------------------------------------------------------ */
  S.theme = {
    isDark: function () { return document.documentElement.classList.contains("theme-dark"); },
    set: function (dark) {
      document.documentElement.classList.toggle("theme-dark", dark);
      S.store.set("theme", dark ? "dark" : "light");
      var btn = document.getElementById("theme-toggle");
      if (btn) {
        btn.setAttribute("aria-pressed", dark ? "true" : "false");
        btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      }
    },
    toggle: function () { S.theme.set(!S.theme.isDark()); },
  };

  /* ------------------------------------------------------------------
     Gurbani reading preferences (persisted)
     ------------------------------------------------------------------ */
  var SIZES = [1.05, 1.25, 1.45, 1.7, 2.0]; // rem
  var SPACING = { compact: 1.6, normal: 1.95, relaxed: 2.35 };
  var PREF_DEFAULTS = { size: 2, spacing: "normal", lang: "en", meaning: true, translit: true, readingTheme: "light" };
  S.prefs = {
    get: function () { return Object.assign({}, PREF_DEFAULTS, S.store.get("readingPrefs", {})); },
    set: function (patch) {
      var next = Object.assign(S.prefs.get(), patch);
      next.size = Math.max(0, Math.min(SIZES.length - 1, next.size));
      S.store.set("readingPrefs", next);
      S.prefs.apply();
      document.dispatchEvent(new CustomEvent("sikhify:prefs", { detail: next }));
      return next;
    },
    apply: function () {
      var p = S.prefs.get();
      var root = document.documentElement.style;
      root.setProperty("--gb-size", SIZES[p.size] + "rem");
      root.setProperty("--gb-leading", SPACING[p.spacing] || SPACING.normal);
      document.documentElement.classList.toggle("gb-hide-meaning", !p.meaning);
      document.documentElement.classList.toggle("gb-hide-translit", !p.translit);
    },
    SIZES: SIZES,
  };
  S.prefs.apply();

  /** Renders the shared reading-preference toolbar. Controls are wired by delegation below. */
  S.prefsToolbar = function (opts) {
    opts = opts || {};
    var p = S.prefs.get();
    var lang = function (code, label) {
      return '<button type="button" class="sk-seg-btn" data-pref-lang="' + code + '" aria-pressed="' + (p.lang === code) + '">' + label + "</button>";
    };
    return (
      '<div class="sk-prefs" role="group" aria-label="Reading preferences">' +
      '<div class="sk-seg" role="group" aria-label="Meaning language">' + lang("pa", "ਪੰਜਾਬੀ") + lang("hi", "हिंदी") + lang("en", "English") + "</div>" +
      '<div class="sk-seg" role="group" aria-label="Gurmukhi text size">' +
      '<button type="button" class="sk-seg-btn" data-pref-size="-1" aria-label="Smaller text">A−</button>' +
      '<button type="button" class="sk-seg-btn" data-pref-size="reset" aria-label="Default text size">A</button>' +
      '<button type="button" class="sk-seg-btn" data-pref-size="1" aria-label="Larger text">A+</button></div>' +
      '<label class="sk-select-label"><span class="sr-only">Line spacing</span><select class="sk-select" data-pref-spacing aria-label="Line spacing">' +
      ["compact", "normal", "relaxed"].map(function (k) {
        return '<option value="' + k + '"' + (p.spacing === k ? " selected" : "") + ">" + k.charAt(0).toUpperCase() + k.slice(1) + " spacing</option>";
      }).join("") + "</select></label>" +
      '<button type="button" class="sk-chip-toggle" data-pref-toggle="translit" aria-pressed="' + p.translit + '">Transliteration</button>' +
      '<button type="button" class="sk-chip-toggle" data-pref-toggle="meaning" aria-pressed="' + p.meaning + '">Meaning</button>' +
      (opts.readingMode ? '<button type="button" class="sk-btn sk-btn-navy sk-btn-sm" data-open-reading>' + S.icon("expand", 16) + "Reading mode</button>" : "") +
      "</div>"
    );
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-pref-lang],[data-pref-size],[data-pref-toggle]");
    if (!t) return;
    var p = S.prefs.get();
    if (t.dataset.prefLang) S.prefs.set({ lang: t.dataset.prefLang });
    else if (t.dataset.prefSize) S.prefs.set({ size: t.dataset.prefSize === "reset" ? PREF_DEFAULTS.size : p.size + Number(t.dataset.prefSize) });
    else if (t.dataset.prefToggle) S.prefs.set(JSON.parse('{"' + t.dataset.prefToggle + '":' + !p[t.dataset.prefToggle] + "}"));
  });
  document.addEventListener("change", function (e) {
    if (e.target.matches("[data-pref-spacing]")) S.prefs.set({ spacing: e.target.value });
  });
  document.addEventListener("sikhify:prefs", function () {
    var p = S.prefs.get();
    document.querySelectorAll("[data-pref-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.prefLang === p.lang)); });
    document.querySelectorAll("[data-pref-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", String(!!p[b.dataset.prefToggle])); });
    document.querySelectorAll("[data-pref-spacing]").forEach(function (s) { s.value = p.spacing; });
    document.querySelectorAll("[data-pref-size]").forEach(function (b) {
      if (b.dataset.prefSize === "-1") b.disabled = p.size === 0;
      if (b.dataset.prefSize === "1") b.disabled = p.size === SIZES.length - 1;
    });
  });

  /* ------------------------------------------------------------------
     Content languages — informational content (lessons, the Gurus, history,
     Rehat Maryada, FAQ…) can be read in English, Hindi or Punjabi (Gurmukhi).
     The interface itself (navigation, buttons, filters) stays in English.
     The choice is the reading preference already used for Gurbani meanings
     (S.prefs.lang), so one setting controls the whole site.
     Translations live in data/i18n/{hi,pa}.js and load only when chosen.
     ------------------------------------------------------------------ */
  var LANGS = [
    { code: "en", name: "English", native: "English" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  ];
  var PACKS = {
    hi: function () { return import("../data/i18n/hi.js"); },
    pa: function () { return import("../data/i18n/pa.js"); },
  };
  var packs = {};
  /** Field-by-field overlay: translated values replace English ones; anything untranslated stays English. */
  function overlayFields(base, tr) {
    if (tr === undefined || tr === null || tr === "") return base;
    if (Array.isArray(base)) return base.map(function (b, i) { return overlayFields(b, tr[i]); });
    if (base && typeof base === "object") {
      var out = Object.assign({}, base);
      Object.keys(tr).forEach(function (k) { out[k] = overlayFields(base[k], tr[k]); });
      return out;
    }
    return typeof tr === "string" || typeof tr === "number" ? tr : base;
  }
  S.i18n = {
    LANGS: LANGS,
    lang: function () {
      var l = S.prefs.get().lang;
      return l === "hi" || l === "pa" ? l : "en";
    },
    /** Loads the pack for the current language (resolves immediately for English or once cached). */
    load: function () {
      var l = S.i18n.lang();
      if (l === "en" || packs[l]) return Promise.resolve(packs[l] || null);
      return PACKS[l]().then(function (m) { packs[l] = m.default; return packs[l]; });
    },
    /** `pack[kind][id]` (or `pack[kind]` for single objects) overlaid on the English item. */
    localize: function (kind, item, id) {
      var p = packs[S.i18n.lang()];
      if (!p || !p[kind] || !item) return item;
      var key = id !== undefined ? id : item.id;
      return overlayFields(item, key === undefined ? p[kind] : p[kind][key]);
    },
    /** A content heading or phrase from pack.text; `vars` fill {placeholders}. */
    t: function (key, english, vars) {
      var p = packs[S.i18n.lang()];
      var s = (p && p.text && p.text[key]) || english;
      if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
      return s;
    },
    /** Raw pack entry (e.g. "ordinals", "learnSections") for the current language, or undefined. */
    get: function (key) {
      var p = packs[S.i18n.lang()];
      return p ? p[key] : undefined;
    },
    /** ` lang="hi"` for localized text elements (screen readers, fonts); empty for English. */
    attr: function () {
      var l = S.i18n.lang();
      return l === "en" || !packs[l] ? "" : ' lang="' + l + '"';
    },
    /** Calls `render` whenever the content language changes (after its pack has loaded), and once at start if not English. */
    watch: function (render) {
      var last = S.i18n.lang();
      // Re-rendering replaces the switcher the visitor just used; put keyboard focus back on its replacement.
      var renderKeepingFocus = function () {
        var buttons = [].slice.call(document.querySelectorAll("[data-pref-lang]"));
        var at = buttons.indexOf(document.activeElement);
        render();
        if (at === -1 || document.contains(buttons[at])) return;
        var next = document.querySelectorAll("[data-pref-lang]")[at];
        if (next) next.focus({ preventScroll: true });
      };
      var run = function () {
        S.i18n.load().then(renderKeepingFocus, function (err) {
          S.toast("This language couldn't be loaded — showing English", "error");
          if (import.meta.env.DEV) console.warn("[Sikhify] language pack failed:", err);
          renderKeepingFocus();
        });
      };
      if (last !== "en") run();
      document.addEventListener("sikhify:prefs", function () {
        var now = S.i18n.lang();
        if (now === last) return;
        last = now;
        run();
      });
    },
    /** The "Read in English | हिन्दी | ਪੰਜਾਬੀ" control. Wired by the shared [data-pref-lang] handler. */
    switcher: function (opts) {
      opts = opts || {};
      var l = S.i18n.lang();
      return '<div class="sk-lang' + (opts.compact ? " sk-lang-compact" : "") + '" role="group" aria-label="Content language">' +
        '<span class="sk-lang-label">' + S.icon("globe", 16) + "<span>Read in</span></span>" +
        '<div class="sk-seg">' + LANGS.map(function (x) {
          return '<button type="button" class="sk-seg-btn" data-pref-lang="' + x.code + '" lang="' + x.code + '" aria-pressed="' + (l === x.code) + '"' +
            (x.code !== "en" ? ' aria-label="' + x.name + " (" + x.native + ')"' : "") + ">" + x.native + "</button>";
        }).join("") + "</div>" +
        '<p class="sk-lang-note" data-lang-note' + (l === "en" ? " hidden" : "") + ">Hindi and Punjabi versions are translations of Sikhify's English text.</p></div>";
    },
  };
  document.querySelectorAll("[data-lang-switch]").forEach(function (el) { el.innerHTML = S.i18n.switcher({ compact: el.hasAttribute("data-compact") }); });
  document.addEventListener("sikhify:prefs", function () {
    var en = S.i18n.lang() === "en";
    document.querySelectorAll("[data-lang-note]").forEach(function (n) { n.hidden = en; });
  });

  /* ------------------------------------------------------------------
     Gurbani rendering — lines: { g, t, pa, hi, en }
     The meaning shown follows the selected language; if a line has no
     meaning in that language, English is shown and labelled.
     ------------------------------------------------------------------ */
  var LANG_LABEL = { pa: "Punjabi", hi: "Hindi", en: "English" };
  S.gurbani = {
    meaningOf: function (line, lang) {
      var text = line[lang];
      if (text) return { text: text, lang: lang, fallback: false };
      if (line.en) return { text: line.en, lang: "en", fallback: lang !== "en" };
      return { text: "", lang: lang, fallback: false };
    },
    missingNotice: function (lines, lang) {
      if (lang === "en") return "";
      var have = lines.filter(function (l) { return l[lang]; }).length;
      if (have === lines.length) return "";
      if (have === 0) return '<p class="gb-notice">' + LANG_LABEL[lang] + " meanings are not available for this text in our source (BaniDB). English is shown instead.</p>";
      return '<p class="gb-notice">Some lines have no ' + LANG_LABEL[lang] + " meaning in our source (BaniDB); English is shown for those lines.</p>";
    },
    renderLines: function (lines, opts) {
      opts = opts || {};
      var p = S.prefs.get();
      var lang = opts.lang || p.lang;
      var html = S.gurbani.missingNotice(lines, lang);
      var lastP = null;
      lines.forEach(function (l) {
        var m = S.gurbani.meaningOf(l, lang);
        var newStanza = opts.stanzas && l.p !== undefined && lastP !== null && l.p !== lastP;
        lastP = l.p;
        html +=
          '<div class="gb-line' + (newStanza ? " gb-stanza" : "") + '">' +
          '<p class="gb-gurmukhi" lang="pa">' + S.esc(l.g) + "</p>" +
          (l.t ? '<p class="gb-translit">' + S.esc(l.t) + "</p>" : "") +
          (m.text
            ? '<p class="gb-meaning" lang="' + (m.lang === "en" ? "en" : m.lang) + '">' + S.esc(m.text) +
              (m.fallback ? ' <span class="gb-tag">EN</span>' : "") + "</p>"
            : "") +
          "</div>";
      });
      return html;
    },
    /** Plain-text versions for copying. */
    text: function (lines, field) {
      return lines.map(function (l) {
        if (field === "meaning") return S.gurbani.meaningOf(l, S.prefs.get().lang).text;
        return l[field] || "";
      }).filter(Boolean).join("\n");
    },
    /** BaniDB writes names phonetically ("Guru Amar Daas Ji"); show the usual spellings. */
    writerName: function (name) {
      return String(name || "")
        .replace(/Daas/g, "Das").replace(/Raam/g, "Ram").replace(/Bahaadur/g, "Bahadur")
        .replace(/Kabeer/g, "Kabir").replace(/Ravi Das/g, "Ravidas").replace(/Fareed/g, "Farid").replace(/Naam Dev/g, "Namdev");
    },
    sourceLabel: function (item) {
      if (!item.ang) return item.source || "";
      if (item.source && item.source.indexOf("Dasam") !== -1) return "Dasam Granth · page " + item.ang;
      return "Ang " + item.ang;
    },
  };

  /* ------------------------------------------------------------------
     Reading mode — full-screen, distraction-free view.
     opts: { title, subtitle, render: () => html }
     ------------------------------------------------------------------ */
  var reader, readerBody, readerLast;
  S.reading = {
    open: function (opts) {
      if (!reader) {
        reader = document.createElement("div");
        reader.className = "sk-reading";
        reader.setAttribute("role", "dialog");
        reader.setAttribute("aria-modal", "true");
        reader.setAttribute("aria-label", "Reading mode");
        reader.hidden = true;
        document.body.appendChild(reader);
        reader.addEventListener("click", function (e) {
          if (e.target.closest("[data-reading-close]")) S.reading.close();
          if (e.target.closest("[data-reading-theme]")) {
            var p = S.prefs.set({ readingTheme: S.prefs.get().readingTheme === "dark" ? "light" : "dark" });
            reader.classList.toggle("is-dark", p.readingTheme === "dark");
            e.target.closest("[data-reading-theme]").setAttribute("aria-pressed", String(p.readingTheme === "dark"));
          }
        });
        reader.addEventListener("keydown", function (e) {
          if (e.key === "Escape") S.reading.close();
          if (e.key === "Tab") trapFocus(reader, e);
        });
        document.addEventListener("sikhify:prefs", function () {
          if (!reader.hidden && S.reading.render) readerBody.innerHTML = S.reading.render();
        });
      }
      readerLast = document.activeElement;
      S.reading.render = opts.render;
      var p = S.prefs.get();
      reader.classList.toggle("is-dark", p.readingTheme === "dark");
      reader.innerHTML =
        '<div class="sk-reading-bar"><div class="sk-reading-titles"><p class="sk-reading-title">' + S.esc(opts.title) + "</p>" +
        (opts.subtitle ? '<p class="sk-reading-sub">' + S.esc(opts.subtitle) + "</p>" : "") + "</div>" +
        S.prefsToolbar() +
        '<button type="button" class="sk-chip-toggle" data-reading-theme aria-pressed="' + (p.readingTheme === "dark") + '">Dark reading</button>' +
        '<button type="button" class="sk-icon-btn" data-reading-close aria-label="Exit reading mode">' + S.icon("close") + "</button></div>" +
        '<div class="sk-reading-body gb-text"></div>';
      readerBody = reader.querySelector(".sk-reading-body");
      readerBody.innerHTML = opts.render();
      reader.hidden = false;
      document.body.classList.add("sk-no-scroll");
      document.dispatchEvent(new CustomEvent("sikhify:prefs"));
      reader.querySelector("[data-reading-close]").focus();
    },
    close: function () {
      if (!reader || reader.hidden) return;
      reader.hidden = true;
      document.body.classList.remove("sk-no-scroll");
      if (readerLast && document.contains(readerLast)) readerLast.focus();
    },
  };
  function trapFocus(container, e) {
    var f = container.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ------------------------------------------------------------------
     Audio — one HTML5 <audio> element shared by every player on the page.
     Tracks: { id, title, subtitle, url, credit? }
     Nothing is shown as "playing" unless the browser reports playback.
     ------------------------------------------------------------------ */
  var el = new Audio();
  el.preload = "metadata";
  var A = (S.audio = {
    el: el,
    track: null,
    queue: [],
    error: null,
    loading: false,
    listeners: [],
    on: function (fn) { A.listeners.push(fn); },
    emit: function () { A.listeners.forEach(function (fn) { fn(A); }); renderMini(); },
    load: function (track, queue) {
      if (!track || !track.url) return;
      A.queue = queue && queue.length ? queue.filter(function (t) { return t.url; }) : [track];
      if (A.track && A.track.id === track.id) return A.toggle();
      A.track = track;
      A.error = null;
      A.loading = true;
      el.src = track.url;
      el.playbackRate = S.store.get("audioRate", 1);
      el.volume = S.store.get("audioVolume", 1);
      A.emit();
      return A.play();
    },
    play: function () {
      if (!A.track) return;
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (err) {
        // NotAllowedError: autoplay blocked (the user can press play).
        // AbortError: play() was interrupted by switching to another track — not a failure.
        if (err && (err.name === "NotAllowedError" || err.name === "AbortError")) return;
        A.fail();
      });
    },
    pause: function () { el.pause(); },
    toggle: function () { if (el.paused) A.play(); else A.pause(); },
    seek: function (t) { if (isFinite(t)) el.currentTime = t; },
    setVolume: function (v) { el.volume = v; S.store.set("audioVolume", v); A.emit(); },
    setRate: function (r) { el.playbackRate = r; S.store.set("audioRate", r); A.emit(); },
    index: function () { return A.queue.findIndex(function (t) { return A.track && t.id === A.track.id; }); },
    next: function () { var i = A.index(); if (i > -1 && i < A.queue.length - 1) A.load(A.queue[i + 1], A.queue); },
    prev: function () {
      if (el.currentTime > 5) return A.seek(0);
      var i = A.index(); if (i > 0) A.load(A.queue[i - 1], A.queue);
    },
    stop: function () { el.pause(); A.track = null; A.error = null; el.removeAttribute("src"); el.load(); A.emit(); },
    fail: function () {
      A.loading = false;
      A.error = "Audio unavailable — the recording could not be loaded.";
      A.emit();
      S.toast("Audio unavailable", "error");
    },
    isCurrent: function (id) { return A.track && A.track.id === id; },
  });
  ["play", "pause", "timeupdate", "durationchange", "loadedmetadata", "ratechange", "volumechange", "waiting", "playing", "ended"].forEach(function (ev) {
    el.addEventListener(ev, function () {
      if (ev === "playing" || ev === "loadedmetadata") { A.loading = false; A.error = null; }
      if (ev === "waiting") A.loading = true;
      if (ev === "ended") A.next();
      A.emit();
    });
  });
  el.addEventListener("error", function () { if (A.track) A.fail(); });

  var RATES = [0.75, 1, 1.25, 1.5, 2];
  /** Inline player markup for a track (or an honest "unavailable" state). */
  A.playerHtml = function (track, extra) {
    extra = extra || "";
    if (!track || !track.url) {
      return '<div class="sk-player is-unavailable" role="note">' + S.icon("volume") +
        "<div><p class=\"sk-player-title\">Audio unavailable</p><p class=\"sk-player-sub\">We don't have a verified recording for this yet." + extra + "</p></div></div>";
    }
    return (
      '<div class="sk-player" data-player="' + S.esc(track.id) + '">' +
      '<button type="button" class="sk-play-btn" data-audio-toggle="' + S.esc(track.id) + '" aria-label="Play ' + S.esc(track.title) + '">' + S.icon("play", 20) + "</button>" +
      '<div class="sk-player-main"><div class="sk-player-row"><p class="sk-player-title">' + S.esc(track.title) + "</p>" +
      '<p class="sk-player-time"><span data-audio-current>0:00</span> / <span data-audio-duration>' + (track.duration || "--:--") + "</span></p></div>" +
      '<input type="range" class="sk-range" min="0" max="1000" value="0" step="1" data-audio-seek aria-label="Seek ' + S.esc(track.title) + '">' +
      '<div class="sk-player-row sk-player-controls">' +
      '<label class="sk-volume">' + S.icon("volume", 16) + '<input type="range" class="sk-range sk-range-sm" min="0" max="1" step="0.05" value="' + S.store.get("audioVolume", 1) + '" data-audio-volume aria-label="Volume"></label>' +
      '<label class="sk-select-label"><span class="sr-only">Playback speed</span><select class="sk-select sk-select-sm" data-audio-rate aria-label="Playback speed">' +
      RATES.map(function (r) { return '<option value="' + r + '"' + (S.store.get("audioRate", 1) === r ? " selected" : "") + ">" + r + "×</option>"; }).join("") +
      "</select></label>" +
      (track.credit ? '<p class="sk-player-credit">' + track.credit + "</p>" : "") +
      '</div><p class="sk-player-error" data-audio-error hidden></p></div></div>'
    );
  };
  /** Registry of tracks rendered on the page, so delegated clicks know what to load. */
  A.registry = {};
  A.register = function (tracks) { tracks.forEach(function (t) { if (t && t.id) A.registry[t.id] = t; }); };
  A.queueFor = null; // optional page function returning the queue for a track

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-audio-toggle]");
    if (!b) return;
    var t = A.registry[b.dataset.audioToggle];
    if (!t) return;
    A.load(t, A.queueFor ? A.queueFor(t) : [t]);
  });
  document.addEventListener("input", function (e) {
    var p = e.target.closest("[data-player]");
    if (e.target.matches("[data-audio-volume]")) A.setVolume(Number(e.target.value));
    if (e.target.matches("[data-audio-seek]") && p && A.isCurrent(p.dataset.player) && isFinite(el.duration)) A.seek((e.target.value / 1000) * el.duration);
    if (e.target.matches("[data-mini-seek]") && isFinite(el.duration)) A.seek((e.target.value / 1000) * el.duration);
  });
  document.addEventListener("change", function (e) {
    if (e.target.matches("[data-audio-rate]")) A.setRate(Number(e.target.value));
  });

  // Keep every inline player in sync with the shared element.
  A.on(function () {
    document.querySelectorAll("[data-player]").forEach(function (p) {
      var current = A.isCurrent(p.dataset.player);
      var playing = current && !el.paused;
      var btn = p.querySelector("[data-audio-toggle]");
      btn.innerHTML = S.icon(playing ? "pause" : "play", 20);
      btn.setAttribute("aria-label", (playing ? "Pause " : "Play ") + (A.registry[p.dataset.player] || {}).title);
      p.classList.toggle("is-playing", playing);
      p.classList.toggle("is-loading", current && A.loading && !A.error);
      var err = p.querySelector("[data-audio-error]");
      err.hidden = !(current && A.error);
      err.textContent = current && A.error ? A.error : "";
      if (current) {
        p.querySelector("[data-audio-current]").textContent = S.formatTime(el.currentTime);
        if (isFinite(el.duration)) p.querySelector("[data-audio-duration]").textContent = S.formatTime(el.duration);
        var seek = p.querySelector("[data-audio-seek]");
        if (document.activeElement !== seek && isFinite(el.duration)) seek.value = Math.round((el.currentTime / el.duration) * 1000) || 0;
      }
    });
  });

  /* Sticky mini-player — visible whenever a track is loaded */
  var mini;
  function renderMini() {
    if (!A.track) { if (mini) mini.hidden = true; document.body.classList.remove("has-mini-player"); return; }
    if (!mini) {
      mini = document.createElement("div");
      mini.className = "sk-mini";
      mini.setAttribute("role", "region");
      mini.setAttribute("aria-label", "Audio player");
      mini.innerHTML =
        '<div class="sk-mini-inner">' +
        '<div class="sk-mini-info"><p class="sk-mini-title"></p><p class="sk-mini-sub"></p></div>' +
        '<div class="sk-mini-controls">' +
        '<button type="button" class="sk-icon-btn" data-mini="prev" aria-label="Previous">' + S.icon("prev") + "</button>" +
        '<button type="button" class="sk-play-btn sk-play-btn-sm" data-mini="toggle" aria-label="Play">' + S.icon("play") + "</button>" +
        '<button type="button" class="sk-icon-btn" data-mini="next" aria-label="Next">' + S.icon("next") + "</button></div>" +
        '<div class="sk-mini-progress"><span class="sk-mini-time" data-mini-current>0:00</span>' +
        '<input type="range" class="sk-range" min="0" max="1000" value="0" data-mini-seek aria-label="Seek">' +
        '<span class="sk-mini-time" data-mini-duration>--:--</span></div>' +
        '<button type="button" class="sk-icon-btn sk-mini-close" data-mini="close" aria-label="Close player">' + S.icon("close") + "</button></div>";
      document.body.appendChild(mini);
      mini.addEventListener("click", function (e) {
        var b = e.target.closest("[data-mini]");
        if (!b) return;
        var act = b.dataset.mini;
        if (act === "toggle") A.toggle();
        if (act === "prev") A.prev();
        if (act === "next") A.next();
        if (act === "close") A.stop();
      });
    }
    mini.hidden = false;
    document.body.classList.add("has-mini-player");
    var playing = !el.paused;
    mini.querySelector(".sk-mini-title").textContent = A.track.title;
    mini.querySelector(".sk-mini-sub").textContent = A.error ? A.error : A.loading ? "Loading…" : A.track.subtitle || "";
    var tb = mini.querySelector('[data-mini="toggle"]');
    tb.innerHTML = S.icon(playing ? "pause" : "play");
    tb.setAttribute("aria-label", playing ? "Pause" : "Play");
    var i = A.index();
    mini.querySelector('[data-mini="prev"]').disabled = i <= 0 && el.currentTime <= 5;
    mini.querySelector('[data-mini="next"]').disabled = i === -1 || i >= A.queue.length - 1;
    mini.querySelector("[data-mini-current]").textContent = S.formatTime(el.currentTime);
    mini.querySelector("[data-mini-duration]").textContent = isFinite(el.duration) ? S.formatTime(el.duration) : A.track.duration || "--:--";
    var seek = mini.querySelector("[data-mini-seek]");
    if (document.activeElement !== seek && isFinite(el.duration)) seek.value = Math.round((el.currentTime / el.duration) * 1000) || 0;
  }

  /* ------------------------------------------------------------------
     Site-wide search overlay
     Lazy-loads the data files on first open, so the homepage stays light.
     ------------------------------------------------------------------ */
  var PAGES = [
    { title: "Home", url: "/", text: "Sikhify home Hukamnama events store" },
    { title: "Learn Sikhism", url: "/learn-sikhism", text: "lessons basics gurus concepts practices five ks progress" },
    { title: "Sikh History", url: "/sikh-history", text: "timeline events martyrs sikh empire gurdwaras" },
    { title: "Rehat Maryada", url: "/rehat-maryada", text: "code of conduct sikh rehat maryada sgpc" },
    { title: "Sikh FAQ", url: "/faq", text: "frequently asked questions" },
    { title: "Gurbani Library", url: "/gurbani", text: "shabad bani raag ang guru granth sahib" },
    { title: "Nitnem", url: "/nitnem", text: "daily prayers checklist japji jaap rehras sohila" },
    { title: "Daily Hukamnama", url: "/hukamnama", text: "hukamnama today mukhwak darbar sahib harmandir sahib" },
    { title: "Kirtan & Katha", url: "/sikh-media", text: "sikh media kirtan katha dhadi gurmat sangeet hazoori ragi artists videos youtube kirtaniye raagi jatha katha vachak" },
    { title: "The Ten Gurus", url: "/gurus", text: "ten gurus guru sahiban biography timeline teachings nanak angad amar das ram das arjan hargobind har rai har krishan tegh bahadur gobind singh" },
    { title: "Community", url: "/community", text: "community feed sangat posts forum discussion" },
    { title: "Community Groups", url: "/community/groups", text: "groups sangat seva youth gurmat local community join" },
    { title: "Submit / Update Information", url: "/submit", text: "submit add gurdwara event personality kirtani website app book correction incorrect information" },
    { title: "Global Gurdwara Directory", url: "/directory/gurdwaras", text: "gurdwara gurudwara directory near me nearby find map country state city langar" },
    { title: "Sikh Directory", url: "/directory", text: "directory resources gurdwaras personalities organizations websites apps books research heritage news events kids" },
    { title: "Sitemap", url: "/sitemap", text: "all pages site map index" },
  ].concat(Object.keys(CONTENT_TYPES).map(function (k) {
    var t = CONTENT_TYPES[k];
    return { title: t.plural, url: "/" + t.path, text: t.label + " " + t.description };
  }));
  var index = null;
  var remote = null;
  /** Other common names, so e.g. “Kirtan Sohila” finds Sohila Sahib. */
  var BANI_ALIASES = {
    "japji-sahib": "Japuji Jap Ji Japu", "jaap-sahib": "Jaapu Japu Sahib", "tav-prasad-savaiye": "Das Savaiye Swaiye Sudha Savaiye",
    "benti-chaupai": "Chaupai Sahib Kabyo Bach Benti", "anand-sahib": "Anandu Song of Bliss", "rehras-sahib": "Rehraas Raharaas So Dar",
    "sohila-sahib": "Kirtan Sohila Sohila", "sukhmani-sahib": "Psalm of Peace", "asa-di-vaar": "Asa Ki Var Aasa Di Vaar", "laavan": "Lavan Laava Anand Karaj",
  };
  function buildIndex() {
    var D = window.SikhifyData, out = [];
    var add = function (type, title, preview, url, text) { out.push({ type: type, title: title, preview: preview || "", url: url, text: [title, preview, text || ""].join(" ") }); };
    PAGES.forEach(function (p) { add("Page", p.title, "", p.url, p.text); });
    (D.gurus || []).forEach(function (g) {
      add("Guru", g.name, g.lifespan + " · " + g.bio, "/learn-sikhism#topic=" + g.id, [g.gurmukhi, g.birthplace, g.contributions.join(" "), g.teachings.join(" ")].join(" "));
    });
    (D.learn || []).forEach(function (t) {
      var type = t.category === "Five Ks" ? "Five Ks" : t.category === "Practices" ? "Practice" : t.category === "Concepts" ? "Concept" : "Learn";
      add(type, t.title, t.summary, "/learn-sikhism#topic=" + t.id, [t.gurmukhi, t.tags.join(" "), JSON.stringify(t.sections)].join(" "));
    });
    (D.history || []).forEach(function (e) {
      add("History", e.year + " — " + e.title, e.summary, "/sikh-history#event=" + e.id, [e.location, e.people.join(" "), e.categories.join(" "), e.details.join(" ")].join(" "));
    });
    (D.historyFigures || []).forEach(function (f) {
      add("Person", f.name, f.role + " · " + f.summary, "/sikh-history#event=" + f.event, f.era);
    });
    var places = {};
    (D.history || []).forEach(function (e) { places[e.location] = true; });
    Object.keys(places).forEach(function (pl) { add("Place", pl, "Events in Sikh history at this place", "/sikh-history#q=" + encodeURIComponent(pl.split(/[,(]/)[0].trim())); });
    if (D.rehat) D.rehat.sections.forEach(function (s) {
      add("Rehat Maryada", s.title, s.summary, "/rehat-maryada#" + s.id, [(s.paragraphs || []).join(" "), (s.list || []).join(" ")].join(" "));
    });
    (D.faq || []).forEach(function (f) { add("FAQ", f.q, f.a, "/faq#faq=" + f.id, f.category); });
    if (D.gurbani) {
      var raags = {};
      D.gurbani.banis.forEach(function (b) {
        var alias = BANI_ALIASES[b.id] || "";
        var opening = (b.opening || []).map(function (l) { return [l.g, l.t, l.en, l.pa, l.hi].join(" "); }).join(" ");
        if (b.nitnem) add("Nitnem", b.name, b.context || "", "/nitnem#bani=" + b.id, [alias, b.gurmukhiName, b.author, b.ang, opening].join(" "));
        add("Bani", b.name, b.author + (b.ang ? " · Ang " + b.ang : ""), "/gurbani#item=" + b.id, [alias, b.gurmukhiName, b.author, b.raag, "ang " + b.ang, opening].join(" "));
        if (b.raag) raags[b.raag] = true;
      });
      D.gurbani.shabads.forEach(function (s) {
        add("Shabad", s.gurmukhiTitle, s.title + " · " + s.author + " · " + S.gurbani.sourceLabel(s), "/gurbani#item=" + s.id,
          [s.title, s.author, s.raag, "ang " + s.ang, s.lines.map(function (l) { return [l.g, l.t, l.en, l.pa, l.hi].join(" "); }).join(" ")].join(" "));
        if (s.raag) raags[s.raag] = true;
      });
      Object.keys(raags).forEach(function (r) { add("Raag", r, "Shabads and Banis in " + r, "/gurbani#raag=" + encodeURIComponent(r), "raag raga"); });
    }
    // Sikh Media: categories, artists and their YouTube videos (data/media.js).
    if (D.media) {
      D.media.categories.forEach(function (c) {
        if (D.media.artists.some(function (a) { return a.category === c; })) add("Media", c, "Browse " + c + " artists and videos", "/sikh-media?category=" + encodeURIComponent(c), "media category");
      });
      D.media.artists.forEach(function (a) {
        add("Artist", a.name, a.category + (a.location ? " · " + a.location : "") + " · " + a.description, "/sikh-media#artist=" + a.id,
          [a.sortName, a.category, a.location, a.keywords.join(" "), "kirtan katha media"].join(" "));
        a.videos.forEach(function (v) {
          add("Video", v.title, a.name + " · " + a.category + " · Watch on Sikhify", "/media/" + encodeURIComponent(v.id),
            [a.name, a.sortName, a.category, v.channel, a.keywords.join(" ")].join(" "));
        });
      });
    }
    // Hukamnamas the visitor has opened or saved (dates, Ang and first lines).
    S.store.get("hukamnamaHistory", []).forEach(function (h) {
      add("Hukamnama", "Hukamnama — " + h.label, "Ang " + h.ang + " · " + (h.first || ""), "/hukamnama#date=" + h.date, [h.date, "ang " + h.ang, h.raag, h.writer, h.text].join(" "));
    });
    (remote && remote.records || []).forEach(function (r) { add(r.type, r.title, r.preview, r.url, r.text); });
    return out.map(function (r) { r.hay = S.norm(r.text); r.titleN = S.norm(r.title); return r; });
  }
  function searchAll(q) {
    var terms = S.norm(q).split(" ").filter(Boolean);
    if (!terms.length) return [];
    var res = [];
    index.forEach(function (r) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (r.titleN.indexOf(t) === 0) score += 10;
        else if (r.titleN.indexOf(t) !== -1) score += 6;
        else if (r.hay.indexOf(t) !== -1) score += 2;
        else return;
      }
      if (r.type === "Page") score += 1;
      var phrase = S.norm(q);
      if (terms.length > 1 && r.hay.indexOf(phrase) !== -1 && r.hay.indexOf(phrase) < 120) score += 8;
      res.push({ r: r, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score || a.r.title.length - b.r.title.length; });
    var out = res.slice(0, 40).map(function (x) { return x.r; });
    // Smart shortcuts: an Ang number or a date.
    var ang = q.trim().match(/^(?:ang\s*)?(\d{1,4})$/i);
    if (ang && +ang[1] >= 1 && +ang[1] <= 1430) out.unshift({ type: "Ang", title: "Open Ang " + ang[1], preview: "Read Ang " + ang[1] + " of the Sri Guru Granth Sahib Ji (loaded live from BaniDB)", url: "/gurbani#ang=" + ang[1] });
    var date = parseDate(q.trim());
    if (date) out.unshift({ type: "Hukamnama", title: "Hukamnama for " + date.label, preview: "Open the Hukamnama from Sri Harmandir Sahib for this date", url: "/hukamnama#date=" + date.iso });
    return out;
  }
  function parseDate(q) {
    var m = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || null, y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = q.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if (/^today$/i.test(q) || /^yesterday$/i.test(q)) {
      var t = new Date(); if (/^yesterday$/i.test(q)) t.setDate(t.getDate() - 1);
      y = t.getFullYear(); mo = t.getMonth() + 1; d = t.getDate();
    } else return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1) return null;
    var iso = y + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    return { iso: iso, label: dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) };
  }

  var overlay, input, list, active = -1, results = [], searchReturnFocus;
  S.search = {
    open: function (initial) {
      if (!overlay) createOverlay();
      searchReturnFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add("sk-no-scroll");
      input.value = initial || "";
      input.focus();
      if (!index) {
        list.innerHTML = '<p class="sk-search-empty" aria-busy="true"><span class="sk-spinner" aria-hidden="true"></span>Loading search…</p>';
        // If the data can't be downloaded (offline), pages are still searchable.
        // Database records (directory, Hukamnamas, groups, posts, live media) are added when the API is reachable.
        Promise.all([S.loadScript("data/search").catch(function () {}), searchService.remoteIndex()]).then(function (res) {
          remote = res[1];
          if (remote && remote.media && remote.media.artists) window.SikhifyData.media = remote.media;
          index = buildIndex();
          run();
        });
      } else run();
    },
    close: function () {
      if (!overlay || overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove("sk-no-scroll");
      if (searchReturnFocus && document.contains(searchReturnFocus)) searchReturnFocus.focus();
    },
    /** Rebuild the index (e.g. after a Hukamnama is opened). */
    invalidate: function () {
      // Data scripts are already loaded once an index exists, so rebuild in place;
      // nulling it would leave an open overlay returning nothing until reopened.
      if (!index) return;
      index = buildIndex();
      if (overlay && !overlay.hidden) run();
    },
  };
  function createOverlay() {
    overlay = document.createElement("div");
    overlay.className = "sk-search";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Search Sikhify");
    overlay.innerHTML =
      '<div class="sk-search-panel">' +
      '<div class="sk-search-bar">' + S.icon("search", 20) +
      '<input type="search" class="sk-search-input" placeholder="Search Gurbani, Gurus, history, Kirtan… (try “Japji”, “Ang 633”, “1699”)" aria-label="Search Sikhify" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="sk-search-results" aria-autocomplete="list">' +
      '<button type="button" class="sk-icon-btn" data-search-clear aria-label="Clear search" hidden>' + S.icon("close") + "</button>" +
      '<button type="button" class="sk-search-esc" data-search-close>Esc</button></div>' +
      '<div class="sk-search-results" id="sk-search-results" role="listbox" aria-label="Search results"></div>' +
      '<p class="sk-search-hint"><kbd>↑</kbd><kbd>↓</kbd> to navigate · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p></div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector(".sk-search-input");
    list = overlay.querySelector(".sk-search-results");
    input.addEventListener("input", S.debounce(run, 80));
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-search-close]")) S.search.close();
      if (e.target.closest("[data-search-clear]")) { input.value = ""; run(); input.focus(); }
      var sug = e.target.closest("[data-suggest]");
      if (sug) { input.value = sug.dataset.suggest; run(); input.focus(); }
      var link = e.target.closest("a.sk-result");
      if (link) S.search.close();
    });
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); S.search.close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(active + 1, results.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
      else if (e.key === "Enter" && document.activeElement === input) {
        var a = list.querySelectorAll("a.sk-result")[Math.max(active, 0)];
        if (a) { e.preventDefault(); a.click(); }
      } else if (e.key === "Tab") trapFocus(overlay.querySelector(".sk-search-panel"), e);
    });
  }
  /** Gurdwara Directory matches come live from the server (the directory can be far too large to bundle). */
  var gurdwaraHits = {}, gurdwaraPending = {};
  var fetchGurdwaras = S.debounce(function (q) {
    if (gurdwaraHits[q] || gurdwaraPending[q]) return;
    gurdwaraPending[q] = true;
    searchService.gurdwaras(q).then(function (items) {
      gurdwaraHits[q] = items.map(function (g) {
        return { type: "Gurdwara", title: g.name, preview: [g.address, g.city.name, g.state.name, g.country.name].filter(Boolean).join(", "), url: g.url };
      });
      if (overlay && !overlay.hidden && input.value.trim() === q) run();
    });
  }, 250);
  var SUGGESTIONS = ["Japji Sahib", "Guru Nanak Dev Ji", "Five Ks", "1699", "Hukamnama", "Langar", "Ang 633", "Raag Asa", "Kirtan"];
  function run() {
    if (!index) return;
    var q = input.value;
    overlay.querySelector("[data-search-clear]").hidden = !q;
    active = -1;
    if (!q.trim()) {
      results = [];
      list.innerHTML = '<div class="sk-search-empty"><p>Search Learn, the Gurus, Sikh History, Rehat Maryada, FAQ, Gurbani, Nitnem, Hukamnama, Kirtan &amp; Katha, the Sikh directory and the community.</p><div class="sk-suggest">' +
        SUGGESTIONS.map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + S.esc(s) + '">' + S.esc(s) + "</button>"; }).join("") + "</div></div>";
      return;
    }
    var gq = q.trim();
    if (gq.length >= 2 && /[\p{L}\p{N}]/u.test(gq)) fetchGurdwaras(gq);
    results = searchAll(q);
    if (gurdwaraHits[gq] && gurdwaraHits[gq].length) results = gurdwaraHits[gq].concat(results);
    if (!results.length) {
      list.innerHTML = '<div class="sk-search-empty"><p class="sk-search-none">No results found for “' + S.esc(q) + "”</p><p>Try a shorter word, a different spelling (e.g. Japji / Japuji), an Ang number, or one of these:</p><div class=\"sk-suggest\">" +
        SUGGESTIONS.slice(0, 5).map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + S.esc(s) + '">' + S.esc(s) + "</button>"; }).join("") + "</div></div>";
      return;
    }
    list.innerHTML = results.map(function (r, i) {
      return '<a class="sk-result" role="option" id="sk-res-' + i + '" aria-selected="false" href="' + S.esc(r.url) + '">' +
        '<span class="sk-result-type">' + S.esc(r.type) + "</span>" +
        '<span class="sk-result-title"' + (/[਀-੿]/.test(r.title) ? ' lang="pa"' : "") + ">" + S.highlight(r.title, q) + "</span>" +
        (r.preview ? '<span class="sk-result-preview">' + S.highlight(r.preview.slice(0, 180), q) + "</span>" : "") + "</a>";
    }).join("");
    setActive(0);
  }
  function setActive(i) {
    var items = list.querySelectorAll("a.sk-result");
    if (!items.length) return;
    active = i;
    items.forEach(function (a, j) { a.setAttribute("aria-selected", j === i ? "true" : "false"); a.classList.toggle("is-active", j === i); });
    input.setAttribute("aria-activedescendant", "sk-res-" + i);
    items[i].scrollIntoView({ block: "nearest" });
  }

  /* ------------------------------------------------------------------
     Wire up header controls present on every page
     ------------------------------------------------------------------ */
  {
    var searchBtn = document.querySelector('[data-site-search], .header-icon-btn[aria-label="Search Sikhify"]');
    if (searchBtn) searchBtn.addEventListener("click", function () { S.search.open(); });
    document.querySelectorAll("[data-open-search]").forEach(function (b) {
      b.addEventListener("click", function () { S.search.open(b.dataset.openSearch || ""); });
    });
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      S.theme.set(S.theme.isDark()); // sync aria state
      themeBtn.addEventListener("click", S.theme.toggle);
    }
    // "/" or Ctrl/⌘+K opens search from anywhere.
    document.addEventListener("keydown", function (e) {
      var typing = /input|textarea|select/i.test((e.target.tagName || "")) || e.target.isContentEditable;
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        S.search.open();
      }
    });
    // Clear (×) buttons inside search fields.
    document.querySelectorAll("[data-clear-for]").forEach(function (btn) {
      var field = document.getElementById(btn.dataset.clearFor);
      if (!field) return;
      var sync = function () { btn.hidden = !field.value; };
      field.addEventListener("input", sync);
      btn.addEventListener("click", function () {
        field.value = "";
        sync();
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
      });
      sync();
    });
    // "Reload the page" actions in status states.
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-reload]")) location.reload();
    });
    S.syncBookmarkButtons();
    document.dispatchEvent(new CustomEvent("sikhify:prefs"));
  }

  /**
   * Live search binding: typing is debounced, but clearing the field or setting it
   * programmatically (clear button, suggestions) applies immediately.
   */
  S.onSearch = function (field, fn) {
    var debounced = S.debounce(fn, 120);
    field.addEventListener("input", function (e) {
      if (!e.isTrusted || field.value === "") fn();
      else debounced();
    });
  };
  /** Programmatically set a search field's value (keeps its clear button in sync). */
  S.setField = function (field, value) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };

}
