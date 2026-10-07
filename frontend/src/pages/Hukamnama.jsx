import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initHukamnama } from '../controllers/hukamnamaController.js';
import '../data/hukamnama.js';

const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਹੁਕਮਨਾਮਾ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/gurbani">Gurbani</a></li>
<li><a aria-current="page" data-crumb-page="" href="/hukamnama">Hukamnama</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Gurbani · Sri Harmandir Sahib</p>
<h1 class="page-hero-title" id="page-title">Daily <span class="gold">Hukamnama</span></h1>
<p class="page-hero-sub">The Guru's order for the day from Sri Harmandir Sahib, Amritsar — with meanings, the official recording, and previous Hukamnamas.</p>
<nav aria-label="Section pages" class="page-subnav"><a href="/gurbani">Gurbani Library</a><a href="/nitnem">Nitnem</a><a aria-current="page" href="/hukamnama">Hukamnama</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<div class="sk-toolbar sk-no-print">
<div class="sk-date-nav">
<button aria-label="Previous day" class="sk-btn sk-btn-sm" data-day="-1" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M15 6l-6 6 6 6"></path></svg> Previous</button>
<label class="sr-only" for="hk-date">Choose a date</label>
<input class="sk-date-input" data-date-input="" id="hk-date" type="date"/>
<button aria-label="Next day" class="sk-btn sk-btn-sm" data-day="1" type="button">Next <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M9 6l6 6-6 6"></path></svg></button>
<button class="sk-btn sk-btn-sm sk-btn-gold" data-today="" type="button">Today</button>
</div>
<div data-prefs=""></div>
</div>
<div class="sk-grid sk-grid-3 mt-6" style="align-items:start">
<article aria-live="polite" class="sk-card" data-hk-card="" style="grid-column: span 2 / span 2"></article>
<aside aria-labelledby="archive-heading" class="sk-no-print">
<div class="sk-card">
<h2 class="sk-card-title" id="archive-heading">Previous Hukamnamas</h2>
<div class="sk-field mt-3" style="max-width:none">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="hk-archive-search">Search previous Hukamnamas</label>
<input autocomplete="off" class="sk-input" id="hk-archive-search" placeholder="Search by word, Ang, Raag…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="hk-archive-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<label class="sk-select-label mt-2 block"><span class="sr-only">Filter by Guru</span><select aria-label="Filter archive by Guru" class="sk-select w-full" data-archive-writer=""></select></label>
<div class="mt-3 flex flex-col gap-2" data-archive=""></div>
<button class="sk-btn sk-btn-sm w-full mt-3" data-archive-more="" type="button">Load 7 more days</button>
</div>
<div class="sk-card mt-4" data-saved-hukamnamas=""></div>
</aside>
</div>
<section aria-labelledby="about-hk" class="mt-12 sk-no-print">
<p class="sk-eyebrow">Understanding</p>
<h2 class="sk-section-title" data-hk-about-title="" id="about-hk">What is a Hukamnama?</h2>
<p class="sk-section-sub" data-hk-about="">Hukamnama means “order” or “edict”. Each morning at Sri Harmandir Sahib, and in Gurdwaras everywhere, a Hukamnama is taken from the Sri Guru Granth Sahib Ji as the Guru's guidance for the day.</p>
<ol class="sk-grid sk-grid-4 mt-6" data-steps=""></ol>
</section>
</div>
</main>`;

export default function Hukamnama() {
  usePageMeta("Daily Hukamnama \u2014 Sikhify.in", "Today's Hukamnama from Sri Harmandir Sahib, Amritsar, with transliteration and Punjabi, Hindi and English meanings, the official SGPC audio, and an archive of previous days.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initHukamnama();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
