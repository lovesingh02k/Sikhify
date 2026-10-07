/* Migrated from active js/nitnem.js; behavior retained. */
export function initNitnem() {
"use strict";
  var S = window.Sikhify, D = window.SikhifyData;
  if (!D.gurbani || !D.nitnem) return;

  var ORDER = [].concat.apply([], D.nitnem.times.map(function (t) { return t.banis; }));
  var BANIS = ORDER.map(function (id) { return D.gurbani.banis.find(function (b) { return b.id === id; }); }).filter(Boolean);
  var BY_ID = {};
  BANIS.forEach(function (b) {
    BY_ID[b.id] = b;
    b.time = D.nitnem.times.find(function (t) { return t.banis.indexOf(b.id) !== -1; });
    b.track = b.audio ? {
      id: "nitnem:" + b.id, title: b.name, subtitle: "Recitation · " + b.audio.by, url: b.audio.url, duration: b.audio.duration,
      credit: "Recording: " + S.esc(b.audio.by) + ' · <a href="' + S.esc(b.audio.source) + '" target="_blank" rel="noopener noreferrer">archive.org</a> · ' + S.esc(b.audio.license),
    } : null;
  });
  S.audio.register(BANIS.map(function (b) { return b.track; }).filter(Boolean));
  S.audio.queueFor = function () { return BANIS.map(function (b) { return b.track; }).filter(Boolean); };

  /* ---------- Date-aware checklist */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function today() {
    var t = S.store.get("nitnemToday", null);
    if (!t || t.date !== todayKey()) {
      // A new day: start a fresh checklist (yesterday's count is already kept in history).
      t = { date: todayKey(), done: [] };
      S.store.set("nitnemToday", t);
    }
    return t;
  }
  function setDone(id, done) {
    var t = today();
    t.done = t.done.filter(function (x) { return x !== id; });
    if (done) t.done.push(id);
    S.store.set("nitnemToday", t);
    var hist = S.store.get("nitnemHistory", {});
    hist[t.date] = t.done.length;
    // Keep ~2 months of history.
    Object.keys(hist).sort().slice(0, -60).forEach(function (k) { delete hist[k]; });
    S.store.set("nitnemHistory", hist);
    renderChecklist();
    renderTabs();
    syncCompleteBtn();
  }
  var isDone = function (id) { return today().done.indexOf(id) !== -1; };

  var groupsEl = document.querySelector("[data-checklist-groups]");
  function renderChecklist() {
    var t = today();
    var d = new Date();
    document.querySelector("[data-today-label]").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    var n = t.done.filter(function (id) { return BY_ID[id]; }).length;
    var bar = document.querySelector("[data-today-bar]");
    bar.setAttribute("aria-valuemax", BANIS.length);
    bar.setAttribute("aria-valuenow", n);
    bar.firstElementChild.style.width = (n / BANIS.length) * 100 + "%";
    document.querySelector("[data-today-text]").textContent = n === BANIS.length ? "All " + n + " Banis completed today — Waheguru!" : n + " of " + BANIS.length + " Banis completed today";
    groupsEl.innerHTML = D.nitnem.times.map(function (time) {
      return '<fieldset class="mt-3"><legend class="sk-eyebrow">' + S.esc(time.label) + ' <span style="text-transform:none;letter-spacing:0;color:var(--text-subtle);font-weight:500">· ' + S.esc(time.sub) + "</span></legend>" +
        time.banis.filter(function (id) { return BY_ID[id]; }).map(function (id) {
          var b = BY_ID[id];
          return '<label class="sk-check"><input type="checkbox" data-check="' + id + '"' + (isDone(id) ? " checked" : "") + '><span class="sk-check-label">' + S.esc(b.name) + "</span>" +
            '<button type="button" class="sk-link-btn sk-check-open" data-select="' + id + '" aria-label="Read ' + S.esc(b.name) + '">Read</button></label>';
        }).join("") + "</fieldset>";
    }).join("");
    renderHistory();
  }
  function renderHistory() {
    var hist = S.store.get("nitnemHistory", {});
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = todayKey(d), c = hist[key] || 0;
      var cls = c >= BANIS.length ? "is-full" : c > 0 ? "is-partial" : "";
      out.push('<div class="sk-day-dot ' + cls + '" title="' + key + ": " + c + " of " + BANIS.length + '"><span aria-hidden="true">' + c + "</span>" +
        '<span class="sr-only">' + d.toLocaleDateString("en-GB", { weekday: "long" }) + ": " + c + " of " + BANIS.length + " Banis</span>" +
        d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2) + "</div>");
    }
    document.querySelector("[data-history]").innerHTML = out.join("");
  }
  groupsEl.addEventListener("change", function (e) {
    if (e.target.matches("[data-check]")) {
      setDone(e.target.dataset.check, e.target.checked);
      S.toast(e.target.checked ? BY_ID[e.target.dataset.check].name + " completed" : "Unchecked " + BY_ID[e.target.dataset.check].name);
    }
  });
  groupsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-select]");
    if (b) { e.preventDefault(); select(b.dataset.select, true); }
  });
  document.querySelector("[data-reset-today]").addEventListener("click", function () {
    if (!today().done.length) { S.toast("Nothing to reset yet today"); return; }
    if (!window.confirm("Reset today's Nitnem checklist?")) return;
    var t = today();
    t.done = [];
    S.store.set("nitnemToday", t);
    var hist = S.store.get("nitnemHistory", {});
    hist[t.date] = 0;
    S.store.set("nitnemHistory", hist);
    renderChecklist();
    renderTabs();
    syncCompleteBtn();
    S.toast("Today's checklist has been reset");
  });
  // If the page stays open past midnight, roll over to the new day.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && S.store.get("nitnemToday", {}).date !== todayKey()) { renderChecklist(); renderTabs(); syncCompleteBtn(); }
  });

  /* ---------- Bani selector (tabs) */
  var tabsEl = document.querySelector("[data-bani-tabs]");
  var readerEl = document.querySelector("[data-bani-reader]");
  var currentId = null;
  function renderTabs() {
    tabsEl.innerHTML = BANIS.map(function (b) {
      var sel = b.id === currentId;
      return '<button type="button" role="tab" class="sk-bani-tab" id="tab-' + b.id + '" aria-selected="' + sel + '" aria-controls="bani-panel" tabindex="' + (sel ? 0 : -1) + '" data-tab="' + b.id + '">' +
        "<span>" + S.esc(b.name) + (isDone(b.id) ? ' <span class="sk-tick" aria-label="completed today">✓</span>' : "") + '</span><small lang="pa">' + S.esc(b.gurmukhiName) + "</small></button>";
    }).join("");
  }
  tabsEl.addEventListener("click", function (e) { var t = e.target.closest("[data-tab]"); if (t) select(t.dataset.tab, true); });
  tabsEl.addEventListener("keydown", function (e) {
    var i = ORDER.indexOf(currentId), to = null;
    if (e.key === "ArrowRight") to = BANIS[(i + 1) % BANIS.length];
    else if (e.key === "ArrowLeft") to = BANIS[(i - 1 + BANIS.length) % BANIS.length];
    else if (e.key === "Home") to = BANIS[0];
    else if (e.key === "End") to = BANIS[BANIS.length - 1];
    if (to) { e.preventDefault(); select(to.id, true); document.getElementById("tab-" + to.id).focus(); }
  });

  /* ---------- Reader */
  var lines = [];
  function select(id, push) {
    if (!BY_ID[id]) return;
    currentId = id;
    S.store.set("nitnemCurrent", id);
    if (push) S.setHash({ bani: id }, true);
    renderTabs();
    renderReader();
    if (push) document.querySelector("[data-reader-card]").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderReader() {
    var b = BY_ID[currentId];
    var yt = b.youtube ? ' <a href="https://www.youtube.com/watch?v=' + b.youtube + '" target="_blank" rel="noopener noreferrer">Listen on YouTube</a>.' : "";
    var pos = S.store.get("nitnemReadPos", {})[b.id] || 0;
    readerEl.innerHTML =
      '<div id="bani-panel" role="tabpanel" aria-labelledby="tab-' + b.id + '">' +
      '<div class="sk-panel-head"><div class="min-w-0"><p class="sk-eyebrow">' + S.esc(b.time.label + " · " + b.time.sub) + "</p>" +
      '<h2 class="gb-title-g mt-1" lang="pa" style="font-size:clamp(1.4rem,3vw,1.8rem)">' + S.esc(b.gurmukhiName) + "</h2>" +
      '<p class="sk-card-title">' + S.esc(b.name) + '</p><p class="sk-card-meta">' + S.esc([b.author, b.source + (b.ang ? ", Ang " + b.ang : ""), b.lineCount + " lines", b.audio ? "Audio " + b.audio.duration : ""].filter(Boolean).join(" · ")) + "</p>" +
      '<p class="sk-card-text">' + S.esc(b.context) + "</p></div>" +
      '<div class="gb-actions"><button type="button" class="sk-btn sk-btn-sm" data-complete aria-pressed="false"></button>' +
      '<button type="button" class="sk-btn sk-btn-sm" data-bookmark-id="nitnem:' + b.id + '" data-bm aria-pressed="false">' + S.icon("bookmark", 15) + '<span class="sk-btn-label">Bookmark</span></button>' +
      '<button type="button" class="sk-btn sk-btn-sm" data-share>' + S.icon("share", 15) + "Share</button></div></div>" +
      '<div class="mt-4">' + S.audio.playerHtml(b.track, yt) + "</div>" +
      '<div class="sk-sticky-tools mt-4">' + S.prefsToolbar({ readingMode: true }) + "</div>" +
      '<div class="sk-read-progress" aria-hidden="true"><span data-read-bar></span></div>' +
      '<div class="flex flex-wrap gap-2 items-center mt-4">' +
      (pos > 5 && pos < 95 ? '<button type="button" class="sk-btn sk-btn-sm sk-btn-gold" data-resume>Resume where you left off (' + Math.round(pos) + "%)</button>" : "") +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="g">' + S.icon("copy", 15) + "Copy Gurmukhi</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="t">' + S.icon("copy", 15) + "Copy transliteration</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy="meaning">' + S.icon("copy", 15) + "Copy meaning</button></div>" +
      '<div class="gb-text mt-5" data-lines><div class="sk-stack" aria-hidden="true">' + [1, 2, 3, 4].map(function () { return '<div class="sk-skeleton" style="height:1.8rem"></div>'; }).join("") + "</div></div>" +
      '<div class="sk-lesson-nav">' + navCard(-1) + '<button type="button" class="sk-btn" data-complete-bottom></button>' + navCard(1) + "</div></div>";
    syncCompleteBtn();
    S.syncBookmarkButtons(readerEl);
    S.audio.emit();
    S.loadScript("data/nitnem-text.js").then(function () {
      if (currentId !== b.id) return;
      lines = window.SikhifyData.nitnemText[b.id] || [];
      readerEl.querySelector("[data-lines]").innerHTML = lines.length ? S.gurbani.renderLines(lines, { stanzas: true }) : '<div class="sk-empty"><p class="sk-empty-title">Text unavailable</p></div>';
      updateReadBar();
    }).catch(function (err) {
      if (currentId !== b.id) return;
      readerEl.querySelector("[data-lines]").innerHTML = S.statusHtml({ error: err, title: "The Bani text couldn't be loaded",
        actions: '<button type="button" class="sk-btn sk-btn-sm" data-reload>Reload the page</button>' });
    });
  }
  function navCard(dir) {
    var i = ORDER.indexOf(currentId) + dir, b = BANIS[i];
    if (!b) return "<span></span>";
    return '<button type="button" class="sk-nav-card' + (dir > 0 ? " sk-next" : "") + '" data-select="' + b.id + '"><small>' + (dir > 0 ? "Next →" : "← Previous") + "</small>" + S.esc(b.name) + "</button>";
  }
  function syncCompleteBtn() {
    if (!currentId) return;
    var done = isDone(currentId);
    readerEl.querySelectorAll("[data-complete],[data-complete-bottom]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(done));
      btn.classList.toggle("sk-btn-gold", !done);
      btn.innerHTML = S.icon("check", 15) + (done ? "Completed today" : "Mark as completed");
    });
  }

  readerEl.addEventListener("click", function (e) {
    var b = BY_ID[currentId], t;
    if (!b) return;
    if (e.target.closest("[data-complete],[data-complete-bottom]")) {
      var now = !isDone(b.id);
      setDone(b.id, now);
      S.toast(now ? b.name + " marked as completed" : b.name + " marked as not completed");
      return;
    }
    if (e.target.closest("[data-bm]")) { S.bookmarks.toggle({ id: "nitnem:" + b.id, type: "Nitnem", title: b.name, subtitle: b.gurmukhiName, url: "/nitnem#bani=" + b.id }); return; }
    if (e.target.closest("[data-share]")) { S.share({ title: b.name + " — Nitnem — Sikhify", text: b.context, url: S.pageUrl("bani=" + b.id) }); return; }
    if ((t = e.target.closest("[data-copy]"))) {
      if (!lines.length) return S.toast("Text is still loading", "error");
      S.copy(S.gurbani.text(lines, t.dataset.copy), t.dataset.copy === "g" ? "Gurmukhi" : t.dataset.copy === "t" ? "Transliteration" : "Meaning");
      return;
    }
    if (e.target.closest("[data-open-reading]")) {
      if (!lines.length) return S.toast("Text is still loading", "error");
      S.reading.open({ title: b.name, subtitle: b.gurmukhiName, render: function () { return S.gurbani.renderLines(lines, { stanzas: true }); } });
      return;
    }
    if (e.target.closest("[data-resume]")) {
      var box = readerEl.querySelector("[data-lines]");
      var pct = S.store.get("nitnemReadPos", {})[b.id] || 0;
      var top = box.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + (box.offsetHeight * pct) / 100 - 140, behavior: "smooth" });
      return;
    }
    if ((t = e.target.closest("[data-select]"))) select(t.dataset.select, true);
  });

  /* Reading progress: how far through the current Bani the reader has scrolled. */
  var updateReadBar = function () {
    var box = readerEl.querySelector("[data-lines]");
    var bar = readerEl.querySelector("[data-read-bar]");
    if (!box || !bar || !lines.length) return;
    var rect = box.getBoundingClientRect();
    var pct = Math.max(0, Math.min(100, ((window.innerHeight * 0.5 - rect.top) / rect.height) * 100));
    bar.style.width = pct + "%";
    var all = S.store.get("nitnemReadPos", {});
    all[currentId] = pct;
    S.store.set("nitnemReadPos", all);
  };
  window.addEventListener("scroll", S.debounce(updateReadBar, 60), { passive: true });

  /* ---------- Start */
  // The explanatory note follows the content language (same preference as the meaning-language control).
  function renderNote() {
    var el = document.querySelector("[data-nitnem-note]");
    var tr = S.i18n.get("nitnemNote");
    el.textContent = tr || D.nitnem.note;
    if (tr) el.setAttribute("lang", S.i18n.lang()); else el.removeAttribute("lang");
  }
  renderNote();
  S.i18n.watch(renderNote);
  renderChecklist();
  var h = S.hashParams();
  var start = (h.bani && BY_ID[h.bani] && h.bani) || (BY_ID[S.store.get("nitnemCurrent", "")] && S.store.get("nitnemCurrent")) || BANIS[0].id;
  select(start, false);
  if (h.bani && BY_ID[h.bani]) document.querySelector("[data-reader-card]").scrollIntoView({ block: "start" });
  window.addEventListener("hashchange", function () {
    var id = S.hashParams().bani;
    if (id && BY_ID[id] && id !== currentId) select(id, false);
  });

}
