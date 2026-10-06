import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initHistory } from '../controllers/historyController.js';
import '../data/gurus.js';
import '../data/learn.js';
import '../data/history.js';
import { heroArtHtml } from '../data/heroArt.js';

const PAGE_HTML = `<main id="main-content">
<section aria-labelledby="page-title" class="page-hero has-art">
<div class="sk-container relative z-10">
${heroArtHtml('history')}
<nav aria-label="Breadcrumb" class="breadcrumbs"><ol data-breadcrumbs="">
<li><a href="/">Home</a></li>
<li><a href="/learn-sikhism">Learn</a></li>
<li><a aria-current="page" data-crumb-page="" href="/sikh-history">Sikh History</a></li>
</ol></nav>
<p class="page-hero-eyebrow">Learn · History</p>
<h1 class="page-hero-title" id="page-title">Five centuries of <span class="gold">Sikh history</span></h1>
<p class="page-hero-sub">From the birth of Guru Nanak Dev Ji in 1469 to the present day — search the timeline, filter by era and open any event for the full story.</p>
<nav aria-label="Section pages" class="page-subnav"><a href="/learn-sikhism">Learn Sikhism</a><a aria-current="page" href="/sikh-history">Sikh History</a><a href="/rehat-maryada">Rehat Maryada</a><a href="/faq">FAQ</a></nav>
</div>
</section>
<div class="sk-container sk-section">
<div class="sk-toolbar">
<div class="sk-toolbar sk-toolbar-row">
<div class="sk-field">
<svg aria-hidden="true" class="sk-icon" fill="none" height="18" stroke="currentColor" stroke-width="1.8" viewbox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<label class="sr-only" for="history-search">Search history</label>
<input autocomplete="off" class="sk-input" id="history-search" placeholder="Search events, people and places…" type="search"/>
<button aria-label="Clear search" class="sk-icon-btn sk-field-clear" data-clear-for="history-search" hidden="" type="button"><svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
</div>
<p aria-live="polite" class="sk-result-count" data-count=""></p>
</div>
<div aria-label="Filter events" class="sk-chip-row" data-filters="" role="group"></div>
<div data-lang-switch=""></div>
</div>
<section aria-labelledby="gurus-heading" class="mt-10" data-section="guru-period">
<p class="sk-eyebrow">The Guru period</p>
<h2 class="sk-section-title" id="gurus-heading">The Ten Gurus, 1469–1708</h2>
<p class="sk-section-sub">Each Guru's lesson includes their biography, contributions and key events.</p>
<div class="sk-grid sk-grid-4 mt-6" data-guru-cards=""></div>
</section>
<section aria-labelledby="timeline-heading" class="mt-12">
<p class="sk-eyebrow">Timeline</p>
<h2 class="sk-section-title" id="timeline-heading">Important events</h2>
<div class="mt-4" data-timeline=""></div>
</section>
<section aria-labelledby="empire-heading" class="mt-12" data-section="empire">
<p class="sk-eyebrow">1799–1849</p>
<h2 class="sk-section-title" id="empire-heading">The Sikh Empire</h2>
<div class="mt-4" data-empire=""></div>
</section>
<section aria-labelledby="figures-heading" class="mt-12">
<p class="sk-eyebrow">People</p>
<h2 class="sk-section-title" id="figures-heading">Martyrs &amp; historical figures</h2>
<p class="sk-section-sub">Select a person to read the event they are remembered for.</p>
<div class="sk-grid sk-grid-3 mt-6" data-figures=""></div>
</section>
</div>
</main>`;

export default function SikhHistory() {
  usePageMeta("Sikh History \u2014 Sikhify.in", "An interactive Sikh history timeline: the Guru period, the Khalsa, martyrs, the Sikh Empire, historic Gurdwaras and modern Sikh history.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initHistory();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
