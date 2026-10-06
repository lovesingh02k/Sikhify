/* Migrated from active js/rehat.js; behavior retained. */
export function initRehat() {
"use strict";
  var S = window.Sikhify, R = window.SikhifyData.rehat;
  if (!R) return;

  var introEl = document.querySelector("[data-rehat-intro]");
  var tocEl = document.querySelector("[data-toc]");
  var tocToggle = document.querySelector(".sk-toc-toggle");
  var sectionsEl = document.querySelector("[data-rehat-sections]");
  var input = document.getElementById("rehat-search");
  var countEl = document.querySelector("[data-count]");
  var q = "";

  /* Content language: the explanatory guide can be read in English, Hindi or Punjabi. */
  var I = S.i18n;
  var loc = function (s) { return I.localize("rehatSections", s); };

  function renderIntro() {
    var T = I.t, la = I.attr(), off = I.localize("rehatOfficial", R.official);
    var en = I.lang() === "en" || !la;
    introEl.innerHTML =
      '<div class="sk-note"><div' + la + '><span class="sk-label sk-label-explain">' + T("explanatoryGuide", "Explanatory guide") + "</span>" +
      '<p class="mt-2">' + (en ? "This page <strong>explains</strong> the Sikh Rehat Maryada in plain language. It is a summary, not the official text, and does not quote it. For exact wording, always refer to the official document." : S.esc(T("rehatIntro", ""))) + "</p></div></div>" +
      '<div class="sk-official"' + la + '><span class="sk-label sk-label-official" style="align-self:flex-start">' + T("officialDocument", "Official document") + "</span>" +
      '<p class="font-semibold text-white mt-1">' + S.esc(off.title) + "</p>" +
      '<p class="text-sm">' + (en ? "Published by the " + S.esc(off.publisher) + "." : S.esc(T("publishedBy", "", { publisher: off.publisher }))) + "</p>" +
      '<a href="' + S.esc(R.official.url) + '" target="_blank" rel="noopener noreferrer">' + T("readOfficial", "Read the official text on sgpc.net →") + "</a></div>";
  }
  renderIntro();

  var enText = function (s) { return [s.title, s.summary, (s.paragraphs || []).join(" "), (s.list || []).join(" ")].join(" "); };
  var sectionText = function (s) { return I.lang() === "en" ? enText(s) : enText(s) + " " + enText(loc(s)); };

  function sectionHtml(en, i) {
    var s = loc(en), la = I.attr();
    var bodyId = "body-" + s.id;
    return '<section class="sk-collapse" id="' + s.id + '" aria-labelledby="h-' + s.id + '">' +
      '<div class="sk-collapse-head"><h2 class="flex-1" id="h-' + s.id + '" style="margin:0">' +
      '<button type="button" class="sk-collapse-btn" aria-expanded="true" aria-controls="' + bodyId + '">' +
      '<span class="sk-num" aria-hidden="true">' + (i + 1) + "</span><span" + la + "><span class=\"sk-collapse-title\">" + S.highlight(s.title, q) + '</span><span class="sk-collapse-sub">' + S.highlight(s.summary, q) + "</span></span>" +
      '<svg class="sk-icon sk-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></h2>' +
      '<button type="button" class="sk-icon-btn sk-no-print" data-copy-section="' + s.id + '" aria-label="Copy link to ' + S.esc(s.title) + '" title="Copy link to this section">' + S.icon("link", 17) + "</button></div>" +
      '<div class="sk-collapse-body" id="' + bodyId + '"' + la + '><span class="sk-label sk-label-explain">' + I.t("explanation", "Explanation") + "</span>" +
      (s.paragraphs || []).map(function (p) { return '<p class="mt-2">' + S.highlight(p, q) + "</p>"; }).join("") +
      (s.list ? "<ul>" + s.list.map(function (li) { return "<li>" + S.highlight(li, q) + "</li>"; }).join("") + "</ul>" : "") +
      (s.link ? '<p class="mt-3"><a class="panel-view-all" href="' + S.esc(s.link.href) + '">' + S.esc(s.link.label) + " →</a></p>" : "") +
      "</div></section>";
  }

  function render() {
    var list = R.sections.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return S.matches(sectionText(x.s), q); });
    countEl.textContent = q ? list.length + (list.length === 1 ? " section matches" : " sections match") + " “" + q + "”" : R.sections.length + " sections";
    tocEl.innerHTML = list.map(function (x) { return '<li><a href="#' + x.s.id + '" data-toc-link="' + x.s.id + '"' + I.attr() + ">" + (x.i + 1) + ". " + S.esc(loc(x.s).title) + "</a></li>"; }).join("");
    sectionsEl.innerHTML = list.length
      ? list.map(function (x) { return sectionHtml(x.s, x.i); }).join("")
      : '<div class="sk-empty"><p class="sk-empty-title">No results found</p><p>No section mentions “' + S.esc(q) + '”. Try “Nitnem”, “marriage”, “Amrit” or “Gurdwara”.</p><div class="sk-suggest"><button type="button" class="sk-chip" data-clear>Show all sections</button></div></div>';
    observe();
  }

  function setExpanded(section, open) {
    var btn = section.querySelector(".sk-collapse-btn");
    btn.setAttribute("aria-expanded", String(open));
    section.querySelector(".sk-collapse-body").hidden = !open;
  }
  function goTo(id, smooth) {
    var sec = document.getElementById(id);
    if (!sec || !sec.classList.contains("sk-collapse")) {
      if (q && R.sections.some(function (s) { return s.id === id; })) { S.setField(input, ""); sec = document.getElementById(id); }
      if (!sec) return;
    }
    setExpanded(sec, true);
    sec.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    sec.querySelector(".sk-collapse-btn").focus({ preventScroll: true });
  }

  document.querySelector("main").addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest(".sk-collapse-btn"))) { setExpanded(t.closest(".sk-collapse"), t.getAttribute("aria-expanded") !== "true"); return; }
    if ((t = e.target.closest("[data-copy-section]"))) { S.copy(S.pageUrl(t.dataset.copySection), "Section link"); return; }
    if ((t = e.target.closest("[data-toc-link]"))) {
      e.preventDefault();
      history.pushState(null, "", "#" + t.dataset.tocLink);
      goTo(t.dataset.tocLink, true);
      if (window.innerWidth < 1024) { tocEl.hidden = true; tocToggle.setAttribute("aria-expanded", "false"); }
      return;
    }
    if (e.target.closest("[data-expand-all]")) { sectionsEl.querySelectorAll(".sk-collapse").forEach(function (s) { setExpanded(s, true); }); return; }
    if (e.target.closest("[data-collapse-all]")) { sectionsEl.querySelectorAll(".sk-collapse").forEach(function (s) { setExpanded(s, false); }); return; }
    if (e.target.closest("[data-print]")) {
      sectionsEl.querySelectorAll(".sk-collapse").forEach(function (s) { setExpanded(s, true); });
      window.print();
      return;
    }
    if (e.target.closest("[data-clear]")) S.setField(input, "");
  });
  tocToggle.addEventListener("click", function () {
    var open = tocToggle.getAttribute("aria-expanded") === "true";
    tocToggle.setAttribute("aria-expanded", String(!open));
    tocEl.hidden = open;
  });
  S.onSearch(input, function () { q = input.value; render(); });

  /* Active TOC item while scrolling */
  var io;
  function observe() {
    if (io) io.disconnect();
    if (!("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tocEl.querySelectorAll("a").forEach(function (a) { a.classList.toggle("is-active", a.dataset.tocLink === en.target.id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sectionsEl.querySelectorAll(".sk-collapse").forEach(function (s) { io.observe(s); });
  }

  /* Back to top */
  var topBtn = document.querySelector("[data-back-top]");
  window.addEventListener("scroll", function () { topBtn.hidden = window.scrollY < 600; }, { passive: true });
  topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
    var title = document.getElementById("page-title");
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  });

  // Language change: re-render, keeping each section's open/closed state.
  I.watch(function () {
    var closed = [].slice.call(sectionsEl.querySelectorAll('.sk-collapse-btn[aria-expanded="false"]')).map(function (b) { return b.closest(".sk-collapse").id; });
    renderIntro();
    render();
    closed.forEach(function (id) { var el = document.getElementById(id); if (el) setExpanded(el, false); });
  });
  render();
  if (location.hash.length > 1) goTo(decodeURIComponent(location.hash.slice(1)), false);
  window.addEventListener("hashchange", function () { goTo(decodeURIComponent(location.hash.slice(1)), true); });

}
