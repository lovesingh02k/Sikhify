/* ==========================================================================
   Sikhify.in — data/faq.js
   Frequently asked questions. Explanatory answers in plain language.
   ========================================================================== */
window.SikhifyData = window.SikhifyData || {};

window.SikhifyData.faqCategories = ["Basics", "Gurbani", "Practices", "Gurdwara", "History", "Five Ks", "Sikh ceremonies", "General questions"];

window.SikhifyData.faq = [
  // Basics
  { id: "what-is-sikhism", category: "Basics", q: "What is Sikhism?", a: "Sikhism is a monotheistic faith founded by Guru Nanak Dev Ji in 15th-century Punjab. It teaches belief in One Creator, the equality of all people, honest living, sharing with others and remembering God through meditation and service." },
  { id: "meaning-of-sikh", category: "Basics", q: "What does the word “Sikh” mean?", a: "“Sikh” means a learner or disciple — someone who is always learning from the Guru." },
  { id: "god-in-sikhism", category: "Basics", q: "What do Sikhs believe about God?", a: "Sikhs believe in One Creator (Ik Onkar) who is formless, timeless, without fear or enmity and present throughout creation. God is most commonly called Waheguru.", link: { label: "Lesson: One Creator", href: "/learn-sikhism#topic=one-creator" } },
  { id: "three-pillars", category: "Basics", q: "What are the three pillars of Sikhi?", a: "Naam Japna (remembering the Creator), Kirat Karni (earning honestly) and Vand Chhakna (sharing with others).", link: { label: "Lesson: Naam Japna", href: "/learn-sikhism#topic=naam-japna" } },
  { id: "afterlife", category: "Basics", q: "What do Sikhs believe about life after death?", a: "Sikhs believe in the cycle of birth and death shaped by one's actions and the Creator's grace. The aim of life is union with the Creator — liberation (mukti) — achieved by living a truthful, God-conscious life here and now." },

  // Gurbani
  { id: "who-is-the-guru", category: "Gurbani", q: "Who is the Guru of the Sikhs today?", a: "Since 1708 the Sri Guru Granth Sahib Ji has been the eternal, living Guru of the Sikhs, as declared by Guru Gobind Singh Ji." },
  { id: "what-is-gurbani", category: "Gurbani", q: "What is Gurbani?", a: "Gurbani means “the Guru's word” — the hymns contained in the Sri Guru Granth Sahib Ji, and also the compositions of Guru Gobind Singh Ji recited in Nitnem.", link: { label: "Open the Gurbani Library", href: "/gurbani" } },
  { id: "granth-structure", category: "Gurbani", q: "How is the Sri Guru Granth Sahib Ji organised?", a: "Its 1430 Angs (pages) open with Japji Sahib and other daily Banis, after which most hymns are arranged by Raag (musical measure), and within each Raag by author." },
  { id: "what-is-hukamnama", category: "Gurbani", q: "What is a Hukamnama?", a: "A Hukamnama is the Guru's order for the day: a shabad read from the Sri Guru Granth Sahib Ji opened at random. The daily Hukamnama from Sri Harmandir Sahib, Amritsar, is shared worldwide.", link: { label: "Read today's Hukamnama", href: "/hukamnama" } },
  { id: "what-is-mool-mantar", category: "Gurbani", q: "What is the Mool Mantar?", a: "The Mool Mantar is the opening verse of the Sri Guru Granth Sahib Ji, describing the nature of the Creator. It begins with Ik Onkar.", link: { label: "Read Japji Sahib", href: "/nitnem#bani=japji-sahib" } },

  // Practices
  { id: "what-is-nitnem", category: "Practices", q: "What is Nitnem?", a: "Nitnem is the set of daily prayers: Japji Sahib, Jaap Sahib and Tav-Prasad Savaiye in the morning (many also recite Benti Chaupai and Anand Sahib), Rehras Sahib in the evening and Sohila Sahib at night.", link: { label: "Open Nitnem", href: "/nitnem" } },
  { id: "vegetarian", category: "Practices", q: "Are Sikhs vegetarian?", a: "The Langar in Gurdwaras is always vegetarian so that everyone can eat together. The Rehat Maryada forbids initiated Sikhs from eating kutha meat; many Sikhs choose to be fully vegetarian." },
  { id: "greeting", category: "Practices", q: "How do Sikhs greet each other?", a: "“Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh” — the Khalsa belongs to Waheguru, and victory belongs to Waheguru. “Sat Sri Akal” is also widely used." },
  { id: "dasvandh", category: "Practices", q: "What is Dasvandh?", a: "Dasvandh is the practice of giving a tenth of one's earnings for community and charitable work, as an expression of Vand Chhakna." },

  // Gurdwara
  { id: "visit-gurdwara", category: "Gurdwara", q: "Can anyone visit a Gurdwara?", a: "Yes. Gurdwaras are open to everyone. Visitors cover their heads, remove their shoes and do not bring tobacco or alcohol inside.", link: { label: "Gurdwara etiquette", href: "/learn-sikhism#topic=gurdwara-etiquette" } },
  { id: "what-is-langar", category: "Gurdwara", q: "What is Langar?", a: "Langar is the free community kitchen in every Gurdwara, where volunteers serve vegetarian food to everyone, who sit together as equals." },
  { id: "gurdwara-service", category: "Gurdwara", q: "What happens during a Gurdwara service?", a: "A service usually includes Kirtan, Katha (explanation of Gurbani), Ardas, the Hukamnama and the distribution of Karah Parshad, followed by Langar." },
  { id: "karah-parshad", category: "Gurdwara", q: "What is Karah Parshad?", a: "Karah Parshad is a sanctified sweet offering made of wheat flour, butter and sugar, given to everyone in equal measure at the end of a service." },

  // History
  { id: "how-many-gurus", category: "History", q: "How many Gurus were there?", a: "There were ten human Gurus, from Guru Nanak Dev Ji to Guru Gobind Singh Ji, followed by the Sri Guru Granth Sahib Ji as the eternal Guru.", link: { label: "Meet the Ten Gurus", href: "/learn-sikhism#filter=Gurus" } },
  { id: "what-is-khalsa", category: "History", q: "What is the Khalsa?", a: "The Khalsa is the collective body of initiated Sikhs, created by Guru Gobind Singh Ji on Vaisakhi 1699 at Anandpur Sahib.", link: { label: "1699 on the timeline", href: "/sikh-history#event=1699-khalsa" } },
  { id: "golden-temple", category: "History", q: "What is the Golden Temple?", a: "Sri Harmandir Sahib in Amritsar, built under Guru Arjan Dev Ji, is the most revered Gurdwara. Its gold covering was sponsored by Maharaja Ranjit Singh in the nineteenth century.", link: { label: "History of Sri Harmandir Sahib", href: "/sikh-history#event=1604-adi-granth" } },
  { id: "vaisakhi", category: "History", q: "Why is Vaisakhi important to Sikhs?", a: "Vaisakhi marks the creation of the Khalsa in 1699, and is also a harvest festival in Punjab." },

  // Five Ks
  { id: "five-ks", category: "Five Ks", q: "What are the Five Ks?", a: "Kesh (uncut hair), Kangha (wooden comb), Kara (steel bracelet), Kachera (cotton undergarment) and Kirpan (article of faith in the form of a sword).", link: { label: "Lesson: The Five Ks", href: "/learn-sikhism#topic=five-ks-overview" } },
  { id: "why-turban", category: "Five Ks", q: "Why do Sikhs wear a turban?", a: "The Dastar (turban) covers and honours the uncut hair (Kesh). It is a mark of Sikh identity, commitment and the responsibility to stand up for others." },
  { id: "kirpan-weapon", category: "Five Ks", q: "Is the Kirpan a weapon?", a: "The Kirpan is an article of faith, not a weapon of aggression. It represents the duty to protect the weak and stand against injustice.", link: { label: "Lesson: Kirpan", href: "/learn-sikhism#topic=kirpan" } },
  { id: "why-kara", category: "Five Ks", q: "Why do Sikhs wear a Kara?", a: "The Kara is a steel bracelet whose unbroken circle reminds a Sikh of the eternal Creator and of the bond with the Guru — and to act rightly.", link: { label: "Lesson: Kara", href: "/learn-sikhism#topic=kara" } },

  // Sikh ceremonies
  { id: "anand-karaj", category: "Sikh ceremonies", q: "What is Anand Karaj?", a: "Anand Karaj is the Sikh marriage ceremony, solemnised before the Sri Guru Granth Sahib Ji with the four Laavan of Guru Ram Das Ji.", link: { label: "Anand Karaj in the Rehat Maryada", href: "/rehat-maryada#anand-karaj" } },
  { id: "amrit-who", category: "Sikh ceremonies", q: "What is Amrit and who can take it?", a: "Amrit Sanchar is the Sikh initiation ceremony conducted by the Panj Pyare. Anyone who is ready to commit to the Sikh code of conduct may take Amrit.", link: { label: "Amrit Sanchar", href: "/rehat-maryada#amrit-sanchar" } },
  { id: "naming", category: "Sikh ceremonies", q: "How are Sikh children named?", a: "In the Naam Karan ceremony a Hukamnama is taken and the child's name begins with the first letter of that shabad." },
  { id: "funeral", category: "Sikh ceremonies", q: "What happens at a Sikh funeral?", a: "The body is cremated, Kirtan Sohila is recited and Ardas is offered. Death is accepted as part of the Creator's Hukam.", link: { label: "Antam Sanskar", href: "/rehat-maryada#antam-sanskar" } },

  // General
  { id: "singh-kaur", category: "General questions", q: "Why are Sikh names Singh and Kaur?", a: "Guru Gobind Singh Ji gave Sikh men the name Singh (lion) and Sikh women the name Kaur (princess), replacing caste-based surnames with a shared identity." },
  { id: "women-turbans", category: "General questions", q: "Do Sikh women wear turbans?", a: "Many do; others cover their hair with a chunni (scarf). Sikh teachings affirm the equal spiritual standing of women and men." },
  { id: "convert", category: "General questions", q: "Can anyone become a Sikh?", a: "Yes. Sikhi is open to anyone who accepts the Gurus' teachings. Sikhs do not seek to convert others, but anyone sincerely drawn to the Guru's path is welcome." },
];


export const faq = window.SikhifyData.faq;
export const faqCategories = window.SikhifyData.faqCategories;
export default window.SikhifyData.faq;
