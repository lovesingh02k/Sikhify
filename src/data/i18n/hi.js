/* ==========================================================================
   Sikhify.in — data/i18n/hi.js
   Hindi translations of Sikhify's informational content, loaded on demand
   by S.i18n (controllers/coreController.js) when the visitor chooses this language.
   Shapes mirror the English data files; anything missing falls back to English.
   ========================================================================== */
import gurus from './hi/gurus.js';
import learn, { learnSections } from './hi/learn.js';
import { history, historyFigures, sikhEmpire } from './hi/history.js';
import faq from './hi/faq.js';
import rehat from './hi/rehat.js';
import { text, ordinals, hukamnamaSteps, nitnemNote } from './hi/text.js';

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
