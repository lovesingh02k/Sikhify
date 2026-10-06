# Sikhify — platform integration report

Date: 2 October 2026 · Backup of the pre-change project: `../sikhify_migration_backup_2026-10-01/`
(everything except `node_modules`; nothing in it was modified).

## Summary

The existing Sikhify site was kept intact (same pages, content, design, animations, search,
dark mode, translations, audio, bookmarks) and extended with:

- a Node API with a SQLite database (`server/`) — real accounts, sessions, roles and persistence;
- the community (feed, posts, comments, reactions, sharing, saved posts, groups, notifications,
  reports, moderation) and profiles;
- the Sikhify Admin Panel (`/admin`), including daily Hukamnama management;
- in-site YouTube playback for Media, with an honest fallback when embedding is disabled;
- the knowledge directory (Gurdwaras, events, personalities, organizations, websites, apps,
  books/research, heritage, news, kids), community submissions with review, and the Ten Gurus
  profiles;
- global search over database records as well as bundled content.

`npm test` (22 API/parser tests), `npm run build`, an 87-page × viewport browser sweep and an
18-step end-to-end browser run all pass — see *Tests performed*.

## Inputs inspected

- Current Sikhify source (`src/`, `public/`, configs, `dist/`, README, previous report).
- Reference source `src.zip` — a Next.js/TypeScript/shadcn "Sangat" app. Its data layer is
  mock-only (invented users with pravatar photos, invented analytics numbers, services that
  return `true` without saving, and a localStorage "preview role" switcher instead of
  authentication). **Taken from it:** the domain model (users, groups and members, posts,
  comments, reactions, saves, notifications, reports), the role/permission matrix, report
  reasons, group categories and the page set. **Not taken:** any data, branding, header,
  visual identity, UI library or mock service.
- `Sikhify_Master_Website_Structure.docx` was **not present** in the project or Downloads;
  the directory structure follows the section list in the brief instead.
- No AI Assistant exists in the current project (no code, no API keys) — nothing to preserve,
  and none was invented. The newsletter is an honest "coming soon" form and was left as is.

## 1. Final architecture

- **Frontend** — Vite + React 19 + React Router 7 + Tailwind 3 + GSAP (unchanged stack).
  Legacy pages keep their HTML + DOM controllers (`src/controllers/`); new sections are React
  pages. `app/navigation.js` + `SiteLink` make every transition between the two a full page
  load, so legacy controllers always start on a fresh document.
- **Backend** — `server/` on `node:http` + `node:sqlite` (no framework, no native modules).
  Versioned migrations (`server/db/database.js`), opaque session cookies, scrypt password
  hashes, CSRF header check, rate limits, magic-byte image validation.
- **Shared** — `shared/roles.js`, `shared/contentTypes.js`, `shared/community.js`,
  `shared/youtube.js` are imported by both browser and server, so permissions, schemas and
  validation are defined once.

## 2. Files created

- `server/` — `index.js`, `app.js`, `config.js`; `db/database.js`, `db/seedMedia.js`;
  `lib/http.js`, `security.js`, `serialize.js`, `mailer.js`, `util.js`;
  `routes/auth, users, posts, groups, notifications, reports, uploads, hukamnama, media,
  entries, submissions, admin, search`; `scripts/create-admin.js`.
- `shared/roles.js`, `contentTypes.js`, `community.js`, `youtube.js`.
- `scripts/dev.js`, `tests/api.test.js`, `tests/youtube.test.js`, `.env.example`.
- `src/app/navigation.js`, `src/app/guards.jsx`; `src/context/AuthContext.jsx`.
- `src/services/` — `api/client.js`, `auth/authService.js`, `community/index.js`,
  `media/mediaService.js`, `hukamnama/hukamnamaService.js`, `content/contentService.js`,
  `admin/adminService.js`, `search/searchService.js`, `index.js`.
- `src/hooks/useReactPage.js`, `useAsync.js`, `useContentLanguage.js`; `src/utils/format.js`.
- `src/components/` — `ui/` (Icon, Dialog + ConfirmDialog, Form, States, Avatar, Pagination),
  `common/` (PageHero, SiteLink, RichText, SchemaFields, LanguageSwitch),
  `layout/AccountMenu.jsx`, `media/YouTubePlayer.jsx`, `hukamnama/HukamnamaPreview.jsx`,
  `admin/AdminKit.jsx`, `community/` (CommunityLayout, PostComposer, PostCard, PostList,
  CommentSection, ReportDialog, ImagePicker, GroupCard).
- `src/pages/` — `Auth/` (Login, Signup, ForgotPassword, ResetPassword, AuthShell),
  `Community/` (Feed, Discover, Groups, GroupForm, GroupPage, GroupMembers, PostPage, Profile,
  Saved, Notifications, AccountSettings), `Admin/` (AdminLayout, Dashboard, Analytics, Users,
  Posts, Comments, Groups, Reports, Submissions, Content, EntryEditor, Media, HukamnamaList,
  HukamnamaEditor, Settings), `Directory/` (DirectoryHub, DirectoryList, EntryDetail,
  SubmitPage), `Gurus/` (GurusIndex, GuruProfile), `Media/VideoPage.jsx`.

## 3. Files modified

- `src/App.jsx` → moved to `src/app/App.jsx` (all routes, legacy guard, redirects).
- `src/services/*Controller.js` → moved to `src/controllers/` (imports updated). Changed:
  `coreController.js` (search merges database records; new pages indexed; video results open
  in-site), `homeController.js` (Hukamnama via the shared service; upcoming events),
  `hukamnamaController.js` (shared service; admin records, paragraph meanings, source line),
  `mediaController.js` (videos open `/media/:id` instead of a new YouTube tab).
- `src/pages/SikhMedia.jsx` (live catalogue, copy), `Home.jsx` (Community quick link, Kids
  card, events panel), all legacy pages (controller import paths only).
- `src/components/layout/Header.jsx` (nav: + Directory, Gurus, Kids, Groups, Events, News,
  Submit; Store moved under More; account area), `Footer.jsx` (built sections lose "Soon").
- `src/components/status/StatusView.jsx`, `src/hooks/usePageController.js` (shared
  once-per-document chrome guard), `src/hooks/usePageMeta.js` (canonical + og:url).
- `src/data/comingSoon.js` (removed: Community, Events, Books, Kids Zone, Sign In),
  `src/data/siteMap.js` (new sections), `src/data/i18n/{hi,pa}.js` (comment paths).
- `src/index.css` — appended a "PLATFORM ADDITIONS" section (forms, tables, pills, layout,
  posts, video player, charts — all on existing tokens, light + dark); one fix: `.sk-section`
  now sets vertical padding only (it previously removed the container's side gutters, so
  page content touched the screen edges on phones — on the existing pages too).
- `src/main.jsx` (AuthProvider), `vite.config.js` (proxy `/api`, `/uploads`), `package.json`
  (scripts, engines), `.gitignore` (database + uploads), `README.md`, this report.

## 4. Files removed

None. (Controllers and `App.jsx` were moved, not deleted.) `src.zip` was left in place.

## 5. Existing features preserved

Homepage (hero, quick links, Today's Hukamnama, panels, content cards, newsletter notice),
Learn, Gurbani Library, Nitnem, Hukamnama (archive, date navigation, SGPC audio, reading mode,
bookmarks, share, print), Sikh History, Rehat Maryada, FAQ, Kirtan & Katha (search, category
filters, A–Z, artist views), Sitemap, Coming Soon pages, 404/500/network screens, global search
(including Ang and date shortcuts), dark/light mode, Hindi/Punjabi content, GSAP motion with
`prefers-reduced-motion`, legacy `.html` URLs, SPA fallback files.

## 6. Features migrated from the reference source

Domain model and flows for posts, comments (one level of replies), reactions, saves, shares,
groups (public/private, roles, join requests, member management), notifications, reports and
moderation, user/admin role matrix, admin sections (dashboard, users, posts, comments, groups,
reports, analytics, settings). All re-implemented against the real API in Sikhify's design.

## 7. Community functionality

Sign up / sign in / sign out / forgot + reset password; profiles (photo upload, name, bio,
interests, location shown only if opted in, posts, groups, saved posts, private activity);
feed (public + your groups), Discover (popular in 30 days, active groups, member search);
posts with up to 4 images, edit/delete own, Like/Support/Insightful reactions, comments with
replies, likes, edit/delete, share (native share or copy link, counted), save, report;
groups (create, cover image, about, public/private, join/leave/request, approve, roles,
remove/ban, settings, delete); notifications (reactions, comments, replies, join requests and
approvals, role changes, moderation, report outcomes, submission reviews; unread badge).

## 8. Admin functionality

`/admin`: dashboard (live counts, today's Hukamnama status, staff activity log), users
(search/filter; Master Admin: roles, suspend, ban, reinstate, reset link), reports (review →
hide/delete/suspend → resolve or dismiss), posts and comments (hide/restore/delete), groups
(suspend/reinstate), submissions (review, correct, approve as draft / publish / reject with
note), Hukamnama, media (artists, videos, categories, YouTube lookup), all content + Gurdwaras,
events, personalities, news (create/edit/verify/publish/archive/delete), analytics (30-day
daily charts with table views, breakdowns — all counted from rows), settings (registration,
read-only community, submissions on/off, community notice — each enforced by the API).
Unauthorized users get 401/403 from the API and a 403 screen in the browser.

## 9. Hukamnama implementation

Table `hukamnamas` (date, Ang, Raag, writer, Gurmukhi, transliteration, Punjabi, Hindi,
English, audio URL, Katha URL, source, status, created/updated by and at, published at) with a
partial unique index: one published record per date. `hukamnama_revisions` stores a snapshot
of every create/update/publish/unpublish/archive. Editor: create, edit, draft, preview (same
normalization as the public page), publish (with an explicit "replace" when another record is
published for that date), unpublish, archive, restore, delete (Master Admin, non-published),
search and date-range filter, history with "load this version". "Fill from BaniDB" and "Use
the SGPC official recordings" prefill fields for review. The homepage and `/hukamnama` share
`hukamnamaService.getHukamnama()`: admin record first, else live BaniDB. "Today" is India time.

## 10. Media implementation

Catalogue in `media_categories`, `media_artists`, `media_videos`, seeded once from
`src/data/media.js` (24 artists; IDs previously verified). `GET /api/media` returns the same
shape as the bundled file, so the existing Media page, filters, A–Z and search work unchanged;
on static hosting the bundled file is used. Artists gained optional style, official links and
references; videos gained an optional description. Kirtani/Jatha submissions become draft
artists.

## 11. YouTube embed implementation

`shared/youtube.js` — `getYouTubeVideoId()` (watch?v=, youtu.be/, embed/, shorts/, live/, v/,
youtube-nocookie, bare ID; rejects look-alike hosts and invalid IDs), embed/watch/thumbnail
helpers. `YouTubePlayer.jsx` — official IFrame Player API on `youtube-nocookie.com`, 16:9
responsive frame, loading state (thumbnail + spinner), YouTube's own controls and fullscreen
plus accessible Play/Pause and Fullscreen buttons, error states by YouTube error code
(2, 5, 100, 101/150/153 → "This video cannot be embedded by its owner." + "Watch on YouTube"),
and a plain official embed if the API script is blocked. `/media/:videoId` shows the player,
title, artist link, category, channel, description, artist info and related videos. Only
catalogued videos play under the Sikhify name. `/artist/:id` opens the artist view.

## 12. Search implementation

The existing overlay and scoring are unchanged. On first open it also loads
`GET /api/search/index` (published directory records, published Hukamnamas, active public
groups, recent public posts, live Media catalogue) and merges them into the same index; new
pages (Gurus, Directory sections, Community, Groups, Submit) are indexed as pages. Private
groups, hidden posts and drafts are never indexed. Offline/static: bundled content only.

## 13. Routes

Legacy: `/`, `/learn-sikhism`, `/gurbani`, `/nitnem`, `/hukamnama`, `/sikh-history`,
`/rehat-maryada`, `/faq`, `/sikh-media`, `/sitemap` (+ `.html` aliases) and Coming Soon pages.
Aliases: `/learn`, `/history`, `/rehat`, `/media` → canonical pages; `/signin` → `/login`;
`/kids-zone` → `/kids`; `/artist/:id`; `/directory/:type` → `/:type`.
New: `/media/:videoId`; `/gurus`, `/gurus/:id`; `/directory`; `/gurdwaras`, `/events`,
`/personalities`, `/organizations`, `/websites`, `/apps`, `/books`, `/heritage`, `/news`,
`/kids` (+ `/:type/:slug`); `/submit`; `/login`, `/signup`, `/forgot-password`,
`/reset-password`; `/community`, `/community/discover`, `/community/groups`(`/new`),
`/community/groups/:slug`(`/members`, `/settings`), `/community/post/:id`,
`/community/profile/:username`, `/community/saved`, `/community/notifications`,
`/community/settings`; `/admin` + `users`, `posts`, `comments`, `groups`, `reports`,
`submissions`, `content`(`/new`, `/:id`), `gurdwaras`, `events`, `personalities`, `news`,
`media`, `hukamnama`(`/new`, `/:id`), `analytics`, `settings`.

## 14. Services

`authService`, `userService` (profiles), `postService`, `commentService`, `groupService`,
`notificationService`, `reportService`, `uploadService`, `mediaService`, `youtubeService`,
`hukamnamaService`, `entryService` with `gurdwaraService` / `eventService` /
`personalityService` / `newsService` bound to their types, `submissionService`,
`adminService`, `searchService` — all exported from `src/services/index.js`.

## 15. Components

See *Files created*. Reusable: `YouTubePlayer`, `HukamnamaPreview`, `PostCard`,
`CommentSection`, `SchemaFields` (any directory type's form), `Dialog`/`ConfirmDialog`
(native `<dialog>`), `Form` fields (labels, help and errors wired with ARIA), `States`
(loading / empty / error / service unavailable), `AdminKit` (stat tile, bar chart with hover +
table view, ranked bars).

## 16. Libraries reused

React, React DOM, React Router, Tailwind CSS, GSAP (ScrollTrigger, SplitText), Vite,
PostCSS/Autoprefixer. Node built-ins on the server: `node:http`, `node:sqlite`,
`node:crypto` (scrypt, random tokens), `node:test`.

## 17. New libraries installed

None. (`playwright-core` was used for browser testing from a temporary folder outside the
project, driving the installed Microsoft Edge; it is not a project dependency.)

## 18. Backend requirements

A Node.js ≥ 22.13 process running `npm start` behind HTTPS, with a persistent disk for the
database and uploads. Outbound HTTPS from the server to `www.youtube.com` (admin video
lookup) and, optionally, `api.resend.com` (email). Browsers fetch BaniDB, SGPC audio,
YouTube and Google Fonts directly, as before.

## 19. Database requirements

SQLite file (default `server/data/sikhify.db`, WAL mode), created and migrated automatically.
Tables: users, sessions, password_resets, groups, group_members, posts, post_reactions,
saved_posts, comments, comment_reactions, notifications, reports, moderation_log, uploads,
settings, hukamnamas, hukamnama_revisions, media_categories, media_artists, media_videos,
entries, submissions, schema_migrations. Back up the database file and `server/uploads/`
together. Single-server deployment; moving to Postgres later means re-implementing
`server/db` and the SQL in `server/routes` (the HTTP API stays the same).

## 20. Environment variables

All optional in development; see `.env.example`: `NODE_ENV`, `PORT`, `HOST`,
`SIKHIFY_DB_PATH`, `SIKHIFY_UPLOAD_DIR`, `SIKHIFY_PUBLIC_URL` (required in production),
`SIKHIFY_COOKIE_SECURE`, `SIKHIFY_TRUST_PROXY`, `SIKHIFY_SESSION_DAYS`,
`SIKHIFY_SERVE_STATIC`, `RESEND_API_KEY`, `MAIL_FROM`, `SIKHIFY_ADMIN_PASSWORD`,
`SIKHIFY_API_PROXY`. No secrets are in the repository.

## 21. Tests performed

- `npm test` — 22 passing: 19 API integration tests over real HTTP (signup validation,
  login/logout, CSRF refusal, guest/user/moderator/admin boundaries incl. moderators not
  seeing emails, posts incl. HTML escaping and ownership, reactions/saves/shares and
  notifications, threaded comments and their permissions, public/private groups and
  group-admin scope, reports → moderation, suspension and ban, the full Hukamnama lifecycle
  and history, media catalogue and URL validation, directory validation and publish rules,
  submissions review, image upload type sniffing and ownership, search privacy, enforced
  settings, password reset single-use + session revocation, analytics from real rows) and
  3 YouTube parser tests (all URL forms; look-alike hosts and bad IDs rejected).
- Browser sweep (Microsoft Edge, headless) of 29 routes × desktop 1366px / tablet 820px /
  mobile 390px: 87/87 with no console errors, no page errors, no failed internal requests,
  no horizontal overflow and non-empty content (a run that hit a local network drop was
  re-run).
- End-to-end browser run, 18/18: sign up through the form; post with link and escaped HTML;
  react, save, comment, edit; create a group and post in it; second member joins, replies and
  reports; notification badge and list; regular user refused at /admin; admin dashboard
  counts; report resolved by hiding (hidden for others, notice for author); promotion to
  moderator (admin yes, settings no); Hukamnama create → preview → publish → visible on the
  homepage card and Hukamnama page → unpublish → BaniDB fallback → archive, with history;
  Media card opens `/media/:id` with a `youtube-nocookie.com` embed; an unplayable video shows
  "This video cannot be embedded by its owner." with "Watch on YouTube"; Gurdwara submission →
  verified publish → directory country filter → detail → found by global search; theme
  toggle; legacy ↔ React navigation; sign out.
- Screens checked visually at desktop and mobile widths (video page, Guru profile, community,
  directory, Hukamnama).
- `npm run dev` checked: API + Vite start and `/api` is proxied.

## 22. Build result

`npm run build` succeeds. Every route is its own chunk; the entry chunk is 271 KB (was
449 KB). Vite still warns that `nitnem-text` (866 KB, the full Nitnem text) is over 500 KB —
it was already that size, is loaded only on the Nitnem page, and is left as is.

## 23. Remaining limitations

- **Content is empty by design.** No Gurdwaras, events, personalities, news, books, etc. were
  invented; those sections show empty states until records are added or submissions approved.
  Guru profiles show only existing Sikhify content (Sakhis and references are empty states).
- **Hosting changes**: the API needs a Node host with persistent storage; Vercel/Netlify
  static hosting keeps the reading features but not accounts/community/admin/directory.
- **Email** is not sent until `RESEND_API_KEY`/`MAIL_FROM` are set (admins can issue reset
  links meanwhile). No email verification of new accounts.
- Rate limits are in-memory (per process); notifications are polled every minute (no
  push/websocket); search index for database records is downloaded whole (fine at current
  scale — switch to SQLite FTS5 when it grows).
- No `lint` or `typecheck` scripts exist in this JavaScript project (none were configured
  before either).
- Media categories can be added but not renamed or removed from the admin UI yet.
- The Ten Gurus pages follow the Hindi/Punjabi preference; the rest of the new interface is
  English, as the existing interface is.
- Browser testing used headless Edge (Chromium); Safari and Firefox were not tested.

---

## Update — visual content, the Ten Guru Sahibs and performance (2 October 2026)

**Guru artwork.** All ten Gurus have public-domain museum artwork, each checked on Wikimedia Commons
for licence, institution and accession, and viewed before use: Museum Rietberg, Zurich (Pahari series,
c. 1830–50, possibly early 18th c.) for Gurus 1, 2, 3, 5, 6, 7, 8; Government Museum and Art Gallery,
Chandigarh for Guru Ram Das Ji (acc. F-42, c. 1800) and Guru Tegh Bahadur Ji (acc. 2678); Victoria
Memorial Hall, Kolkata for Guru Gobind Singh Ji (C-784, c. 1800). Rejected: a Seattle Art Museum file
titled "Guru Tegh Bahadur" whose description identifies Raja Chattar Singh of Chamba, and a multi-figure
Guru Gobind Singh painting that couldn't be cropped without guessing. All are labelled as artistic
depictions made after the Gurus' lifetimes; a symbolic emblem replaces any image that fails.
Section art: William Carpenter, *The Golden Temple at Amritsar*, 1854 (V&A, Sikh History header) and an
illuminated Guru Granth Sahib folio digitized by the Panjab Digital Library (Gurbani header).
Every source is listed on `/image-credits`.

**Optimization.** 12 originals (8.0 MB) → 50 self-hosted files (WebP widths + JPEG fallback); a Guru
card image is 6–17 KB. Homepage photos gained responsive `srcset`.

**Measured (headless Edge):**
- Home hero on phones 310 KB → 155 KB
- Video page JS 3.6 MB → 0.5 MB (YouTube player loads on Play)
- Guru profile JS 793 KB → 550 KB (Gurbani data loads when its section nears the screen)
- Desktop CLS 0.26–0.33 → ≤0.034 (route area reserves the viewport; page controllers render before
  first paint)

**Checked and not changed:** a suspected scroll-reveal bug turned out to be a screenshot artifact; the
original animation code was restored unchanged. YouTube WebP thumbnails are missing for 6 catalogued
videos and save ~3%, so thumbnails stay JPEG with `srcset`.

**Tests:** 22/22 API tests, 72/72 page × viewport browser sweep, 19/19 end-to-end flows (including
"no YouTube code before Play", Guru artwork alt text, no broken images, image credits).

## Update — Global Gurdwara Directory (2 October 2026)

One directory, not two: Gurdwaras moved out of the generic `entries` table into dedicated
relational tables (migration 5 moves any existing Gurdwara entries and pending Gurdwara
submissions across, then removes them from the generic directory). Old `/gurdwaras` URLs redirect.

**Database (migration 5, `server/db/gurdwaraSchema.js`)** — `countries` (249 ISO countries,
names from `Intl.DisplayNames`), `states_regions`, `cities`, `gurdwaras` (status
active / temporarily_closed / permanently_closed; verification verified / needs_verification;
normalized name/phone/website for duplicate detection; `archived_at`; audit columns; indexes incl.
a partial index for public listings), `facilities`, `services`, `gurdwara_facilities`,
`gurdwara_services`, `gurdwara_images`, `gurdwara_sources`, `gurdwara_verification`,
`gurdwara_updates`, `gurdwara_submissions`, and the FTS5 index `gurdwaras_fts`.
A `distance_km` SQL function sorts by distance.

**API** — public: `GET /api/gurdwaras` (search/filters/sort/page), `/meta`, `/locations`,
`/countries`, `/place`, `/by-path/:country/:state/:city/:slug`; members:
`POST /api/gurdwaras/submissions`, `GET /api/me/gurdwara-submissions`,
`PATCH /api/gurdwaras/submissions/:id`; staff: `/api/admin/gurdwaras` (list, create, get, edit,
`/status`, `/verify`, `/archive`, `/sources`, `/images`, `/check-duplicates`, `/duplicates`,
`/import`, `/stats`), `/api/admin/gurdwara-sources/:id`, `/api/admin/gurdwara-images/:id`,
`/api/admin/gurdwara-submissions[/:id/review]`.

**Routes** — `/directory/gurdwaras`, `/directory/gurdwaras/:country[/:state[/:city]]`,
`/directory/gurdwaras/:country/:state/:city/:slug`, `/directory/gurdwaras/suggest`,
`/admin/gurdwaras`, `/admin/gurdwaras/new`, `/admin/gurdwaras/:id`; `/gurdwaras` and
`/gurdwaras/:slug` redirect.

**Tests** — `tests/gurdwaras.test.js` (11 API tests: 0 records, 1 record, 120 records with filters,
sorting, distance and pagination, duplicates, the submission workflow, import, admin, 10,525
records with all queries under ~65 ms, migration); browser flows (27 directory steps + the 19
existing platform flows); a 66-page sweep at desktop, tablet and mobile with no console errors.

**Limitations** — the directory ships empty (no data was invented); OpenStreetMap's public tiles
suit modest traffic only; a dedicated 1,000-record step isn't in the tests (120 and 10,525 are);
rate limits are in memory (one server process).

## Fix — Gurdwara Directory showed "0 Gurdwaras Found" (2 October 2026)

**Root cause:** the `gurdwaras` table in `server/data/sikhify.db` was empty (0 rows; no
cities, sources or submissions). The API, filters, distance sorting and UI were returning the
correct answer for an empty table. There was no way to load source-backed data apart from the
admin import screen.

**Fixed / added**
- Source-backed data: `npm run gurdwaras:fetch-wikidata` builds
  `server/seed/gurdwaras/wikidata-gurdwaras.json` (297 records, CC0, every record linked to its
  Wikidata item and, where one exists, its Wikipedia article; unknown fields left empty).
  `npm run gurdwaras:import -- <file> [--apply]` imports CSV/JSON (dry run by default; re-runs
  update instead of duplicating). Imported records are "needs verification".
- Migration 6: `gurdwaras.district`, `gurdwaras.external_ref` (unique), `states_regions.code`
  (ISO 3166-2), indexes on place and status, search index now covers district.
- Honest empty states: the API reports `alsoMatching` (records hidden only because they await
  verification or are closed) and the page offers to show them; API failures show "Unable to load
  Gurdwaras" + Try again.
- Search: "Gurudwara/Gurdwara", "Sri/Shri", "Sahib/Saheb" spellings match each other.
- Admin: "Verify selected" (bulk, note required, each record needs a source); District field.
- Development fixtures: `NODE_ENV=development npm run gurdwaras:dev-fixtures [-- --remove]`;
  never served by a production server.
- Development query log (`SIKHIFY_DEBUG_QUERIES`, on in development): filters, SQL conditions,
  totals — never credentials or visitor coordinates.
