# Sikhify for Android

A native Flutter app (version 2), designed after the Sikhify mobile mockup: warm cream pages, deep navy and saffron gold.

| Screen | What it does |
|---|---|
| **Splash and welcome** | Sri Harmandir Sahib with the gold Khanda and the Fateh, then three welcome pages (shown once) |
| **Home** | Fateh, the Daily Hukamnama card, Quick Access (Learn · Gurbani · Media · Gurdwaras, plus "See All"), Nitnem for this time of day, Continue Learning and Upcoming Festivals |
| **Learn** | Topics as courses (Basics, Ten Gurus, Concepts, Practices, Five Ks, Sikh History), lessons with progress, search, bookmarks |
| **Gurbani** | Sri Guru Granth Sahib Ji header, Nitnem, the Hukamnama and every Bani; search (first letters, words, English), any Ang, popular Shabads |
| **Media** | Kirtan and Katha by Singers / Videos / A-Z, with category filters; videos play inside the app (YouTube) |
| **Gurdwaras** | The Global Gurdwara Directory: search, an OpenStreetMap map of results, photo cards, a detail page with map and directions |
| **Festivals** | The next Gurpurab large, then the calendar with Nanakshahi dates |
| **Profile** | Your name (on the phone only), Bookmarks, Offline Gurbani, daily Reminders, Appearance (light/dark), language and meanings, About, Share |

- A **mini player** above the tabs follows any recitation (Bani audio, Hukamnama, Katha) across the app.
- **Reminders** (morning Nitnem, Hukamnama, Rehras, Sohila) are scheduled on the phone, with no server and no account.
- **Offline:** the 7 Nitnem Banis, 29 Shabads and every lesson come with the app. Other Banis can be saved from Profile → Offline Gurbani. The last Hukamnama, Angs, media, festivals and Gurdwaras opened are kept for offline use.

## Data

- **Bundled:** `node scripts/export-app-data.mjs` copies the website's data (`frontend/src/data`) into `assets/data`:
  - Banis, Nitnem text and Shabads (from BaniDB)
  - Learn lessons and the Ten Gurus
- **Live:**
  - [BaniDB](https://www.banidb.com): Banis, Angs, search and the Hukamnama
  - www.sikhify.in API: Hukamnama published by admins, Kirtan & Katha, festivals and Gurdwaras
- **Images** (credited in the app's About screen):
  - Sri Harmandir Sahib photo by Oleg Yunakov (CC BY-SA 3.0, Wikimedia Commons)
  - Public-domain museum paintings of the Guru Sahibs, Sri Harmandir Sahib (Carpenter, 1854) and an illuminated folio
- **Icons and splash:** `node scripts/app-icons.cjs`
- **Font:** Noto Sans Gurmukhi (SIL OFL)
- **Maps:** © OpenStreetMap contributors

## Build

Needs Flutter 3.47+, Java 17+ and the Android SDK.

```sh
cd app
flutter pub get
flutter build apk --release                  # one APK for every phone
flutter build apk --release --split-per-abi  # smaller; most phones use app-arm64-v8a-release.apk
```

- Tests: `flutter test`. The tests that use the internet run with `flutter test --tags live` (they cover BaniDB and sikhify.in).
- Before each release, raise `version:` in `pubspec.yaml` (the number after `+` must go up).
- The APK is signed with the debug key: fine to share and install, **not for the Play Store**. For the Play Store, create your own upload key, keep it safe, and add it to `android/app/build.gradle.kts`.
