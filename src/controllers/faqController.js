/* Migrated from active js/faq.js; behavior retained. */
export function initFaq() {
"use strict";
  var S = window.Sikhify, D = window.SikhifyData;
  if (!D.faq) return;

  var FILTERS = ["All"].concat(D.faqCategories);
  var state = { filter: "All", q: "", open: {} };
  var input = document.getElementById("faq-search");
  var listEl = document.querySelector("[data-faq-list]");
  var filtersEl = document.querySelector("[data-filters]");
  var countEl = document.querySelector("[data-count]");

  /* Content language: questions and answers can be read in English, Hindi or Punjabi. */
  var I = S.i18n;
  var loc = function (f) { return I.localize("faq", f); };
  var faqText = function (f) {
    var en = f.q + " " + f.a + " " + f.category;
    if (I.lang() === "en") return en;
    var L = loc(f);
    return en + " " + L.q + " " + L.a;
  };
  var visible = function () {
    return D.faq.filter(function (f) {
      return (state.filter === "All" || f.category === state.filter) && S.matches(faqText(f), state.q);
    });
  };

  function render() {
    filtersEl.innerHTML = FILTERS.map(function (c) {
      var n = c === "All" ? D.faq.length : D.faq.filter(function (f) { return f.category === c; }).length;
      return '<button type="button" class="sk-chip" data-filter="' + S.esc(c) + '" aria-pressed="' + (state.filter === c) + '">' + S.esc(c) + '<span class="sk-count">' + n + "</span></button>";
    }).join("");
    var list = visible();
    countEl.textContent = list.length + (list.length === 1 ? " question" : " questions") + (state.q ? " match “" + state.q + "”" : "");
    if (!list.length) {
      listEl.innerHTML = '<div class="sk-empty"><p class="sk-empty-title">No results found</p><p>No questions match' + (state.q ? " “" + S.esc(state.q) + "”" : "") +
        (state.filter !== "All" ? " in " + S.esc(state.filter) : "") + '.</p><div class="sk-suggest">' +
        ["Langar", "turban", "Amrit", "Nitnem", "Khalsa"].map(function (s) { return '<button type="button" class="sk-chip" data-suggest="' + s + '">' + s + "</button>"; }).join("") +
        '<button type="button" class="sk-chip" data-clear-all>Clear filters</button></div></div>';
      return;
    }
    var la = I.attr();
    listEl.innerHTML = list.map(function (en) {
      var f = loc(en), open = !!state.open[f.id];
      return '<div class="sk-acc" id="faq-' + f.id + '">' +
        '<h2 class="sk-acc-head" style="margin:0"><button type="button" class="sk-acc-btn" id="q-' + f.id + '" aria-expanded="' + open + '" aria-controls="a-' + f.id + '" data-acc="' + f.id + '">' +
        '<span><span class="sk-acc-cat">' + S.esc(f.category) + '</span><span class="sk-acc-q"' + la + '>' + S.highlight(f.q, state.q) + "</span></span>" +
        '<svg class="sk-icon sk-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></h2>' +
        '<div class="sk-acc-panel" id="a-' + f.id + '" role="region" aria-labelledby="q-' + f.id + '"' + (open ? "" : " hidden") + ">" +
        "<p" + la + ">" + S.highlight(f.a, state.q) + "</p>" +
        '<div class="sk-acc-actions">' +
        (f.link ? '<a class="sk-btn sk-btn-sm" href="' + S.esc(f.link.href) + '">' + S.esc(f.link.label) + " →</a>" : "") +
        '<button type="button" class="sk-btn sk-btn-sm" data-copy-faq="' + f.id + '">' + S.icon("link", 15) + "Copy link</button></div></div></div>";
    }).join("");
  }

  function setOpen(id, open) {
    state.open[id] = open;
    var btn = document.getElementById("q-" + id), panel = document.getElementById("a-" + id);
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  }

  document.querySelector("main").addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-filter]"))) { state.filter = t.dataset.filter; render(); return; }
    if ((t = e.target.closest("[data-acc]"))) { setOpen(t.dataset.acc, t.getAttribute("aria-expanded") !== "true"); return; }
    if ((t = e.target.closest("[data-copy-faq]"))) { S.copy(S.pageUrl("faq=" + t.dataset.copyFaq), "Link to question"); return; }
    if (e.target.closest("[data-open-all]")) { visible().forEach(function (f) { setOpen(f.id, true); }); return; }
    if (e.target.closest("[data-close-all]")) { visible().forEach(function (f) { setOpen(f.id, false); }); return; }
    if ((t = e.target.closest("[data-suggest]"))) { state.filter = "All"; S.setField(input, t.dataset.suggest); return; }
    if (e.target.closest("[data-clear-all]")) { state.filter = "All"; S.setField(input, ""); }
  });

  // Keyboard navigation between accordion headers.
  listEl.addEventListener("keydown", function (e) {
    if (!e.target.matches(".sk-acc-btn")) return;
    var btns = [].slice.call(listEl.querySelectorAll(".sk-acc-btn"));
    var i = btns.indexOf(e.target), to = null;
    if (e.key === "ArrowDown") to = btns[(i + 1) % btns.length];
    else if (e.key === "ArrowUp") to = btns[(i - 1 + btns.length) % btns.length];
    else if (e.key === "Home") to = btns[0];
    else if (e.key === "End") to = btns[btns.length - 1];
    if (to) { e.preventDefault(); to.focus(); }
  });

  S.onSearch(input, function () {
    state.q = input.value;
    // While searching, open matching answers so the highlighted text is visible.
    if (state.q.trim()) visible().forEach(function (f) { state.open[f.id] = true; });
    render();
  });

  function route() {
    var id = S.hashParams().faq;
    var f = id && D.faq.find(function (x) { return x.id === id; });
    if (!f) return;
    if (!visible().some(function (x) { return x.id === id; })) { state.filter = "All"; state.q = ""; input.value = ""; }
    state.open[id] = true;
    render();
    var el = document.getElementById("faq-" + id);
    el.classList.add("is-target");
    el.scrollIntoView({ block: "center" });
    document.getElementById("q-" + id).focus({ preventScroll: true });
    setTimeout(function () { el.classList.remove("is-target"); }, 2500);
  }
  window.addEventListener("hashchange", route);
  I.watch(render);
  render();
  route();

}
