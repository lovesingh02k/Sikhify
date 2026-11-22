# Sikhify — Play Store listing

Everything needed to fill in the Play Console. Files in this folder:

| File | Where it goes in Play Console |
|---|---|
| `icon-512.png` | Store listing → App icon (512×512) |
| `feature-graphic-1024x500.png` | Store listing → Feature graphic |
| `screenshots/*.png` (1080×2160) | Store listing → Phone screenshots (upload all 6, in order) |
| `../release/Sikhify-<version>.aab` | Testing / Production → Create release → App bundles |

---

## App details

- **App name** (30 max): `Sikhify — Nitnem & Gurbani`
- **Default language:** English (United Kingdom) or English (United States)
- **App or game:** App
- **Free or paid:** Free
- **Category:** Books & Reference *(alternatives: Education, Lifestyle)*
- **Contact email:** sikhify.in@gmail.com
- **Website:** https://www.sikhify.in
- **Privacy policy:** https://www.sikhify.in/privacy-policy

## Short description (80 max)

```
Nitnem, Gurbani, daily Hukamnama, Sikh history, Kirtan and Gurdwaras — free.
```

## Full description (4000 max)

```
Sikhify brings Gurbani and Sikhi learning to your phone — free, with no ads and no sign-in.

DAILY HUKAMNAMA
• Today's Hukamnama from Sri Harmandir Sahib, Amritsar
• Gurmukhi, transliteration and English meaning
• Listen to the SGPC recitation and Katha
• Open the Hukamnama of any earlier date

NITNEM
• Japji Sahib, Jaap Sahib, Tav Prasad Savaiye, Chaupai Sahib, Anand Sahib, Rehras Sahib, Sohila Sahib and more
• Read like a Gutka: turn the pages, with the Bani’s name and page number on every page (or scroll, if you prefer)
• Read offline, with meanings
• Audio for many Banis
• Remembers where you stopped, and tracks your daily Nitnem

SRI GURU GRANTH SAHIB JI
• Search by first letters (e.g. "snk"), Gurmukhi words or English meaning
• Open any Ang, read Ang by Ang
• Bookmark Shabads

LEARN SIKHI
• Short lessons on the basics, the Ten Gurus, core concepts, the Five Ks, Sikh practices and history
• Sikh History timeline, Sikh personalities and the Sikh Empire
• Rehat Maryada explained in plain language, and answers to common questions
• A Kids section with Gurmukhi letters, stories and quizzes

DAILY QUIZ
• 5 new questions every day on the Gurus, Sikh history, Gurbani and Sikh life — one at a time
• Keep your streak going, with an optional daily reminder

KIRTAN & KATHA
• Kirtan from Hazoori Ragis and well-known Ragis, Katha and Gurmat Sangeet

GURDWARAS
• Find Gurdwaras around the world by name, city or country — or choose a country, state and city
• Search by history, Guru Sahib or facilities too (e.g. "Langar")
• Historic Gurdwaras on a map, with directions, timings, facilities and nearby Gurdwaras
• Add a missing Gurdwara, or a phone number or note for one already listed

FESTIVALS
• Gurpurabs and Sikh festivals with dates (Nanakshahi calendar) and their significance

MADE FOR EVERYONE
• English, Punjabi (ਪੰਜਾਬੀ) and Hindi (हिंदी)
• Light and dark mode, adjustable text size
• Gentle daily reminders for Nitnem, the Hukamnama and the quiz
• Share Gurbani in Punjabi, Hindi (हिंदी letters) or English
• Add, suggest or report — every contribution is checked by the Sikhify team

PRIVACY
Sikhify has no accounts, no ads and no tracking. Your bookmarks, quiz answers and settings stay on your phone.

Gurbani text: BaniDB. Hukamnama audio: SGPC. Videos play from YouTube.

Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh 🙏
```

## Release notes (first release)

```
First release of Sikhify: daily Hukamnama, Nitnem, Gurbani search, Learn Sikhi, Kirtan & Katha, Gurdwaras and festivals — in English, Punjabi and Hindi.
```

---

## App content forms (Policy → App content)

**Privacy policy:** https://www.sikhify.in/privacy-policy

**Ads:** No, my app does not contain ads.

**App access:** All functionality is available without special access (no login).

**Content rating** (IARC questionnaire): Category *Reference, News, or Educational*. Answer **No** to violence, sexual content, profanity, drugs, gambling, and user-generated content shared between users (the app has no chat or posting). Expected rating: Everyone / PEGI 3.

**Target audience:** 13 and over is the simplest choice. *(Choosing ages under 13 because of the Kids section brings in the Families policy and extra review; the app can still be used by children with their parents.)*

**News app:** No.

**Data safety:**
- Does your app collect or share any of the required user data types? → **Yes** (only what people type into the Add / Suggest / Report forms)
- Data types to tick, each **Collected**, **not shared**, **optional** (the user chooses to send it), purpose **App functionality** (and **Developer communications** for email):
  - Personal info → **Name** (optional, in the forms)
  - Personal info → **Email address** (optional, in the forms, so the team can reply)
  - App activity → **Other user-generated content** (the suggestion, report, Gurdwara details or listing they send)
- Is the data processed ephemerally? → No (submissions are kept for review)
- Is all of the user data collected by your app encrypted in transit? → Yes (all connections use HTTPS)
- Do you provide a way for users to request that their data is deleted? → Yes — by email to sikhify.in@gmail.com or the privacy request form at https://www.sikhify.in/submit?kind=privacy
- (Bookmarks, quiz answers, settings and the Profile name stay on the device and are not "collected".)

**Government app:** No. **Financial features:** None. **Health:** No.

---

## Signing (keep safe!)

- The upload key is **outside the repository**, in `C:\Users\<you>\.sikhify-keys\`:
  - `sikhify-upload.jks` — the key
  - `key.properties.backup` — its password
- Copy that folder to a safe place (Google Drive, a USB stick). Without it you cannot publish updates until Google approves a key reset.
- When creating the app in Play Console, keep **Play App Signing** on (the default): Google holds the final signing key; you upload with this key.

## Building a new version

1. Raise `version:` in `app/pubspec.yaml` (e.g. `2.1.3+6` — the number after `+` must go up every upload) and the "Version" text in `lib/screens/profile.dart`.
2. `cd app` → `flutter build appbundle --release`
3. Upload `build/app/outputs/bundle/release/app-release.aab`.

## Quiz links open the app (App Links)

Shared quiz links (`https://www.sikhify.in/quiz?q=…`) open the app when it is installed. Android checks
`frontend/public/.well-known/assetlinks.json` on the website, which lists the app's signing key fingerprints.

- It already has the **upload key** (APKs you share yourself).
- After the first Play Store upload, copy the **App signing key certificate → SHA-256 fingerprint** from
  Play Console → *Test and release → App integrity* and add it to `sha256_cert_fingerprints` in that file,
  then deploy the website. Without it, phones that installed from the Play Store open quiz links in the browser.
