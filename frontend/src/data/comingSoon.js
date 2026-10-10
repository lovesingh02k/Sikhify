/* ==========================================================================
   Sikhify.in — data/comingSoon.js
   Sections that appear in the navigation but have not been built yet.
   Each gets an honest Coming Soon page at its route (see App.jsx), so no link
   on the site leads to a dead end. Descriptions reuse the site's own copy and
   make no promises about dates or features.

   When a section is built: give it a real route in app/App.jsx, remove it here,
   and drop its "Soon" tag from the header/footer/home markup.
   `retired: true` — removed from the navigation, footer and sitemap; the old URL
   still answers with this page so bookmarks don't break.
   (Community, Events, Books, Kids and Sign In have been built and removed.)
   ========================================================================== */

export const COMING_SOON = [
  {
    path: '/sikh-store', title: 'Sikh Store', eyebrow: 'Store',
    description: 'Authentic Sikh products — such as Kara, Gutka Sahib and Khanda pendants — will be available here.',
    related: ['/gurbani', '/nitnem', '/learn-sikhism'],
  },
  {
    path: '/blog', title: 'Blog', eyebrow: 'Media',
    description: 'Articles on Sikhism, lifestyle, spirituality, history and more.',
    related: ['/learn-sikhism', '/sikh-history', '/sikh-media'],
  },
  {
    path: '/volunteer', title: 'Volunteers', eyebrow: 'Community', retired: true,
    description: 'Ways to offer Seva and help spread the Guru’s teachings with Sikhify.',
    related: ['/learn-sikhism', '/rehat-maryada', '/faq'],
  },
  {
    path: '/seva', title: 'Seva Opportunities', eyebrow: 'Community', retired: true,
    description: 'Opportunities for selfless service with the Sangat.',
    related: ['/learn-sikhism', '/rehat-maryada', '/faq'],
  },
  {
    path: '/downloads', title: 'Downloads', eyebrow: 'Resources', retired: true,
    description: 'Free resources — wallpapers, books, calendars and materials for children.',
    related: ['/gurbani', '/nitnem', '/learn-sikhism'],
  },
  {
    path: '/wallpapers', title: 'Wallpapers', eyebrow: 'Resources', retired: true,
    description: 'Gurbani and Sikh heritage wallpapers for your devices.',
    related: ['/gurbani', '/hukamnama', '/sikh-history'],
  },
  {
    path: '/children-resources', title: 'Children Resources', eyebrow: 'Resources',
    description: 'Learning materials and activities for Sikh children.',
    related: ['/learn-sikhism', '/sikh-history', '/faq'],
  },
  {
    path: '/contact', title: 'Contact Us', eyebrow: 'Support',
    description: 'A way to reach the Sikhify team directly.',
    related: ['/faq', '/learn-sikhism', '/sitemap'],
  },
  {
    path: '/donate', title: 'Donate', eyebrow: 'Support',
    description: 'A way to support Sikhify’s work.',
    related: ['/learn-sikhism', '/gurbani', '/faq'],
  },
];
