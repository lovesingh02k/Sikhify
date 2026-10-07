/* ==========================================================================
   Sikhify — data/guruArtwork.js
   Historical artwork for the Ten Guru Sahibs. These are artistic depictions
   painted after the Gurus' lifetimes — not portraits from life
   and not photographs. Every work below is held by a museum, is in the public
   domain (age of the artwork), and was checked on Wikimedia Commons for its
   licence, holding institution and accession number (2 October 2026).

   Files are optimized copies in src/assets/images/gurus/ (WebP at several
   widths + one JPEG fallback), generated from the Commons originals.
   A Guru without artwork here falls back to a symbolic treatment (GuruEmblem).
   ========================================================================== */
import dimensions from '../assets/images/gurus/dimensions.json';

const urls = import.meta.glob('../assets/images/gurus/*.{webp,jpg}', { eager: true, query: '?url', import: 'default' });
const url = (file) => urls[`../assets/images/gurus/${file}`];

const RIETBERG = {
  institution: 'Museum Rietberg, Zurich',
  style: 'Pahari painting',
  date: 'c. 1830–1850',
  dateNote: 'Some scholars date this series to the early 18th century.',
};

/** id → provenance (ids match data/gurus.js) */
const WORKS = {
  'guru-nanak-dev-ji': { ...RIETBERG, subject: 'Sri Guru Nanak Dev Ji with Bhai Mardana Ji playing the rabab', commons: 'Painting_of_Guru_Nanak,_Pahari,_ca.1830–50.jpg' },
  'guru-angad-dev-ji': { ...RIETBERG, subject: 'Sri Guru Angad Dev Ji', commons: 'Painting_of_Guru_Angad,_Pahari,_ca.1830–50.jpg' },
  'guru-amar-das-ji': { ...RIETBERG, subject: 'Sri Guru Amar Das Ji', commons: 'Painting_of_Guru_Amar_Das,_Pahari,_ca.1830–50.jpg' },
  'guru-ram-das-ji': {
    institution: 'Government Museum and Art Gallery, Chandigarh', accession: 'F-42', style: 'Pahari painting, family workshop of Nainsukh of Guler', date: 'c. 1800',
    subject: 'Sri Guru Ram Das Ji seated, with an attendant holding a fly-whisk', commons: 'Guru_Ram_Das_miniature_painting.jpg',
  },
  'guru-arjan-dev-ji': { ...RIETBERG, subject: 'Sri Guru Arjan Dev Ji', commons: 'Painting_of_Guru_Arjan,_Pahari,_ca.1850.jpg' },
  'guru-hargobind-sahib-ji': { ...RIETBERG, subject: 'Sri Guru Hargobind Sahib Ji with a falcon', commons: 'Painting_of_Guru_Hargobind,_Pahari,_ca.1830–50.jpg' },
  'guru-har-rai-ji': { ...RIETBERG, subject: 'Sri Guru Har Rai Ji', commons: 'Painting_of_Guru_Har_Rai,_Pahari,_ca.1830–50.jpg' },
  'guru-har-krishan-ji': { ...RIETBERG, subject: 'Sri Guru Har Krishan Ji', commons: 'Painting_of_Guru_Har_Krishan,_Pahari,_ca.1830–50.jpg' },
  'guru-tegh-bahadur-ji': {
    institution: 'Government Museum and Art Gallery, Chandigarh', accession: '2678', style: 'Pahari painting, gouache on paper', date: '18th or 19th century',
    subject: 'Sri Guru Tegh Bahadur Ji', commons: 'Guru_Tegh_Bahadur,_Pahari_painting.png',
  },
  'guru-gobind-singh-ji': {
    institution: 'Victoria Memorial Hall, Kolkata', accession: 'C-784', style: 'Miniature painting, probably Pahari (Guler)', date: 'c. 1800',
    subject: 'Sri Guru Gobind Singh Ji on horseback, with an attendant holding a parasol', commons: 'Equestrian_miniature_painting_of_Guru_Gobind_Singh_on_horseback_with_a_parasol_attendant,_bearing_a_Perso-Arabic_inscription_at_the_top_margin.jpg',
  },
};

export const LICENSE = 'Public domain';

/** Artwork for a Guru id, or null (→ symbolic fallback). */
export function guruArtwork(id) {
  const w = WORKS[id];
  const d = dimensions[id];
  if (!w || !d) return null;
  const webp = d.widths.map((width) => `${url(`${id}-${width}.webp`)} ${width}w`).join(', ');
  return {
    ...w,
    id,
    license: LICENSE,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${w.commons}`,
    width: d.width,
    height: d.height,
    webpSrcSet: webp,
    fallbackSrc: url(`${id}-${d.fallback}.jpg`),
    alt: `${w.style} (${w.date}, ${w.institution}): a historical artistic depiction of ${w.subject}`,
    credit: `${w.style}, ${w.date}. ${w.institution}${w.accession ? `, acc. no. ${w.accession}` : ''}. ${LICENSE}, via Wikimedia Commons.`,
  };
}

export const GURU_ARTWORK_IDS = Object.keys(WORKS);
