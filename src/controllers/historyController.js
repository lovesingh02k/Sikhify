/* Migrated from active js/history.js; behavior retained.
   Guru cards show the Guru's museum artwork (utils/images.js) beside the number. */
import { guruImageHtml } from "../utils/images.js";
export function initHistory() {
"use strict";
  var S = window.Sikhify, D = window.SikhifyData;
  if (!D.history) return;

  var EVENTS = D.history.slice().sort(function (a, b) { return a.sort - b.sort; });
  var BY_ID = {};
  EVENTS.forEach(function (e) { BY_ID[e.id] = e; });
  var FILTERS = ["All"].concat(D.historyCategories);
  var ERAS = [
    { label: "The Guru period", range: "1469–1708", from: 0, to: 1708 },
    { label: "The 18th century", range: "1708–1799", from: 1709, to: 1798 },
    { label: "The Sikh Empire", range: "1799–1849", from: 1799, to: 1849 },
    { label: "The modern era", range: "1850–today", from: 1850, to: 9999 },
  ];

  var state = { filter: "All", q: "" };
  var input = document.getElementById("history-search");
  var filtersEl = document.querySelector("[data-filters]");
  var countEl = document.querySelector("[data-count]");
  var timelineEl = document.querySelector("[data-timeline]");
  var gurusEl = document.querySelector("[data-guru-cards]");
  var empireEl = document.querySelector("[data-empire]");
  var figuresEl = document.querySelector("[data-figures]");

  /* Content language: data stays English; these return display copies (and searchable text) in the chosen language. */
  var I = S.i18n;
  var locE = function (e) { return I.localize("history", e); };
  var locF = function (f) { return I.localize("historyFigures", f); };
  var locG = function (g) { return I.localize("gurus", g); };
  var enText = function (e) { return [e.year, e.title, e.location, e.people.join(" "), e.summary, e.details.join(" "), e.categories.join(" ")].join(" "); };
  var eventText = function (e) { return I.lang() === "en" ? enText(e) : enText(e) + " " + enText(locE(e)); };
  var both = function (fn, x, loc) { return I.lang() === "en" ? fn(x) : fn(x) + " " + fn(loc(x)); };
  var inFilter = function (e) { return state.filter === "All" || e.categories.indexOf(state.filter) !== -1; };
  var visible = function () { return EVENTS.filter(function (e) { return inFilter(e) && S.matches(eventText(e), state.q); }); };

  function renderFilters() {
    filtersEl.innerHTML = FILTERS.map(function (f) {
      var n = f === "All" ? EVENTS.length : EVENTS.filter(function (e) { return e.categories.indexOf(f) !== -1; }).length;
      return '<button type="button" class="sk-chip" data-filter="' + S.esc(f) + '" aria-pressed="' + (state.filter === f) + '">' + S.esc(f) + '<span class="sk-count">' + n + "</span></button>";
    }).join("");
  }

  function eventCard(en) {
    var e = locE(en), la = I.attr();
    return '<li class="sk-timeline-item" id="t-' + e.id + '"><article class="sk-card">' +
      '<div class="flex flex-wrap items-center justify-between gap-2"><p class="sk-timeline-year">' + S.highlight(e.year, state.q) + "</p>" +
      '<div class="flex flex-wrap gap-1">' + e.categories.map(function (c) { return '<span class="sk-badge sk-badge-muted">' + S.esc(c) + "</span>"; }).join("") + "</div></div>" +
      '<h3 class="sk-card-title mt-1"' + la + ">" + S.highlight(e.title, state.q) + "</h3>" +
      '<div class="sk-meta-row"' + la + "><span>" + S.icon("pin", 14) + '<span class="sr-only">Location: </span>' + S.highlight(e.location, state.q) + "</span>" +
      (e.people.length ? "<span>" + S.icon("user", 14) + '<span class="sr-only">People: </span>' + S.highlight(e.people.join(", "), state.q) + "</span>" : "") + "</div>" +
      '<p class="sk-card-text"' + la + ">" + S.highlight(e.summary, state.q) + "</p>" +
      '<div class="sk-card-foot"><button type="button" class="sk-btn sk-btn-sm sk-btn-navy" data-open-event="' + e.id + '" aria-haspopup="dialog">View details</button>' +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy-event="' + e.id + '">' + S.icon("link", 15) + "Copy link</button></div>" +
      "</article></li>";
  }

  function renderTimeline(list) {
    if (!list.length) {
      timelineEl.innerHTML = '<div class="sk-empty"><p class="sk-empty-title">No results found</p><p>No events match' + (state.q ? " “" + S.esc(state.q) + "”" : "") +
        (state.filter !== "All" ? " in " + S.esc(state.filter) : "") + '. Try another word or filter.</p><div class="sk-suggest">' +
        ["Khalsa", "Amritsar", "Martyrdom", "Ranjit Singh", "1984"].map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + s + '">' + s + "</button>"; }).join("") +
        '<button type="button" class="sk-chip" data-clear-all>Clear filters</button></div></div>';
      return;
    }
    timelineEl.innerHTML = ERAS.map(function (era) {
      var items = list.filter(function (e) { return e.sort >= era.from && e.sort <= era.to + 0.99; });
      if (!items.length) return "";
      return '<div class="sk-era-head"><h3' + I.attr() + ">" + S.esc(I.t("era:" + era.label, era.label)) + '</h3><span class="sk-card-meta">' + era.range + "</span></div>" +
        '<ol class="sk-timeline">' + items.map(eventCard).join("") + "</ol>";
    }).join("");
  }

  function renderGurus() {
    var section = gurusEl.closest("[data-section]");
    var show = state.filter === "All" || state.filter === "Guru Period";
    var gText = function (g) { return [g.name, g.gurmukhi, g.bio, g.birthplace, g.lifespan].join(" "); };
    var gurus = (D.gurus || []).filter(function (g) { return S.matches(both(gText, g, locG), state.q); });
    section.hidden = !show || !gurus.length;
    gurusEl.innerHTML = gurus.map(function (en) {
      var g = locG(en), la = I.attr();
      return '<a class="sk-card sk-card-link" href="/learn-sikhism#topic=' + g.id + '">' +
        '<div class="flex items-center gap-3">' + '<span class="sk-guru-thumb" aria-hidden="true">' + guruImageHtml(g, { sizes: '56px' }) + '<span class="sk-guru-thumb-num">' + g.number + "</span></span>" +
        '<div><p class="sk-card-title" style="font-size:0.98rem"' + la + ">" + S.highlight(g.name, state.q) + '</p><p class="sk-card-meta">' + S.esc(g.lifespan) + "</p></div></div>" +
        '<p class="sk-card-text"' + la + ">" + S.esc(en.number === 1 ? g.guruship : I.t("guruYears", "Guru {years}", { years: g.guruship })) + " · " + S.esc(g.birthplace.split("(")[0].trim()) + "</p></a>";
    }).join("");
  }

  function renderEmpire() {
    var section = empireEl.closest("[data-section]");
    var E = I.localize("sikhEmpire", D.sikhEmpire), la = I.attr();
    var events = EVENTS.filter(function (e) { return e.categories.indexOf("Sikh Empire") !== -1 && S.matches(eventText(e), state.q); });
    var introMatch = S.matches([D.sikhEmpire.intro, D.sikhEmpire.places.join(" "), E.intro, E.places.join(" ")].join(" "), state.q);
    section.hidden = !(state.filter === "All" || state.filter === "Sikh Empire") || (!introMatch && !events.length);
    empireEl.innerHTML =
      '<div class="sk-grid sk-grid-2"' + la + '><div class="sk-card"><p class="sk-card-text" style="margin-top:0">' + S.highlight(E.intro, state.q) + "</p>" +
      '<h3 class="sk-card-title mt-4" style="font-size:0.95rem">' + I.t("importantPlaces", "Important places") + "</h3>" + '<ul class="mt-2" style="list-style:disc;padding-left:1.2rem">' +
      E.places.map(function (p) { return '<li class="sk-card-text" style="margin-top:0.2rem">' + S.highlight(p, state.q) + "</li>"; }).join("") + "</ul></div>" +
      '<div><dl class="sk-grid sk-grid-2" style="gap:0.75rem">' + E.facts.map(function (f) { return '<div class="sk-fact"><dt>' + S.esc(f.label) + "</dt><dd>" + S.esc(f.value) + "</dd></div>"; }).join("") + "</dl>" +
      '<h3 class="sk-card-title mt-5" style="font-size:0.95rem">' + I.t("majorEvents", "Major events") + "</h3>" + '<div class="flex flex-col gap-2 mt-2">' +
      (events.length ? events.map(function (en) {
        var e = locE(en);
        return '<button type="button" class="sk-archive-item" data-open-event="' + e.id + '" aria-haspopup="dialog"><span class="sk-archive-date"><b>' + S.esc(e.year.replace(/s$/, "")) + "</b></span><span><span class=\"sk-card-title\" style=\"font-size:0.92rem\">" + S.esc(e.title) + '</span><span class="sk-card-meta block">' + S.esc(e.summary) + "</span></span></button>";
      }).join("") : '<p class="sk-card-meta">No Sikh Empire events match your search.</p>') + "</div></div></div>";
  }

  function renderFigures() {
    var figs = (D.historyFigures || []).filter(function (f) {
      var ev = BY_ID[f.event];
      var okFilter = state.filter === "All" || (ev && ev.categories.indexOf(state.filter) !== -1);
      return okFilter && S.matches(both(function (x) { return [x.name, x.role, x.era, x.summary].join(" "); }, f, locF), state.q);
    });
    figuresEl.closest("section").hidden = !figs.length;
    figuresEl.innerHTML = figs.map(function (en) {
      var f = locF(en), la = I.attr();
      return '<button type="button" class="sk-card sk-card-link" data-open-event="' + f.event + '" aria-haspopup="dialog">' +
        '<span class="sk-badge"' + la + ">" + S.esc(f.role) + "</span>" +
        '<span class="sk-card-title block mt-2"' + la + ">" + S.highlight(f.name, state.q) + "</span>" +
        '<span class="sk-card-meta block"' + la + ">" + S.esc(f.era) + "</span>" +
        '<span class="sk-card-text block"' + la + ">" + S.highlight(f.summary, state.q) + "</span>" +
        '<span class="panel-view-all block mt-3">Read the event →</span></button>';
    }).join("");
  }

  function render() {
    renderFilters();
    var list = visible();
    countEl.textContent = list.length + (list.length === 1 ? " event" : " events") + (state.q ? " match “" + state.q + "”" : "");
    renderTimeline(list);
    renderGurus();
    renderEmpire();
    renderFigures();
  }

  /* ---------- Details dialog */
  var openId = null;
  function openEvent(id, push) {
    var en = BY_ID[id];
    if (!en) return;
    openId = id;
    var e = locE(en), la = I.attr(), T = I.t;
    var list = visible();
    if (list.indexOf(en) === -1) list = EVENTS;
    var i = list.indexOf(en), prev = list[i - 1] && locE(list[i - 1]), next = list[i + 1] && locE(list[i + 1]);
    var figures = (D.historyFigures || []).filter(function (f) { return f.event === e.id; }).map(locF);
    if (push !== false) S.setHash({ event: id }, true);
    var body = S.dialog.open({
      title: e.year + " — " + e.title,
      html:
        '<div class="flex flex-wrap items-center justify-between gap-2"><div class="flex flex-wrap gap-1">' + e.categories.map(function (c) { return '<span class="sk-badge">' + S.esc(c) + "</span>"; }).join("") + "</div>" + I.switcher({ compact: true }) + "</div>" +
        '<div' + la + '><dl class="sk-grid sk-grid-2 mt-4" style="gap:0.75rem"><div class="sk-fact"><dt>' + T("when", "When") + "</dt><dd>" + S.esc(e.year) + '</dd></div><div class="sk-fact"><dt>' + T("where", "Where") + "</dt><dd>" + S.esc(e.location) + "</dd></div>" +
        (e.people.length ? '<div class="sk-fact" style="grid-column:1/-1"><dt>' + T("people", "People") + "</dt><dd>" + S.esc(e.people.join(", ")) + "</dd></div>" : "") + "</dl>" +
        '<p class="mt-4" style="color:var(--text);font-weight:500">' + S.esc(e.summary) + "</p>" +
        e.details.map(function (d) { return "<p>" + S.esc(d) + "</p>"; }).join("") +
        (figures.length ? '<p class="mt-4"><strong style="color:var(--text)">' + T("rememberedHere", "Remembered here:") + "</strong> " + figures.map(function (f) { return S.esc(f.name); }).join("; ") + "</p>" : "") + "</div>" +
        relatedGuruLinks(en) +
        '<div class="sk-lesson-nav">' +
        (prev ? '<button type="button" class="sk-nav-card" data-open-event="' + prev.id + '"><small>← Previous</small>' + S.esc(prev.year + " — " + prev.title) + "</button>" : "<span></span>") +
        '<div class="flex gap-2 justify-center"><button type="button" class="sk-btn sk-btn-sm" data-copy-event="' + e.id + '">' + S.icon("link", 15) + 'Copy link</button><button type="button" class="sk-btn sk-btn-sm" data-share-event="' + e.id + '">' + S.icon("share", 15) + "Share</button></div>" +
        (next ? '<button type="button" class="sk-nav-card sk-next" data-open-event="' + next.id + '"><small>Next →</small>' + S.esc(next.year + " — " + next.title) + "</button>" : "<span></span>") +
        "</div>",
      onClose: function () {
        openId = null;
        if (S.hashParams().event) history.replaceState(null, "", location.pathname + location.search);
      },
    });
    body.onclick = handleClick;
  }
  function relatedGuruLinks(e) {
    var gs = (D.gurus || []).filter(function (g) { return e.people.indexOf(g.name) !== -1; });
    if (!gs.length) return "";
    return '<div class="flex flex-wrap gap-2 mt-4">' + gs.map(function (g) { return '<a class="sk-chip" href="/learn-sikhism#topic=' + g.id + '">Lesson: <span' + I.attr() + ">" + S.esc(locG(g).name) + "</span></a>"; }).join("") + "</div>";
  }

  /* ---------- Events */
  function handleClick(ev) {
    var t;
    if ((t = ev.target.closest("[data-filter]"))) { state.filter = t.dataset.filter; render(); return; }
    if ((t = ev.target.closest("[data-open-event]"))) { openEvent(t.dataset.openEvent); return; }
    if ((t = ev.target.closest("[data-copy-event]"))) { S.copy(S.pageUrl("event=" + t.dataset.copyEvent), "Link"); return; }
    if ((t = ev.target.closest("[data-share-event]"))) {
      var e = BY_ID[t.dataset.shareEvent];
      S.share({ title: e.title + " — Sikh History", text: e.summary, url: S.pageUrl("event=" + e.id) });
      return;
    }
    if ((t = ev.target.closest("[data-suggest]"))) { state.filter = "All"; S.setField(input, t.dataset.suggest); return; }
    if (ev.target.closest("[data-clear-all]")) { state.filter = "All"; S.setField(input, ""); }
  }
  document.querySelector("main").addEventListener("click", handleClick);
  S.onSearch(input, function () { state.q = input.value; render(); });

  /* ---------- Routing: #event=, #filter=, #q= */
  function route() {
    var h = S.hashParams();
    if (h.filter && FILTERS.indexOf(h.filter) !== -1) { state.filter = h.filter; render(); }
    if (h.q) { input.value = h.q; state.q = h.q; render(); }
    if (h.event && BY_ID[h.event]) openEvent(h.event, false);
  }
  window.addEventListener("hashchange", route);
  // Language change: re-render lists, and the open event in place.
  I.watch(function () {
    render();
    if (openId) openEvent(openId, false);
  });
  render();
  route();

}
