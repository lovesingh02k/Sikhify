/* Migrated from active js/learn.js; behavior retained.
   Guru cards show the Guru's museum artwork (utils/images.js) beside the number. */
import { guruImageHtml } from "../utils/images.js";
export function initLearn() {
"use strict";
  var S = window.Sikhify, D = window.SikhifyData;
  var dashboard = document.getElementById("learn-dashboard");
  var lessonEl = document.getElementById("learn-lesson");
  if (!dashboard || !D.learn || !D.gurus) return;

  /* ---------- Build the ordered lesson list (Gurus come from data/gurus.js) */
  var ORDINAL = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  var guruLessons = D.gurus.map(function (g) {
    return {
      id: g.id, title: g.name, gurmukhi: g.gurmukhi, category: "Gurus", tags: ["Gurus"],
      summary: ORDINAL[g.number] + " Guru · " + g.lifespan, guru: g,
    };
  });
  var byCat = function (c) { return D.learn.filter(function (l) { return l.category === c; }); };
  var LESSONS = [].concat(byCat("Basics"), guruLessons, byCat("Concepts"), byCat("Practices"), byCat("Five Ks"), byCat("Sikh History"));
  var BY_ID = {};
  LESSONS.forEach(function (l, i) { l.index = i; BY_ID[l.id] = l; });

  var SECTION_TITLES = {
    Basics: ["Introduction to Sikhism", "What Sikhs believe and the three pillars of Sikh life."],
    Gurus: ["Guru Sahiban", "The Ten Gurus, from Guru Nanak Dev Ji to Guru Gobind Singh Ji."],
    Concepts: ["Sikh concepts", "Key ideas you will meet again and again in Gurbani."],
    Practices: ["Sikh practices", "How Sikhs live their faith day to day."],
    "Five Ks": ["The Five Ks", "The five articles of faith of the Khalsa."],
    "Sikh History": ["Sikh history essentials", "Turning points every Sikh learns about."],
  };
  var FILTERS = ["All"].concat(D.learnCategories, ["Bookmarked"]);

  /* ---------- Content language (English, Hindi, Punjabi). Data objects stay English;
     these return display copies in the visitor's chosen language. */
  var I = S.i18n;
  function locGuru(g) { return I.localize("gurus", g); }
  function guruSummary(g) {
    var ords = I.get("ordinals");
    var ord = ords ? I.t("guruOrdinal", "{ordinal} Guru", { ordinal: ords[g.number] }) : ORDINAL[g.number] + " Guru";
    return ord + " · " + g.lifespan;
  }
  function loc(l) {
    if (!l.guru) return I.localize("learn", l);
    var g = locGuru(l.guru);
    return Object.assign({}, l, { title: g.name, summary: guruSummary(g), guru: g });
  }
  function sectionTitle(cat) { var t = I.get("learnSections"); return (t && t[cat]) || SECTION_TITLES[cat]; }

  /* ---------- Progress (persisted) */
  var progress = function () { return S.store.get("learnProgress", { completed: [], last: null }); };
  var saveProgress = function (p) { S.store.set("learnProgress", p); renderProgress(); };
  var isDone = function (id) { return progress().completed.indexOf(id) !== -1; };
  function setDone(id, done) {
    var p = progress();
    p.completed = p.completed.filter(function (x) { return x !== id && BY_ID[x]; });
    if (done) p.completed.push(id);
    saveProgress(p);
  }

  function renderProgress() {
    var p = progress();
    var done = p.completed.filter(function (id) { return BY_ID[id]; }).length;
    var pct = Math.round((done / LESSONS.length) * 100);
    document.querySelector("[data-progress-pct]").textContent = pct + "%";
    var bar = document.querySelector("[data-progress-bar]");
    bar.setAttribute("aria-valuenow", pct);
    bar.firstElementChild.style.width = pct + "%";
    document.querySelector("[data-progress-text]").textContent = done + " of " + LESSONS.length + " lessons completed";
    var cont = document.querySelector("[data-continue]");
    cont.textContent = done === 0 ? "Start learning" : done === LESSONS.length ? "Review lessons" : "Continue learning";
    document.querySelector("[data-reset-progress]").hidden = done === 0;
  }
  function continueTarget() {
    var p = progress();
    if (p.last && BY_ID[p.last] && !isDone(p.last)) return p.last;
    var next = LESSONS.find(function (l) { return !isDone(l.id); });
    return (next || LESSONS[0]).id;
  }
  document.querySelector("[data-continue]").addEventListener("click", function () { openLesson(continueTarget()); });
  document.querySelector("[data-reset-progress]").addEventListener("click", function () {
    if (!window.confirm("Reset your learning progress? Completed lessons will be cleared.")) return;
    saveProgress({ completed: [], last: null });
    renderDashboard();
    S.toast("Progress reset");
  });

  /* ---------- Dashboard state: filter + search */
  var state = { filter: "All", q: "" };
  var searchInput = document.getElementById("learn-search");
  var filtersEl = dashboard.querySelector("[data-filters]");
  var contentEl = dashboard.querySelector("[data-learn-content]");
  var countEl = dashboard.querySelector("[data-count]");

  function lessonText(l) {
    if (l.guru) {
      var g = l.guru;
      return [g.name, g.gurmukhi, g.bio, g.birthplace, g.contributions.join(" "), g.teachings.join(" "), g.events.map(function (e) { return e.year + " " + e.text; }).join(" ")].join(" ");
    }
    return [l.title, l.gurmukhi, l.summary, l.category, l.tags.join(" "), JSON.stringify(l.sections)].join(" ");
  }
  /** English text plus the chosen language's text, so visitors can search in either. */
  function searchText(l) {
    if (I.lang() === "en") return lessonText(l);
    var L = loc(l);
    return lessonText(l) + " " + (L.guru ? [L.guru.name, L.guru.bio, L.guru.birthplace, L.guru.contributions.join(" "), L.guru.teachings.join(" ")].join(" ") : [L.title, L.summary, JSON.stringify(L.sections)].join(" "));
  }
  function matchesFilter(l) {
    if (state.filter === "All") return true;
    if (state.filter === "Bookmarked") return S.bookmarks.has("learn:" + l.id);
    return l.category === state.filter || l.tags.indexOf(state.filter) !== -1;
  }
  function visibleLessons() {
    return LESSONS.filter(function (l) { return matchesFilter(l) && S.matches(searchText(l), state.q); });
  }

  function renderFilters() {
    filtersEl.innerHTML = FILTERS.map(function (f) {
      var n = f === "All" ? LESSONS.length : f === "Bookmarked" ? S.bookmarks.ofType(["Lesson"]).length : LESSONS.filter(function (l) { return l.category === f || l.tags.indexOf(f) !== -1; }).length;
      return '<button type="button" class="sk-chip" data-filter="' + S.esc(f) + '" aria-pressed="' + (state.filter === f) + '">' + S.esc(f) + '<span class="sk-count">' + n + "</span></button>";
    }).join("");
  }
  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.dataset.filter;
    renderDashboard();
  });
  S.onSearch(searchInput, function () { state.q = searchInput.value; renderDashboard(); });

  function bookmarkBtn(l) {
    return '<button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="learn:' + l.id + '" data-bookmark-lesson="' + l.id + '" aria-pressed="false" aria-label="Bookmark ' + S.esc(l.title) + '">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">Bookmark</span></button>';
  }
  function lessonCard(l) {
    var done = isDone(l.id), L = loc(l), la = I.attr();
    return '<article class="sk-card sk-card-link' + (done ? " is-complete" : "") + '" data-open-lesson="' + l.id + '">' +
      '<div class="flex items-center justify-between gap-2"><span class="sk-badge">' + S.esc(l.category) + "</span>" + (done ? '<span class="sk-done-badge">' + S.icon("check", 12) + "Completed</span>" : "") + "</div>" +
      (l.gurmukhi && l.gurmukhi !== L.title ? '<p class="sk-gurmukhi-accent mt-3" lang="pa">' + S.esc(l.gurmukhi) + "</p>" : "") +
      '<h3 class="sk-card-title mt-2"' + la + '><a href="#topic=' + l.id + '">' + S.highlight(L.title, state.q) + "</a></h3>" +
      '<p class="sk-card-text"' + la + ">" + S.highlight(L.summary, state.q) + "</p>" +
      '<div class="sk-card-foot">' + bookmarkBtn(l) + '<a href="#topic=' + l.id + '" class="panel-view-all" tabindex="-1" aria-hidden="true">Open lesson →</a></div></article>';
  }
  function guruCard(l) {
    var g = locGuru(l.guru), done = isDone(l.id), la = I.attr();
    // Sentences end with "." in English and "।" (danda) in Hindi and Punjabi.
    var firstSentence = g.bio.split(/(?<=[.।])\s/)[0];
    var rest = g.bio.slice(firstSentence.length).trim();
    return '<article class="sk-card' + (done ? " is-complete" : "") + '" id="card-' + g.id + '">' +
      '<div class="flex items-start gap-3">' + '<span class="sk-guru-thumb" aria-hidden="true">' + guruImageHtml(g, { sizes: '56px' }) + '<span class="sk-guru-thumb-num">' + g.number + "</span></span>" +
      '<div class="min-w-0"><h3 class="sk-card-title"' + la + '><a href="#topic=' + g.id + '">' + S.highlight(g.name, state.q) + "</a></h3>" +
      '<p class="sk-card-meta"' + la + ">" + S.esc(g.lifespan) + " · " + (g.number === 1 ? S.esc(I.t("founder", "Founder")) : S.esc(I.t("guruYears", "Guru {years}", { years: g.guruship }))) + "</p></div>" +
      (done ? '<span class="sk-done-badge ml-auto">' + S.icon("check", 12) + "Done</span>" : "") + "</div>" +
      (g.gurmukhi !== g.name ? '<p class="gb-title-g mt-3" lang="pa" style="font-size:1rem">' + S.esc(g.gurmukhi) + "</p>" : "") +
      '<p class="sk-card-text"' + la + ">" + S.esc(firstSentence) + (rest ? ' <span class="sk-readmore" id="more-' + g.id + '" hidden>' + S.esc(rest) + "</span>" : "") + "</p>" +
      '<div class="sk-card-foot">' +
      (rest ? '<button type="button" class="sk-link-btn" data-readmore="more-' + g.id + '" aria-expanded="false" aria-controls="more-' + g.id + '">Read more</button>' : "") +
      '<div class="flex gap-2">' + bookmarkBtn(l) + '<a class="sk-btn sk-btn-sm sk-btn-navy" href="#topic=' + g.id + '">Open lesson</a></div></div></article>';
  }
  function guruStrip() {
    var start = 1469, end = 1708;
    var starts = { 1: 1469, 2: 1539, 3: 1552, 4: 1574, 5: 1581, 6: 1606, 7: 1644, 8: 1661, 9: 1664, 10: 1675 };
    return '<div class="guru-strip" role="group" aria-label="Timeline of the Ten Gurus">' +
      '<div class="guru-strip-track">' +
      D.gurus.map(function (g) {
        var x = ((starts[g.number] - start) / (end - start)) * 100;
        return '<a class="guru-strip-mark" href="#topic=' + g.id + '" style="left:' + x + '%" title="' + S.esc(g.name + " · Guru from " + starts[g.number]) + '" aria-label="' + S.esc(g.name + ", Guru from " + starts[g.number]) + '">' + g.number + "</a>";
      }).join("") +
      '</div><div class="guru-strip-years"><span>1469</span><span>1539</span><span>1581</span><span>1644</span><span>1675</span><span>1708</span></div></div>';
  }

  function renderDashboard() {
    renderFilters();
    var list = visibleLessons();
    countEl.textContent = list.length + (list.length === 1 ? " lesson" : " lessons") + (state.q ? " match “" + state.q + "”" : "");
    if (!list.length) {
      contentEl.innerHTML = '<div class="sk-empty"><p class="sk-empty-title">No results found</p><p>' +
        (state.filter === "Bookmarked" && !state.q ? "You haven't bookmarked any lessons yet. Use the Bookmark button on any lesson." : "Try a different word or clear the filters.") +
        '</p><div class="sk-suggest">' + ["Guru Nanak", "Langar", "Kara", "Hukam", "1699"].map(function (s) {
          return '<button type="button" class="sk-chip" data-suggest="' + s + '">' + s + "</button>";
        }).join("") + '<button type="button" class="sk-chip" data-clear-all>Clear filters</button></div></div>';
      return;
    }
    var grouped = !state.q && state.filter === "All";
    var cats = grouped ? D.learnCategories : [null];
    contentEl.innerHTML = cats.map(function (cat) {
      var items = cat ? list.filter(function (l) { return l.category === cat; }) : list;
      if (!items.length) return "";
      var gurusOnly = items.every(function (l) { return l.guru; });
      var st = cat && sectionTitle(cat);
      var head = cat ? '<div class="mb-5 mt-10 first:mt-0"><p class="sk-eyebrow">' + S.esc(cat) + '</p><h2 class="sk-section-title"' + I.attr() + ">" + S.esc(st[0]) + '</h2><p class="sk-section-sub"' + I.attr() + ">" + S.esc(st[1]) + "</p></div>" : "";
      var strip = (cat === "Gurus" || (state.filter === "Gurus" && !state.q)) ? guruStrip() : "";
      return '<section class="mb-6">' + head + strip + '<div class="sk-grid sk-grid-3">' +
        items.map(function (l) { return l.guru && (gurusOnly || cat === "Gurus") ? guruCard(l) : lessonCard(l); }).join("") + "</div></section>";
    }).join("");
    S.syncBookmarkButtons(contentEl);
  }

  contentEl.addEventListener("click", function (e) {
    var more = e.target.closest("[data-readmore]");
    if (more) {
      var span = document.getElementById(more.dataset.readmore);
      var open = more.getAttribute("aria-expanded") === "true";
      span.hidden = open;
      more.setAttribute("aria-expanded", String(!open));
      more.textContent = open ? "Read more" : "Show less";
      return;
    }
    var bm = e.target.closest("[data-bookmark-lesson]");
    if (bm) { toggleBookmark(BY_ID[bm.dataset.bookmarkLesson]); return; }
    var sug = e.target.closest("[data-suggest]");
    if (sug) { state.filter = "All"; S.setField(searchInput, sug.dataset.suggest); return; }
    if (e.target.closest("[data-clear-all]")) { state.filter = "All"; S.setField(searchInput, ""); return; }
    // Whole lesson card is clickable (except its buttons/links, handled natively).
    var card = e.target.closest("[data-open-lesson]");
    if (card && !e.target.closest("a,button")) openLesson(card.dataset.openLesson);
  });

  function toggleBookmark(l) {
    S.bookmarks.toggle({ id: "learn:" + l.id, type: "Lesson", title: l.title, subtitle: l.category, url: "/learn-sikhism#topic=" + l.id });
    if (state.filter === "Bookmarked") renderDashboard();
    else renderFilters();
  }

  /* ---------- Lesson view */
  function openLesson(id) { S.setHash({ topic: id }); route(); }

  function sectionHtml(sec) {
    return "<h3>" + S.esc(sec.heading) + "</h3>" +
      (sec.paragraphs || []).map(function (p) { return "<p>" + S.esc(p) + "</p>"; }).join("") +
      (sec.list ? "<ul>" + sec.list.map(function (li) { return "<li>" + S.esc(li) + "</li>"; }).join("") + "</ul>" : "");
  }
  /** `g` is the localized Guru; its year ranges are untranslated, so the timeline maths still works. */
  function guruBody(g) {
    var from = 1469, to = 1708;
    var years = g.guruship.match(/(\d{4})–(\d{4})/);
    var a = years ? +years[1] : 1469, b = years ? +years[2] : 1539;
    var left = ((a - from) / (to - from)) * 100, width = Math.max(((b - a) / (to - from)) * 100, 1.5);
    var T = I.t;
    return "<h3>" + T("biography", "Biography") + "</h3><p>" + S.esc(g.bio) + "</p>" +
      '<p><strong style="color:var(--text)">' + T("born", "Born") + ":</strong> " + S.esc(g.birthplace) + ' · <strong style="color:var(--text)">' + T("lifespan", "Lifespan") + ":</strong> " + S.esc(g.lifespan) + "</p>" +
      "<h3>" + T("majorContributions", "Major contributions") + "</h3><ul>" + g.contributions.map(function (c) { return "<li>" + S.esc(c) + "</li>"; }).join("") + "</ul>" +
      "<h3>" + T("importantEvents", "Important events") + '</h3><ul class="sk-events">' + g.events.map(function (e) { return "<li><strong>" + S.esc(e.year) + "</strong>" + S.esc(e.text) + "</li>"; }).join("") + "</ul>" +
      "<h3>" + T("keyTeachings", "Key teachings") + "</h3><ul>" + g.teachings.map(function (t) { return "<li>" + S.esc(t) + "</li>"; }).join("") + "</ul>" +
      "<h3>" + T("timelinePlacement", "Timeline placement") + "</h3><p>" + (g.number === 1 ? T("founderUntil", "Founder of the Sikh faith; Guru until 1539.") : S.esc(T("guruFromTo", "Guru from {a} to {b}, within the Guru period of 1469–1708.", { a: a, b: b }))) + "</p>" +
      '<div class="guru-span" role="img" aria-label="Guruship ' + a + "–" + b + ' within 1469–1708"><span style="left:' + left + "%;width:" + width + '%"></span></div>' +
      '<div class="flex justify-between text-xs mt-1" style="color:var(--text-subtle)"><span>1469</span><span>1708</span></div>' +
      // The timeline is searched by the English name, which always matches.
      '<p class="mt-4"><a class="panel-view-all" href="/sikh-history#q=' + encodeURIComponent(BY_ID[g.id].guru.name) + '">' + S.esc(T("seeOnTimeline", "See {name} on the Sikh history timeline →", { name: g.name })) + "</a></p>";
  }

  function renderLesson(l) {
    var p = progress();
    p.last = l.id;
    S.store.set("learnProgress", p);
    var done = isDone(l.id), L = loc(l), la = I.attr();
    var prev = LESSONS[l.index - 1], next = LESSONS[l.index + 1];
    var related = (l.related || (l.guru ? [prev && prev.guru ? prev.id : null, next && next.guru ? next.id : null] : []))
      .filter(function (id) { return id && BY_ID[id]; });
    lessonEl.innerHTML =
      '<a href="/learn-sikhism" class="sk-link-btn" data-back>' + S.icon("left", 16) + "All lessons</a>" +
      '<div class="sk-card mt-4" style="padding:clamp(1.25rem,3vw,2.5rem)">' +
      '<div class="sk-lesson-head"><div><span class="sk-badge">' + S.esc(l.category) + "</span>" +
      (done ? ' <span class="sk-done-badge">' + S.icon("check", 12) + "Completed</span>" : "") +
      (l.gurmukhi && l.gurmukhi !== L.title ? '<p class="sk-gurmukhi-accent mt-3" lang="pa">' + S.esc(l.gurmukhi) + "</p>" : "") +
      '<h2 class="mt-2" tabindex="-1" data-lesson-title' + la + ">" + S.esc(L.title) + "</h2>" +
      '<p class="sk-muted mt-2"' + la + ">" + S.esc(L.guru ? L.guru.birthplace : L.summary) + "</p></div>" +
      '<div class="gb-actions">' + bookmarkBtn(l) +
      '<button type="button" class="sk-btn sk-btn-sm" data-share-lesson>' + S.icon("share", 15) + "Share</button></div></div>" +
      '<div class="sk-lesson-lang">' + I.switcher({ compact: true }) + "</div>" +
      '<div class="mt-2"' + la + ">" + (L.guru ? guruBody(L.guru) : L.sections.map(sectionHtml).join("")) + "</div>" +
      (l.links ? '<div class="flex flex-wrap gap-2 mt-6">' + l.links.map(function (k) { return '<a class="sk-btn sk-btn-sm" href="' + S.esc(k.href) + '">' + S.esc(k.label) + " →</a>"; }).join("") + "</div>" : "") +
      (related.length ? '<h3>Related lessons</h3><div class="sk-related">' + related.map(function (id) { return '<a class="sk-chip" href="#topic=' + id + '"' + la + ">" + S.esc(loc(BY_ID[id]).title) + "</a>"; }).join("") + "</div>" : "") +
      '<div class="sk-lesson-nav">' +
      (prev ? '<a class="sk-nav-card" href="#topic=' + prev.id + '"><small>← Previous</small><span' + la + ">" + S.esc(loc(prev).title) + "</span></a>" : "<span></span>") +
      '<button type="button" class="sk-btn ' + (done ? "" : "sk-btn-gold") + '" data-mark-complete aria-pressed="' + done + '">' + S.icon("check", 16) + (done ? "Completed — mark as not done" : "Mark as completed") + "</button>" +
      (next ? '<a class="sk-nav-card sk-next" href="#topic=' + next.id + '"><small>Next →</small><span' + la + ">" + S.esc(loc(next).title) + "</span></a>" : "<span></span>") +
      "</div></div>";
    S.syncBookmarkButtons(lessonEl);
  }

  lessonEl.addEventListener("click", function (e) {
    var id = S.hashParams().topic, l = BY_ID[id];
    if (!l) return;
    if (e.target.closest("[data-back]")) { e.preventDefault(); history.pushState(null, "", location.pathname); route(); return; }
    if (e.target.closest("[data-bookmark-lesson]")) { toggleBookmark(l); return; }
    if (e.target.closest("[data-share-lesson]")) { S.share({ title: l.title + " — Sikhify", text: l.summary, url: S.pageUrl("topic=" + l.id) }); return; }
    if (e.target.closest("[data-mark-complete]")) {
      var nowDone = !isDone(l.id);
      setDone(l.id, nowDone);
      S.toast(nowDone ? "Lesson completed" : "Marked as not completed");
      renderLesson(l);
      lessonEl.querySelector("[data-mark-complete]").focus();
    }
  });

  /* ---------- Routing (#topic, #filter, #q) */
  var crumbs = document.querySelector("[data-breadcrumbs]");
  var baseTitle = document.title;
  function setCrumbs(lesson) {
    var last = crumbs.querySelector("[data-crumb-lesson]");
    if (last) last.remove();
    var pageCrumb = crumbs.querySelector("[data-crumb-page]");
    if (lesson) {
      pageCrumb.removeAttribute("aria-current");
      var li = document.createElement("li");
      li.setAttribute("data-crumb-lesson", "");
      li.innerHTML = '<span aria-current="page"' + I.attr() + ">" + S.esc(loc(lesson).title) + "</span>";
      crumbs.appendChild(li);
    } else pageCrumb.setAttribute("aria-current", "page");
  }
  function route() {
    var h = S.hashParams();
    var l = h.topic && BY_ID[h.topic];
    if (l) {
      dashboard.hidden = true;
      lessonEl.hidden = false;
      renderLesson(l);
      setCrumbs(l);
      document.title = loc(l).title + " — Learn Sikhism — Sikhify";
      lessonEl.scrollIntoView({ block: "start" });
      var t = lessonEl.querySelector("[data-lesson-title]");
      if (t) t.focus({ preventScroll: true });
      return;
    }
    if (h.filter && FILTERS.indexOf(h.filter) !== -1) state.filter = h.filter;
    if (h.q) { searchInput.value = h.q; state.q = h.q; }
    lessonEl.hidden = true;
    dashboard.hidden = false;
    setCrumbs(null);
    document.title = baseTitle;
    renderDashboard();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.addEventListener("sikhify:bookmarks", function () { if (!dashboard.hidden) renderFilters(); });

  // Language change: re-render in place (no scrolling or focus jumps).
  I.watch(function () {
    var l = S.hashParams().topic && BY_ID[S.hashParams().topic];
    if (l && !lessonEl.hidden) {
      renderLesson(l);
      setCrumbs(l);
      document.title = loc(l).title + " — Learn Sikhism — Sikhify";
    } else renderDashboard();
  });

  renderProgress();
  route();

}
