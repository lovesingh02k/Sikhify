import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initMedia } from '../controllers/mediaController.js';
import { mediaService } from '../services/media/mediaService.js';

const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਕੀਰਤਨ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/sikh-media">Media</a></li>
<li><a aria-current="page" data-crumb-page="" href="/sikh-media">Kirtan &amp; Katha</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Media · Kirtan &amp; Katha</p>
<h1 class="page-hero-title" id="page-title">Kirtan, Katha &amp; <span class="gold">Gurmat Sangeet</span></h1>
<p class="page-hero-sub">Find Ragis, Hazoori Ragis, Katha Vachaks and Dhadi Jathas, and watch their Kirtan and Katha right here on Sikhify. Search, filter by category or browse artists A–Z.</p>
<nav aria-label="On this page" class="page-subnav"><a href="#media-artists">Artists</a><a href="#media-videos">Videos</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<!-- Directory view: search, category, A–Z, artists and videos -->
<div id="media-browse">
<div class="sk-toolbar">
<div class="sk-toolbar sk-toolbar-row">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="media-search">Search artists and videos</label>
<input autocomplete="off" class="sk-input" id="media-search" placeholder="Search artists, videos, categories…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="media-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<p aria-live="polite" class="sk-result-count" data-count=""></p>
</div>
<div aria-label="Filter by category" class="sk-chip-row" data-filters="" role="group"></div>
<div>
<div aria-label="Filter artists by first letter" class="sk-media-az" data-letters="" role="group"></div>
<p class="sk-card-meta">Artists are listed by first name — titles such as Bhai, Giani, Dr. and Dhadi are not counted.</p>
</div>
<div class="flex flex-wrap items-center gap-3" data-clear-wrap="" hidden="">
<button class="sk-link-btn" data-clear-all="" type="button">Clear all filters</button>
</div>
</div>
<section aria-labelledby="artists-heading" class="mt-10" id="media-artists">
<p class="sk-eyebrow">Directory</p>
<h2 class="sk-section-title" id="artists-heading">Artists</h2>
<div class="sk-grid sk-grid-3 mt-6" data-artists=""><p class="sk-card-meta" style="grid-column:1/-1;min-height:70vh" aria-busy="true"><span class="sk-spinner" aria-hidden="true"></span> Loading artists…</p></div>
</section>
<section aria-labelledby="videos-heading" class="mt-12" id="media-videos">
<p class="sk-eyebrow">Watch &amp; listen</p>
<h2 class="sk-section-title" id="videos-heading">Videos</h2>
<p class="sk-section-sub">Videos play here on Sikhify.</p>
<div class="sk-grid sk-grid-3 mt-6" data-videos=""></div>
<div class="flex justify-center mt-8"><button class="sk-btn" data-load-more="" hidden="" type="button">Load more</button></div>
</section>
</div>
<!-- Artist view (opened via #artist=…) -->
<article hidden="" id="media-artist"></article>
</div>
</main>`;

export default function SikhMedia() {
  usePageMeta("Kirtan & Katha \u2014 Sikh Media \u2014 Sikhify.in", "Listen to Gurbani Kirtan, Katha, Dhadi and Gurmat Sangeet from Ragis, Hazoori Ragis and Katha Vachaks. Search artists, filter by category or browse A\u2013Z.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    // The live catalogue (admin-managed) — or the bundled one if the API isn't available.
    mediaService.installCatalog().then(() => initMedia());
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
