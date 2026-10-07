/* ==========================================================================
   Sikhify — data/directoryVisuals.js
   How each directory section looks: icon, a Gurmukhi word set as artwork,
   accent tone, card layout and (only where one truly fits) a cover image.

   Cover images are real works that depict the section's own subject:
   Sri Harmandir Sahib for Gurdwaras and heritage, a museum painting of a
   Sikh personality for Personalities, the Gurus' museum artwork for the
   Ten Gurus and an illuminated manuscript for Books. Sections without a
   fitting image use a designed typographic tile — never a stock photo.
   Credits for every image are listed on /image-credits.
   ========================================================================== */
import { heroArt } from './heroArt.js';
import { guruArtwork } from './guruArtwork.js';

const harmandirPainting = heroArt('history');
const folio = heroArt('gurbani');
const guruNanak = guruArtwork('guru-nanak-dev-ji');

/** Photographs from Wikimedia Commons used as section covers (also listed in data/imageCredits.js). */
export const COMMONS_COVERS = {
  harmandir: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Hamandir_Sahib_%28Golden_Temple%29.jpg/1280px-Hamandir_Sahib_%28Golden_Temple%29.jpg',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Hamandir_Sahib_%28Golden_Temple%29.jpg/500px-Hamandir_Sahib_%28Golden_Temple%29.jpg',
    width: 1280, height: 853,
    alt: 'Sri Harmandir Sahib in the Amrit Sarovar, Amritsar',
    subject: 'Sri Harmandir Sahib (Golden Temple), Amritsar', author: 'Oleg Yunakov', license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hamandir_Sahib_(Golden_Temple).jpg',
  },
  nalwa: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Hari_Singh_Nalwa_british_museum.jpg',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Hari_Singh_Nalwa_british_museum.jpg/500px-Hari_Singh_Nalwa_british_museum.jpg',
    width: 1097, height: 1555,
    alt: 'Nineteenth-century painting of Hari Singh Nalwa seated in armour (National Army Museum, London)',
    subject: 'Hari Singh Nalwa — painting in the National Army Museum, London', author: 'Sir John McQueen', license: 'Public domain',
    url: 'https://commons.wikimedia.org/wiki/File:Hari_Singh_Nalwa_british_museum.jpg',
  },
};

const commons = (c) => ({ src: c.thumb, srcSet: `${c.thumb} 500w, ${c.src} ${c.width}w`, width: c.width, height: c.height, alt: c.alt });
const local = (a) => a && ({ src: a.fallbackSrc, sources: [{ type: 'image/webp', srcSet: a.webpSrcSet }], width: a.width, height: a.height, alt: a.alt });

/**
 * key → visual. `layout` picks the card design used for the section's records:
 * portrait · landscape · site (logo/identity) · book · event · news · kids.
 */
export const DIRECTORY_VISUALS = {
  gurdwara: { icon: 'pin', glyph: 'ਗੁਰਦੁਆਰੇ', tone: 'gold', image: commons(COMMONS_COVERS.harmandir) },
  heritage: { icon: 'history', glyph: 'ਵਿਰਸਾ', tone: 'gold', layout: 'landscape', image: local(harmandirPainting) },
  personality: { icon: 'user', glyph: 'ਸ਼ਖ਼ਸੀਅਤਾਂ', tone: 'navy', layout: 'portrait', image: commons(COMMONS_COVERS.nalwa) },
  gurus: { icon: 'book', glyph: 'ਦਸ ਗੁਰੂ', tone: 'navy', image: local(guruNanak) },
  kirtan: { icon: 'volume', glyph: 'ਕੀਰਤਨ', tone: 'navy' },
  event: { icon: 'calendar', glyph: 'ਸਮਾਗਮ', tone: 'saffron', layout: 'event' },
  organization: { icon: 'users', glyph: 'ਸੰਸਥਾਵਾਂ', tone: 'teal', layout: 'site' },
  news: { icon: 'message', glyph: 'ਖ਼ਬਰਾਂ', tone: 'slate', layout: 'news' },
  website: { icon: 'globe', glyph: 'ਵੈੱਬਸਾਈਟਾਂ', tone: 'teal', layout: 'site' },
  app: { icon: 'phone', glyph: 'ਐਪਸ', tone: 'slate', layout: 'site' },
  book: { icon: 'book', glyph: 'ਪੁਸਤਕਾਂ', tone: 'saffron', layout: 'book', image: local(folio) },
  kids: { icon: 'heart', glyph: 'ਬੱਚੇ', tone: 'kids', layout: 'kids' },
};

export const visualFor = (key) => DIRECTORY_VISUALS[key] || { icon: 'compass', glyph: 'ਸਿੱਖ', tone: 'gold' };

/** Short "what you'll find" lines for the hub cards (descriptions of the sections, not of records). */
export const SECTION_PITCH = {
  gurdwara: 'The Panj Takht and historic Gurdwaras across India — with photos, maps, directions and sources.',
  gurus: 'Biographies, timelines, teachings and Bani of the Ten Guru Sahibs.',
  kirtan: 'Hazoori Ragis, Raagi Jathas, Dhadi Jathas and Katha Vachaks with their videos.',
};

/**
 * A Wikimedia Commons thumbnail at another width (Commons serves standard steps only).
 * Other URLs are returned unchanged.
 */
export function commonsThumb(url, width) {
  if (!url || !/^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(url)) return url;
  return url.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`);
}
