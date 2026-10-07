/* ==========================================================================
   Sikhify.in — data/history.js
   Sikh history: timeline events, martyrs & historical figures, Sikh Empire.
   Educational summaries. Where sources give different dates, this is noted.

   Event shape: { id, year, sort, title, categories[], location, people[], summary, details[] }
   ========================================================================== */
window.SikhifyData = window.SikhifyData || {};

window.SikhifyData.historyCategories = ["Guru Period", "Sikh Empire", "Martyrdom", "Gurdwaras", "Modern Sikh History"];

window.SikhifyData.history = [
  {
    id: "1469-birth-guru-nanak", year: "1469", sort: 1469, title: "Birth of Guru Nanak Dev Ji",
    categories: ["Guru Period"], location: "Rai Bhoi di Talwandi (Nankana Sahib)", people: ["Guru Nanak Dev Ji"],
    summary: "The founder of Sikhi is born to Mehta Kalu and Mata Tripta.",
    details: ["His birthplace, now Nankana Sahib in present-day Pakistan, is among the holiest sites in Sikhi. His birth anniversary (Gurpurab) is celebrated worldwide."],
  },
  {
    id: "c1499-sultanpur", year: "c. 1499", sort: 1499, title: "Revelation at Sultanpur Lodhi",
    categories: ["Guru Period"], location: "Sultanpur Lodhi, Punjab", people: ["Guru Nanak Dev Ji"],
    summary: "Guru Nanak Dev Ji emerges from the Kali Bein with a message of oneness.",
    details: ["After disappearing into the river for three days, Guru Nanak Dev Ji declared that there is no Hindu and no Muslim — all are children of the One Creator. Gurdwara Ber Sahib marks the site. Some sources date this event to 1507."],
  },
  {
    id: "udasis", year: "Early 1500s", sort: 1500, title: "The Udasis — Guru Nanak's journeys",
    categories: ["Guru Period"], location: "South Asia and beyond", people: ["Guru Nanak Dev Ji", "Bhai Mardana Ji"],
    summary: "Long journeys spreading the message of Naam and equality.",
    details: ["Accompanied by the musician Bhai Mardana, Guru Nanak Dev Ji travelled across South Asia and, according to Sikh tradition, as far as Mecca and Baghdad, engaging in dialogue with people of many faiths."],
  },
  {
    id: "kartarpur", year: "1520s", sort: 1522, title: "Settling at Kartarpur",
    categories: ["Guru Period", "Gurdwaras"], location: "Kartarpur (present-day Pakistan)", people: ["Guru Nanak Dev Ji"],
    summary: "The first Sikh community takes shape around Kirtan, farming and Langar.",
    details: ["At Kartarpur on the Ravi, Guru Nanak Dev Ji farmed and led the Sangat. Gurdwara Darbar Sahib Kartarpur marks the place where he spent his final years."],
  },
  {
    id: "1539-guru-angad", year: "1539", sort: 1539, title: "Guruship passes to Guru Angad Dev Ji",
    categories: ["Guru Period"], location: "Kartarpur", people: ["Guru Nanak Dev Ji", "Guru Angad Dev Ji"],
    summary: "Bhai Lehna is named Guru Angad — “a part of my own body”.",
    details: ["Guru Nanak Dev Ji chose his devoted follower over his own sons, establishing that Guruship passes by spiritual merit."],
  },
  {
    id: "1552-goindwal", year: "1552", sort: 1552, title: "Guru Amar Das Ji at Goindwal",
    categories: ["Guru Period", "Gurdwaras"], location: "Goindwal Sahib, Punjab", people: ["Guru Amar Das Ji"],
    summary: "Goindwal becomes a centre of the Sikh community, with its Baoli and Langar.",
    details: ["Guru Amar Das Ji required all visitors to eat together in the Langar before meeting him and built the Baoli Sahib step-well at Goindwal."],
  },
  {
    id: "1577-amritsar", year: "1577", sort: 1577, title: "Founding of Ramdaspur (Amritsar)",
    categories: ["Guru Period", "Gurdwaras"], location: "Amritsar, Punjab", people: ["Guru Ram Das Ji"],
    summary: "Guru Ram Das Ji founds the town that becomes Amritsar.",
    details: ["Guru Ram Das Ji began excavating the sacred pool (sarovar) and invited traders and craftspeople to settle, laying the foundation of the city of Amritsar."],
  },
  {
    id: "1604-adi-granth", year: "1604", sort: 1604, title: "The Adi Granth installed at Sri Harmandir Sahib",
    categories: ["Guru Period", "Gurdwaras"], location: "Sri Harmandir Sahib, Amritsar", people: ["Guru Arjan Dev Ji", "Bhai Gurdas Ji", "Baba Buddha Ji"],
    summary: "Guru Arjan Dev Ji compiles and installs the Adi Granth.",
    details: [
      "Guru Arjan Dev Ji completed Sri Harmandir Sahib, with doors on all four sides as a sign of openness to all.",
      "The Adi Granth, written by Bhai Gurdas Ji, was installed with Baba Buddha Ji as the first Granthi.",
    ],
  },
  {
    id: "1606-guru-arjan-martyrdom", year: "1606", sort: 1606, title: "Martyrdom of Guru Arjan Dev Ji",
    categories: ["Guru Period", "Martyrdom"], location: "Lahore", people: ["Guru Arjan Dev Ji"],
    summary: "The first Sikh martyr is executed on the orders of Emperor Jahangir.",
    details: ["Guru Arjan Dev Ji was tortured and executed in Lahore. Gurdwara Dera Sahib in Lahore marks the site. His martyrdom marked a turning point in Sikh history."],
  },
  {
    id: "1606-akal-takht", year: "1606", sort: 1606.5, title: "The Akal Takht is established",
    categories: ["Guru Period", "Gurdwaras"], location: "Amritsar", people: ["Guru Hargobind Sahib Ji"],
    summary: "Guru Hargobind Sahib Ji builds the Akal Takht and adopts Miri Piri.",
    details: ["Facing Sri Harmandir Sahib, the Akal Takht became the seat of Sikh temporal authority. The Guru wore two swords representing Miri (temporal) and Piri (spiritual) authority."],
  },
  {
    id: "bandi-chhor", year: "c. 1619", sort: 1619, title: "Release from Gwalior — Bandi Chhor Divas",
    categories: ["Guru Period"], location: "Gwalior Fort", people: ["Guru Hargobind Sahib Ji"],
    summary: "Guru Hargobind Sahib Ji secures the release of 52 imprisoned princes.",
    details: ["According to Sikh tradition, the Guru agreed to leave Gwalior Fort only if 52 Rajas held with him were also freed. His return to Amritsar is celebrated as Bandi Chhor Divas. Dates given in sources vary."],
  },
  {
    id: "1665-anandpur", year: "1665", sort: 1665, title: "Founding of Anandpur Sahib",
    categories: ["Guru Period", "Gurdwaras"], location: "Anandpur Sahib, Punjab", people: ["Guru Tegh Bahadur Ji"],
    summary: "Guru Tegh Bahadur Ji founds Chak Nanki, later Anandpur Sahib.",
    details: ["Anandpur Sahib later became the place where the Khalsa was created in 1699."],
  },
  {
    id: "1666-patna", year: "1666", sort: 1666, title: "Birth of Guru Gobind Singh Ji",
    categories: ["Guru Period", "Gurdwaras"], location: "Patna, Bihar", people: ["Guru Gobind Singh Ji", "Mata Gujri Ji"],
    summary: "The tenth Guru is born at Patna.",
    details: ["Takht Sri Patna Sahib marks his birthplace."],
  },
  {
    id: "1675-martyrdom", year: "1675", sort: 1675, title: "Martyrdom of Guru Tegh Bahadur Ji",
    categories: ["Guru Period", "Martyrdom", "Gurdwaras"], location: "Chandni Chowk, Delhi", people: ["Guru Tegh Bahadur Ji", "Bhai Mati Das Ji", "Bhai Sati Das Ji", "Bhai Dayala Ji"],
    summary: "The ninth Guru gives his life for the religious freedom of others.",
    details: [
      "Kashmiri Pandits facing forced conversion asked Guru Tegh Bahadur Ji for help. He was executed in Delhi, as were his companions Bhai Mati Das, Bhai Sati Das and Bhai Dayala.",
      "Gurdwara Sis Ganj Sahib marks the site. His body was cremated by Bhai Lakhi Shah Vanjara (Gurdwara Rakab Ganj Sahib), and his head was carried to Anandpur Sahib by Bhai Jaita.",
    ],
  },
  {
    id: "1699-khalsa", year: "1699", sort: 1699, title: "Creation of the Khalsa",
    categories: ["Guru Period", "Gurdwaras"], location: "Anandpur Sahib (Takht Sri Kesgarh Sahib)", people: ["Guru Gobind Singh Ji", "The Panj Pyare"],
    summary: "Guru Gobind Singh Ji initiates the Panj Pyare on Vaisakhi.",
    details: ["Five Sikhs offered their heads at the Guru's call. The Guru initiated them with Khande di Pahul and then received Amrit from them, creating the Khalsa and giving the Five Ks."],
  },
  {
    id: "1704-chamkaur", year: "1704", sort: 1704, title: "Battle of Chamkaur — the elder Sahibzade",
    categories: ["Guru Period", "Martyrdom"], location: "Chamkaur Sahib, Punjab", people: ["Sahibzada Ajit Singh", "Sahibzada Jujhar Singh"],
    summary: "The Guru's elder sons fall fighting against an overwhelming force.",
    details: ["After leaving Anandpur Sahib, Guru Gobind Singh Ji and a small band of Sikhs were besieged at Chamkaur. Sahibzada Ajit Singh and Sahibzada Jujhar Singh were martyred in battle."],
  },
  {
    id: "1704-sirhind", year: "1704", sort: 1704.5, title: "Martyrdom of the younger Sahibzade and Mata Gujri Ji",
    categories: ["Guru Period", "Martyrdom", "Gurdwaras"], location: "Sirhind (Fatehgarh Sahib), Punjab", people: ["Sahibzada Zorawar Singh", "Sahibzada Fateh Singh", "Mata Gujri Ji"],
    summary: "The Guru's youngest sons are executed at Sirhind for refusing to give up their faith.",
    details: ["The young Sahibzade refused to convert and were bricked up alive and then executed on the orders of the governor of Sirhind. Their grandmother Mata Gujri Ji passed away in captivity. Gurdwara Fatehgarh Sahib marks the site."],
  },
  {
    id: "1705-muktsar", year: "1705", sort: 1705, title: "Battle of Muktsar — the Chali Mukte",
    categories: ["Guru Period", "Martyrdom"], location: "Sri Muktsar Sahib, Punjab", people: ["Mai Bhago Ji", "The Chali Mukte"],
    summary: "Forty Sikhs, led back by Mai Bhago, give their lives; the Guru forgives them.",
    details: ["Forty Sikhs who had earlier left the Guru returned with Mai Bhago and fought at Khidrana. The Guru blessed them as the Chali Mukte (forty liberated ones), and the place became Muktsar."],
  },
  {
    id: "1706-damdama", year: "1706", sort: 1706, title: "Final recension at Damdama Sahib",
    categories: ["Guru Period", "Gurdwaras"], location: "Talwandi Sabo (Takht Sri Damdama Sahib)", people: ["Guru Gobind Singh Ji", "Bhai Mani Singh Ji"],
    summary: "The Guru prepares the final version of the Granth, adding Guru Tegh Bahadur Ji's Bani.",
    details: ["According to Sikh tradition, Bhai Mani Singh served as scribe while the Guru prepared the final recension of the Granth at Damdama Sahib."],
  },
  {
    id: "1708-guru-granth-sahib", year: "1708", sort: 1708, title: "Guruship passes to Sri Guru Granth Sahib Ji",
    categories: ["Guru Period", "Gurdwaras"], location: "Nanded (Takht Sri Hazur Sahib)", people: ["Guru Gobind Singh Ji"],
    summary: "The Granth is declared the eternal Guru of the Sikhs.",
    details: ["Before passing away at Nanded, Guru Gobind Singh Ji conferred Guruship on the Sri Guru Granth Sahib Ji. He also sent Banda Singh Bahadur to Punjab."],
  },
  {
    id: "1710-sirhind", year: "1710", sort: 1710, title: "Banda Singh Bahadur captures Sirhind",
    categories: ["Modern Sikh History"], location: "Chappar Chiri and Sirhind, Punjab", people: ["Banda Singh Bahadur"],
    summary: "Sikh forces defeat the Mughal governor and establish rule from Lohgarh.",
    details: ["Banda Singh Bahadur defeated the Mughal forces at Chappar Chiri, captured Sirhind, abolished the zamindari system in the areas he controlled and issued coins in the name of the Gurus."],
  },
  {
    id: "1716-banda-singh-martyrdom", year: "1716", sort: 1716, title: "Martyrdom of Banda Singh Bahadur",
    categories: ["Martyrdom"], location: "Delhi", people: ["Banda Singh Bahadur"],
    summary: "Banda Singh Bahadur and hundreds of his companions are executed in Delhi.",
    details: ["After a long siege at Gurdas Nangal, Banda Singh Bahadur was captured and executed in Delhi with many of his companions, who refused to renounce their faith."],
  },
  {
    id: "1734-bhai-mani-singh", year: "1734", sort: 1734, title: "Martyrdom of Bhai Mani Singh Ji",
    categories: ["Martyrdom"], location: "Lahore", people: ["Bhai Mani Singh Ji"],
    summary: "The scholar and Granthi of Sri Harmandir Sahib is executed in Lahore.",
    details: ["Bhai Mani Singh Ji was executed limb by limb after being unable to pay a tax imposed for holding a Sikh gathering. Some sources give the year as 1737."],
  },
  {
    id: "1746-chhota-ghallughara", year: "1746", sort: 1746, title: "Chhota Ghallughara",
    categories: ["Martyrdom", "Modern Sikh History"], location: "Kahnuwan, Punjab", people: [],
    summary: "The “Lesser Holocaust”: thousands of Sikhs are killed by Mughal forces.",
    details: ["Thousands of Sikhs were killed or captured in a campaign by the Lahore administration."],
  },
  {
    id: "1757-baba-deep-singh", year: "1757", sort: 1757, title: "Martyrdom of Baba Deep Singh Ji",
    categories: ["Martyrdom", "Gurdwaras"], location: "Amritsar", people: ["Baba Deep Singh Ji"],
    summary: "The aged scholar-warrior falls defending the sanctity of Sri Harmandir Sahib.",
    details: ["Baba Deep Singh Ji led Sikhs to Amritsar after Sri Harmandir Sahib was desecrated by Afghan forces. He was martyred near the complex; Gurdwara Shaheed Ganj Baba Deep Singh marks the place."],
  },
  {
    id: "1762-vadda-ghallughara", year: "1762", sort: 1762, title: "Vadda Ghallughara",
    categories: ["Martyrdom", "Modern Sikh History"], location: "Kup-Rahira, Punjab", people: [],
    summary: "The “Great Holocaust”: thousands of Sikhs are killed by Ahmad Shah Abdali's forces.",
    details: ["A large number of Sikhs, including many women, children and elders, were killed. Despite this loss the Sikh Misls recovered within a few years."],
  },
  {
    id: "1799-lahore", year: "1799", sort: 1799, title: "Ranjit Singh takes Lahore",
    categories: ["Sikh Empire"], location: "Lahore", people: ["Maharaja Ranjit Singh"],
    summary: "The young Sukerchakia chief captures Lahore, beginning the Sikh Empire.",
    details: ["Ranjit Singh was proclaimed Maharaja in 1801 and united the Sikh Misls into a single state."],
  },
  {
    id: "1809-amritsar-treaty", year: "1809", sort: 1809, title: "Treaty of Amritsar",
    categories: ["Sikh Empire"], location: "Amritsar", people: ["Maharaja Ranjit Singh"],
    summary: "The Sutlej is fixed as the boundary with the British East India Company.",
    details: ["The treaty kept peace with the British while Ranjit Singh expanded his empire north and west."],
  },
  {
    id: "1830-golden-temple-gilding", year: "1830s", sort: 1830, title: "Sri Harmandir Sahib covered in gold",
    categories: ["Sikh Empire", "Gurdwaras"], location: "Amritsar", people: ["Maharaja Ranjit Singh"],
    summary: "Maharaja Ranjit Singh sponsors the gilding that gives the “Golden Temple” its name.",
    details: ["The Maharaja provided gold, marble and craftsmanship for Sri Harmandir Sahib and other Gurdwaras."],
  },
  {
    id: "1837-hari-singh-nalwa", year: "1837", sort: 1837, title: "Death of Hari Singh Nalwa at Jamrud",
    categories: ["Sikh Empire"], location: "Jamrud, near the Khyber Pass", people: ["Hari Singh Nalwa"],
    summary: "The great Sikh general falls defending the north-west frontier.",
    details: ["Hari Singh Nalwa was the commander who secured the frontier for the Sikh Empire, including Peshawar."],
  },
  {
    id: "1849-annexation", year: "1849", sort: 1849, title: "Annexation of Punjab",
    categories: ["Sikh Empire"], location: "Lahore", people: ["Maharaja Duleep Singh", "Maharani Jind Kaur"],
    summary: "After two Anglo-Sikh Wars, the British annex Punjab.",
    details: ["The First (1845–46) and Second (1848–49) Anglo-Sikh Wars ended with the annexation of the Sikh Empire. The young Maharaja Duleep Singh was removed from power and later taken to Britain."],
  },
  {
    id: "1873-singh-sabha", year: "1873", sort: 1873, title: "The Singh Sabha movement",
    categories: ["Modern Sikh History"], location: "Amritsar", people: [],
    summary: "A revival of Sikh education, literature and practice begins.",
    details: ["The Singh Sabha movement founded schools and colleges, published literature and worked to restore Sikh practices."],
  },
  {
    id: "1920-sgpc", year: "1920", sort: 1920, title: "SGPC and the Gurdwara Reform Movement",
    categories: ["Modern Sikh History", "Gurdwaras"], location: "Amritsar", people: [],
    summary: "Sikhs campaign peacefully to free Gurdwaras from hereditary mahants.",
    details: ["The Shiromani Gurdwara Parbandhak Committee was formed in 1920. After years of non-violent struggle, including the tragedy at Nankana Sahib in 1921, the Sikh Gurdwaras Act of 1925 placed historic Gurdwaras under elected Sikh management."],
  },
  {
    id: "1947-partition", year: "1947", sort: 1947, title: "Partition of Punjab",
    categories: ["Modern Sikh History"], location: "Punjab", people: [],
    summary: "Punjab is divided between India and Pakistan.",
    details: ["Millions were displaced and many lost their lives. Historic shrines including Nankana Sahib and Kartarpur came to lie in Pakistan."],
  },
  {
    id: "1984", year: "1984", sort: 1984, title: "Operation Blue Star and the November 1984 violence",
    categories: ["Modern Sikh History", "Martyrdom", "Gurdwaras"], location: "Amritsar and Delhi", people: [],
    summary: "An army assault on the Darbar Sahib complex, followed by anti-Sikh violence.",
    details: [
      "In June 1984 the Indian Army assaulted the Darbar Sahib complex in Amritsar, heavily damaging the Akal Takht; many pilgrims were killed.",
      "In November 1984, following the assassination of Prime Minister Indira Gandhi, organised violence against Sikhs killed thousands, mostly in Delhi.",
    ],
  },
  {
    id: "2019-kartarpur-corridor", year: "2019", sort: 2019, title: "The Kartarpur Corridor opens",
    categories: ["Modern Sikh History", "Gurdwaras"], location: "Dera Baba Nanak – Kartarpur", people: ["Guru Nanak Dev Ji"],
    summary: "A visa-free corridor opens for the 550th Gurpurab of Guru Nanak Dev Ji.",
    details: ["Pilgrims from India can now visit Gurdwara Darbar Sahib Kartarpur in Pakistan, where Guru Nanak Dev Ji spent his final years."],
  },
];

/* Martyrs and historical figures — shown as cards; `event` links to a timeline entry. */
window.SikhifyData.historyFigures = [
  { id: "bhai-mardana", name: "Bhai Mardana Ji", role: "Companion of Guru Nanak Dev Ji", era: "15th–16th century", summary: "A Muslim musician who played the rabab and accompanied Guru Nanak Dev Ji on his journeys for many years.", event: "udasis" },
  { id: "baba-buddha", name: "Baba Buddha Ji", role: "Elder of the Sikh community", era: "1506–1631", summary: "Served the first six Gurus, anointed several of them, and was the first Granthi of Sri Harmandir Sahib.", event: "1604-adi-granth" },
  { id: "mata-khivi", name: "Mata Khivi Ji", role: "Organiser of the Langar", era: "16th century", summary: "Wife of Guru Angad Dev Ji, renowned for her service in the Langar; she is the only woman mentioned by name in the Guru Granth Sahib Ji.", event: "1539-guru-angad" },
  { id: "bhai-gurdas", name: "Bhai Gurdas Ji", role: "Scholar and scribe", era: "16th–17th century", summary: "Scribe of the Adi Granth and author of the Vaaran, whose writings are called the key to understanding Gurbani.", event: "1604-adi-granth" },
  { id: "bhai-mati-das", name: "Bhai Mati Das, Bhai Sati Das & Bhai Dayala", role: "Martyrs", era: "1675", summary: "Companions of Guru Tegh Bahadur Ji, executed in Delhi for refusing to abandon their faith.", event: "1675-martyrdom" },
  { id: "elder-sahibzade", name: "Sahibzada Ajit Singh & Sahibzada Jujhar Singh", role: "Martyrs", era: "1704", summary: "The elder sons of Guru Gobind Singh Ji, martyred in battle at Chamkaur.", event: "1704-chamkaur" },
  { id: "younger-sahibzade", name: "Sahibzada Zorawar Singh & Sahibzada Fateh Singh", role: "Martyrs", era: "1704", summary: "The youngest sons of Guru Gobind Singh Ji, executed at Sirhind for refusing to give up their faith.", event: "1704-sirhind" },
  { id: "mata-gujri", name: "Mata Gujri Ji", role: "Mother of Guru Gobind Singh Ji", era: "1704", summary: "Gave her sons and grandsons the courage to stand firm, and passed away in captivity at Sirhind.", event: "1704-sirhind" },
  { id: "mai-bhago", name: "Mai Bhago Ji", role: "Warrior", era: "1705", summary: "Led forty Sikhs back to the Guru and fought at the Battle of Muktsar.", event: "1705-muktsar" },
  { id: "banda-singh", name: "Banda Singh Bahadur", role: "Military leader and martyr", era: "1670–1716", summary: "Sent by Guru Gobind Singh Ji to Punjab, he established Sikh rule before being executed in Delhi.", event: "1716-banda-singh-martyrdom" },
  { id: "bhai-mani-singh", name: "Bhai Mani Singh Ji", role: "Scholar and martyr", era: "d. 1734", summary: "Granthi of Sri Harmandir Sahib and scribe of the Granth, executed limb by limb in Lahore.", event: "1734-bhai-mani-singh" },
  { id: "baba-deep-singh", name: "Baba Deep Singh Ji", role: "Scholar-warrior and martyr", era: "1682–1757", summary: "Scholar of Damdama Sahib who fell defending Sri Harmandir Sahib.", event: "1757-baba-deep-singh" },
  { id: "ranjit-singh", name: "Maharaja Ranjit Singh", role: "Founder of the Sikh Empire", era: "1780–1839", summary: "United the Misls, ruled from Lahore, and sponsored the gilding of Sri Harmandir Sahib.", event: "1799-lahore" },
  { id: "hari-singh-nalwa", name: "Hari Singh Nalwa", role: "General of the Sikh Empire", era: "d. 1837", summary: "Commander who secured the north-west frontier, falling at Jamrud.", event: "1837-hari-singh-nalwa" },
  { id: "jind-kaur", name: "Maharani Jind Kaur", role: "Regent of the Sikh Empire", era: "1817–1863", summary: "Mother of Maharaja Duleep Singh, who resisted British control as regent.", event: "1849-annexation" },
];

/* Sikh Empire overview */
window.SikhifyData.sikhEmpire = {
  intro:
    "The Sikh Empire (1799–1849) grew from the Sikh Misls under Maharaja Ranjit Singh. From its capital at Lahore it stretched from the Sutlej to the Khyber Pass and into Kashmir, and it was known for a court that included Sikhs, Hindus, Muslims and Europeans.",
  facts: [
    { label: "Founded", value: "1799 (Lahore taken)" },
    { label: "Capital", value: "Lahore" },
    { label: "Founder", value: "Maharaja Ranjit Singh" },
    { label: "Ended", value: "1849 (annexed by the British)" },
  ],
  places: ["Lahore — capital", "Amritsar — spiritual centre", "Multan — taken 1818", "Kashmir — taken 1819", "Peshawar — taken 1834"],
};


export const history = window.SikhifyData.history;
export const historyCategories = window.SikhifyData.historyCategories;
export const historyFigures = window.SikhifyData.historyFigures;
export const sikhEmpire = window.SikhifyData.sikhEmpire;
export default window.SikhifyData.history;
