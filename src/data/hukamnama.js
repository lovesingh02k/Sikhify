/* ==========================================================================
   Sikhify.in — data/hukamnama.js
   Sources for the daily Hukamnama. Text is loaded live from BaniDB; audio is
   the official recording published daily by the SGPC.
   ========================================================================== */
window.SikhifyData = window.SikhifyData || {};

window.SikhifyData.hukamnama = {
  api: "https://api.banidb.com/v2/hukamnamas",
  /** Earliest date the archive is offered for (BaniDB and SGPC audio both cover it). */
  archiveStart: "2025-01-01",
  /** SGPC daily audio; {d} is the date as DDMMYY. */
  audio: {
    hukamnama: "https://hs.sgpc.net/hukamnamaaudio/SGPCNET{d}.mp3",
    katha: "https://hs.sgpc.net/kathaaudio/katha{d}.mp3",
  },
  officialUrl: "https://hs.sgpc.net/",
  steps: [
    { title: "Ardas", text: "The Sangat stands for Ardas, humbly asking the Guru for guidance." },
    { title: "Opening the Guru Granth Sahib Ji", text: "The Granthi opens the Sri Guru Granth Sahib Ji at random, with reverence." },
    { title: "Reading the shabad", text: "The first shabad on the left-hand Ang is read in full, going back to its start if it began on the previous Ang." },
    { title: "The Guru's order", text: "That shabad is the Hukamnama — the Guru's guidance for the Sangat that day." },
  ],
};


export const hukamnama = window.SikhifyData.hukamnama;
export default window.SikhifyData.hukamnama;
