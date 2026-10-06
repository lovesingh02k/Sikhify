import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initNitnem } from '../controllers/nitnemController.js';
import '../data/gurbani.js';
import '../data/nitnem.js';


const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਨਿਤਨੇਮ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/gurbani">Gurbani</a></li>
<li><a aria-current="page" data-crumb-page="" href="/nitnem">Nitnem</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Gurbani · Daily prayers</p>
<h1 class="page-hero-title" id="page-title"><span class="gold">Nitnem</span> — the daily Banis</h1>
<p class="page-hero-sub">Read each Bani with meanings, listen where a recording is available, and keep track of your daily Nitnem.</p>
<nav aria-label="Section pages" class="page-subnav"><a href="/gurbani">Gurbani Library</a><a aria-current="page" href="/nitnem">Nitnem</a><a href="/hukamnama">Hukamnama</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<div class="sk-grid sk-grid-3" style="align-items:start">
<!-- Daily checklist -->
<section aria-labelledby="checklist-heading" class="sk-card" data-checklist="">
<div class="flex justify-between items-start gap-2">
<div>
<p class="sk-eyebrow" data-today-label="">Today</p>
<h2 class="sk-card-title" id="checklist-heading">Daily Nitnem checklist</h2>
</div>
<button class="sk-btn sk-btn-sm" data-reset-today="" type="button">Reset today</button>
</div>
<div aria-label="Today's Nitnem" aria-valuemax="7" aria-valuemin="0" aria-valuenow="0" class="sk-progress sk-progress-light mt-4" data-today-bar="" role="progressbar"><span style="width:0%"></span></div>
<p class="sk-card-meta" data-today-text=""></p>
<div class="mt-3" data-checklist-groups=""></div>
<h3 class="text-sm font-semibold mt-5 mb-2" style="color:var(--text)">Last 7 days</h3>
<div class="sk-day-dots" data-history=""></div>
</section>
<!-- Bani reader -->
<section aria-label="Bani reader" class="sk-card" data-reader-card="" style="grid-column: span 2 / span 2">
<div aria-label="Choose a Bani" class="sk-bani-tabs" data-bani-tabs="" role="tablist"></div>
<div class="mt-5" data-bani-reader=""></div>
</section>
</div>
<p class="sk-card-meta mt-6" data-nitnem-note=""></p>
</div>
</main>`;

export default function Nitnem() {
  usePageMeta("Nitnem \u2014 Sikhify.in", "Read the daily Nitnem Banis with transliteration and Punjabi, Hindi and English meanings, listen to recitations, and keep a daily Nitnem checklist.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initNitnem();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
