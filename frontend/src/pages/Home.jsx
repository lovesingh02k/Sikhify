import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { initHome } from '../controllers/homeController.js';
import GURUS from '../data/gurus.js';
import { guruImageHtml } from '../utils/images.js';

/** The Ten Guru Sahibs strip (artwork lazy-loads; text is real text). */
const GURU_CARDS = GURUS.map((g) => `<li><a class="home-guru" href="/gurus/${g.id}">` +
  `<span class="home-guru-art">${guruImageHtml(g, { sizes: '(min-width: 1024px) 200px, 40vw' })}<span class="home-guru-num" aria-hidden="true">${String(g.number).padStart(2, '0')}</span></span>` +
  `<span class="home-guru-name">Sri ${g.name}</span><span class="home-guru-gurmukhi" lang="pa">ਸ੍ਰੀ ${g.gurmukhi}</span>` +
  `<span class="home-guru-years">${g.lifespan.replace('–', ' — ')}</span></a></li>`).join('');

const PAGE_HTML = `<main id="main-content">
<!-- EL:SECTION hero-section -->
<section aria-labelledby="hero-heading" class="hero-section">
<!-- Photo: Golden Temple reflection at dusk — by Henlynn, Pexels (pexels.com/photo/the-golden-temple-7433983/) -->
<img alt="The Golden Temple (Sri Harmandir Sahib) reflected in the sacred pool at dusk, Amritsar" class="hero-bg-image" decoding="async" fetchpriority="high" height="1280" width="1920" src="https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1920" srcset="https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=768 768w, https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1280 1280w, https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1600 1600w, https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1920 1920w" sizes="100vw"/>
<div aria-hidden="true" class="hero-overlay"></div>
<div class="max-w-[1280px] mx-auto px-5 md:px-8 relative z-10">
<div class="hero-content">
<!-- EL:WIDGET:Heading -->
<h1 class="hero-title font-heading" id="hero-heading">
          Discover. Learn.<br/>Live <span class="text-gold-500">Sikhism</span>.
        </h1>
<!-- EL:WIDGET:Text -->
<p class="hero-subtitle">Explore the teachings, history and beauty of Sikhism. Enrich your life with Gurbani and Seva.</p>
<!-- EL:WIDGET:Button group -->
<div class="flex flex-wrap gap-4 mt-8">
<a class="btn-navy-fill" href="/hukamnama">
<svg aria-hidden="true" fill="none" height="16" viewbox="0 0 16 16" width="16"><path d="M3 2.5h7.5a2 2 0 0 1 2 2V14l-2.75-1.5L7 14l-2.75-1.5L1.5 14V4.5a2 2 0 0 1 2-2Z" stroke="white" stroke-width="1.3"></path></svg>
            Daily Hukamnama
          </a>
<a class="btn-outline-white" href="/gurbani">
<svg aria-hidden="true" fill="none" height="16" viewbox="0 0 16 16" width="16"><path d="M2 9a2 2 0 0 1 2-2h1v6H4a2 2 0 0 1-2-2V9Z" stroke="#142238" stroke-width="1.3"></path><path d="M14 9a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2V9Z" stroke="#142238" stroke-width="1.3"></path><path d="M4 7a4 4 0 0 1 8 0" stroke="#142238" stroke-width="1.3"></path></svg>
            Explore Gurbani
          </a>
</div>
</div>
</div>
</section>
<!-- EL:SECTION quicklinks-section -->
<section aria-label="Quick links" class="quicklinks-section">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="quicklinks-card">
<!-- EL:INNER-SECTION quicklinks-row -->
<ul class="quicklinks-row" role="list">
<!-- EL:WIDGET:Icon Box -->
<li><a class="quicklink-item" href="/hukamnama"><span class="quicklink-icon"><svg aria-hidden="true" fill="none" height="24" viewbox="0 0 24 24" width="24"><path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z" stroke="#142238" stroke-width="1.4"></path><path d="M16 7h3a1 1 0 0 1 1 1v12h-4" stroke="#142238" stroke-width="1.4"></path></svg></span><span class="quicklink-title">Hukamnama</span><span class="quicklink-sub">Daily Guidance</span></a></li>
<li><a class="quicklink-item" href="/gurbani"><span class="quicklink-icon quicklink-icon-gurmukhi">ੴ</span><span class="quicklink-title">Gurbani</span><span class="quicklink-sub">Read &amp; Listen</span></a></li>
<li><a class="quicklink-item" href="/nitnem"><span class="quicklink-icon"><svg aria-hidden="true" fill="none" height="24" viewbox="0 0 24 24" width="24"><rect height="18" rx="1.5" stroke="#142238" stroke-width="1.4" width="14" x="5" y="3"></rect><path d="M9 8h6M9 12h6M9 16h3" stroke="#142238" stroke-linecap="round" stroke-width="1.4"></path></svg></span><span class="quicklink-title">Nitnem</span><span class="quicklink-sub">Daily Prayers</span></a></li>
<li><a class="quicklink-item" href="/learn-sikhism"><span class="quicklink-icon"><svg aria-hidden="true" fill="none" height="24" viewbox="0 0 24 24" width="24"><path d="M3 8l9-4 9 4-9 4-9-4Z" stroke="#142238" stroke-linejoin="round" stroke-width="1.4"></path><path d="M7 10.5V16c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-5.5" stroke="#142238" stroke-width="1.4"></path></svg></span><span class="quicklink-title">Learn</span><span class="quicklink-sub">Sikhism</span></a></li>
<li><a class="quicklink-item" href="/sikh-store"><span class="quicklink-icon"><svg aria-hidden="true" fill="none" height="24" viewbox="0 0 24 24" width="24"><path d="M4 9l1.5-4.5h13L20 9" stroke="#142238" stroke-linejoin="round" stroke-width="1.4"></path><path d="M4 9h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V9Z" stroke="#142238" stroke-width="1.4"></path></svg></span><span class="quicklink-title">Sikh Store</span><span class="quicklink-sub"><span class="soon-pill" aria-label="coming soon">Soon</span></span></a></li>
<li><a class="quicklink-item" href="/community"><span class="quicklink-icon"><svg aria-hidden="true" fill="none" height="24" viewbox="0 0 24 24" width="24"><circle cx="9" cy="8" r="3" stroke="#142238" stroke-width="1.4"></circle><circle cx="17" cy="9" r="2.3" stroke="#142238" stroke-width="1.4"></circle><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#142238" stroke-width="1.4"></path><path d="M15.5 14.3c2.2.3 4 1.9 4 4.7" stroke="#142238" stroke-width="1.4"></path></svg></span><span class="quicklink-title">Community</span><span class="quicklink-sub">Sangat &amp; Groups</span></a></li>
</ul>
</div>
</div>
</section>
<!-- EL:SECTION home-banners — hidden (takes no space) until /api/banners/home returns a published banner (homeController) -->
<section aria-label="Featured" class="home-banners-section" data-home-banners="" hidden="">
<div class="max-w-[1280px] mx-auto px-5 md:px-8"><div class="home-banners" data-banners=""></div></div>
</section>
<!-- EL:SECTION festivals-section — hidden (takes no space) until /api/festivals/home returns cards (homeController) -->
<section aria-labelledby="festivals-heading" class="festivals-section" data-festivals-section="" hidden="">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="festivals-head">
<span class="section-icon" aria-hidden="true"><svg aria-hidden="true" width="22" height="22" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg></span>
<div class="min-w-0 festivals-head-text">
<h2 class="festivals-title font-heading" id="festivals-heading">Sikh Festivals &amp; Important Days</h2>
<p class="festivals-sub">Celebrate the moments that connect us to Sikhi.</p>
</div>
<a class="pill-link" href="/festivals">View all days <span aria-hidden="true">→</span></a>
</div>
<div class="festivals-row" data-festivals="" data-motion="reveal"></div>
</div>
</section>
<!-- EL:SECTION dashboard-section -->
<section aria-label="Today's highlights" class="dashboard-section">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="dashboard-grid">
<!-- EL:COLUMN hukamnama-column -->
<!-- EL:WIDGET:Testimonial (Hukamnama excerpt card) -->
<article class="hukamnama-card">
<span aria-hidden="true" class="khanda-mark hukamnama-watermark"></span>
<div class="hukamnama-card-head">
<span class="hukamnama-icon" aria-hidden="true"><svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z"></path><path d="M12 6.5v13"></path></svg></span>
<h2 class="font-heading text-lg font-semibold text-white">Today's Hukamnama</h2>
</div>
<p class="hukamnama-date"><svg aria-hidden="true" width="15" height="15" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><span data-hk-date="">Shabad for reflection</span></p>
<p class="hukamnama-gurmukhi font-gurmukhi" data-hk-gurmukhi="" lang="pa">
            ਜੋ ਨਰੁ ਦੁਖ ਮੈ ਦੁਖੁ ਨਹੀ ਮਾਨੈ ॥<br/>
            ਸੁਖ ਸਨੇਹੁ ਅਰੁ ਭੈ ਨਹੀ ਜਾ ਕੈ ਕੰਚਨ ਮਾਟੀ ਮਾਨੈ ॥੧॥ ਰਹਾਉ ॥
          </p>
<div class="hukamnama-english">
<p class="hukamnama-label">English translation</p>
<p class="hukamnama-translation" data-hk-english="" lang="en">That man, who in the midst of pain, does not feel pain, who is not affected by pleasure, affection or fear, and who looks alike upon gold and dust.</p>
</div>
<p class="hukamnama-meaning" data-hk-translation="" hidden=""></p>
<div class="hukamnama-footer">
<cite class="hukamnama-source" data-hk-source="">— Sri Guru Granth Sahib Ji (Ang 633), Guru Tegh Bahadur Ji</cite>
</div>
<div class="hukamnama-bottom">
<a class="hukamnama-more" href="/hukamnama">Read full Hukamnama <span aria-hidden="true">→</span></a>
<svg class="hukamnama-ornament" aria-hidden="true" viewbox="0 0 140 28" fill="none"><path d="M0 14h48M92 14h48" stroke="currentColor" stroke-width="1.5"></path><path d="M70 3l10 11-10 11-10-11 10-11Z" stroke="currentColor" stroke-width="1.5"></path><circle cx="70" cy="14" r="3" fill="currentColor"></circle></svg>
</div>
</article>
<!-- EL:COLUMN events-column -->
<article class="panel-card events-card">
<div class="panel-card-head">
<h2 class="panel-title font-heading"><span class="panel-title-icon" aria-hidden="true"><svg aria-hidden="true" width="15" height="15" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg></span>Upcoming Events</h2>
<a class="panel-view-all" href="/events" data-home-events-all="">View all <span aria-hidden="true">→</span></a>
</div>
<p class="panel-kicker" data-home-events-kicker="" hidden="">More Gurpurabs &amp; important days ahead</p>
<div class="panel-soon" data-home-events="">
<span class="panel-soon-icon" aria-hidden="true"><svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewbox="0 0 24 24" width="22"><rect height="16" rx="2" width="18" x="3" y="5"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg></span>
<p class="panel-soon-text">No upcoming events are listed yet. Gurpurabs, Nagar Kirtans and Kirtan Darbars appear here once they are verified — you can <a class="panel-view-all" href="/submit?kind=event">submit an event</a>.</p>
<a class="panel-view-all" href="/sikh-history">Explore Sikh history →</a>
</div>
<p class="panel-foot">Know of a Nagar Kirtan or Kirtan Darbar? <a class="panel-view-all" href="/submit?kind=event">Submit an event <span aria-hidden="true">→</span></a></p>
</article>
<!-- EL:COLUMN store-column -->
<article class="panel-card store-card">
<div class="panel-card-head">
<h2 class="panel-title font-heading"><span class="panel-title-icon" aria-hidden="true"><svg width="15" height="15" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 9l1.5-4.5h13L20 9"></path><path d="M4 9h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V9Z"></path></svg></span>Sikh Store</h2>
<span class="soon-pill" aria-label="coming soon">Soon</span>
</div>
<!-- EL:INNER-SECTION product-thumbs-row -->
<p class="panel-soon-text mb-3">Kara, Gutka Sahib, Khanda pendants and more — a preview of what's planned. The store isn't open yet.</p>
<div class="product-thumb-row is-preview">
<!-- EL:WIDGET:Image + Text -->
<a class="product-thumb" href="/sikh-store">
<!-- Photo: bracelet close-up — by monicore-style placeholder, Pexels -->
<img alt="Polished steel Kara bracelet" decoding="async" height="400" loading="lazy" width="400" src="https://images.pexels.com/photos/16461255/pexels-photo-16461255.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400" srcset="https://images.pexels.com/photos/16461255/pexels-photo-16461255.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=200 200w, https://images.pexels.com/photos/16461255/pexels-photo-16461255.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w" sizes="(min-width: 1024px) 110px, 30vw"/>
<span class="product-thumb-tag">Preview</span><span class="product-thumb-title">Steel Kara</span>
</a>
<a class="product-thumb" href="/sikh-store">
<!-- Photo: leather-bound book — by Jess Bailey Designs, Pexels -->
<img alt="Gutka Sahib prayer book" decoding="async" height="400" loading="lazy" width="400" src="https://images.pexels.com/photos/1018133/pexels-photo-1018133.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400" srcset="https://images.pexels.com/photos/1018133/pexels-photo-1018133.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=200 200w, https://images.pexels.com/photos/1018133/pexels-photo-1018133.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w" sizes="(min-width: 1024px) 110px, 30vw"/>
<span class="product-thumb-tag">Preview</span><span class="product-thumb-title">Gutka Sahib</span>
</a>
<a class="product-thumb" href="/sikh-store">
<!-- Photo: pendant necklace — by monicore, Pexels (pexels.com/photo/135486) -->
<img alt="Khanda pendant necklace" decoding="async" height="400" loading="lazy" width="400" src="https://images.pexels.com/photos/135486/pexels-photo-135486.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400" srcset="https://images.pexels.com/photos/135486/pexels-photo-135486.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=200 200w, https://images.pexels.com/photos/135486/pexels-photo-135486.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w" sizes="(min-width: 1024px) 110px, 30vw"/>
<span class="product-thumb-tag">Preview</span><span class="product-thumb-title">Khanda Pendant</span>
</a>
</div>
<div class="store-note"><span class="khanda-mark store-note-mark" aria-hidden="true"></span><p><strong>Opening soon.</strong> We'll announce it here on the homepage when the store opens.</p></div>
<div class="panel-foot store-foot"><a class="pill-link pill-link-soft" href="/sikh-store">Learn more <span aria-hidden="true">→</span></a></div>
</article>
</div>
</div>
</section>
<!-- EL:SECTION gurus-section -->
<section aria-labelledby="home-gurus-heading" class="home-gurus-section">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="home-gurus-head">
<div>
<p class="sk-eyebrow">Guru Sahiban</p>
<h2 class="font-heading text-2xl font-bold text-ink-900" id="home-gurus-heading">The Ten Guru Sahibs</h2>
<p class="home-gurus-sub">From Sri Guru Nanak Dev Ji to Sri Guru Gobind Singh Ji. Paintings are historical artistic depictions from museum collections.</p>
</div>
<a class="panel-view-all" href="/gurus">Explore all ten →</a>
</div>
<ol class="home-gurus-row" role="list">${GURU_CARDS}</ol>
</div>
</section>
<!-- EL:SECTION content-cards-section -->
<section aria-label="Explore Sikhify" class="content-cards-section">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<!-- EL:INNER-SECTION content-cards-grid -->
<div class="content-cards-grid">
<!-- EL:WIDGET:Icon Box (image card) -->
<a class="content-card" href="/gurbani">
<!-- Photo: open journal book — by Arun Thomas, Pexels (pexels.com/photo/journal-book-1156683/) -->
<img alt="Open scripture book with warm lighting" decoding="async" height="400" loading="lazy" width="600" src="https://images.pexels.com/photos/1156683/pexels-photo-1156683.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600" srcset="https://images.pexels.com/photos/1156683/pexels-photo-1156683.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w, https://images.pexels.com/photos/1156683/pexels-photo-1156683.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600 600w, https://images.pexels.com/photos/1156683/pexels-photo-1156683.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=900 900w" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"/>
<div class="content-card-body">
<h3 class="content-card-title">Gurbani Library</h3>
<p class="content-card-text">Read, search and listen to Gurbani with meanings in Punjabi, Hindi &amp; English.</p>
<span class="content-card-link">Explore →</span>
</div>
</a>
<a class="content-card" href="/sikh-history">
<!-- Photo: elder Sikh man in turban — by Avneet Kaur, Pexels (pexels.com/photo/man-in-turban-and-with-gray-beard-25578443/) -->
<img alt="Elder Sikh man at a community gathering" decoding="async" height="400" loading="lazy" width="600" src="https://images.pexels.com/photos/25578443/pexels-photo-25578443.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600" srcset="https://images.pexels.com/photos/25578443/pexels-photo-25578443.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w, https://images.pexels.com/photos/25578443/pexels-photo-25578443.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600 600w, https://images.pexels.com/photos/25578443/pexels-photo-25578443.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=900 900w" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"/>
<div class="content-card-body">
<h3 class="content-card-title">Sikh History</h3>
<p class="content-card-text">Learn about the lives of Guru Sahiban, Sikh Empire, martyrs and inspiring stories.</p>
<span class="content-card-link">Explore →</span>
</div>
</a>
<a class="content-card" href="/kids">
<!-- Photo: child having turban tied — by World Sikh Organization of Canada, Pexels (pexels.com/photo/a-person-putting-an-orange-head-turban-on-a-child-14797819/) -->
<img alt="Child having a turban tied by a family member" decoding="async" height="400" loading="lazy" width="600" src="https://images.pexels.com/photos/14797819/pexels-photo-14797819.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600" srcset="https://images.pexels.com/photos/14797819/pexels-photo-14797819.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w, https://images.pexels.com/photos/14797819/pexels-photo-14797819.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600 600w, https://images.pexels.com/photos/14797819/pexels-photo-14797819.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=900 900w" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"/>
<div class="content-card-body">
<h3 class="content-card-title">Kids — Learn Sikhi</h3>
<p class="content-card-text">Fun learning, stories, games and activities for Sikh children.</p>
<span class="content-card-link">Explore →</span>
</div>
</a>
<a class="content-card" href="/sikh-media">
<!-- Photo: studio microphone — by Reel Focus Productions, Pexels (pexels.com/photo/podcast-microphone-27616685/) -->
<img alt="Studio microphone used for Kirtan and Katha recordings" decoding="async" height="400" loading="lazy" width="600" src="https://images.pexels.com/photos/27616685/pexels-photo-27616685.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600" srcset="https://images.pexels.com/photos/27616685/pexels-photo-27616685.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w, https://images.pexels.com/photos/27616685/pexels-photo-27616685.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=600 600w, https://images.pexels.com/photos/27616685/pexels-photo-27616685.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=900 900w" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"/>
<div class="content-card-body">
<h3 class="content-card-title">Sikh Media</h3>
<p class="content-card-text">Listen to Kirtan, Katha, Dhadi and Gurmat Sangeet from Ragis and Katha Vachaks.</p>
<span class="content-card-link">Explore →</span>
</div>
</a>
<a class="content-card" href="/blog">
<!-- Photo: pen and open notebook — by Negative Space, Pexels (pexels.com/photo/coffee-notebook-pen-writing-34587/) -->
<img alt="Pen resting on an open notebook" decoding="async" height="400" loading="lazy" width="600" src="https://images.pexels.com/photos/34587/pexels-photo.jpg?auto=compress&amp;cs=tinysrgb&amp;w=600" srcset="https://images.pexels.com/photos/34587/pexels-photo.jpg?auto=compress&amp;cs=tinysrgb&amp;w=400 400w, https://images.pexels.com/photos/34587/pexels-photo.jpg?auto=compress&amp;cs=tinysrgb&amp;w=600 600w, https://images.pexels.com/photos/34587/pexels-photo.jpg?auto=compress&amp;cs=tinysrgb&amp;w=900 900w" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"/>
<div class="content-card-body">
<h3 class="content-card-title">Blog <span class="soon-pill" aria-label="coming soon">Soon</span></h3>
<p class="content-card-text">Read articles on Sikhism, lifestyle, spirituality, history and more.</p>
<span class="content-card-link">Explore →</span>
</div>
</a>
</div>
</div>
</section>
<!-- EL:SECTION newsletter-section -->
<section aria-labelledby="newsletter-heading" class="newsletter-section">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="newsletter-row">
<div class="newsletter-copy">
<span aria-hidden="true" class="newsletter-icon">
<svg fill="none" height="22" viewbox="0 0 22 22" width="22"><rect height="14" rx="2" stroke="#142238" stroke-width="1.4" width="18" x="2" y="4"></rect><path d="M2.5 5.5 11 12l8.5-6.5" stroke="#142238" stroke-width="1.4"></path></svg>
</span>
<div>
<h2 class="font-heading text-lg font-semibold text-white" id="newsletter-heading">Stay Connected <span class="soon-pill" aria-label="coming soon">Soon</span></h2>
<p class="text-white/70 text-sm mt-0.5">Email updates with the daily Hukamnama are coming soon. Until then, today's Hukamnama is always on the <a class="newsletter-link" href="/hukamnama">Hukamnama page</a>.</p>
</div>
</div>
<div aria-label="Newsletter sign-up (coming soon)" class="newsletter-form is-soon" role="group">
<label class="sr-only" for="newsletter-email">Email address (sign-up coming soon)</label>
<input aria-describedby="newsletter-heading" class="newsletter-input" disabled="" id="newsletter-email" placeholder="Sign-up opens soon" type="email"/>
<button class="btn-gold-fill" disabled="" type="button">Coming soon</button>
</div>
</div>
</div>
</section>
</main>`;

export default function Home() {
  usePageMeta("Sikhify.in \u2014 Discover. Learn. Live Sikhism.", "Explore the teachings, history and beauty of Sikhism: the daily Hukamnama, Gurbani with meanings, Nitnem, Sikh history, Kirtan and Katha.");
  usePageController(() => {
    initCore();
    initCommonInteractions();
    initHome();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PAGE_HTML }} />;
}
