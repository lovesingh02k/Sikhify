/* Migrated from active js/home.js; behavior retained.
   The "Today's Hukamnama" card reads the same source as the Hukamnama page
   (services/hukamnama/hukamnamaService.js): the Hukamnama published by a
   Sikhify admin, or the live BaniDB feed when none has been published. */
import { hukamnamaService, firstLines } from '../services/hukamnama/hukamnamaService.js';
import { eventService } from '../services/content/contentService.js';
import { festivalService } from '../services/festivals/festivalService.js';
import { festivalCardHtml, festivalDateLabel } from '../utils/festivalCard.js';
import GURUS from '../data/gurus.js';
import { guruImageHtml } from '../utils/images.js';
import { bannerService } from '../services/banners/bannerService.js';
import { bannerCarouselHtml, wireBannerPlayers, wireBannerCarousel } from '../utils/bannerHtml.js';

/**
 * Homepage banners (Admin → Homepage banners): published and inside their dates. A banner
 * may feature a festival / important day (shown in the light observance design). The
 * section takes no space at all until there is a banner to show.
 */
function renderBanners() {
  var section = document.querySelector("[data-home-banners]");
  var box = section && section.querySelector("[data-banners]");
  if (!box) return;
  bannerService.home().then(function (res) {
    var items = (res && res.items) || [];
    box.innerHTML = bannerCarouselHtml(items);
    wireBannerPlayers(box);
    wireBannerCarousel(box);
    section.hidden = !items.length;
  }).catch(function () {
    section.hidden = true; // API unavailable: the rest of the homepage is unaffected
  });
}

/** One row: a date tile (27 / OCT), the title, and "Tuesday · in 17 days". */
function eventRow(href, title, iso, daysUntil, extra) {
  var esc = window.Sikhify.esc;
  var p = iso.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  var weekday = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  var when = daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : "in " + daysUntil + " days";
  return '<li><a class="ev-item" href="' + esc(href) + '">' +
    '<span class="ev-date" aria-hidden="true"><span class="ev-day">' + p[2] + '</span><span class="ev-mon">' +
    d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase() + "</span></span>" +
    '<span class="ev-body"><span class="ev-title">' + esc(title) + "</span>" +
    '<span class="ev-meta"><time datetime="' + esc(iso) + '" title="' + esc(festivalDateLabel(iso)) + '">' + esc(weekday) + '</time><span class="ev-when">' + esc(when) + "</span></span>" +
    (extra ? '<span class="ev-where">' + esc(extra) + "</span>" : "") + "</span>" +
    '<span class="ev-go" aria-hidden="true">→</span></a></li>';
}

var DAY_MS = 864e5;
function daysFromToday(iso) {
  var p = iso.split("-").map(Number);
  var now = new Date();
  return Math.max(0, Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / DAY_MS));
}

/**
 * "Upcoming Events": the next published events. When none are listed, the next
 * festivals and important days with a verified date fill the list instead —
 * skipping the ones already shown in the festival cards above, so nothing
 * repeats ("View all" then goes to the festivals page). Never invented events.
 */
function renderEvents() {
  var box = document.querySelector("[data-home-events]");
  if (!box) return;
  var show = function (rows, allHref, kicker) {
    box.className = "";
    box.innerHTML = '<ol class="ev-list" role="list">' + rows.join("") + "</ol>";
    var all = document.querySelector("[data-home-events-all]");
    if (all && allHref) all.setAttribute("href", allHref);
    var k = document.querySelector("[data-home-events-kicker]");
    if (k) k.hidden = !kicker;
  };
  eventService.list({ when: "upcoming", limit: 3 }).then(function (res) {
    if (res.items.length) {
      show(res.items.map(function (e) {
        return eventRow(e.url, e.title, e.date, daysFromToday(e.date), [e.fields.venue, e.city].filter(Boolean).join(", "));
      }));
      return;
    }
    return Promise.all([festivalService.list(), festivalService.home().catch(function () { return { items: [] }; })]).then(function (r) {
      var shown = ((r[1] && r[1].items) || []).map(function (c) { return c.slug; });
      var all = ((r[0] && r[0].items) || []).filter(function (o) { return o.next; });
      var rest = all.filter(function (o) { return shown.indexOf(o.slug) === -1; });
      var next = (rest.length ? rest : all).slice(0, 3);
      if (!next.length) return; // keep the honest "none listed yet" copy
      show(next.map(function (o) { return eventRow("/festivals/" + o.slug, o.title, o.next.start, o.next.daysUntil); }), "/festivals", true);
    });
  }).catch(function () { /* API unavailable (static hosting): keep the fallback copy */ });
}

/** The related Guru's historical artwork for a festival card ('' when there is none). */
function guruArt(card) {
  var g = card.relatedGuru && GURUS.find(function (x) { return x.id === card.relatedGuru; });
  return g ? guruImageHtml(g, { sizes: "(min-width: 900px) 200px, 120px" }) : "";
}

/**
 * "Sikh Festivals & Important Days": published observances with verified dates,
 * selected by the API for today (see shared/festivals.js). The section stays
 * hidden — no heading, no empty note, no space — unless there are cards to show;
 * it appears by itself once an admin publishes an eligible observance.
 */
function renderFestivals() {
  var section = document.querySelector("[data-festivals-section]");
  var box = section && section.querySelector("[data-festivals]");
  if (!box) return;
  festivalService.home().then(function (res) {
    var items = (res && res.items) || [];
    // With nothing inside its window, the API offers the next verified dates (still labelled "in N days").
    box.innerHTML = items.map(function (c) { return festivalCardHtml(c, { wide: true, art: guruArt }); }).join("");
    section.hidden = !items.length;
  }).catch(function () {
    section.hidden = true; // offline / API unavailable: the rest of the homepage is unaffected
  });
}

export function initHome() {
"use strict";
  renderEvents();
  renderBanners();
  renderFestivals();
  var card = document.querySelector("[data-hk-gurmukhi]");
  if (!card || !window.fetch) return;

  hukamnamaService.getHukamnama("today")
    .then(function (h) {
      var lines = firstLines(h, 2);
      if (!lines.length) return;
      var esc = window.Sikhify ? Sikhify.esc : function (s) { return s; };
      card.innerHTML = lines.map(function (l) { return esc(l.g); }).join("<br>");
      // English translation, always (line by line, or the first line of the English block).
      var english = lines.map(function (l) { return l.en || ""; }).filter(Boolean).join(" ");
      if (!english && h.blocks.en) english = h.blocks.en.split("\n")[0];
      var enEl = document.querySelector("[data-hk-english]");
      if (enEl) { enEl.textContent = english; enEl.parentNode.hidden = !english; }
      // Plus the meaning in the visitor's reading language, when that is Punjabi (Prof. Sahib Singh) or Hindi.
      var lang = window.Sikhify && Sikhify.prefs ? Sikhify.prefs.get().lang : "en";
      var meaning = "";
      if (lang === "pa" || lang === "hi") {
        meaning = lines.map(function (l) { return l[lang] || ""; }).filter(Boolean).join(" ");
        if (!meaning && h.blocks[lang]) meaning = h.blocks[lang].split("\n")[0];
      }
      var trEl = document.querySelector("[data-hk-translation]");
      if (trEl) { trEl.textContent = meaning; trEl.setAttribute("lang", lang); trEl.hidden = !meaning; }
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
