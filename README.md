# Sikhify

Sikh knowledge, Gurbani, Nitnem, the daily Hukamnama, history, Kirtan & Katha, a verified
Sikh directory, and a community — a Vite + React + Tailwind frontend with a small Node API.

```
Sikhify/
├── frontend/   Browser app: React pages, legacy pages + controllers, components, data, styles (Vite)
├── backend/    Node API: routes, database, auth, admin, imports and seed data
├── shared/     Code used by both: permissions, content schemas + validation, constants, media catalogue
├── api/        Vercel Function entry (index.js) — a thin wrapper around backend/src
├── scripts/    dev.js — runs backend and frontend together
├── tests/      Tests for shared/ code (frontend/ and backend/ have their own tests/)
└── docs/       Deployment guide (Vercel + Turso) and the platform integration report
```

## Quick start

Requires **Node.js 22.13 or newer** (the API uses Node's built-in `node:sqlite`).

```bash
npm install          # installs both workspaces (frontend + backend) from the root
npm run admin:create -- --email you@example.com --name "Your Name" --username you
npm run dev          # API on :8787 + Vite on :5173 (Vite forwards /api and /uploads to the API)
```

Open http://localhost:5173. Sign in at `/login`; the admin panel is at `/admin`. There is no default
admin account anywhere in the code — `admin:create` prompts for a password.

## Commands

All commands run from the repository root.

| Command | What it does |
| --- | --- |
| `npm run dev` | Backend (watch mode) + frontend dev server together |
| `npm run dev:frontend` / `npm run dev:backend` | Just one of them (`dev:web` / `dev:api` are aliases) |
| `npm run build` | Production build of the frontend → `frontend/dist/` |
| `npm run preview` | Backend + `vite preview` of the production build |
| `npm start` | Production server: serves `frontend/dist/` and the API from one process |
| `npm test` | All tests: `test:shared`, `test:frontend`, `test:backend` |
| `npm run admin:create -- --email … --name … --username …` | Create (or promote) a Master Admin |
| `npm run directory:import [-- --apply [--publish]]` | Import knowledge-directory seed data (dry run by default) |
| `npm run gurdwaras:import -- <file> [--apply]` | Import Gurdwaras from CSV/JSON (dry run by default) |
| `npm run gurdwaras:import-historic [-- --apply --verify --by admin@…]` | Import the curated Panj Takht + historic Gurdwaras of India (`backend/seed/gurdwaras/india-historic-gurdwaras.json`); `--verify` records the named admin as having checked them |
| `npm run gurdwaras:fetch-wikidata` | Refresh the bundled Wikidata Gurdwara dataset |
| `npm run gurdwaras:dev-fixtures` | Fake Gurdwaras for UI testing (`NODE_ENV=development` only) |

Each workspace also has its own scripts (`npm run build -w frontend`, `npm test -w backend`, …).

## Architecture

```
Browser ── frontend/ (React + legacy pages)
   │          services/  ← the only place the UI talks to the network
   ▼
 /api/*  ── backend/src/app.js → routes/  (auth, permissions, validation, rate limits)
   │
   ▼
Database ── local SQLite file (development) or Turso/libSQL (production)
```

The browser and API share one origin: in development Vite proxies `/api` and `/uploads` to the
backend; in production `npm start` serves both, or Vercel routes `/api/*` to `api/index.js`.

### frontend/

```
frontend/src/
  app/            App.jsx (all routes), guards.jsx (auth/role guards), navigation.js
  pages/          Legacy pages (Home, Learn, Gurbani, Nitnem, Hukamnama, History, Rehat, FAQ,
                  SikhMedia, Sitemap, ComingSoon, NotFound) and React pages in folders:
                  Auth/, Community/, Admin/, Directory/, Gurdwaras/, Gurus/, Media/
  controllers/    The original site's page behaviour (DOM controllers) for the legacy pages
  services/       All data access — api/client.js plus auth, community, media, hukamnama,
                  content (directory + submissions), gurdwaras, admin, search. UI never calls fetch().
  components/     layout/, ui/, common/, community/, admin/, gurdwaras/, map/, media/, images/, status/ …
  context/        AuthContext (signed-in user and permissions, from the server)
  hooks/          useReactPage, usePageController, useAsync, useContentLanguage, usePageMeta …
  data/           Bundled content (Gurbani, Nitnem, Gurus, history, FAQ, comingSoon, siteMap)
  data/i18n/      Hindi and Punjabi translations of the informational content
  motion/         GSAP page motion (respects prefers-reduced-motion)
  assets/         Optimized, self-hosted images
  index.css       Site styles (Tailwind + the site's own CSS)
frontend/public/  Static files copied as-is (icons, manifest, Netlify _redirects)
frontend/tests/   Route-integrity tests (every nav/sitemap link resolves; Coming Soon is honest)
```

- **Two kinds of pages.** The original pages render their HTML and are wired by controllers
  that expect a fresh document; links to and from them are normal page loads
  (`app/navigation.js`, `components/common/SiteLink.jsx`). React pages (community, admin,
  directory, Gurus, video pages, accounts) navigate client-side between themselves.
- **Coming Soon** — sections in the navigation that aren't built yet are listed in
  `frontend/src/data/comingSoon.js` and get an honest placeholder page.

### backend/

```
backend/src/
  index.js        HTTP server entry (npm start / npm run dev:backend)
  app.js          Router, sessions, CSRF check, rate limits, static serving in production
  config.js       All settings from environment variables
  routes/         auth, users, posts, groups, notifications, reports, uploads, hukamnama, media,
                  entries (knowledge directory), gurdwaras, submissions, admin, search
  db/             database.js (connection + versioned migrations), gurdwaraSchema.js, seedMedia.js
  lib/            http, security (passwords, sessions, rate limits), mailer, serialize,
                  entries (directory validation), gurdwaraStore, util
backend/scripts/  create-admin, import-directory, import-gurdwaras, fetch-wikidata-gurdwaras, seed-dev-gurdwaras
backend/seed/     directory/*.json (knowledge directory), gurdwaras/wikidata-gurdwaras.json
backend/tests/    API integration tests (node:test)
backend/data/     Local SQLite database (created on first start; git-ignored)
backend/uploads/  Uploaded images in local development (git-ignored)
```

- **Permissions** live in one table (`shared/roles.js`). The API enforces them on every
  request; the browser only uses them to decide what to show.
  Roles: Guest · User · Moderator · Master Admin, plus per-group Group Admin / Group Moderator.

### shared/

Imported by both the browser and the server, so rules are defined once:
`roles.js` (permission table), `contentTypes.js` (directory schemas + validation),
`community.js` (limits, reactions, report reasons), `gurdwaras.js` (facilities, services,
normalization), `youtube.js` (URL parsing), and `data/media.js` (the verified Kirtan & Katha
catalogue: the frontend's offline fallback and the backend's first-run database seed).

## Database

- **Development:** nothing to set up. On first start the backend creates
  `backend/data/sikhify.db` (Node's built-in SQLite) and imports the Kirtan & Katha catalogue
  from `shared/data/media.js`.
- **Production:** set `SIKHIFY_DATABASE_URL` and `SIKHIFY_DATABASE_AUTH_TOKEN` to use a remote
  Turso/libSQL database (see `docs/VERCEL_DEPLOY.md`).
- **Migrations** are versioned in `backend/src/db/database.js` and applied automatically, once and
  in order, whenever the backend (or any script) opens the database. There is no separate command.
- **Scripts use the same database as the site** — local file by default, Turso when the
  variables above are set.

### Seed data

**Knowledge directory** (personalities, organizations, websites, apps, books, heritage):
source-backed records in `backend/seed/directory/*.json`. Every record has a source and reference
links, and facts that could not be verified are left empty.

```bash
npm run directory:import                      # dry run — shows what would change
npm run directory:import -- --apply           # import as drafts (publish them in /admin/content)
npm run directory:import -- --apply --publish # import and publish
```

Imported records are never marked verified — that is a person's decision in `/admin/content`, so
public pages show them as "Pending" until an admin verifies them. Re-running is safe: records
nobody has touched are updated from the file; records edited or verified in the admin are kept.

**Gurdwaras** (Global Gurdwara Directory, its own relational tables): 297 source-backed records from
Wikidata (CC0) in `backend/seed/gurdwaras/wikidata-gurdwaras.json`.

```bash
npm run gurdwaras:fetch-wikidata                                              # refresh the file
npm run gurdwaras:import -- backend/seed/gurdwaras/wikidata-gurdwaras.json            # dry run
npm run gurdwaras:import -- backend/seed/gurdwaras/wikidata-gurdwaras.json --apply    # import
```

Imported Gurdwaras stay "needs verification" and are **not public** until an admin verifies them
(`/admin/gurdwaras` → Records → filter "Needs verification" → select → "Verify selected").
Public listings show active + verified records only; a record can be verified only by a person
and only with a source.

## Environment

Variables live next to the code that reads them. All are optional for local development.

| File | For | Contains |
| --- | --- | --- |
| `backend/.env` (from `backend/.env.example`) | Server only | Database URL/token, cookies, public URL, email (Resend), admin bootstrap |
| `frontend/.env` (from `frontend/.env.example`) | Build time | `VITE_MAP_*` (public — compiled into the bundle), `SIKHIFY_API_PROXY` (dev server only) |

Never put backend secrets in `frontend/.env` or give them a `VITE_` prefix — every `VITE_` value is
visible to all visitors. In production set at least `NODE_ENV=production` and `SIKHIFY_PUBLIC_URL`.
For password-reset email set `RESEND_API_KEY` and `MAIL_FROM`; without them, development prints
reset links to the server console and admins can issue a reset link from `/admin/users`.

## Features

- **Daily Hukamnama** — one canonical record per date. Admins create, preview, publish,
  unpublish, archive and see the history at `/admin/hukamnama` (optionally prefilled from
  BaniDB). When no record is published for a date, the site falls back to the live BaniDB feed
  with the SGPC's official audio.
- **Media / YouTube** — videos play inside Sikhify (`/media/:videoId`) with the official
  YouTube player on the privacy-enhanced `youtube-nocookie.com` host. If a video's owner has
  disabled embedding, the player says so and offers "Watch on YouTube". The catalogue is in the
  database (managed at `/admin/media`); `shared/data/media.js` is the seed and static fallback.
- **Global Gurdwara Directory** — `/directory/gurdwaras[/country[/state[/city[/slug]]]]`, with
  server-side search (SQLite FTS5) and filters, distance sorting from the visitor's location
  (used for the request only, never stored), a lazy-loaded Leaflet map, "Suggest a Gurdwara"
  (always pending review), and the admin CMS at `/admin/gurdwaras` (records, submission review
  with duplicate comparison, CSV/JSON import with a dry run).
- **Knowledge directory** — events, personalities, organizations, websites, apps, books & research,
  heritage, news and kids resources share one schema file (`shared/contentTypes.js`) used by the
  admin editor, the submission form, the public pages, the seed importer and the API's validation.
  Nothing is published without a source or reference; every record shows its verification status.
- **Submissions** — `/submit`: pending → reviewed by a moderator/admin → approved (draft) or
  verified-and-published, or rejected with a note. Nothing is ever published automatically.
- **Search** — the overlay (`/` or Ctrl/⌘+K) indexes the bundled content and, when the API is
  reachable, adds directory records, published Hukamnamas, public groups/posts and the live
  Media catalogue (`GET /api/search/index`).
- **Three-language content** — informational content can be read in English, Hindi or Punjabi.

## Images

- **Where:** `frontend/src/assets/images/{gurus,history,gurbani}/` — optimized, self-hosted WebP at
  several widths plus one JPEG fallback each. Provenance and licences are in
  `frontend/src/data/guruArtwork.js`, `heroArt.js` and `imageCredits.js`, shown on `/image-credits`.
- **The Ten Gurus' artwork** is public-domain museum work — artistic depictions made after the
  Gurus' lifetimes, labelled as such. If a file is missing, a symbolic emblem is shown instead;
  nothing is ever AI-generated.
- **Adding artwork:** only use works whose licence and holding institution you can verify.

## Hosting

**Vercel + Turso** (recommended): see [`docs/VERCEL_DEPLOY.md`](docs/VERCEL_DEPLOY.md).
`vercel.json` builds the frontend to `frontend/dist` and routes `/api/*` and `/uploads/*` to the
function in `api/index.js`.

**Any Node host with a persistent disk** (the SQLite database and `backend/uploads/` must survive
restarts — back both up):

```bash
npm ci && npm run build
NODE_ENV=production SIKHIFY_PUBLIC_URL=https://your-domain npm start   # listens on $PORT (default 8787)
```

Put it behind HTTPS (cookies are Secure in production) and set `SIKHIFY_TRUST_PROXY=true` behind a
reverse proxy.

**Static-only hosting** (`netlify.toml` / `frontend/public/_redirects`) still works for everything
that doesn't need the API: Gurbani, Nitnem, Hukamnama (from BaniDB), Learn, History, Rehat, FAQ,
Media (bundled catalogue) and the Ten Gurus. Community, accounts, admin and the directory then
show a clear "not available" state.
