/* Migrated from active js/hukamnama.js; behavior retained.
   Hukamnamas now come from services/hukamnama/hukamnamaService.js — the record
   published by a Sikhify admin for that date, or the live BaniDB feed — the
   same source the homepage card uses. */
import { hukamnamaService } from '../services/hukamnama/hukamnamaService.js';

export function initHukamnama() {
"use strict";
  var S = window.Sikhify, H = window.SikhifyData.hukamnama;
  if (!H) return;

  var cardEl = document.querySelector("[data-hk-card]");
  var dateInput = document.querySelector("[data-date-input]");
  var archiveEl = document.querySelector("[data-archive]");
  var archiveSearch = document.getElementById("hk-archive-search");
  var writerSel = document.querySelector("[data-archive-writer]");
  var savedEl = document.querySelector("[data-saved-hukamnamas]");
  document.querySelector("[data-prefs]").innerHTML = S.prefsToolbar({ readingMode: true });
  /* "What is a Hukamnama?" is informational content: it follows the content language
     (the same preference as the meaning-language control in the reading toolbar). */
  var I = S.i18n;
  function renderAbout() {
    var steps = I.get("hukamnamaSteps") || H.steps, la = I.attr();
    var title = document.querySelector("[data-hk-about-title]"), about = document.querySelector("[data-hk-about]");
    if (title && la) { title.textContent = I.t("hukamnamaAboutTitle", title.textContent); title.setAttribute("lang", I.lang()); }
    if (about && la) { about.textContent = I.t("hukamnamaAbout", about.textContent); about.setAttribute("lang", I.lang()); }
    if (!la) {
      if (title) { title.textContent = "What is a Hukamnama?"; title.removeAttribute("lang"); }
      if (about) { about.textContent = "Hukamnama means “order” or “edict”. Each morning at Sri Harmandir Sahib, and in Gurdwaras everywhere, a Hukamnama is taken from the Sri Guru Granth Sahib Ji as the Guru's guidance for the day."; about.removeAttribute("lang"); }
    }
    document.querySelector("[data-steps]").innerHTML = steps.map(function (s, i) {
      return '<li class="sk-card"' + la + '><span class="sk-collapse-btn" style="padding:0"><span class="sk-num">' + (i + 1) + '</span></span><h3 class="sk-card-title mt-3">' + S.esc(s.title) + '</h3><p class="sk-card-text">' + S.esc(s.text) + "</p></li>";
    }).join("");
  }
  renderAbout();
  I.watch(renderAbout);

  var cache = {};          // iso -> parsed Hukamnama
  var latest = null;       // iso date of the newest Hukamnama (BaniDB "today")
  var current = null;      // parsed Hukamnama being shown
  var archiveDays = 7;

  /* ---------- Dates */
  var iso = function (y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); };
  var parts = function (s) { var p = s.split("-").map(Number); return { y: p[0], m: p[1], d: p[2] }; };
  function shift(s, days) {
    var p = parts(s), dt = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function label(s, opts) {
    var p = parts(s);
    return new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-GB", Object.assign({ day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }, opts || {}));
  }

  /* ---------- Data */
  function prepare(h) {
    var first = h.lines.find(function (l) { return !/^(ੴ|.*ਮਹਲਾ|.*ਮਃ|ਸਲੋਕ|ਰਾਗੁ)/.test(l.g); }) || h.lines[0];
    h.first = first;
    return h;
  }
  function fetchDay(s) {
    if (cache[s]) return Promise.resolve(cache[s]);
    return hukamnamaService.getHukamnama(s).then(function (h) {
      prepare(h);
      cache[h.date] = h;
      if (s === "today") latest = h.date;
      return h;
    });
  }

  /** Meanings an admin entered as paragraphs (not line-by-line), in the reading language when available. */
  var BLOCK_LABEL = { t: "Transliteration", pa: "Punjabi meaning", hi: "Hindi meaning", en: "English meaning" };
  function renderBlocks(h) {
    var b = h.blocks || {};
    var lang = S.prefs.get().lang;
    var meaning = b[lang] ? lang : b.en ? "en" : b.pa ? "pa" : b.hi ? "hi" : null;
    var out = "";
    if (b.t) out += '<div class="gb-line"><p class="sk-eyebrow">' + BLOCK_LABEL.t + '</p><p class="gb-translit" style="white-space:pre-line">' + S.esc(b.t) + "</p></div>";
    if (meaning) out += '<div class="gb-line"><p class="sk-eyebrow">' + BLOCK_LABEL[meaning] + '</p><p class="gb-meaning" lang="' + meaning + '" style="white-space:pre-line">' + S.esc(b[meaning]) + "</p></div>";
    return out;
  }
  function renderText(h) { return S.gurbani.renderLines(h.lines) + renderBlocks(h); }

  /* ---------- Main card */
  function skeleton() {
    cardEl.innerHTML = '<div class="sk-stack" aria-busy="true"><div class="sk-skeleton" style="height:1rem;width:40%"></div><div class="sk-skeleton" style="height:1.6rem;width:70%"></div>' +
      [1, 2, 3, 4, 5].map(function () { return '<div><div class="sk-skeleton" style="height:1.7rem"></div><div class="sk-skeleton mt-2" style="height:0.9rem;width:80%"></div></div>'; }).join("") + "</div>";
  }
  function renderCard(h) {
    current = h;
    var isLatest = h.date === latest;
    var sgpc = h.origin === "banidb";
    var credit = sgpc ? 'Official recording: <a href="' + H.officialUrl + '" target="_blank" rel="noopener noreferrer">SGPC</a>' : "";
    var hkTrack = { id: "hk:" + h.date, title: "Hukamnama — " + label(h.date), subtitle: sgpc ? "Sri Harmandir Sahib · SGPC" : "Hukamnama recording", url: h.audioUrl, credit: credit, missingHint: sgpc ? "SGPC usually publishes the day's recording later in the day" : "" };
    var kathaTrack = { id: "katha:" + h.date, title: "Katha — " + label(h.date), subtitle: sgpc ? "Explanation of the Hukamnama · SGPC" : "Explanation of the Hukamnama", url: h.kathaUrl, credit: credit, missingHint: sgpc ? "SGPC usually publishes the day's Katha later in the day" : "" };
    S.audio.register([hkTrack, kathaTrack]);
    S.audio.queueFor = function () { return [hkTrack, kathaTrack]; };
    cardEl.innerHTML =
      '<div class="sk-panel-head"><div class="min-w-0"><p class="sk-eyebrow">' + (isLatest ? "Today's Hukamnama" : "Hukamnama") + " · Sri Harmandir Sahib, Amritsar</p>" +
      '<h2 class="sk-section-title mt-1" tabindex="-1" data-hk-title>' + S.esc(label(h.date, { weekday: "long" })) + "</h2>" +
      '<div class="flex flex-wrap gap-1 mt-3">' + (h.ang ? '<span class="sk-badge sk-badge-navy">Ang ' + h.ang + "</span>" : "") + (h.raag ? '<span class="sk-badge">' + S.esc(h.raag) + "</span>" : "") +
      (h.writer ? '<span class="sk-badge sk-badge-muted">' + S.esc(h.writer) + "</span>" : "") + "</div></div>" +
      '<div class="gb-actions sk-no-print">' +
      '<button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="hukamnama:' + h.date + '" data-bm aria-pressed="false">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">Bookmark</span></button>' +
      '<button type="button" class="sk-btn sk-btn-sm" data-share>' + S.icon("share", 15) + "Share</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-print>' + S.icon("print", 15) + "Print</button></div></div>" +
      '<div class="sk-grid sk-grid-2 mt-5 sk-no-print" style="gap:0.75rem">' + S.audio.playerHtml(hkTrack) + S.audio.playerHtml(kathaTrack) + "</div>" +
      '<div class="flex flex-wrap gap-2 mt-4 sk-no-print">' +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="g">' + S.icon("copy", 15) + "Copy Gurmukhi</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="t">' + S.icon("copy", 15) + "Copy transliteration</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="meaning">' + S.icon("copy", 15) + "Copy meaning</button></div>" +
      '<div class="gb-text mt-6" data-lines>' + renderText(h) + "</div>" +
      (sgpc
        ? '<p class="sk-card-meta mt-6">Source: Sri Guru Granth Sahib Ji, Ang ' + h.ang + ". Text and meanings via BaniDB; audio published by the SGPC. Always refer to the " +
          '<a class="panel-view-all" href="' + H.officialUrl + '" target="_blank" rel="noopener noreferrer">official SGPC Hukamnama</a>.</p>'
        : '<p class="sk-card-meta mt-6">Source: ' + S.esc(h.source) + (h.ang ? " · Sri Guru Granth Sahib Ji, Ang " + h.ang : "") + ". Published by the Sikhify team. Always refer to the " +
          '<a class="panel-view-all" href="' + H.officialUrl + '" target="_blank" rel="noopener noreferrer">official SGPC Hukamnama</a>.</p>');
    S.syncBookmarkButtons(cardEl);
    S.audio.emit();
    dateInput.value = h.date;
    document.querySelector('[data-day="1"]').disabled = isLatest;
    document.querySelector('[data-day="-1"]').disabled = h.date <= H.archiveStart;
    document.title = "Hukamnama " + label(h.date) + " — Sikhify";
    remember(h);
    renderArchive();
  }
  function renderError(s, err) {
    current = null;
    var dated = s && s !== "today";
    var missing = S.statusKind(err) === "notFound";
    cardEl.innerHTML = S.statusHtml({
      error: err,
      title: "This Hukamnama couldn't be loaded",
      text: missing ? (dated ? "There is no Hukamnama available for " + label(s) + "." : "Today's Hukamnama hasn't been published yet. Please check again shortly.") : undefined,
      actions: '<button type="button" class="sk-btn sk-btn-sm" data-retry>Try again</button>' +
        (dated ? '<button type="button" class="sk-btn sk-btn-sm" data-today-btn>Go to today</button>' : "") +
        '<a class="sk-btn sk-btn-sm" href="' + H.officialUrl + '" target="_blank" rel="noopener noreferrer">Open the SGPC website</a>',
    });
  }

  var pending = null;
  function show(s, push) {
    pending = s;
    skeleton();
    return fetchDay(s).then(function (h) {
      if (pending !== s) return;
      if (push !== false) S.setHash({ date: h.date }, s === "today");
      renderCard(h);
    }).catch(function (err) { if (pending === s) renderError(s, err); });
  }

  /* Hukamnamas viewed are remembered so the site-wide search can find them. */
  function remember(h) {
    var list = S.store.get("hukamnamaHistory", []).filter(function (x) { return x.date !== h.date; });
    list.unshift({
      date: h.date, label: label(h.date), ang: h.ang, raag: h.raag, writer: h.writer,
      first: h.first ? h.first.g : "", text: h.lines.slice(0, 8).map(function (l) { return [l.g, l.t, l.en].join(" "); }).join(" ").slice(0, 600),
    });
    S.store.set("hukamnamaHistory", list.slice(0, 30));
    if (S.search.invalidate) S.search.invalidate();
  }

  /* ---------- Archive */
  function archiveDates() {
    var out = [];
    for (var i = 0; i < archiveDays; i++) {
      var d = shift(latest, -i);
      if (d < H.archiveStart) break;
      out.push(d);
    }
    return out;
  }
  function loadArchive() {
    if (!latest) return;
    var dates = archiveDates();
    renderArchive();
    Promise.all(dates.map(function (d) { return fetchDay(d).catch(function () { return null; }); })).then(renderArchive);
  }
  function renderArchive() {
    if (!latest) { archiveEl.innerHTML = '<p class="sk-card-meta">The archive will appear once today\'s Hukamnama has loaded.</p>'; return; }
    var q = archiveSearch.value;
    var writer = writerSel.value;
    var dates = archiveDates();
    var loaded = dates.map(function (d) { return cache[d]; }).filter(Boolean);
    var writers = Array.from(new Set(loaded.map(function (h) { return h.writer; }).filter(Boolean))).sort();
    writerSel.innerHTML = '<option value="">All Gurus</option>' + writers.map(function (w) { return '<option value="' + S.esc(w) + '"' + (w === writer ? " selected" : "") + ">" + S.esc(w) + "</option>"; }).join("");
    var rows = dates.map(function (d) {
      var h = cache[d];
      if (!h) return '<div class="sk-archive-item" aria-hidden="true"><span class="sk-archive-date sk-skeleton" style="height:44px"></span><span class="flex-1"><span class="sk-skeleton block" style="height:0.9rem;width:60%"></span><span class="sk-skeleton block mt-2" style="height:0.9rem"></span></span></div>';
      if (writer && h.writer !== writer) return "";
      var text = [label(d), d, "ang " + h.ang, h.raag, h.writer, h.lines.map(function (l) { return [l.g, l.t, l.en, l.pa].join(" "); }).join(" ")].join(" ");
      if (!S.matches(text, q)) return "";
      var p = parts(d);
      return '<button type="button" class="sk-archive-item" data-go="' + d + '"' + (current && current.date === d ? ' aria-current="true"' : "") + ">" +
        '<span class="sk-archive-date"><b>' + p.d + "</b><small>" + new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase() + "</small></span>" +
        '<span class="min-w-0"><span class="sk-card-meta block" style="margin-top:0">Ang ' + h.ang + (h.writer ? " · " + S.esc(h.writer) : "") + "</span>" +
        '<span class="block mt-1" lang="pa" style="font-family:\'Noto Sans Gurmukhi\',sans-serif;color:var(--text);font-size:0.95rem;line-height:1.5">' + S.highlight(h.first ? h.first.g : "", q) + "</span></span></button>";
    }).join("");
    archiveEl.innerHTML = rows || '<div class="sk-empty" style="padding:1.5rem 1rem"><p class="sk-empty-title" style="font-size:0.95rem">No results found</p><p>Nothing in these ' + dates.length + ' days matches. Load more days or clear the search.</p></div>';
    document.querySelector("[data-archive-more]").hidden = shift(latest, -archiveDays) < H.archiveStart;
  }
  function renderSaved() {
    var list = S.bookmarks.ofType(["Hukamnama"]);
    savedEl.innerHTML = '<h2 class="sk-card-title">My saved Hukamnamas</h2>' + (list.length
      ? '<div class="flex flex-col gap-2 mt-3">' + list.map(function (b) { return '<a class="sk-btn sk-btn-sm" style="justify-content:flex-start" href="' + S.esc(b.url) + '">' + S.icon("bookmark", 14) + S.esc(b.title) + "</a>"; }).join("") + "</div>"
      : '<p class="sk-card-meta">Use Bookmark on any Hukamnama to keep it here.</p>');
  }

  /* ---------- Events */
  document.querySelector("main").addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-day]"))) { if (current) show(shift(current.date, Number(t.dataset.day))); return; }
    if (e.target.closest("[data-today],[data-today-btn]")) { show("today"); return; }
    if (e.target.closest("[data-retry]")) { show(pending || "today"); return; }
    if ((t = e.target.closest("[data-go]"))) { show(t.dataset.go); cardEl.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (e.target.closest("[data-archive-more]")) { archiveDays += 7; loadArchive(); return; }
    if (!current) return;
    if (e.target.closest("[data-bm]")) {
      S.bookmarks.toggle({ id: "hukamnama:" + current.date, type: "Hukamnama", title: "Hukamnama — " + label(current.date), subtitle: "Ang " + current.ang, url: "/hukamnama#date=" + current.date });
      return;
    }
    if (e.target.closest("[data-share]")) { S.share({ title: "Hukamnama — " + label(current.date), text: "Hukamnama from Sri Harmandir Sahib, Ang " + current.ang, url: S.pageUrl("date=" + current.date) }); return; }
    if (e.target.closest("[data-print]")) { window.print(); return; }
    if ((t = e.target.closest("[data-copy]"))) { S.copy(S.gurbani.text(current.lines, t.dataset.copy), t.dataset.copy === "g" ? "Gurmukhi" : t.dataset.copy === "t" ? "Transliteration" : "Meaning"); return; }
    if (e.target.closest("[data-open-reading]")) {
      var h = current;
      S.reading.open({ title: "Hukamnama — " + label(h.date), subtitle: [h.ang ? "Ang " + h.ang : "", h.writer].filter(Boolean).join(" · "), render: function () { return renderText(h); } });
    }
  });
  dateInput.addEventListener("change", function () {
    var v = dateInput.value;
    if (!v) return;
    if (v < H.archiveStart || (latest && v > latest)) { S.toast("Choose a date between " + label(H.archiveStart) + " and today", "error"); if (current) dateInput.value = current.date; return; }
    show(v);
  });
  S.onSearch(archiveSearch, renderArchive);
  writerSel.addEventListener("change", renderArchive);
  document.addEventListener("sikhify:bookmarks", renderSaved);
  document.addEventListener("sikhify:prefs", function () {
    if (current) cardEl.querySelector("[data-lines]").innerHTML = renderText(current);
  });
  window.addEventListener("hashchange", function () {
    var d = S.hashParams().date;
    if (d && (!current || d !== current.date)) show(d, false);
  });

  /* ---------- Start: load today first (it defines the newest date), then any requested date. */
  dateInput.min = H.archiveStart;
  renderSaved();
  skeleton();
  var wanted = S.hashParams().date;
  fetchDay("today").then(function (h) {
    dateInput.max = latest;
    if (wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) && wanted !== h.date) show(wanted, false);
    else { pending = "today"; renderCard(h); }
    loadArchive();
  }).catch(function (err) {
    if (wanted) show(wanted, false); else renderError("today", err);
    renderArchive();
  });

}
