const FOOTER_HTML = `<footer class="site-footer" role="contentinfo">
<div class="max-w-[1280px] mx-auto px-5 md:px-8 py-14">
<div class="footer-grid">
<!-- EL:COLUMN footer-brand-column -->
<div class="footer-brand">
<div class="flex items-center gap-3 mb-3">
<span aria-hidden="true" class="khanda-mark footer-brand-khanda"></span>
<span class="font-heading font-bold text-lg text-white">Sikhify</span>
</div>
<p class="text-white/65 text-sm leading-relaxed max-w-[240px]">Our mission is to spread Guru's teachings, promote unity and serve humanity.</p>
<!-- EL:WIDGET:Icon List (social) -->
<ul aria-label="Social channels — coming soon" class="footer-social" role="list">
<li><span aria-label="Facebook (coming soon)" class="footer-social-icon is-soon" role="img" title="Coming soon"><svg fill="none" height="16" viewbox="0 0 16 16" width="16"><path d="M10 2H8.5A2.5 2.5 0 0 0 6 4.5V6H4v2.5h2V14h2.5V8.5h2l.5-2.5H8.5V4.5c0-.3.2-.5.5-.5H10V2Z" fill="currentColor"></path></svg></span></li>
<li><span aria-label="Instagram (coming soon)" class="footer-social-icon is-soon" role="img" title="Coming soon"><svg fill="none" height="16" viewbox="0 0 16 16" width="16"><rect height="12" rx="3.5" stroke="currentColor" stroke-width="1.3" width="12" x="2" y="2"></rect><circle cx="8" cy="8" r="2.7" stroke="currentColor" stroke-width="1.3"></circle><circle cx="11.6" cy="4.4" fill="currentColor" r="0.8"></circle></svg></span></li>
<li><span aria-label="YouTube (coming soon)" class="footer-social-icon is-soon" role="img" title="Coming soon"><svg fill="none" height="16" viewbox="0 0 16 16" width="16"><rect height="8" rx="2.5" stroke="currentColor" stroke-width="1.3" width="13" x="1.5" y="4"></rect><path d="M7 6.5l3 1.5-3 1.5v-3Z" fill="currentColor"></path></svg></span></li>
<li><span aria-label="Telegram (coming soon)" class="footer-social-icon is-soon" role="img" title="Coming soon"><svg fill="none" height="16" viewbox="0 0 16 16" width="16"><path d="M14 2 1.5 7.2l4 1.4L14 2Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.1"></path><path d="M5.5 8.6 14 2 9.8 13l-2.5-4-3-1.4Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.1"></path></svg></span></li>
</ul>
<p class="footer-soon-note">Social channels coming soon</p>
</div>
<!-- EL:COLUMN footer-links-column -->
<nav aria-label="Explore" class="footer-nav-column">
<h3 class="footer-heading">Explore</h3>
<ul role="list">
<li><a href="/learn-sikhism">Learn Sikhism</a></li>
<li><a href="/gurbani">Gurbani</a></li>
<li><a href="/nitnem">Nitnem</a></li>
<li><a href="/sikh-history">Sikh History</a></li>
<li><a href="/rehat-maryada">Rehat Maryada</a></li>
<li><a href="/faq">FAQ</a></li>
<li><a href="/gurus">The Ten Gurus</a></li>
</ul>
</nav>
<nav aria-label="Resources" class="footer-nav-column">
<h3 class="footer-heading">Resources</h3>
<ul role="list">
<li><a href="/books">Books &amp; Research</a></li>
<li><a href="/directory">Sikh Directory</a></li>
<li><a href="/festivals">Festivals &amp; Important Days</a></li>
<li><a href="/kids">Kids — Learn Sikhi</a></li>
</ul>
</nav>
<nav aria-label="Community" class="footer-nav-column">
<h3 class="footer-heading">Community</h3>
<ul role="list">
<li><a href="/community">Community</a></li>
<li><a href="/faq">Common Questions</a></li>
<li><a href="/events">Events</a></li>
<li><a href="/submit">Submit / Update Information</a></li>
</ul>
</nav>
<nav aria-label="Support" class="footer-nav-column">
<h3 class="footer-heading">Support</h3>
<ul role="list">
<li><a href="/about">About Us</a></li>
<li><a href="/contact">Contact Us <span class="soon-pill" aria-label="coming soon">Soon</span></a></li>
<li><a href="/donate">Donate <span class="soon-pill" aria-label="coming soon">Soon</span></a></li>
<li><a href="/sitemap">Sitemap</a></li>
<li><a href="/image-credits">Image credits</a></li>
<li><a href="/privacy-policy">Privacy Policy</a></li>
</ul>
</nav>
<!-- EL:COLUMN footer-app-column -->
<div class="footer-app-column">
<h3 class="footer-heading">Mobile App <span class="soon-pill">Soon</span></h3>
<p class="text-white/65 text-sm mb-4">The Sikhify app is on its way — take the Guru's teachings everywhere.</p>
<div class="flex flex-col gap-2">
<span aria-label="Google Play — coming soon" class="app-badge is-soon" role="img">
<svg aria-hidden="true" fill="none" height="18" viewbox="0 0 18 18" width="18"><path d="M3 2 13 9 3 16V2Z" fill="#F0A93B"></path></svg>
<span><span class="block text-[10px] text-white/60 leading-none">COMING SOON TO</span><span class="block text-sm font-medium leading-tight">Google Play</span></span>
</span>
<span aria-label="App Store — coming soon" class="app-badge is-soon" role="img">
<svg aria-hidden="true" fill="none" height="18" viewbox="0 0 18 18" width="18"><path d="M12.5 2.3c.1.9-.3 1.8-.8 2.4-.6.7-1.5 1.2-2.3 1.1-.1-.9.3-1.8.9-2.4.6-.7 1.5-1.1 2.2-1.1ZM15.4 12.8c-.4.9-.6 1.3-1.1 2.1-.7 1.1-1.7 2.5-2.9 2.5-1.1 0-1.4-.7-2.8-.7-1.5 0-1.8.7-2.9.7-1.2 0-2.1-1.3-2.8-2.4-1.9-2.9-2.1-6.3-.9-8.1.8-1.3 2.1-2.1 3.3-2.1 1.2 0 2 .8 3 .8s1.6-.8 3.1-.8c1.2 0 2.5.6 3.3 1.8-2.9 1.6-2.4 5.8.7 6.2Z" fill="#F0A93B"></path></svg>
<span><span class="block text-[10px] text-white/60 leading-none">COMING SOON TO</span><span class="block text-sm font-medium leading-tight">App Store</span></span>
</span>
</div>
</div>
</div>
</div>
<div class="footer-bottom">
<div class="max-w-[1280px] mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 py-5">
<p class="text-white/60 text-xs">© {{YEAR}} Sikhify – All Rights Reserved</p>
<span aria-hidden="true" class="khanda-mark footer-khanda"></span>
<p class="text-white/60 text-xs font-gurmukhi" lang="pa">ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਿਹ</p>
</div>
</div>
</footer>`;

export default function Footer() {
  // The copyright year follows the visitor's clock, so it never goes stale.
  return <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML.replace('{{YEAR}}', String(new Date().getFullYear())) }} />;
}
