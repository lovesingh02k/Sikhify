/* Migrated from active js/gurbani.js; behavior retained. */
export function initGurbani() {
"use strict";
  var S = window.Sikhify, G = window.SikhifyData.gurbani;
  if (!G) return;
  var PAGE_SIZE = 9;
  var API = "https://api.banidb.com/v2";

  /* ---------- Normalised item list */
  function track(item) {
    var a = item.audioRaw;
    if (!a || !a.url) return null;
    return {
      id: "gb:" + item.id, title: item.title, subtitle: "Recitation · " + a.by, url: a.url, duration: a.duration,
      credit: 'Recording: ' + S.esc(a.by) + ' · <a href="' + S.esc(a.source) + '" target="_blank" rel="noopener noreferrer">archive.org</a> · ' + S.esc(a.license),
    };
  }
  var ITEMS = [].concat(
    G.banis.map(function (b) {
      return {
        id: b.id, type: "Bani", title: b.name, gurmukhiTitle: b.gurmukhiName, author: b.author, raag: b.raag || "",
        ang: b.ang || "", source: b.source, nitnem: b.nitnem, lines: b.opening || [], full: false,
        baniDbId: b.baniDbId, lineCount: b.lineCount, audioRaw: b.audio,
        youtube: b.youtube ? { id: b.youtube, artist: "" } : null,
      };
    }),
    G.shabads.map(function (s) {
      return {
        id: s.id, type: "Shabad", title: s.title, gurmukhiTitle: s.gurmukhiTitle, author: s.author, raag: s.raag || "",
        ang: String(s.ang), source: s.source, nitnem: false, lines: s.lines, full: true, audioRaw: null, youtube: s.youtube,
      };
    })
  );
  ITEMS.forEach(function (it) { it.track = track(it); });
  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });
  S.audio.register(ITEMS.map(function (i) { return i.track; }).filter(Boolean));

  var authors = Array.from(new Set(ITEMS.map(function (i) { return i.author; }))).sort();
  var raags = Array.from(new Set(ITEMS.map(function (i) { return i.raag; }).filter(Boolean))).sort();

  /* ---------- Elements & state */
  var library = document.getElementById("gb-library");
  var detail = document.getElementById("gb-detail");
  var input = document.getElementById("gb-search");
  var grid = library.querySelector("[data-gb-grid]");
  var countEl = library.querySelector("[data-count]");
  var filtersEl = library.querySelector("[data-filters]");
  var authorSel = library.querySelector("[data-author-filter]");
  var raagSel = library.querySelector("[data-raag-filter]");
  var moreBtn = library.querySelector("[data-load-more]");
  library.querySelector("[data-prefs]").innerHTML = S.prefsToolbar();
  var FILTERS = ["All", "Shabad", "Bani", "Nitnem", "My Bookmarks"];
  var state = { filter: "All", q: "", author: "", raag: "", shown: PAGE_SIZE };

  authorSel.innerHTML = '<option value="">All Gurus &amp; Bhagats</option>' + authors.map(function (a) { return '<option value="' + S.esc(a) + '">' + S.esc(a) + "</option>"; }).join("");
  raagSel.innerHTML = '<option value="">All Raags</option>' + raags.map(function (r) { return '<option value="' + S.esc(r) + '">' + S.esc(r) + "</option>"; }).join("");

  function itemText(it) {
    return [it.title, it.gurmukhiTitle, it.author, it.raag, it.type, it.nitnem ? "nitnem" : "", it.ang ? "ang " + it.ang + " " + it.ang : "",
      it.lines.map(function (l) { return [l.g, l.t, l.pa, l.hi, l.en].join(" "); }).join(" ")].join(" ");
  }
  function visible() {
    return ITEMS.filter(function (it) {
      if (state.filter === "Shabad" && it.type !== "Shabad") return false;
      if (state.filter === "Bani" && it.type !== "Bani") return false;
      if (state.filter === "Nitnem" && !it.nitnem) return false;
      if (state.filter === "My Bookmarks" && !S.bookmarks.has("gurbani:" + it.id)) return false;
      if (state.author && it.author !== state.author) return false;
      if (state.raag && it.raag !== state.raag) return false;
      return S.matches(itemText(it), state.q);
    });
  }
  S.audio.queueFor = function () {
    var q = visible().map(function (i) { return i.track; }).filter(Boolean);
    return q.length ? q : ITEMS.map(function (i) { return i.track; }).filter(Boolean);
  };

  /* ---------- Library rendering */
  function firstContentLine(it) {
    return it.lines.find(function (l) { return l.en && !/^(ੴ|.*ਮਹਲਾ|.*ਮਃ|ਸਲੋਕ|ਰਾਗੁ)/.test(l.g); }) || it.lines[0];
  }
  function card(it) {
    var line = firstContentLine(it);
    var m = line ? S.gurbani.meaningOf(line, S.prefs.get().lang) : { text: "" };
    var isBm = S.bookmarks.has("gurbani:" + it.id);
    return '<article class="sk-card sk-card-link" data-open-item="' + it.id + '">' +
      '<div class="flex flex-wrap gap-1"><span class="sk-badge">' + it.type + "</span>" + (it.nitnem ? '<span class="sk-badge sk-badge-navy">Nitnem</span>' : "") +
      (it.track ? '<span class="sk-badge sk-badge-muted">' + S.icon("volume", 12) + "Audio</span>" : "") + "</div>" +
      '<h3 class="gb-title-g mt-3" lang="pa"><a href="#item=' + it.id + '">' + S.highlight(it.gurmukhiTitle, state.q) + "</a></h3>" +
      '<p class="sk-card-title" style="font-size:0.95rem">' + S.highlight(it.title, state.q) + "</p>" +
      '<p class="sk-card-meta">' + S.esc([it.author, it.raag, S.gurbani.sourceLabel(it)].filter(Boolean).join(" · ")) + "</p>" +
      (m.text ? '<p class="sk-card-text"' + (m.lang === "pa" ? ' lang="pa" style="font-family:\'Noto Sans Gurmukhi\',sans-serif"' : "") + ">" + S.highlight(m.text, state.q) + "</p>" : "") +
      '<div class="sk-card-foot"><button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="gurbani:' + it.id + '" data-bm-item="' + it.id + '" aria-pressed="' + isBm + '">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">' + (isBm ? "Saved" : "Bookmark") + "</span></button>" +
      '<a href="#item=' + it.id + '" class="panel-view-all" tabindex="-1" aria-hidden="true">Read →</a></div></article>';
  }
  function savedAngs() {
    var angs = S.bookmarks.ofType(["Ang"]);
    if (!angs.length) return "";
    return '<div class="sk-card mb-5" style="grid-column:1/-1"><h3 class="sk-card-title" style="font-size:0.95rem">Saved Angs</h3><div class="sk-suggest mt-3">' +
      angs.map(function (b) { return '<a class="sk-chip" href="' + S.esc(b.url) + '">' + S.esc(b.title) + "</a>"; }).join("") + "</div></div>";
  }
  function renderLibrary() {
    filtersEl.innerHTML = FILTERS.map(function (f) {
      var n = f === "All" ? ITEMS.length : f === "Shabad" ? ITEMS.filter(function (i) { return i.type === "Shabad"; }).length :
        f === "Bani" ? ITEMS.filter(function (i) { return i.type === "Bani"; }).length : f === "Nitnem" ? ITEMS.filter(function (i) { return i.nitnem; }).length :
        S.bookmarks.ofType(["Shabad", "Bani", "Ang"]).length;
      return '<button type="button" class="sk-chip" data-filter="' + f + '" aria-pressed="' + (state.filter === f) + '">' + f + '<span class="sk-count">' + n + "</span></button>";
    }).join("");
    authorSel.value = state.author;
    raagSel.value = state.raag;
    var list = visible();
    countEl.textContent = list.length + (list.length === 1 ? " result" : " results");
    var head = state.filter === "My Bookmarks" ? savedAngs() : "";
    if (!list.length) {
      grid.innerHTML = head + '<div class="sk-empty" style="grid-column:1/-1"><p class="sk-empty-title">No results found</p><p>' +
        (state.filter === "My Bookmarks" && !state.q ? "You haven't bookmarked any Gurbani yet. Open a shabad or Bani and select Bookmark." :
          "Try a different spelling (e.g. “japji” or “ਜਪੁ”), a Raag, an Ang number, or clear the filters.") +
        '</p><div class="sk-suggest">' + ["Japji", "ਮੇਰਾ ਮਨੁ", "Raag Asa", "father", "633"].map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + S.esc(s) + '">' + S.esc(s) + "</button>"; }).join("") +
        '<button type="button" class="sk-chip" data-clear-all>Clear filters</button></div></div>';
      moreBtn.hidden = true;
      return;
    }
    grid.innerHTML = head + list.slice(0, state.shown).map(card).join("");
    moreBtn.hidden = list.length <= state.shown;
    moreBtn.textContent = "Load more (" + (list.length - state.shown) + " remaining)";
  }

  library.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-filter]"))) { state.filter = t.dataset.filter; state.shown = PAGE_SIZE; renderLibrary(); return; }
    if ((t = e.target.closest("[data-bm-item]"))) { toggleBookmark(BY_ID[t.dataset.bmItem]); return; }
    if ((t = e.target.closest("[data-suggest]"))) { resetFilters(); S.setField(input, t.dataset.suggest); return; }
    if (e.target.closest("[data-clear-all]")) { resetFilters(); S.setField(input, ""); return; }
    if (e.target.closest("[data-load-more]")) {
      var first = state.shown;
      state.shown += PAGE_SIZE;
      renderLibrary();
      var next = grid.querySelectorAll("[data-open-item]")[first];
      if (next) next.querySelector("a").focus();
      return;
    }
    if (e.target.closest("[data-open-reading]")) return;
    var c = e.target.closest("[data-open-item]");
    if (c && !e.target.closest("a,button")) location.hash = "item=" + c.dataset.openItem;
  });
  function resetFilters() { state.filter = "All"; state.author = ""; state.raag = ""; state.shown = PAGE_SIZE; }
  S.onSearch(input, function () { state.q = input.value; state.shown = PAGE_SIZE; renderLibrary(); });
  authorSel.addEventListener("change", function () { state.author = authorSel.value; state.shown = PAGE_SIZE; renderLibrary(); });
  raagSel.addEventListener("change", function () { state.raag = raagSel.value; state.shown = PAGE_SIZE; renderLibrary(); });
  library.querySelector("[data-ang-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = parseInt(document.getElementById("ang-input").value, 10);
    if (!(n >= 1 && n <= 1430)) { S.toast("Enter an Ang between 1 and 1430", "error"); return; }
    location.hash = "ang=" + n;
  });

  function toggleBookmark(it) {
    S.bookmarks.toggle({ id: "gurbani:" + it.id, type: it.type, title: it.title, subtitle: it.gurmukhiTitle, url: "/gurbani#item=" + it.id });
    if (!library.hidden) renderLibrary();
  }

  /* ---------- Detail view */
  var current = null; // { kind: "item"|"ang", item?, ang?, lines, title, subtitle }

  function skeleton() {
    return '<div class="sk-stack" aria-hidden="true">' + [1, 2, 3, 4, 5].map(function () {
      return '<div><div class="sk-skeleton" style="height:1.8rem;width:90%"></div><div class="sk-skeleton mt-2" style="height:0.9rem;width:70%"></div></div>';
    }).join("") + "</div>";
  }
  function detailShell(opts) {
    return '<a href="/gurbani" class="sk-link-btn" data-back>' + S.icon("left", 16) + "Gurbani Library</a>" +
      '<div class="sk-card mt-4" style="padding:clamp(1.25rem,3vw,2.25rem)">' +
      '<div class="sk-panel-head"><div class="min-w-0">' + opts.badges +
      '<h2 class="gb-title-g mt-3" lang="pa" style="font-size:clamp(1.4rem,3vw,1.9rem)" tabindex="-1" data-detail-title>' + S.esc(opts.gTitle) + "</h2>" +
      '<p class="sk-card-title mt-1">' + S.esc(opts.title) + '</p><p class="sk-card-meta">' + S.esc(opts.meta) + "</p></div>" +
      '<div class="gb-actions">' + opts.actions + "</div></div>" +
      '<div class="mt-5">' + opts.audio + "</div>" +
      '<div class="sk-sticky-tools mt-5">' + S.prefsToolbar({ readingMode: true }) + "</div>" +
      '<div class="flex flex-wrap gap-2 mt-4">' +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="g">' + S.icon("copy", 15) + "Copy Gurmukhi</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="t">' + S.icon("copy", 15) + "Copy transliteration</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="meaning">' + S.icon("copy", 15) + "Copy meaning</button></div>" +
      '<div class="gb-text mt-6" data-lines>' + skeleton() + "</div>" + opts.note +
      '<div class="sk-lesson-nav">' + opts.nav + "</div></div>";
  }
  function shareBtn() { return '<button type="button" class="sk-btn sk-btn-sm" data-share>' + S.icon("share", 15) + "Share</button>"; }

  function openItem(it) {
    var list = visible();
    if (list.indexOf(it) === -1) list = ITEMS;
    var i = list.indexOf(it), prev = list[i - 1], next = list[i + 1];
    current = { kind: "item", item: it, lines: it.lines, title: it.title, subtitle: [it.author, S.gurbani.sourceLabel(it)].filter(Boolean).join(" · ") };
    var yt = it.youtube ? ' <a href="https://www.youtube.com/watch?v=' + it.youtube.id + '" target="_blank" rel="noopener noreferrer">' + (it.youtube.artist ? "Listen to kirtan by " + S.esc(it.youtube.artist) : "Listen") + " on YouTube</a>." : "";
    detail.innerHTML = detailShell({
      badges: '<div class="flex flex-wrap gap-1"><span class="sk-badge">' + it.type + "</span>" + (it.nitnem ? '<a class="sk-badge sk-badge-navy" href="/nitnem#bani=' + it.id + '">Nitnem</a>' : "") + "</div>",
      gTitle: it.gurmukhiTitle, title: it.title,
      meta: [it.author, it.raag, S.gurbani.sourceLabel(it), it.lineCount ? it.lineCount + " lines" : ""].filter(Boolean).join(" · "),
      actions: '<button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="gurbani:' + it.id + '" data-bm-current aria-pressed="false">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">Bookmark</span></button>' + shareBtn(),
      audio: S.audio.playerHtml(it.track, yt, it.youtube ? { id: it.youtube.id, title: it.title, by: it.youtube.artist } : null),
      note: it.type === "Bani" ? '<p class="sk-card-meta mt-6">Full text of the SGPC version from BaniDB.' + (it.nitnem ? ' <a class="panel-view-all" href="/nitnem#bani=' + it.id + '">Read with the Nitnem checklist →</a>' : "") + "</p>" : '<p class="sk-card-meta mt-6">Text and meanings: BaniDB.</p>',
      nav: (prev ? '<a class="sk-nav-card" href="#item=' + prev.id + '"><small>← Previous</small>' + S.esc(prev.title) + "</a>" : "<span></span>") + "<span></span>" +
        (next ? '<a class="sk-nav-card sk-next" href="#item=' + next.id + '"><small>Next →</small>' + S.esc(next.title) + "</a>" : "<span></span>"),
    });
    showDetail(it.title);
    S.audio.emit();
    if (it.full) return renderLines(it.lines);
    loadBani(it).then(function (lines) {
      if (!current || current.item !== it) return;
      current.lines = lines;
      renderLines(lines);
    }).catch(function (err) {
      if (!current || current.item !== it) return;
      detail.querySelector("[data-lines]").innerHTML =
        S.statusHtml({ error: err, title: "The full text couldn't be loaded", actions: '<button type="button" class="sk-btn sk-btn-sm" data-retry>Try again</button>' }) +
        '<p class="sk-card-meta mt-4">The opening lines are shown below.</p>' +
        '<div class="mt-6">' + S.gurbani.renderLines(it.lines) + "</div>";
    });
  }
  function loadBani(it) {
    if (it.nitnem) {
      return S.loadScript("data/nitnem-text.js").then(function () { return window.SikhifyData.nitnemText[it.id]; });
    }
    return S.fetchJson(API + "/banis/" + it.baniDbId).then(function (d) {
      return d.verses.filter(function (v) { return v.existsSGPC === 1; }).map(function (v) {
        var x = v.verse, tr = x.translation || {};
        return { g: x.verse.unicode, t: (x.transliteration || {}).english, pa: tr.pu && tr.pu.ss && tr.pu.ss.unicode, hi: tr.hi && tr.hi.ss, en: tr.en && (tr.en.bdb || tr.en.ssk), p: v.paragraph };
      });
    });
  }

  function openAng(n) {
    var prev = n > 1 ? n - 1 : null, next = n < 1430 ? n + 1 : null;
    current = { kind: "ang", ang: n, lines: [], title: "Ang " + n, subtitle: "Sri Guru Granth Sahib Ji" };
    detail.innerHTML = detailShell({
      badges: '<span class="sk-badge">Ang</span>',
      gTitle: "ਅੰਗ " + toGurmukhiDigits(n), title: "Ang " + n + " of 1430", meta: "Sri Guru Granth Sahib Ji · loaded live from BaniDB",
      actions: '<button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="ang:' + n + '" data-bm-current aria-pressed="false">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">Bookmark</span></button>' + shareBtn(),
      audio: S.audio.playerHtml(null, " Recordings are not available for individual Angs."),
      note: '<p class="sk-card-meta mt-6">Gurmukhi, transliteration and meanings from BaniDB.</p>',
      nav: (prev ? '<a class="sk-nav-card" href="#ang=' + prev + '"><small>← Previous Ang</small>Ang ' + prev + "</a>" : "<span></span>") + "<span></span>" +
        (next ? '<a class="sk-nav-card sk-next" href="#ang=' + next + '"><small>Next Ang →</small>Ang ' + next + "</a>" : "<span></span>"),
    });
    showDetail("Ang " + n);
    S.fetchJson(API + "/angs/" + n + "/G").then(function (d) {
      if (!current || current.ang !== n) return;
      current.lines = d.page.map(function (v) {
        var tr = v.translation || {};
        return { g: v.verse.unicode, t: (v.transliteration || {}).english, pa: tr.pu && tr.pu.ss && tr.pu.ss.unicode, hi: tr.hi && tr.hi.ss, en: tr.en && (tr.en.bdb || tr.en.ssk) };
      });
      var raag = d.page[0] && d.page[0].raag && d.page[0].raag.english;
      if (raag) detail.querySelector(".sk-card-meta").textContent = "Sri Guru Granth Sahib Ji · " + raag + " · loaded live from BaniDB";
      renderLines(current.lines);
    }).catch(function (err) {
      if (!current || current.ang !== n) return;
      detail.querySelector("[data-lines]").innerHTML = S.statusHtml({ error: err, title: "Ang " + n + " couldn't be loaded",
        actions: '<button type="button" class="sk-btn sk-btn-sm" data-retry>Try again</button><a class="sk-chip" href="/gurbani">Back to the library</a>' });
    });
  }
  function toGurmukhiDigits(n) { return String(n).replace(/\d/g, function (d) { return "੦੧੨੩੪੫੬੭੮੯"[d]; }); }

  function renderLines(lines) {
    var box = detail.querySelector("[data-lines]");
    if (box) box.innerHTML = S.gurbani.renderLines(lines, { stanzas: current.kind === "item" && current.item.type === "Bani" });
  }
  document.addEventListener("sikhify:prefs", function () {
    if (!detail.hidden && current && current.lines.length) renderLines(current.lines);
    if (!library.hidden) renderLibrary();
  });

  detail.addEventListener("click", function (e) {
    if (!current) return;
    var t;
    if (e.target.closest("[data-back]")) { e.preventDefault(); history.pushState(null, "", location.pathname); route(); return; }
    if (e.target.closest("[data-bm-current]")) {
      if (current.kind === "item") toggleBookmark(current.item);
      else S.bookmarks.toggle({ id: "ang:" + current.ang, type: "Ang", title: "Ang " + current.ang, subtitle: "Sri Guru Granth Sahib Ji", url: "/gurbani#ang=" + current.ang });
      return;
    }
    if (e.target.closest("[data-share]")) {
      var hash = current.kind === "item" ? "item=" + current.item.id : "ang=" + current.ang;
      S.share({ title: current.title + " — Gurbani Library", text: current.subtitle, url: S.pageUrl(hash) });
      return;
    }
    if ((t = e.target.closest("[data-copy]"))) {
      if (!current.lines.length) { S.toast("Text is still loading", "error"); return; }
      var field = t.dataset.copy;
      var text = S.gurbani.text(current.lines, field);
      S.copy(text, field === "g" ? "Gurmukhi" : field === "t" ? "Transliteration" : "Meaning");
      return;
    }
    if (e.target.closest("[data-open-reading]")) {
      if (!current.lines.length) { S.toast("Text is still loading", "error"); return; }
      S.reading.open({
        title: current.title, subtitle: current.subtitle,
        render: function () { return S.gurbani.renderLines(current.lines, { stanzas: current.kind === "item" && current.item.type === "Bani" }); },
      });
      return;
    }
    if (e.target.closest("[data-retry]")) route();
  });

  /* ---------- Routing */
  var crumbs = document.querySelector("[data-breadcrumbs]");
  var baseTitle = document.title;
  function showDetail(label) {
    library.hidden = true;
    detail.hidden = false;
    var old = crumbs.querySelector("[data-crumb-item]");
    if (old) old.remove();
    crumbs.querySelector("[data-crumb-page]").removeAttribute("aria-current");
    var li = document.createElement("li");
    li.setAttribute("data-crumb-item", "");
    li.innerHTML = '<span aria-current="page">' + S.esc(label) + "</span>";
    crumbs.appendChild(li);
    document.title = label + " — Gurbani Library — Sikhify";
    S.syncBookmarkButtons(detail);
    detail.scrollIntoView({ block: "start" });
    var h = detail.querySelector("[data-detail-title]");
    if (h) h.focus({ preventScroll: true });
  }
  function showLibrary() {
    current = null;
    detail.hidden = true;
    detail.innerHTML = "";
    library.hidden = false;
    var old = crumbs.querySelector("[data-crumb-item]");
    if (old) old.remove();
    crumbs.querySelector("[data-crumb-page]").setAttribute("aria-current", "page");
    document.title = baseTitle;
    renderLibrary();
  }
  function route() {
    var h = S.hashParams();
    if (h.item && BY_ID[h.item]) return openItem(BY_ID[h.item]);
    var n = parseInt(h.ang, 10);
    if (n >= 1 && n <= 1430) return openAng(n);
    if (h.raag) { resetFilters(); state.raag = raags.indexOf(h.raag) !== -1 ? h.raag : ""; if (!state.raag) S.setField(input, h.raag); }
    if (h.q) { input.value = h.q; state.q = h.q; }
    if (h.filter && FILTERS.indexOf(h.filter) !== -1) state.filter = h.filter;
    if (h.item && !BY_ID[h.item]) S.toast("That Gurbani item wasn't found", "error");
    showLibrary();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.addEventListener("sikhify:bookmarks", function () { if (!library.hidden) renderLibrary(); });
  route();

}
