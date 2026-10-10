import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initLearn } from '../controllers/learnController.js';
import '../data/learn.js';
import '../data/gurus.js';
const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਸਿੱਖੀ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/learn-sikhism">Learn</a></li>
<li><a aria-current="page" data-crumb-page="" href="/learn-sikhism">Learn Sikhism</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Learn</p>
<h1 class="page-hero-title" id="page-title">Discover the path of <span class="gold">Sikhi</span></h1>
<p class="page-hero-sub">Short, clear lessons on Sikh beliefs, the Ten Gurus, key concepts and daily practice. Mark lessons complete and pick up where you left off.</p>
<div class="sk-progress-card" data-learn-progress="">
<div class="sk-progress-label"><span>Your progress</span><span class="sk-progress-value" data-progress-pct="">0%</span></div>
<div aria-label="Learning progress" aria-valuemax="100" aria-valuemin="0" aria-valuenow="0" class="sk-progress" data-progress-bar="" role="progressbar"><span style="width:0%"></span></div>
<p class="text-sm mt-2 text-white/70" data-progress-text="">0 of 0 lessons completed</p>
<div class="sk-progress-actions">
<button class="sk-btn sk-btn-gold sk-btn-sm" data-continue="" type="button">Start learning</button>
<button class="sk-btn sk-btn-sm" data-reset-progress="" hidden="" type="button">Reset progress</button>
</div>
</div>
<nav aria-label="Section pages" class="page-subnav"><a aria-current="page" href="/learn-sikhism">Learn Sikhism</a><a href="/sikh-history">Sikh History</a><a href="/rehat-maryada">Rehat Maryada</a><a href="/faq">FAQ</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<!-- Dashboard: search, filters and lesson cards -->
<div id="learn-dashboard">
<div class="sk-toolbar">
<div class="sk-toolbar sk-toolbar-row">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="learn-search">Search lessons</label>
<input autocomplete="off" class="sk-input" id="learn-search" placeholder="Search topics, Gurus, concepts, practices…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="learn-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<p aria-live="polite" class="sk-result-count" data-count=""></p>
</div>
<div aria-label="Filter lessons" class="sk-chip-row" data-filters="" role="group"></div>
<div data-lang-switch=""></div>
</div>
<div class="mt-8" data-learn-content=""></div>
</div>
<!-- Lesson view (opened via #topic=…) -->
<article aria-live="polite" class="sk-lesson" hidden="" id="learn-lesson"></article>
</div>
</main>`;

export default function Learn() {
  usePageMeta("Learn Sikhism \u2014 Sikhify.in", "Learn Sikhism step by step: core beliefs, the Ten Gurus, Sikh concepts and practices and the Five Ks \u2014 with progress tracking, search and bookmarks.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initLearn();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
