import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initFaq } from '../controllers/faqController.js';
import '../data/faq.js';

const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero">
<span class="page-hero-glyph" aria-hidden="true" lang="pa">ਸਵਾਲ</span>
<div class="sk-container relative z-10">
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/learn-sikhism">Learn</a></li>
<li><a aria-current="page" data-crumb-page="" href="/faq">FAQ</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Learn · FAQ</p>
<h1 class="page-hero-title" id="page-title">Questions about <span class="gold">Sikhi</span>, answered</h1>
<p class="page-hero-sub">Clear, respectful answers to the questions people most often ask. Search, filter by category, and share a link to any answer.</p>
<nav aria-label="Section pages" class="page-subnav"><a href="/learn-sikhism">Learn Sikhism</a><a href="/sikh-history">Sikh History</a><a href="/rehat-maryada">Rehat Maryada</a><a aria-current="page" href="/faq">FAQ</a></nav>
</div>
</section>
<div class="sk-container sk-section" style="max-width:960px">
<div class="sk-toolbar">
<div class="sk-toolbar sk-toolbar-row">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="faq-search">Search questions</label>
<input autocomplete="off" class="sk-input" id="faq-search" placeholder="Search questions and answers…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="faq-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<div class="flex flex-wrap gap-2">
<button class="sk-btn sk-btn-sm" data-open-all="" type="button">Open all</button>
<button class="sk-btn sk-btn-sm" data-close-all="" type="button">Close all</button>
</div>
</div>
<div aria-label="Filter by category" class="sk-chip-row" data-filters="" role="group"></div>
<div data-lang-switch=""></div>
<p aria-live="polite" class="sk-result-count" data-count=""></p>
</div>
<div class="mt-6" data-faq-list=""></div>
</div>
</main>`;

export default function FAQ() {
  usePageMeta("Sikh FAQ \u2014 Sikhify.in", "Answers to common questions about Sikhism: beliefs, Gurbani, practices, Gurdwaras, history, the Five Ks and Sikh ceremonies.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initFaq();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
