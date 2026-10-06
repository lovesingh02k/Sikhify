/* ==========================================================================
   Sikhify.in — data/i18n/pa.js
   Punjabi (Gurmukhi) translations of Sikhify's informational content, loaded on demand
   by S.i18n (controllers/coreController.js) when the visitor chooses this language.
   Shapes mirror the English data files; anything missing falls back to English.
   ========================================================================== */
import gurus from './pa/gurus.js';
import learn, { learnSections } from './pa/learn.js';
import { history, historyFigures, sikhEmpire } from './pa/history.js';
import faq from './pa/faq.js';
import rehat from './pa/rehat.js';
import { text, ordinals, hukamnamaSteps, nitnemNote } from './pa/text.js';

export default {
  text,
  ordinals,
  gurus,
  learn,
  learnSections,
  history,
  historyFigures,
  sikhEmpire,
  faq,
  rehatOfficial: rehat.official,
  rehatSections: rehat.sections,
  hukamnamaSteps,
  nitnemNote,
};
