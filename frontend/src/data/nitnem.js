/* ==========================================================================
   Sikhify.in — data/nitnem.js
   Nitnem schedule. Bani details (name, audio, opening lines) live in
   data/gurbani.js (banis with nitnem: true); the full text is in data/nitnem-text.js.
   ========================================================================== */
window.SikhifyData = window.SikhifyData || {};

window.SikhifyData.nitnem = {
  times: [
    { id: "morning", label: "Morning", sub: "Amrit Vela", banis: ["japji-sahib", "jaap-sahib", "tav-prasad-savaiye", "benti-chaupai", "anand-sahib"] },
    { id: "evening", label: "Evening", sub: "At sunset", banis: ["rehras-sahib"] },
    { id: "night", label: "Night", sub: "Before sleep", banis: ["sohila-sahib"] },
  ],
  note:
    "The Sikh Rehat Maryada lists Japji Sahib, Jaap Sahib and Tav-Prasad Savaiye for the morning, Rehras Sahib in the evening and Sohila Sahib at night. Benti Chaupai and Anand Sahib are recited at Amrit Sanchar and many Sikhs include them every morning.",
};


export const nitnem = window.SikhifyData.nitnem;
export default window.SikhifyData.nitnem;
