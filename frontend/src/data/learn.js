/* ==========================================================================
   Sikhify.in — data/learn.js
   Learn Sikhism lessons. Explanatory educational content (not scripture).
   Lessons for the Ten Gurus are generated at runtime from data/gurus.js.

   Lesson shape:
   { id, title, gurmukhi?, category, tags[], summary,
     sections: [{ heading, paragraphs?: [], list?: [] }], related?: [ids] }
   ========================================================================== */
window.SikhifyData = window.SikhifyData || {};

window.SikhifyData.learnCategories = ["Basics", "Gurus", "Concepts", "Practices", "Five Ks", "Sikh History"];

window.SikhifyData.learn = [
  /* ---------------- Basics ---------------- */
  {
    id: "what-is-sikhism",
    title: "What is Sikhism?",
    category: "Basics",
    tags: ["Basics"],
    summary: "An introduction to Sikhi — its origins, its Gurus and its scripture.",
    sections: [
      {
        heading: "Origins",
        paragraphs: [
          "Sikhism (Sikhi) began in the Punjab region of South Asia with Guru Nanak Dev Ji (1469–1539) and was shaped over two centuries by the ten Gurus. Today it is one of the world's major religions, with an estimated 25–30 million followers worldwide.",
          "The word “Sikh” means learner or disciple. A Sikh is a lifelong student of the Guru's teachings.",
        ],
      },
      {
        heading: "The Guru today",
        paragraphs: [
          "Since 1708 the eternal Guru of the Sikhs has been the Sri Guru Granth Sahib Ji, which contains the words of six of the Gurus alongside saints from different faiths and social backgrounds.",
        ],
      },
      {
        heading: "In daily life",
        list: [
          "Remembering the Creator (Naam Japna)",
          "Earning honestly (Kirat Karni)",
          "Sharing with others (Vand Chhakna)",
          "Serving without expectation (Seva)",
          "Treating every person as equal",
        ],
      },
    ],
    related: ["core-beliefs", "one-creator", "guru-nanak-dev-ji"],
  },
  {
    id: "core-beliefs",
    title: "Core beliefs",
    category: "Basics",
    tags: ["Basics"],
    summary: "The central beliefs that shape Sikh life.",
    sections: [
      {
        heading: "What Sikhs believe",
        list: [
          "There is One Creator, present in all of creation",
          "The Ten Gurus carried one divine light and message",
          "The Sri Guru Granth Sahib Ji is the eternal Guru",
          "All human beings are equal, whatever their caste, gender or background",
          "Liberation is found through remembrance, truthful living and grace — not through ritual",
        ],
      },
      {
        heading: "What Sikhi rejects",
        paragraphs: [
          "The Gurus taught against caste discrimination, idol worship, superstition and empty ritual, and against renouncing the world. A Sikh lives as a householder, engaged with family and society.",
        ],
      },
    ],
    related: ["what-is-sikhism", "equality", "ik-onkar"],
  },
  {
    id: "one-creator",
    title: "One God, One Creator",
    gurmukhi: "ੴ",
    category: "Basics",
    tags: ["Basics"],
    summary: "Sikhi teaches belief in one Creator, beyond form, time and fear.",
    sections: [
      {
        heading: "The Creator in Sikhi",
        paragraphs: [
          "The Sri Guru Granth Sahib Ji opens with the Mool Mantar, which describes the Creator as one, eternal truth, the creator of all, without fear or enmity, timeless, beyond birth and self-existent, realised through the Guru's grace.",
          "God is not limited to any one religion or place. The Creator is both beyond creation and present within it — within every person.",
        ],
      },
      {
        heading: "Names for God",
        paragraphs: ["Sikhs most often use “Waheguru” (Wondrous Enlightener). Gurbani also uses many names drawn from different traditions, such as Ram, Hari, Gobind and Allah, all pointing to the same One."],
      },
    ],
    related: ["ik-onkar", "naam", "hukam"],
  },
  {
    id: "equality",
    title: "Equality",
    category: "Basics",
    tags: ["Basics", "Concepts"],
    summary: "Every person carries the same divine light, so no one is high or low by birth.",
    sections: [
      {
        heading: "Equality in practice",
        list: [
          "In the Langar everyone sits together on the floor and eats the same food",
          "The Gurdwara is open to people of every faith and background",
          "Women and men have equal standing in religious life",
          "The names Singh and Kaur removed caste-based surnames",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "At a time of rigid caste divisions, the Gurus built institutions that made equality visible. The Guru Granth Sahib Ji itself includes the words of saints from so-called “low” castes and from Muslim backgrounds.",
        ],
      },
    ],
    related: ["pangat", "sangat", "guru-amar-das-ji"],
  },
  {
    id: "naam-japna",
    title: "Naam Japna",
    gurmukhi: "ਨਾਮ ਜਪਣਾ",
    category: "Basics",
    tags: ["Basics"],
    summary: "The first of the three pillars: keeping the Creator in constant remembrance.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Naam Japna means remembering and meditating on the Creator's Name — through recitation of Gurbani, Kirtan and quiet meditation on Waheguru — until remembrance becomes part of every moment.",
        ],
      },
      { heading: "How Sikhs practise it", list: ["Daily Nitnem", "Simran (meditation) on Waheguru", "Singing and listening to Kirtan", "Keeping the Creator in mind during work and rest"] },
    ],
    related: ["naam", "simran", "nitnem"],
  },
  {
    id: "kirat-karni",
    title: "Kirat Karni — honest living",
    gurmukhi: "ਕਿਰਤ ਕਰਨੀ",
    category: "Basics",
    tags: ["Basics"],
    summary: "The second pillar: earning a living honestly through one's own effort.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Kirat Karni means working hard and earning truthfully, without cheating or exploiting others. Guru Nanak Dev Ji himself farmed at Kartarpur, showing that spiritual life and honest work go together.",
        ],
      },
      { heading: "In practice", list: ["Honest work of any kind is honourable", "Avoid deceit, bribery and exploitation", "Live as a householder rather than renouncing the world"] },
    ],
    related: ["vand-chhakna", "naam-japna"],
  },
  {
    id: "vand-chhakna",
    title: "Vand Chhakna — sharing with others",
    gurmukhi: "ਵੰਡ ਛਕਣਾ",
    category: "Basics",
    tags: ["Basics"],
    summary: "The third pillar: sharing one's earnings and blessings with others.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Vand Chhakna means sharing what one has — food, time and wealth — especially with those in need. Many Sikhs give Dasvandh, a tenth of their earnings, for community and charitable work.",
        ],
      },
      { heading: "In practice", list: ["Contributing to the Langar", "Giving Dasvandh", "Helping anyone in need, regardless of background"] },
    ],
    related: ["langar", "seva", "kirat-karni"],
  },

  /* ---------------- Concepts ---------------- */
  {
    id: "ik-onkar",
    title: "Ik Onkar",
    gurmukhi: "ੴ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "“There is One Creator” — the first words of the Sri Guru Granth Sahib Ji.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "ੴ (Ik Onkar) combines the numeral one (੧) with Oankar, the Creator who is present throughout creation. It is the opening of the Mool Mantar and of the Guru Granth Sahib Ji.",
          "Ik Onkar expresses the oneness of the Creator and of creation: the same light is present in every being.",
        ],
      },
    ],
    related: ["one-creator", "hukam"],
  },
  {
    id: "naam",
    title: "Naam",
    gurmukhi: "ਨਾਮ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "The divine presence that pervades creation, and remembrance of it.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Naam, literally “Name”, refers to the Creator's presence that sustains all things. To be attuned to Naam is to live in awareness of the Creator. Gurbani describes Naam as the source of peace and the remedy for ego.",
        ],
      },
    ],
    related: ["naam-japna", "simran"],
  },
  {
    id: "seva",
    title: "Seva",
    gurmukhi: "ਸੇਵਾ",
    category: "Concepts",
    tags: ["Concepts", "Practices"],
    summary: "Selfless service performed without expectation of reward.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: ["Seva is service offered humbly, for others and for the Guru, without seeking praise or reward. It helps a Sikh overcome ego (haumai)."],
      },
      { heading: "Forms of Seva", list: ["Cooking and serving in the Langar", "Cleaning the Gurdwara and looking after shoes", "Helping in disasters and emergencies", "Sharing skills and time with the community"] },
    ],
    related: ["langar", "vand-chhakna"],
  },
  {
    id: "simran",
    title: "Simran",
    gurmukhi: "ਸਿਮਰਨ",
    category: "Concepts",
    tags: ["Concepts", "Practices"],
    summary: "Meditative remembrance of the Creator.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: ["Simran is focused, loving remembrance of the Creator — often by repeating “Waheguru” — so that the mind becomes still and attuned to Naam."],
      },
      { heading: "In practice", list: ["Simran at Amrit Vela (early morning)", "Collective Simran in the Sangat", "Remembering Waheguru throughout the day"] },
    ],
    related: ["naam", "naam-japna"],
  },
  {
    id: "sangat",
    title: "Sangat",
    gurmukhi: "ਸੰਗਤ",
    category: "Concepts",
    tags: ["Concepts", "Practices"],
    summary: "The holy congregation — gathering together in the Guru's presence.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: ["Sangat is the community that gathers to sing, listen to and reflect on Gurbani. Gurbani praises the company of the holy (Sadh Sangat) as a place where the mind is uplifted."],
      },
      { heading: "In practice", list: ["Attending the Gurdwara with family and friends", "Joining Kirtan and Katha", "Supporting one another in Seva"] },
    ],
    related: ["pangat", "kirtan"],
  },
  {
    id: "pangat",
    title: "Pangat",
    gurmukhi: "ਪੰਗਤ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "Sitting in a row to eat together as equals in the Langar.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Pangat means sitting together in rows to share food. Guru Amar Das Ji asked that all visitors first sit together in the Langar before meeting the Guru, so that no distinction of status or caste remained.",
        ],
      },
    ],
    related: ["langar", "equality"],
  },
  {
    id: "hukam",
    title: "Hukam",
    gurmukhi: "ਹੁਕਮ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "The Divine Order that governs all creation.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: [
          "Hukam is the Creator's will and order, through which everything comes into being. Japji Sahib teaches that by understanding and walking in Hukam, the wall of ego falls away.",
          "Accepting Hukam is not passivity: Sikhs act with effort and courage, while accepting outcomes with humility.",
        ],
      },
    ],
    related: ["ik-onkar", "chardi-kala"],
  },
  {
    id: "chardi-kala",
    title: "Chardi Kala",
    gurmukhi: "ਚੜ੍ਹਦੀ ਕਲਾ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "Ever-rising spirits — optimism and resilience in every circumstance.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: ["Chardi Kala describes a spirit of eternal optimism rooted in faith. Sikh history is full of examples of people who remained in Chardi Kala through great suffering."],
      },
    ],
    related: ["hukam", "sarbat-da-bhala"],
  },
  {
    id: "sarbat-da-bhala",
    title: "Sarbat da Bhala",
    gurmukhi: "ਸਰਬੱਤ ਦਾ ਭਲਾ",
    category: "Concepts",
    tags: ["Concepts"],
    summary: "The wellbeing of all — the closing wish of the Sikh Ardas.",
    sections: [
      {
        heading: "Meaning",
        paragraphs: ["Sarbat da Bhala means “the welfare of all”. The Sikh Ardas ends by asking for the wellbeing of all humanity, not only of Sikhs — a reminder that a Sikh's concern extends to everyone."],
      },
    ],
    related: ["ardas", "chardi-kala"],
  },
  {
    id: "five-ks-overview",
    title: "The Five Ks",
    gurmukhi: "ਪੰਜ ਕਕਾਰ",
    category: "Concepts",
    tags: ["Concepts", "Five Ks"],
    summary: "The five articles of faith kept by initiated Sikhs.",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "Guru Gobind Singh Ji gave the Five Ks (Panj Kakaar) to the Khalsa in 1699. Each begins with the Gurmukhi letter ਕ (K) and together they express commitment, discipline and identity.",
        ],
        list: ["Kesh — uncut hair", "Kangha — wooden comb", "Kara — steel bracelet", "Kachera — cotton undergarment", "Kirpan — article of faith in the form of a sword"],
      },
    ],
    related: ["kesh", "kangha", "kara", "kachera", "kirpan"],
  },

  /* ---------------- Practices ---------------- */
  {
    id: "nitnem",
    title: "Nitnem",
    gurmukhi: "ਨਿਤਨੇਮ",
    category: "Practices",
    tags: ["Practices"],
    summary: "The daily prayers recited morning, evening and night.",
    sections: [
      {
        heading: "The daily Banis",
        list: [
          "Morning: Japji Sahib, Jaap Sahib, Tav-Prasad Savaiye (many also recite Benti Chaupai and Anand Sahib)",
          "Evening: Rehras Sahib",
          "Night: Sohila Sahib (Kirtan Sohila)",
        ],
      },
      { heading: "Read along", paragraphs: ["You can read every Nitnem Bani with meanings and audio on the Nitnem page, and track your daily checklist there."] },
    ],
    links: [{ label: "Open Nitnem", href: "/nitnem" }],
    related: ["ardas", "naam-japna"],
  },
  {
    id: "ardas",
    title: "Ardas",
    gurmukhi: "ਅਰਦਾਸ",
    category: "Practices",
    tags: ["Practices"],
    summary: "The formal Sikh prayer of supplication, offered standing.",
    sections: [
      {
        heading: "About Ardas",
        paragraphs: [
          "Ardas is recited standing, with hands joined, at the end of services, before undertaking tasks and at important moments. It remembers the Gurus, the sacrifices of Sikhs throughout history and asks for the Guru's grace.",
          "Ardas closes with the wish for Sarbat da Bhala — the wellbeing of all.",
        ],
      },
    ],
    related: ["sarbat-da-bhala", "nitnem"],
  },
  {
    id: "kirtan",
    title: "Kirtan",
    gurmukhi: "ਕੀਰਤਨ",
    category: "Practices",
    tags: ["Practices"],
    summary: "Singing Gurbani to music, in the Raags of the Guru Granth Sahib Ji.",
    sections: [
      {
        heading: "About Kirtan",
        paragraphs: [
          "Kirtan is the singing of Gurbani, usually with harmonium and tabla. Most of the Guru Granth Sahib Ji is arranged in Raags (musical measures), reflecting the central place of music in Sikh worship.",
        ],
      },
    ],
    links: [{ label: "Explore the Gurbani Library", href: "/gurbani" }],
    related: ["sangat", "simran"],
  },
  {
    id: "langar",
    title: "Langar",
    gurmukhi: "ਲੰਗਰ",
    category: "Practices",
    tags: ["Practices"],
    summary: "The free community kitchen found in every Gurdwara.",
    sections: [
      {
        heading: "About Langar",
        paragraphs: [
          "Langar was begun by Guru Nanak Dev Ji and strengthened by the later Gurus. Volunteers prepare and serve free vegetarian food to anyone who comes, regardless of religion, caste or status.",
        ],
      },
      { heading: "What it teaches", list: ["Equality — all sit together (Pangat)", "Seva — food is prepared and served by volunteers", "Vand Chhakna — the community shares its resources"] },
    ],
    related: ["pangat", "seva", "vand-chhakna"],
  },
  {
    id: "gurdwara-etiquette",
    title: "Gurdwara etiquette",
    category: "Practices",
    tags: ["Practices"],
    summary: "How to visit a Gurdwara respectfully — everyone is welcome.",
    sections: [
      {
        heading: "When you visit",
        list: [
          "Cover your head; head coverings are usually available",
          "Remove your shoes and wash your hands",
          "Do not bring tobacco, alcohol or other intoxicants",
          "Bow or sit quietly before the Sri Guru Granth Sahib Ji, and sit on the floor",
          "Accept Karah Parshad with cupped hands and join the Langar",
        ],
      },
    ],
    links: [{ label: "Read about Gurdwara conduct in the Rehat Maryada", href: "/rehat-maryada#gurdwara-conduct" }],
    related: ["langar", "sangat"],
  },
  {
    id: "amrit-sanchar",
    title: "Amrit Sanchar",
    gurmukhi: "ਅੰਮ੍ਰਿਤ ਸੰਚਾਰ",
    category: "Practices",
    tags: ["Practices"],
    summary: "The Sikh initiation ceremony into the Khalsa.",
    sections: [
      {
        heading: "About Amrit Sanchar",
        paragraphs: [
          "Amrit Sanchar is conducted by five initiated Sikhs representing the Panj Pyare, in the presence of the Sri Guru Granth Sahib Ji. Amrit is prepared in an iron bowl, stirred with a Khanda while Banis are recited.",
          "Initiates commit to keeping the Five Ks, reciting Nitnem and following the Sikh code of conduct. Anyone ready to accept this discipline may take Amrit, whatever their background.",
        ],
      },
    ],
    links: [{ label: "Amrit Sanchar in the Rehat Maryada", href: "/rehat-maryada#amrit-sanchar" }],
    related: ["khalsa-1699", "five-ks-overview", "sikh-rehat"],
  },
  {
    id: "sikh-rehat",
    title: "Sikh Rehat",
    gurmukhi: "ਰਹਿਤ",
    category: "Practices",
    tags: ["Practices"],
    summary: "The Sikh way of life and code of conduct.",
    sections: [
      {
        heading: "About Rehat",
        paragraphs: [
          "Rehat is the discipline of Sikh life. The Sikh Rehat Maryada, published by the Shiromani Gurdwara Parbandhak Committee (SGPC), sets out personal conduct, Panthic conventions and ceremonies.",
        ],
      },
    ],
    links: [{ label: "Open the Rehat Maryada guide", href: "/rehat-maryada" }],
    related: ["amrit-sanchar", "nitnem"],
  },

  /* ---------------- Five Ks ---------------- */
  {
    id: "kesh",
    title: "Kesh",
    gurmukhi: "ਕੇਸ",
    category: "Five Ks",
    tags: ["Five Ks"],
    summary: "Uncut hair, kept in the form the Creator gave.",
    sections: [
      { heading: "Meaning", paragraphs: ["Kesh is uncut hair, kept as a sign of accepting the Creator's will and the natural form given by the Creator."] },
      { heading: "Importance", paragraphs: ["Kesh is central to Sikh identity. It is covered with a Dastar (turban) or head covering, which also signals a commitment to stand up for others."] },
      { heading: "Historical context", paragraphs: ["Keeping uncut hair was practised by the Gurus and given as an article of faith to the Khalsa in 1699. Dishonouring the hair is one of the four cardinal prohibitions for initiated Sikhs."] },
      { heading: "In simple words", paragraphs: ["Sikhs don't cut their hair because they accept themselves as the Creator made them."] },
    ],
    related: ["kangha", "five-ks-overview"],
  },
  {
    id: "kangha",
    title: "Kangha",
    gurmukhi: "ਕੰਘਾ",
    category: "Five Ks",
    tags: ["Five Ks"],
    summary: "A small wooden comb kept in the hair.",
    sections: [
      { heading: "Meaning", paragraphs: ["The Kangha is a small wooden comb kept in the hair."] },
      { heading: "Importance", paragraphs: ["It keeps the Kesh clean and tidy, and symbolises an orderly, disciplined life of body and mind."] },
      { heading: "Historical context", paragraphs: ["Given to the Khalsa in 1699, the Kangha reflects the Gurus' teaching that spiritual life does not mean neglecting the body, as some ascetics of the time did."] },
      { heading: "In simple words", paragraphs: ["Sikhs comb their hair twice a day, as a reminder to keep both body and mind clean."] },
    ],
    related: ["kesh", "kara"],
  },
  {
    id: "kara",
    title: "Kara",
    gurmukhi: "ਕੜਾ",
    category: "Five Ks",
    tags: ["Five Ks"],
    summary: "A steel or iron bracelet worn on the wrist.",
    sections: [
      { heading: "Meaning", paragraphs: ["The Kara is a plain circle of steel or iron worn on the wrist."] },
      { heading: "Importance", paragraphs: ["Its circle — without beginning or end — reminds a Sikh of the eternal Creator and of the bond with the Guru. Seen on the hand, it is a reminder to act rightly."] },
      { heading: "Historical context", paragraphs: ["The Kara was given to the Khalsa as an article of faith in 1699. It is plain rather than decorative, reflecting simplicity."] },
      { heading: "In simple words", paragraphs: ["The Kara is a reminder on your hand: before you do something, ask whether the Guru would approve."] },
    ],
    related: ["kirpan", "kachera"],
  },
  {
    id: "kachera",
    title: "Kachera",
    gurmukhi: "ਕਛਹਿਰਾ",
    category: "Five Ks",
    tags: ["Five Ks"],
    summary: "A cotton undergarment.",
    sections: [
      { heading: "Meaning", paragraphs: ["The Kachera is a specific style of cotton undergarment."] },
      { heading: "Importance", paragraphs: ["It symbolises self-control, modesty and faithfulness, and was practical clothing allowing free movement."] },
      { heading: "Historical context", paragraphs: ["Given to the Khalsa in 1699, the Kachera suited a people who needed to be ready at all times — in contrast to the loose garments of the period."] },
      { heading: "In simple words", paragraphs: ["The Kachera reminds Sikhs to be modest and in control of their desires."] },
    ],
    related: ["kara", "kirpan"],
  },
  {
    id: "kirpan",
    title: "Kirpan",
    gurmukhi: "ਕਿਰਪਾਨ",
    category: "Five Ks",
    tags: ["Five Ks"],
    summary: "An article of faith in the form of a sword.",
    sections: [
      { heading: "Meaning", paragraphs: ["The Kirpan is an article of faith in the form of a small sword. Its name is often explained as joining kirpa (mercy) and aan (honour)."] },
      { heading: "Importance", paragraphs: ["It represents the duty to protect the weak, stand against injustice and uphold dignity. It is a religious article, not a weapon of aggression."] },
      { heading: "Historical context", paragraphs: ["Guru Hargobind Sahib Ji's Miri Piri swords and Guru Gobind Singh Ji's creation of the Khalsa established the ideal of the saint-soldier (Sant Sipahi), symbolised by the Kirpan."] },
      { heading: "In simple words", paragraphs: ["The Kirpan reminds Sikhs to be brave and to protect anyone who is being treated unfairly."] },
    ],
    related: ["kesh", "five-ks-overview"],
  },

  /* ---------------- Sikh History ---------------- */
  {
    id: "khalsa-1699",
    title: "The creation of the Khalsa (1699)",
    category: "Sikh History",
    tags: ["Sikh History"],
    summary: "How Guru Gobind Singh Ji created the Khalsa on Vaisakhi 1699.",
    sections: [
      {
        heading: "Vaisakhi 1699",
        paragraphs: [
          "At Anandpur Sahib, Guru Gobind Singh Ji asked the gathered Sangat who would offer their head for their faith. Five Sikhs from different regions and castes came forward — remembered as the Panj Pyare.",
          "The Guru initiated them with Khande di Pahul (Amrit), then asked them to initiate him in turn, showing the equality of Guru and disciple. Thus the Khalsa was born.",
        ],
      },
    ],
    links: [{ label: "See it on the history timeline", href: "/sikh-history#event=1699-khalsa" }],
    related: ["guru-gobind-singh-ji", "amrit-sanchar", "five-ks-overview"],
  },
  {
    id: "guru-granth-sahib-guru",
    title: "The Guru Granth Sahib as Guru (1708)",
    category: "Sikh History",
    tags: ["Sikh History"],
    summary: "How the scripture became the eternal Guru of the Sikhs.",
    sections: [
      {
        heading: "From Adi Granth to Guru Granth",
        paragraphs: [
          "Guru Arjan Dev Ji compiled the Adi Granth and installed it at Sri Harmandir Sahib in 1604. Guru Gobind Singh Ji added the Bani of Guru Tegh Bahadur Ji, and at Nanded in 1708 declared the Granth the Guru for all time.",
          "Since then Sikhs have bowed before the Sri Guru Granth Sahib Ji as their living Guru.",
        ],
      },
    ],
    links: [
      { label: "Open the Gurbani Library", href: "/gurbani" },
      { label: "See it on the timeline", href: "/sikh-history#event=1708-guru-granth-sahib" },
    ],
    related: ["guru-arjan-dev-ji", "guru-gobind-singh-ji"],
  },
  {
    id: "five-takhts",
    title: "The Five Takhts",
    category: "Sikh History",
    tags: ["Sikh History"],
    summary: "The five seats of Sikh temporal authority.",
    sections: [
      {
        heading: "The Takhts",
        list: [
          "Sri Akal Takht Sahib, Amritsar — established by Guru Hargobind Sahib Ji in 1606",
          "Takht Sri Kesgarh Sahib, Anandpur Sahib — birthplace of the Khalsa",
          "Takht Sri Damdama Sahib, Talwandi Sabo — linked to the final recension of the Guru Granth Sahib",
          "Takht Sri Patna Sahib, Bihar — birthplace of Guru Gobind Singh Ji",
          "Takht Sri Hazur Sahib, Nanded — where Guruship passed to the Guru Granth Sahib Ji",
        ],
      },
    ],
    links: [{ label: "Explore Gurdwaras in Sikh history", href: "/sikh-history#filter=Gurdwaras" }],
    related: ["guru-hargobind-sahib-ji", "khalsa-1699"],
  },
];


export const learn = window.SikhifyData.learn;
export const learnCategories = window.SikhifyData.learnCategories;
export default window.SikhifyData.learn;
