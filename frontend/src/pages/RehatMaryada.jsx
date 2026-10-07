import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initRehat } from '../controllers/rehatController.js';
import '../data/rehat.js';

const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਰਹਿਤ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/learn-sikhism">Learn</a></li>
<li><a aria-current="page" data-crumb-page="" href="/rehat-maryada">Rehat Maryada</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Learn · Code of conduct</p>
<h1 class="page-hero-title" id="page-title">The Sikh <span class="gold">Rehat Maryada</span></h1>
<p class="page-hero-sub">An explanatory guide to the Sikh code of conduct and conventions — with links to the official text published by the SGPC.</p>
<nav aria-label="Section pages" class="page-subnav"><a href="/learn-sikhism">Learn Sikhism</a><a href="/sikh-history">Sikh History</a><a aria-current="page" href="/rehat-maryada">Rehat Maryada</a><a href="/faq">FAQ</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<div class="mb-6" data-lang-switch=""></div>
<div class="sk-grid sk-grid-2" data-rehat-intro="" style="gap:1rem"></div>
<div class="sk-toolbar sk-toolbar-row mt-8 sk-no-print">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="rehat-search">Search the Rehat Maryada guide</label>
<input autocomplete="off" class="sk-input" id="rehat-search" placeholder="Search sections, e.g. “Ardas”, “marriage”…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="rehat-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<div class="flex flex-wrap gap-2">
<button class="sk-btn sk-btn-sm" data-expand-all="" type="button">Expand all</button>
<button class="sk-btn sk-btn-sm" data-collapse-all="" type="button">Collapse all</button>
<button class="sk-btn sk-btn-sm sk-btn-navy" data-print="" type="button">Print guide</button>
</div>
</div>
<p aria-live="polite" class="sk-result-count mt-3" data-count=""></p>
<div class="sk-two-col mt-6">
<aside aria-label="Table of contents" class="sk-toc">
<button aria-controls="rehat-toc-list" aria-expanded="false" class="sk-toc-toggle" type="button">Contents <svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><path d="M6 9l6 6 6-6"></path></svg></button>
<ol class="sk-toc-list" data-toc="" hidden="" id="rehat-toc-list"></ol>
</aside>
<div data-rehat-sections=""></div>
</div>
</div>
<button aria-label="Back to top" class="sk-back-top" data-back-top="" hidden="" type="button"><svg aria-hidden="true" fill="none" height="20" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="20"><path d="M12 19V5M5 12l7-7 7 7"></path></svg></button>
</main>`;

export default function RehatMaryada() {
  usePageMeta("Rehat Maryada \u2014 Sikhify.in", "A plain-language guide to the Sikh Rehat Maryada: daily life, Nitnem, Ardas, Gurdwara conduct, Anand Karaj, Antam Sanskar, Amrit Sanchar and the Five Ks.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initRehat();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
