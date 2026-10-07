/* ==========================================================================
   Sikhify — data/imageCredits.js
   Sources and licences for every photograph on the site (the Guru artwork is
   listed from data/guruArtwork.js). Photographers are as recorded when the
   photos were chosen; "credited on Pexels" means the name wasn't recorded —
   the linked Pexels page shows it.
   ========================================================================== */
const PEXELS = { license: 'Pexels License (free to use)', licenseUrl: 'https://www.pexels.com/license/' };

export const PHOTO_CREDITS = [
  { use: 'Homepage hero', subject: 'Sri Harmandir Sahib reflected in the sacred pool at dusk, Amritsar', author: 'Henlynn', url: 'https://www.pexels.com/photo/the-golden-temple-7433983/', ...PEXELS },
  { use: 'Homepage — Gurbani Library card', subject: 'Open book in warm light', author: 'Arun Thomas', url: 'https://www.pexels.com/photo/journal-book-1156683/', ...PEXELS },
  { use: 'Homepage — Sikh History card', subject: 'Elder Sikh man in a turban', author: 'Avneet Kaur', url: 'https://www.pexels.com/photo/man-in-turban-and-with-gray-beard-25578443/', ...PEXELS },
  { use: 'Homepage — Kids card', subject: 'A child having a turban tied', author: 'World Sikh Organization of Canada', url: 'https://www.pexels.com/photo/a-person-putting-an-orange-head-turban-on-a-child-14797819/', ...PEXELS },
  { use: 'Homepage — Sikh Media card', subject: 'Studio microphone', author: 'Reel Focus Productions', url: 'https://www.pexels.com/photo/podcast-microphone-27616685/', ...PEXELS },
  { use: 'Homepage — Blog card', subject: 'Pen on an open notebook', author: 'Negative Space', url: 'https://www.pexels.com/photo/coffee-notebook-pen-writing-34587/', ...PEXELS },
  { use: 'Homepage — Sikh Store preview', subject: 'Steel bracelet (Kara)', author: 'credited on Pexels', url: 'https://www.pexels.com/photo/16461255/', ...PEXELS },
  { use: 'Homepage — Sikh Store preview', subject: 'Leather-bound book', author: 'Jess Bailey Designs', url: 'https://www.pexels.com/photo/1018133/', ...PEXELS },
  { use: 'Homepage — Sikh Store preview', subject: 'Pendant necklace', author: 'monicore', url: 'https://www.pexels.com/photo/135486/', ...PEXELS },
];

/* Directory section covers (data/directoryVisuals.js) — Wikimedia Commons. */
PHOTO_CREDITS.push(
  { use: 'Directory — hub header and Gurdwara Directory cover', subject: 'Sri Harmandir Sahib (Golden Temple), Amritsar', author: 'Oleg Yunakov', url: 'https://commons.wikimedia.org/wiki/File:Hamandir_Sahib_(Golden_Temple).jpg', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  { use: 'Directory — Sikh Personalities cover', subject: 'Hari Singh Nalwa — painting in the National Army Museum, London', author: 'Sir John McQueen', url: 'https://commons.wikimedia.org/wiki/File:Hari_Singh_Nalwa_british_museum.jpg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File:Hari_Singh_Nalwa_british_museum.jpg' },
);

export const OTHER_CREDITS = [
  { use: 'Gurdwara and directory record photos', text: 'Shown on each record’s own page with the photographer or artist, the licence and a link to its Wikimedia Commons file page.' },
  { use: 'Video thumbnails and the video player', text: 'Served by YouTube for each video in Sikhify Media; videos play through YouTube’s embedded player and remain on YouTube.' },
];
