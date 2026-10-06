/* Migrated from active js/home.js; behavior retained.
   The "Today's Hukamnama" card reads the same source as the Hukamnama page
   (services/hukamnama/hukamnamaService.js): the Hukamnama published by a
   Sikhify admin, or the live BaniDB feed when none has been published. */
import { hukamnamaService, firstLines } from '../services/hukamnama/hukamnamaService.js';
import { eventService } from '../services/content/contentService.js';

/** "Upcoming Events": the next published events (with the site's original event-list styling). */
function renderEvents() {
  var box = document.querySelector("[data-home-events]");
  if (!box) return;
  eventService.list({ when: "upcoming", limit: 3 }).then(function (res) {
    if (!res.items.length) return; // keep the honest "none listed yet" copy
    var esc = window.Sikhify.esc;
    box.className = "";
    box.innerHTML = '<ul class="event-list" role="list">' + res.items.map(function (e) {
      var p = e.date.split("-").map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
      var where = [e.fields.venue, e.city].filter(Boolean).join(", ");
      return '<li><a class="event-item" href="' + esc(e.url) + '">' +
        '<span class="event-date"><span class="event-date-day">' + p[2] + '</span><span class="event-date-month">' +
        d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase() + "</span></span>" +
        '<span><span class="event-title">' + esc(e.title) + '</span><span class="event-location">' + esc(where) + "</span></span></a></li>";
    }).join("") + "</ul>";
  }).catch(function () { /* API unavailable (static hosting): keep the fallback copy */ });
}

export function initHome() {
"use strict";
  renderEvents();
  var card = document.querySelector("[data-hk-gurmukhi]");
  if (!card || !window.fetch) return;

  hukamnamaService.getHukamnama("today")
    .then(function (h) {
      var lines = firstLines(h, 2);
      if (!lines.length) return;
      var esc = window.Sikhify ? Sikhify.esc : function (s) { return s; };
      card.innerHTML = lines.map(function (l) { return esc(l.g); }).join("<br>");
      // Meaning in the visitor's reading language (Punjabi: Prof. Sahib Singh; Hindi; English) — English if missing.
      var lang = window.Sikhify && Sikhify.prefs ? Sikhify.prefs.get().lang : "en";
      var meaningOf = function (l) {
        if (lang === "pa" && l.pa) return l.pa;
        if (lang === "hi" && l.hi) return l.hi;
        return l.en || "";
      };
      var meaning = lines.map(meaningOf).filter(Boolean).join(" ");
      var blockLang = !meaning && (h.blocks[lang] ? lang : h.blocks.en ? "en" : null);
      if (blockLang) meaning = h.blocks[blockLang].split("\n")[0];
      var shownLang = blockLang || (lines.every(function (l) { return lang !== "en" && l[lang]; }) ? lang : "en");
      var trEl = document.querySelector("[data-hk-translation]");
      if (meaning) {
        trEl.textContent = meaning;
        trEl.setAttribute("lang", shownLang);
      } else trEl.textContent = "";
      var p = h.date.split("-").map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
      document.querySelector("[data-hk-date]").textContent = d.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      });
      document.querySelector("[data-hk-source]").textContent =
        "— Sri Guru Granth Sahib Ji" + (h.ang ? " (Ang " + h.ang + ")" : "") + (h.writer ? ", " + h.writer : "");
    })
    .catch(function () {
      /* Offline or no source available: keep the verified fallback shabad. */
    });

}
