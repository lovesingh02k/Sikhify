import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import AccountMenu, { MobileAccount } from './AccountMenu.jsx';

const HEADER_HTML = `<header class="site-header" role="banner">
<div class="max-w-[1280px] mx-auto px-5 md:px-8">
<div class="flex items-center justify-between h-20">
<!-- EL:COLUMN logo-column -->
<a aria-label="Sikhify home" class="brand-lockup flex items-center gap-3" href="/">
<!-- EL:WIDGET:Icon -->
<span aria-hidden="true" class="khanda-mark brand-khanda"></span>
<!-- EL:WIDGET:Heading -->
<span class="brand-text leading-none">
<span class="block font-heading font-bold text-xl text-white">Sikhify</span>
<span class="block font-body text-[11px] tracking-wide text-white/60 -mt-0.5">Simplifying Sikhism</span>
</span>
</a>
<!-- EL:COLUMN primary-nav-column -->
<nav aria-label="Primary" class="main-nav hidden lg:flex items-center gap-8">
<a class="nav-link is-active" href="/">Home</a>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">Learn <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/learn-sikhism">Learn Sikhism</a>
<a href="/gurus">The Ten Gurus</a>
<a href="/sikh-history">Sikh History</a>
<a href="/rehat-maryada">Rehat Maryada</a>
<a href="/faq">FAQ</a>
<a href="/kids">Kids — Learn Sikhi</a>
</div>
</div>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">Gurbani <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/gurbani">Gurbani Library</a>
<a href="/nitnem">Nitnem</a>
<a href="/hukamnama">Hukamnama</a>
</div>
</div>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">Media <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/sikh-media">Kirtan &amp; Katha</a>
<a href="/blog">Blog <span class="soon-pill" aria-label="coming soon">Soon</span></a>
</div>
</div>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">Directory <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/directory/gurdwaras">Gurdwaras</a>
<a href="/personalities">Sikh Personalities</a>
<a href="/organizations">Organizations</a>
<a href="/websites">Sikh Websites</a>
<a href="/apps">Sikh Apps</a>
<a href="/books">Books &amp; Research</a>
<a href="/heritage">Sikh Heritage</a>
<a href="/directory">Browse the directory</a>
</div>
</div>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">Community <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/community">Community Feed</a>
<a href="/community/groups">Groups</a>
<a href="/events">Events</a>
<a href="/news">News</a>
<a href="/submit">Submit / Update Information</a>
</div>
</div>
<div class="nav-dropdown">
<button aria-expanded="false" aria-haspopup="true" class="nav-link nav-dropdown-trigger" type="button">More <svg aria-hidden="true" fill="none" height="6" viewbox="0 0 10 6" width="10"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="nav-dropdown-panel">
<a href="/sikh-store">Sikh Store <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/downloads">Downloads <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/about">About Us <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/contact">Contact Us <span class="soon-pill" aria-label="coming soon">Soon</span></a>
</div>
</div>
</nav>
<!-- EL:COLUMN header-actions-column -->
<div class="flex items-center gap-4">
<button aria-haspopup="dialog" aria-label="Search Sikhify" class="header-icon-btn" data-site-search="">
<svg aria-hidden="true" fill="none" height="18" viewbox="0 0 18 18" width="18"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"></circle><path d="M13 13L17 17" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path></svg>
</button>
<button aria-label="Switch to dark mode" aria-pressed="false" class="header-icon-btn" id="theme-toggle">
<svg aria-hidden="true" fill="none" height="18" viewbox="0 0 18 18" width="18"><path d="M9 1.5a7.5 7.5 0 1 0 7.5 9.4A6 6 0 0 1 9 1.5Z" stroke="currentColor" stroke-width="1.3"></path></svg>
</button>
<!-- EL:WIDGET:Button — account area: React renders the signed-in menu here (AccountMenu) -->
<div class="sk-account" data-account-slot="">
<a class="btn-gold-fill hidden sm:inline-flex" href="/login">
<svg aria-hidden="true" fill="none" height="14" viewbox="0 0 14 14" width="14"><circle cx="7" cy="4.5" r="2.5" stroke="#142238" stroke-width="1.3"></circle><path d="M2 12.5c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="#142238" stroke-width="1.3"></path></svg>
          Sign In
        </a>
</div>
<button aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu" class="mobile-menu-toggle lg:hidden" id="mobile-menu-toggle">
<span></span><span></span><span></span>
</button>
</div>
</div>
</div>
<!-- EL:SECTION mobile-nav-panel -->
<div class="mobile-nav-panel" id="mobile-menu">
<nav aria-label="Mobile" class="flex flex-col gap-1 px-5 py-4">
<a class="mobile-nav-link" href="/">Home</a>
<div class="mobile-nav-group">
<button aria-controls="m-learn" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">Learn <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-learn">
<a href="/learn-sikhism">Learn Sikhism</a>
<a href="/gurus">The Ten Gurus</a>
<a href="/sikh-history">Sikh History</a>
<a href="/rehat-maryada">Rehat Maryada</a>
<a href="/faq">FAQ</a>
<a href="/kids">Kids — Learn Sikhi</a>
</div>
</div>
<div class="mobile-nav-group">
<button aria-controls="m-gurbani" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">Gurbani <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-gurbani">
<a href="/gurbani">Gurbani Library</a>
<a href="/nitnem">Nitnem</a>
<a href="/hukamnama">Hukamnama</a>
</div>
</div>
<div class="mobile-nav-group">
<button aria-controls="m-media" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">Media <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-media">
<a href="/sikh-media">Kirtan &amp; Katha</a>
<a href="/blog">Blog <span class="soon-pill" aria-label="coming soon">Soon</span></a>
</div>
</div>
<div class="mobile-nav-group">
<button aria-controls="m-directory" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">Directory <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-directory">
<a href="/directory/gurdwaras">Gurdwaras</a>
<a href="/personalities">Sikh Personalities</a>
<a href="/organizations">Organizations</a>
<a href="/websites">Sikh Websites</a>
<a href="/apps">Sikh Apps</a>
<a href="/books">Books &amp; Research</a>
<a href="/heritage">Sikh Heritage</a>
<a href="/directory">Browse the directory</a>
</div>
</div>
<div class="mobile-nav-group">
<button aria-controls="m-community" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">Community <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-community">
<a href="/community">Community Feed</a>
<a href="/community/groups">Groups</a>
<a href="/events">Events</a>
<a href="/news">News</a>
<a href="/submit">Submit / Update Information</a>
</div>
</div>
<div class="mobile-nav-group">
<button aria-controls="m-more" aria-expanded="false" class="mobile-nav-link mobile-nav-toggle" type="button">More <svg aria-hidden="true" fill="none" height="8" viewbox="0 0 10 6" width="12"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"></path></svg></button>
<div class="mobile-subnav" hidden="" id="m-more">
<a href="/sikh-store">Sikh Store <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/downloads">Downloads <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/about">About Us <span class="soon-pill" aria-label="coming soon">Soon</span></a>
<a href="/contact">Contact Us <span class="soon-pill" aria-label="coming soon">Soon</span></a>
</div>
</div>
<div data-mobile-account-slot=""><a class="btn-gold-fill justify-center mt-2" href="/login">Sign In</a></div>
</nav>
</div>
</header>`;

export default function Header() {
  const location = useLocation();
  const [slots, setSlots] = useState(null);

  useEffect(() => {
    const root = document.querySelector('.site-header');
    if (!root) return;
    // Hand the account areas to React (AccountMenu); their static Sign In links are the no-JS fallback.
    const desktop = root.querySelector('[data-account-slot]');
    const mobile = root.querySelector('[data-mobile-account-slot]');
    desktop.replaceChildren();
    mobile.replaceChildren();
    setSlots({ desktop, mobile });
  }, []);

  useEffect(() => {
    const root = document.querySelector('.site-header');
    if (!root) return;
    root.querySelectorAll('.nav-link.is-active, .nav-dropdown-trigger.is-active').forEach((el) => el.classList.remove('is-active'));
    root.querySelectorAll('.nav-dropdown-panel a[aria-current]').forEach((el) => el.removeAttribute('aria-current'));
    // The most specific link for the current path (e.g. /community/groups/… → Groups).
    const path = location.pathname.replace(/\.html$/, '') || '/';
    let best = null;
    root.querySelectorAll('.main-nav a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      const hit = href === path || (href !== '/' && path.startsWith(href + '/'));
      if (hit && (!best || href.length > best.getAttribute('href').length)) best = a;
    });
    if (!best) return;
    best.classList.add('is-active');
    if (best.closest('.nav-dropdown-panel')) best.setAttribute('aria-current', 'page');
    best.closest('.nav-dropdown')?.querySelector('.nav-dropdown-trigger')?.classList.add('is-active');
  }, [location.pathname]);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
      {slots ? createPortal(<AccountMenu />, slots.desktop) : null}
      {slots ? createPortal(<MobileAccount />, slots.mobile) : null}
    </>
  );
}
