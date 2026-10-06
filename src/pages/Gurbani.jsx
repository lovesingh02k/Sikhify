import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initGurbani } from '../controllers/gurbaniController.js';
import '../data/gurbani.js';
import { heroArtHtml } from '../data/heroArt.js';


const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero has-art">
<div class="sk-container relative z-10">
${heroArtHtml('gurbani')}
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/gurbani">Gurbani</a></li>
<li><a aria-current="page" data-crumb-page="" href="/gurbani">Gurbani Library</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Gurbani</p>
<h1 class="page-hero-title" id="page-title">The <span class="gold">Gurbani</span> Library</h1>
<p class="page-hero-sub">Search shabads and Banis in Gurmukhi, transliteration or meaning, choose Punjabi, Hindi or English meanings, listen, bookmark and read without distraction.</p>
<nav aria-label="Section pages" class="page-subnav"><a aria-current="page" href="/gurbani">Gurbani Library</a><a href="/nitnem">Nitnem</a><a href="/hukamnama">Hukamnama</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<!-- Library view -->
<div id="gb-library">
<div class="sk-toolbar">
<div class="sk-toolbar sk-toolbar-row">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="gb-search">Search Gurbani</label>
<input autocomplete="off" class="sk-input" id="gb-search" placeholder="Search Gurmukhi, transliteration, meaning, Raag, Ang…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="gb-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<p aria-live="polite" class="sk-result-count" data-count=""></p>
</div>
<div aria-label="Filter by type" class="sk-chip-row" data-filters="" role="group"></div>
<div class="flex flex-wrap gap-2 items-center">
<label class="sk-select-label"><span class="sr-only">Filter by Guru or author</span><select aria-label="Filter by Guru or author" class="sk-select" data-author-filter=""></select></label>
<label class="sk-select-label"><span class="sr-only">Filter by Raag</span><select aria-label="Filter by Raag" class="sk-select" data-raag-filter=""></select></label>
<form class="flex gap-2 items-center" data-ang-form="">
<label class="sr-only" for="ang-input">Open an Ang (1–1430)</label>
<input class="sk-date-input" id="ang-input" inputmode="numeric" max="1430" min="1" placeholder="Ang 1–1430" style="width:8.5rem" type="number"/>
<button class="sk-btn sk-btn-sm" type="submit">Open Ang</button>
</form>
</div>
<div data-prefs=""></div>
</div>
<div class="sk-grid sk-grid-3 mt-6" data-gb-grid=""></div>
<div class="flex justify-center mt-8"><button class="sk-btn" data-load-more="" hidden="" type="button">Load more</button></div>
</div>
<!-- Detail view (opened via #item=… or #ang=…) -->
<article hidden="" id="gb-detail"></article>
</div>
</main>`;

export default function Gurbani() {
  usePageMeta("Gurbani Library \u2014 Sikhify.in", "Read Gurbani with Punjabi, Hindi and English meanings and transliteration: shabads, Banis, Raags and any Ang of the Sri Guru Granth Sahib Ji, with audio, bookmarks and reading mode.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initGurbani();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
