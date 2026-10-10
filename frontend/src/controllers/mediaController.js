/* Migrated from active js/media.js; behavior retained.
   Videos now open on Sikhify's own video page (/media/:videoId, embedded
   player) instead of sending visitors to YouTube. The catalogue is the live
   one installed by the page (services/media/mediaService.js).
   Thumbnails come from utils/images.js (srcset sized to the card, lazy). */
import { youTubeThumbHtml } from "../utils/images.js";
export function initMedia() {
"use strict";
  var S = window.Sikhify, M = window.SikhifyData.media;
  var browse = document.getElementById("media-browse");
  var artistEl = document.getElementById("media-artist");
  if (!M || !browse || !artistEl) return;

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var VIDEO_PAGE = 9;
  var CATEGORIES = M.categories.filter(function (c) { return M.artists.some(function (a) { return a.category === c; }); });
  var ARTISTS = M.artists.slice().sort(function (a, b) { return a.sortName.localeCompare(b.sortName); });
  var BY_ID = {};
  ARTISTS.forEach(function (a, i) { a.index = i; BY_ID[a.id] = a; });

  var letterOf = function (a) { return a.sortName.charAt(0).toUpperCase(); };
  var videoUrl = function (id) { return "/media/" + encodeURIComponent(id); };
  var initials = function (a) {
    return a.sortName.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  };
  var plural = function (n, one, many) { return n + " " + (n === 1 ? one : many); };

  /* ---------- Elements & state */
  var input = document.getElementById("media-search");
  var filtersEl = browse.querySelector("[data-filters]");
  var lettersEl = browse.querySelector("[data-letters]");
  var countEl = browse.querySelector("[data-count]");
  var artistsEl = browse.querySelector("[data-artists]");
  var videosEl = browse.querySelector("[data-videos]");
  var moreBtn = browse.querySelector("[data-load-more]");
  var clearWrap = browse.querySelector("[data-clear-wrap]");
  var state = { q: "", category: "All", letter: "All", shown: VIDEO_PAGE };

  /* ---------- Matching
     An artist matches when every search word appears in its own fields. Otherwise
     only the videos whose title/channel (plus artist fields) contain every word are
     kept — e.g. “harjinder mere satgura” finds that one shabad. */
  function artistText(a) { return S.norm([a.name, a.sortName, a.category, a.location || "", a.description, a.keywords.join(" ")].join(" ")); }
  function match(a, terms) {
    if (!terms.length) return { artist: a, videos: a.videos, partial: false };
    var at = artistText(a);
    if (terms.every(function (t) { return at.indexOf(t) !== -1; })) return { artist: a, videos: a.videos, partial: false };
    var vids = a.videos.filter(function (v) {
      var vt = S.norm(v.title + " " + v.channel);
      return terms.every(function (t) { return vt.indexOf(t) !== -1 || at.indexOf(t) !== -1; });
    });
    return vids.length ? { artist: a, videos: vids, partial: true } : null;
  }
  /** Search + category (used to show which letters still have results). */
  function searched() {
    var terms = S.norm(state.q).split(" ").filter(Boolean);
    return ARTISTS.filter(function (a) { return state.category === "All" || a.category === state.category; })
      .map(function (a) { return match(a, terms); }).filter(Boolean);
  }
  function results(base) {
    return state.letter === "All" ? base : base.filter(function (m) { return letterOf(m.artist) === state.letter; });
  }

  /* ---------- URL state (?q=&category=&letter=) */
  function readUrl() {
    var p = new URLSearchParams(location.search);
    var q = p.get("q") || "";
    var cat = (p.get("category") || "").toLowerCase();
    var letter = (p.get("letter") || "").toUpperCase();
    state.q = q;
    state.category = CATEGORIES.find(function (c) { return c.toLowerCase() === cat; }) || "All";
    state.letter = LETTERS.indexOf(letter) !== -1 ? letter : "All";
    input.value = q;
    var clear = document.querySelector("[data-clear-for=\"media-search\"]");
    if (clear) clear.hidden = !q; // core.js also syncs it on DOMContentLoaded
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q.trim()) p.set("q", state.q.trim());
    if (state.category !== "All") p.set("category", state.category);
    if (state.letter !== "All") p.set("letter", state.letter);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------- Rendering: directory */
  function renderFilters(base) {
    filtersEl.innerHTML = ["All"].concat(CATEGORIES).map(function (c) {
      var n = c === "All" ? ARTISTS.length : ARTISTS.filter(function (a) { return a.category === c; }).length;
      return '<button type="button" class="sk-chip" data-category="' + S.esc(c) + '" aria-pressed="' + (state.category === c) + '">' + S.esc(c) + '<span class="sk-count">' + n + "</span></button>";
    }).join("");
    var has = {};
    base.forEach(function (m) { has[letterOf(m.artist)] = true; });
    lettersEl.innerHTML = '<button type="button" class="sk-media-letter sk-media-letter-all" data-letter="All" aria-pressed="' + (state.letter === "All") + '">All</button>' +
      LETTERS.map(function (l) {
        var empty = !has[l];
        return '<button type="button" class="sk-media-letter' + (empty ? " is-empty" : "") + '" data-letter="' + l + '" aria-pressed="' + (state.letter === l) + '"' +
          ' aria-label="' + l + (empty ? ", no artists" : "") + '">' + l + "</button>";
      }).join("");
  }

  function avatar(a, large) {
    return '<span class="sk-media-avatar' + (large ? " sk-media-avatar-lg" : "") + '" aria-hidden="true">' + S.esc(initials(a)) + "</span>";
  }
  function artistCard(m) {
    var a = m.artist, q = state.q;
    return '<article class="sk-card sk-card-link sk-media-artist-card" data-open-artist="' + a.id + '">' +
      '<div class="flex items-start gap-3">' + avatar(a) + '<div class="min-w-0">' +
      '<span class="sk-badge">' + S.esc(a.category) + "</span>" +
      '<h3 class="sk-card-title mt-2"><a href="#artist=' + a.id + '">' + S.highlight(a.name, q) + "</a></h3>" +
      (a.location ? '<p class="sk-card-meta">' + S.icon("pin", 13) + '<span class="sr-only">Location: </span>' + S.highlight(a.location, q) + "</p>" : "") +
      "</div></div>" +
      '<p class="sk-card-text">' + S.highlight(a.description, q) + "</p>" +
      (m.partial ? '<ul class="sk-media-matches" aria-label="Matching videos">' + m.videos.map(function (v) { return "<li>" + S.icon("play", 12) + S.highlight(v.title, q) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="sk-card-foot"><span class="sk-card-meta" style="margin-top:0">' + (m.partial ? plural(m.videos.length, "matching video", "matching videos") + " of " + a.videos.length : plural(a.videos.length, "video", "videos")) + "</span>" +
      '<a href="#artist=' + a.id + '" class="panel-view-all" tabindex="-1" aria-hidden="true">View artist →</a></div></article>';
  }
  /** 1156 → "19:16", 6255 → "1:44:15" (as checked on YouTube by scripts/curate-media.js). */
  function formatLength(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = String(sec % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + x : m + ":" + x;
  }

  function videoCard(v, a, opts) {
    opts = opts || {};
    var q = opts.q || "";
    var label = "Play " + v.title + " — " + a.name;
    return '<article class="sk-card sk-media-video' + (opts.target ? " is-target" : "") + '" id="video-' + S.esc(v.id) + '">' +
      '<a class="sk-media-thumb" href="' + videoUrl(v.id) + '" aria-label="' + S.esc(label) + '">' +
      youTubeThumbHtml(v.id) + '<span class="sk-media-play" aria-hidden="true">' + S.icon("play", 22) + "</span>" +
      (v.durationSeconds ? '<span class="sk-media-duration"><span class="sr-only">Length </span>' + formatLength(v.durationSeconds) + "</span>" : "") + "</a>" +
      '<h3 class="sk-card-title sk-media-video-title mt-3"><a href="' + videoUrl(v.id) + '">' + S.highlight(v.title, q) + "</a></h3>" +
      (opts.showArtist ? '<p class="sk-card-meta"><a class="sk-media-artist-link" href="#artist=' + a.id + '">' + S.highlight(a.name, q) + "</a> · " + S.esc(a.category) + "</p>" : "") +
      '<p class="sk-card-meta">' + S.icon("youtube", 13) + S.esc(v.channel) + "</p></article>";
  }

  function renderBrowse() {
    var base = searched();
    var list = results(base);
    renderFilters(base);
    var videos = [];
    list.forEach(function (m) { m.videos.forEach(function (v) { videos.push({ v: v, a: m.artist }); }); });
    countEl.textContent = plural(list.length, "artist", "artists") + " · " + plural(videos.length, "video", "videos") +
      (state.letter !== "All" ? " · starting with “" + state.letter + "”" : "") + (state.q.trim() ? " · matching “" + state.q.trim() + "”" : "");
    clearWrap.hidden = !(state.q || state.letter !== "All" || state.category !== "All");

    if (!list.length) {
      var why = [];
      if (state.q.trim()) why.push("“" + S.esc(state.q.trim()) + "”");
      if (state.category !== "All") why.push("in " + S.esc(state.category));
      if (state.letter !== "All") why.push("starting with “" + state.letter + "”");
      artistsEl.innerHTML = '<div class="sk-empty" style="grid-column:1/-1"><p class="sk-empty-title">No artists found</p><p>No artists match ' + why.join(" ") +
        '. Try another letter, category or spelling.</p><div class="sk-suggest">' +
        ["Kirtan", "Katha", "Hazoori Ragi", "Raag", "Japji"].map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + S.esc(s) + '">' + S.esc(s) + "</button>"; }).join("") +
        '<button type="button" class="sk-chip" data-clear-all>Clear filters</button></div></div>';
      videosEl.innerHTML = '<p class="sk-card-meta" style="grid-column:1/-1">No videos for the current filters.</p>';
      moreBtn.hidden = true;
      return;
    }
    artistsEl.innerHTML = list.map(artistCard).join("");
    videosEl.innerHTML = videos.slice(0, state.shown).map(function (x) { return videoCard(x.v, x.a, { showArtist: true, q: state.q }); }).join("");
    moreBtn.hidden = videos.length <= state.shown;
    moreBtn.textContent = "Load more (" + (videos.length - state.shown) + " remaining)";
  }

  function update() { state.shown = VIDEO_PAGE; writeUrl(); renderBrowse(); }
  function resetFilters() { state.category = "All"; state.letter = "All"; }

  browse.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-category]"))) { state.category = t.dataset.category; update(); return; }
    if ((t = e.target.closest("[data-letter]"))) {
      var l = t.dataset.letter;
      state.letter = l !== "All" && state.letter === l ? "All" : l; // pressing the active letter again shows all
      update();
      var again = lettersEl.querySelector('[data-letter="' + state.letter + '"]');
      if (again) again.focus();
      return;
    }
    if ((t = e.target.closest("[data-suggest]"))) { resetFilters(); S.setField(input, t.dataset.suggest); return; }
    if (e.target.closest("[data-clear-all]")) { resetFilters(); S.setField(input, ""); update(); return; }
    if (e.target.closest("[data-load-more]")) {
      var first = state.shown;
      state.shown += VIDEO_PAGE;
      renderBrowse();
      var next = videosEl.querySelectorAll(".sk-media-video")[first];
      if (next) next.querySelector(".sk-media-video-title a").focus();
      return;
    }
    // Whole artist card is clickable (its own links/buttons behave natively).
    var c = e.target.closest("[data-open-artist]");
    if (c && !e.target.closest("a,button")) location.hash = "artist=" + c.dataset.openArtist;
  });
  // Arrow keys move between A–Z buttons.
  lettersEl.addEventListener("keydown", function (e) {
    if (!e.target.matches("[data-letter]")) return;
    var btns = [].slice.call(lettersEl.querySelectorAll("[data-letter]"));
    var i = btns.indexOf(e.target), to = null;
    if (e.key === "ArrowRight") to = btns[(i + 1) % btns.length];
    else if (e.key === "ArrowLeft") to = btns[(i - 1 + btns.length) % btns.length];
    else if (e.key === "Home") to = btns[0];
    else if (e.key === "End") to = btns[btns.length - 1];
    if (to) { e.preventDefault(); to.focus(); }
  });
  S.onSearch(input, function () { state.q = input.value; update(); });

  /* ---------- Rendering: artist view */
  var currentArtist = null;
  function renderArtist(a, videoId) {
    currentArtist = a;
    var prev = ARTISTS[a.index - 1], next = ARTISTS[a.index + 1];
    var related = ARTISTS.filter(function (x) { return x.category === a.category && x !== a; });
    artistEl.innerHTML =
      '<a href="/sikh-media' + S.esc(location.search) + '" class="sk-link-btn" data-back>' + S.icon("left", 16) + "All artists</a>" +
      '<div class="sk-card mt-4" style="padding:clamp(1.25rem,3vw,2.25rem)">' +
      '<div class="sk-panel-head"><div class="flex items-start gap-4 min-w-0">' + avatar(a, true) + '<div class="min-w-0">' +
      '<a class="sk-badge" href="/sikh-media?category=' + encodeURIComponent(a.category) + '">' + S.esc(a.category) + "</a>" +
      '<h2 class="sk-section-title mt-2" tabindex="-1" data-artist-title>' + S.esc(a.name) + "</h2>" +
      (a.location ? '<p class="sk-card-meta">' + S.icon("pin", 13) + '<span class="sr-only">Location: </span>' + S.esc(a.location) + "</p>" : "") +
      '<p class="sk-card-meta">' + plural(a.videos.length, "video", "videos") + "</p></div></div>" +
      '<div class="gb-actions"><button type="button" class="sk-btn sk-btn-sm" data-share-artist>' + S.icon("share", 15) + "Share</button>" +
      '<button type="button" class="sk-btn sk-btn-sm" data-copy-artist>' + S.icon("link", 15) + "Copy link</button></div></div>" +
      '<p class="mt-5" style="color:var(--text-muted);max-width:720px;line-height:1.7">' + S.esc(a.description) + "</p>" +
      '<h3 class="sk-card-title mt-8">Videos</h3><p class="sk-card-meta">Videos play here on Sikhify.</p>' +
      '<div class="sk-grid sk-grid-3 mt-4">' + a.videos.map(function (v) { return videoCard(v, a, { target: v.id === videoId }); }).join("") + "</div>" +
      (related.length ? '<h3 class="sk-card-title mt-8">More ' + S.esc(a.category) + ' artists</h3><div class="sk-suggest mt-3">' +
        related.map(function (r) { return '<a class="sk-chip" href="#artist=' + r.id + '">' + S.esc(r.name) + "</a>"; }).join("") + "</div>" : "") +
      '<div class="sk-lesson-nav">' +
      (prev ? '<a class="sk-nav-card" href="#artist=' + prev.id + '"><small>← Previous</small>' + S.esc(prev.name) + "</a>" : "<span></span>") + "<span></span>" +
      (next ? '<a class="sk-nav-card sk-next" href="#artist=' + next.id + '"><small>Next →</small>' + S.esc(next.name) + "</a>" : "<span></span>") +
      "</div></div>";
  }
  artistEl.addEventListener("click", function (e) {
    if (!currentArtist) return;
    if (e.target.closest("[data-back]")) { e.preventDefault(); history.pushState(null, "", location.pathname + location.search); route(); return; }
    if (e.target.closest("[data-share-artist]")) {
      S.share({ title: currentArtist.name + " — Sikh Media — Sikhify", text: currentArtist.description, url: location.href.split("#")[0].split("?")[0] + "#artist=" + currentArtist.id });
      return;
    }
    if (e.target.closest("[data-copy-artist]")) S.copy(location.href.split("#")[0].split("?")[0] + "#artist=" + currentArtist.id, "Link");
  });

  /* ---------- Routing: #artist=id[&video=id] over the directory */
  var crumbs = document.querySelector("[data-breadcrumbs]");
  var baseTitle = document.title;
  function setCrumb(label) {
    var old = crumbs.querySelector("[data-crumb-item]");
    if (old) old.remove();
    var page = crumbs.querySelector("[data-crumb-page]");
    if (!label) { page.setAttribute("aria-current", "page"); return; }
    page.removeAttribute("aria-current");
    var li = document.createElement("li");
    li.setAttribute("data-crumb-item", "");
    li.innerHTML = '<span aria-current="page">' + S.esc(label) + "</span>";
    crumbs.appendChild(li);
  }
  function route() {
    var h = S.hashParams();
    var a = h.artist && BY_ID[h.artist];
    if (a) {
      browse.hidden = true;
      artistEl.hidden = false;
      renderArtist(a, h.video);
      setCrumb(a.name);
      document.title = a.name + " — Sikh Media — Sikhify";
      var target = h.video && document.getElementById("video-" + h.video);
      if (target) {
        target.scrollIntoView({ block: "center" });
        target.querySelector(".sk-media-video-title a").focus({ preventScroll: true });
        setTimeout(function () { target.classList.remove("is-target"); }, 2500);
      } else {
        artistEl.scrollIntoView({ block: "start" });
        artistEl.querySelector("[data-artist-title]").focus({ preventScroll: true });
      }
      return;
    }
    if (h.artist) S.toast("That artist wasn't found", "error");
    currentArtist = null;
    artistEl.hidden = true;
    artistEl.innerHTML = "";
    browse.hidden = false;
    setCrumb(null);
    document.title = baseTitle;
    renderBrowse();
    // Plain section anchors (#media-artists, #media-videos) from the hero links.
    var section = /^#[A-Za-z][\w-]*$/.test(location.hash) && document.getElementById(location.hash.slice(1));
    if (section) section.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", function () { readUrl(); route(); });

  readUrl();
  route();

}
