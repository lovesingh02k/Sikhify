# Sikhify

Sikh knowledge, Gurbani, Nitnem, the daily Hukamnama, history, Kirtan & Katha, a verified
Sikh directory, and a community — one Vite + React + Tailwind site with a small Node API.

## Commands

```bash
npm install
npm run dev          # API on :8787 + Vite on :5173 (Vite forwards /api and /uploads to the API)
npm run build        # production build → dist/
npm run preview      # API + `vite preview` of the production build
npm start            # production server: serves dist/ and the API from one process
npm test             # API integration tests + YouTube URL parser tests (node:test)
npm run admin:create -- --email you@example.com --name "Your Name" --username you
```

Requires **Node.js 22.13 or newer** (the API uses Node's built-in `node:sqlite`; no native modules).

### First run

1. `npm install`
2. `npm run admin:create -- --email you@example.com --name "Your Name" --username you`
   (prompts for a password; there is no default admin account anywhere in the code).
3. `npm run dev` and open http://localhost:5173. Sign in at `/login`; the admin panel is at `/admin`.

On first start the API creates `server/data/sikhify.db` and imports the existing, verified
Kirtan & Katha catalogue from `src/data/media.js`.

## How the app is put together

```
src/
  app/            App.jsx (all routes), guards.jsx (auth/role guards), navigation.js
  pages/          Legacy pages (Home, Learn, Gurbani, Nitnem, Hukamnama, History, Rehat, FAQ,
                  SikhMedia, Sitemap, ComingSoon, NotFound) and React pages in folders:
                  Auth/, Community/, Admin/, Directory/, Gurus/, Media/
  controllers/    The original site's page behaviour (DOM controllers) for the legacy pages
  services/       All data access — api/client.js plus auth, community, media, hukamnama,
                  content (directory + submissions), admin, search. UI never calls fetch().
  components/     layout/ (Header, Footer, AccountMenu), ui/ (Icon, Dialog, Form, States…),
                  common/, community/, admin/, media/ (YouTubePlayer), hukamnama/, status/
  context/        AuthContext (signed-in user and permissions, from the server)
  hooks/          useReactPage, usePageController, useAsync, useContentLanguage, usePageMeta
  data/           Bundled content (Gurbani, Nitnem, Gurus, history, FAQ, translations, media)
  motion/         GSAP page motion (respects prefers-reduced-motion)
shared/           Used by both browser and server: roles.js (permission table),
                  contentTypes.js (directory schemas + validation), community.js, youtube.js
server/           Node API: app.js, routes/, db/ (schema + migrations), lib/, scripts/
tests/            npm test
```

- **Two kinds of pages.** The original pages render their HTML and are wired by controllers
  that expect a fresh document; links to and from them are normal page loads
  (`app/navigation.js`, `components/common/SiteLink.jsx`). React pages (community, admin,
  directory, Gurus, video pages, accounts) navigate client-side between themselves.
- **Permissions** live in one table (`shared/roles.js`). The API enforces them on every
  request; the browser only uses them to decide what to show.
  Roles: Guest (not signed in) · User · Moderator · Master Admin, plus per-group
  Group Admin / Group Moderator roles that apply only inside that group.
- **Daily Hukamnama** — one canonical record per date. Admins create, preview, publish,
  unpublish, archive and see the history at `/admin/hukamnama` (optionally prefilled from
  BaniDB). The homepage card and `/hukamnama` both read it through
  `services/hukamnama/hukamnamaService.js`; when no record is published for a date, both fall
  back to the live BaniDB feed with the SGPC's official audio (the original behaviour).
- **Media / YouTube** — videos play inside Sikhify (`/media/:videoId`) with the official
  YouTube player on the privacy-enhanced `youtube-nocookie.com` host
  (`components/media/YouTubePlayer.jsx`). If a video's owner has disabled embedding, the
  player says so and offers "Watch on YouTube". `shared/youtube.js` parses watch?v=,
  youtu.be/, embed/, shorts/ and live/ links. The catalogue is in the database (managed at
  `/admin/media`); `src/data/media.js` is the seed and the fallback for static hosting.
- **Global Gurdwara Directory** — `/directory/gurdwaras[/country[/state[/city[/slug]]]]`.
  Its own relational tables (countries → states_regions → cities → gurdwaras, plus facilities,
  services, images, sources, verification log, change history and submissions — see
  `server/db/gurdwaraSchema.js`), server-side search (SQLite FTS5) and filters, distance
  sorting from the visitor's location (used for the request only, never stored), a lazy-loaded
  Leaflet map (`components/map/`), "Suggest a Gurdwara" (always pending review), and the
  admin CMS at `/admin/gurdwaras` (records, submission review with duplicate comparison,
  possible duplicates, CSV/JSON import with a dry run). Public listings show **active +
  verified** records only; a record can be verified only by a person and only with a source.
  The directory starts empty — add records in the admin, import a file from a reliable source,
  or approve community suggestions. Source-backed data from Wikidata (CC0):
  `npm run gurdwaras:fetch-wikidata` (refreshes `server/seed/gurdwaras/wikidata-gurdwaras.json`),
  then `npm run gurdwaras:import -- server/seed/gurdwaras/wikidata-gurdwaras.json --apply`
  (dry run without `--apply`; re-running updates instead of duplicating). Imported records stay
  "needs verification" until an admin verifies them (/admin/gurdwaras → Records → filter
  "Needs verification" → select → "Verify selected"). UI test data for development only:
  `NODE_ENV=development npm run gurdwaras:dev-fixtures` (`-- --remove` deletes it).
- **Knowledge directory** — events, personalities, organizations, websites, apps, books & research, heritage, news and kids
  resources share one schema file (`shared/contentTypes.js`) used by the admin editor, the
  submission form, the public pages and the API's validation. Nothing is published without a
  source or reference; every record shows its verification status and dates.
- **Submissions** — `/submit`: pending → reviewed by a moderator/admin → approved (draft) or
  verified-and-published, or rejected with a note. Nothing is ever published automatically.
- **Search** — the overlay (`/` or Ctrl/⌘+K) indexes the bundled content and, when the API is
  reachable, adds directory records, published Hukamnamas, public groups/posts and the live
  Media catalogue (`GET /api/search/index`).
- **Status screens & states** — every React page has loading, empty and error states
  (`components/ui/States.jsx`); without the API, account/community pages say so honestly.
- **Three-language content** — informational content can be read in English, Hindi or
  Punjabi; the same preference now also applies on the Ten Gurus pages.
- **Coming Soon** — sections in the navigation that aren't built yet are listed in
  `src/data/comingSoon.js` and get an honest placeholder page.

## Images

- **Where:** `src/assets/images/{gurus,history,gurbani}/` — optimized, self-hosted WebP at several widths
  plus one JPEG fallback each (hashed and cached long-term by the build). Provenance and licences are in
  `src/data/guruArtwork.js`, `src/data/heroArt.js` and `src/data/imageCredits.js`, and shown on
  `/image-credits`.
- **Components:** `OptimizedImage` (picture + srcset/sizes, width/height, lazy, placeholder, fallback),
  `GuruImage` (museum artwork or the symbolic `GuruEmblem`), `MediaThumbnail` (YouTube thumbnails);
  `src/utils/images.js` gives the original pages' controllers the same behaviour as HTML strings.
- **The Ten Gurus' artwork** is public-domain museum work (mostly Museum Rietberg, Zurich; also the
  Government Museum and Art Gallery, Chandigarh, and the Victoria Memorial Hall, Kolkata) — artistic
  depictions made after the Gurus' lifetimes, labelled as such. If a file is missing or fails, a symbolic
  emblem (ੴ and the Guru's number in Gurmukhi) is shown instead; nothing is ever AI-generated.
- **Adding artwork:** only use works whose licence and holding institution you can verify. Make WebP
  variants (e.g. 240/360/480/720 px) plus a 480 px JPEG, put them in the folder above, and add the
  record (institution, accession, date, licence, source link) to the data file.
- **Photographs** on the homepage are Pexels-hosted with responsive `srcset` (Pexels serves AVIF/WebP).
- **Videos:** the player shows the video's thumbnail and loads YouTube's player (~3.5 MB) only when the
  visitor presses Play.

## Configuration

Every setting is an environment variable — see **`.env.example`**. In production set at least
`NODE_ENV=production` and `SIKHIFY_PUBLIC_URL`. For password-reset email set `RESEND_API_KEY`
and `MAIL_FROM`; without them, development prints reset links to the server console and admins
can issue a reset link from `/admin/users`.

Maps (Gurdwara Directory) use Leaflet with OpenStreetMap tiles by default — no API key.
`VITE_MAP_PROVIDER=none` hides interactive maps; `VITE_MAP_TILE_URL` / `VITE_MAP_ATTRIBUTION`
point them at another tile service (recommended for heavy production traffic).

## Hosting

The site needs the API for accounts, the community, the admin panel, the directory and
admin-published Hukamnamas. Run it on any Node host with a **persistent disk** (the SQLite
database and `server/uploads/` must survive restarts and deploys — back both up):

```bash
npm ci && npm run build
NODE_ENV=production SIKHIFY_PUBLIC_URL=https://your-domain npm start   # listens on $PORT (default 8787)
```

Put it behind HTTPS (cookies are Secure in production) and set `SIKHIFY_TRUST_PROXY=true`
behind a reverse proxy. `npm start` also serves the built site with the single-page-app fallback.

**Static-only hosting** (`public/_redirects` for Netlify, `vercel.json` for Vercel) still
works for everything that doesn't need the API: Gurbani, Nitnem, Hukamnama (from BaniDB),
Learn, History, Rehat, FAQ, Media (bundled catalogue, in-site player) and the Ten Gurus.
Community, accounts, admin and the directory then show a clear "not available" state.
