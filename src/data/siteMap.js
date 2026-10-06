/* ==========================================================================
   Sikhify.in — data/siteMap.js
   The pages that exist today, grouped as in the main navigation.
   Used by the Sitemap page and as "available now" links on Coming Soon pages.
   ========================================================================== */

export const SITE_SECTIONS = [
  {
    title: 'Start here',
    links: [
      { href: '/', title: 'Home', text: "Today's Hukamnama, quick links and highlights." },
    ],
  },
  {
    title: 'Learn',
    links: [
      { href: '/learn-sikhism', title: 'Learn Sikhism', text: 'Core beliefs, the Ten Gurus, concepts, practices and the Five Ks.' },
      { href: '/sikh-history', title: 'Sikh History', text: 'An interactive timeline from 1469 to the present day.' },
      { href: '/rehat-maryada', title: 'Rehat Maryada', text: 'A plain-language guide to the Sikh code of conduct.' },
      { href: '/faq', title: 'FAQ', text: 'Clear answers to the questions people ask most often.' },
      { href: '/gurus', title: 'The Ten Gurus', text: 'Profiles of the Ten Gurus: biography, timeline, teachings and Bani.' },
      { href: '/kids', title: 'Kids — Learn Sikhi', text: 'Stories, Sakhis, values and Gurmukhi for children.' },
    ],
  },
  {
    title: 'Gurbani',
    links: [
      { href: '/gurbani', title: 'Gurbani Library', text: 'Shabads, Banis, Raags and any Ang, with meanings.' },
      { href: '/nitnem', title: 'Nitnem', text: 'The daily Banis with a daily checklist.' },
      { href: '/hukamnama', title: 'Daily Hukamnama', text: 'The Guru’s order for the day from Sri Harmandir Sahib.' },
    ],
  },
  {
    title: 'Media',
    links: [
      { href: '/sikh-media', title: 'Kirtan & Katha', text: 'Ragis, Katha Vachaks and Dhadi Jathas — videos play on Sikhify.' },
    ],
  },
  {
    title: 'Directory',
    links: [
      { href: '/directory', title: 'Sikh Directory', text: 'Every directory section, verified and sourced.' },
      { href: '/directory/gurdwaras', title: 'Global Gurdwara Directory', text: 'Search Gurdwaras by country, state and city, or find the nearest ones.' },
      { href: '/personalities', title: 'Sikh Personalities', text: 'Historical figures, Shaheeds, scholars and more.' },
      { href: '/organizations', title: 'Organizations', text: 'Sikh institutions and community organizations.' },
      { href: '/websites', title: 'Sikh Websites', text: 'Useful Sikh websites.' },
      { href: '/apps', title: 'Sikh Apps', text: 'Apps for Gurbani, Nitnem and learning.' },
      { href: '/books', title: 'Books & Research', text: 'Books and research, linked to legitimate sources.' },
      { href: '/heritage', title: 'Sikh Heritage', text: 'Historical Gurdwaras, forts, museums and monuments.' },
    ],
  },
  {
    title: 'Community',
    links: [
      { href: '/community', title: 'Community', text: 'Share with the Sangat, comment and react.' },
      { href: '/community/groups', title: 'Groups', text: 'Seva, Gurmat study, youth and local Sangat groups.' },
      { href: '/events', title: 'Events', text: 'Gurpurabs, Nagar Kirtans, Samagams and more.' },
      { href: '/news', title: 'News', text: 'Sourced community and institutional news.' },
      { href: '/submit', title: 'Submit / Update Information', text: 'Add or correct information — every submission is reviewed.' },
    ],
  },
];

export const PAGES = Object.fromEntries(SITE_SECTIONS.flatMap((s) => s.links).map((l) => [l.href, l]));
