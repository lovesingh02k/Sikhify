# Sikhify — Vercel deployment

This build is prepared for a **single Vercel deployment**:

- Vite/React frontend (`frontend/`) → Vercel static output (`frontend/dist/`)
- Node.js API (`backend/src/`) → Vercel Function (`/api/index.js`, a thin entry that stays at the repository root because Vercel requires it there)
- Persistent database → Turso/libSQL
- Uploaded image bytes → `uploads.data` in the database

## 1. Create the production database

Create a Turso/libSQL database from the Turso dashboard and copy:

- database URL, for example `libsql://your-db.turso.io`
- database auth token

Do not put either value in source code or `.env.example` with real credentials.

## 2. Add Vercel environment variables

In Vercel → Project → Settings → Environment Variables, add these for **Production** (and Preview if you want preview accounts/data):

```text
SIKHIFY_DATABASE_URL=libsql://your-db.turso.io
SIKHIFY_DATABASE_AUTH_TOKEN=your-turso-token
SIKHIFY_COOKIE_SECURE=true
SIKHIFY_TRUST_PROXY=true
SIKHIFY_SESSION_DAYS=30
```

Optional password-reset email support:

```text
RESEND_API_KEY=...
MAIL_FROM=Sikhify <no-reply@your-domain>
```

Optional explicit public URL:

```text
SIKHIFY_PUBLIC_URL=https://your-domain.com
```

If `SIKHIFY_PUBLIC_URL` is omitted on Vercel, the server derives the public URL from Vercel's deployment URL variables.

## 3. Deploy

Push the project to GitHub and import the repository into Vercel.

Build settings are already in `vercel.json`:

```text
Framework: Vite
Build command: npm run build
Output directory: frontend/dist
```

The `/api/*` and `/uploads/*` routes are sent to the Node function before the SPA fallback.

## 4. Create the first admin

Run the admin bootstrap locally against the **same Turso database**. PowerShell example:

```powershell
$env:SIKHIFY_DATABASE_URL="libsql://your-db.turso.io"
$env:SIKHIFY_DATABASE_AUTH_TOKEN="your-turso-token"
$env:SIKHIFY_ADMIN_PASSWORD="use-a-strong-password"

npm install
npm run admin:create -- --email "admin@example.com" --name "Sikhify Admin" --username "admin"
```

The command can also promote an existing account:

```powershell
npm run admin:create -- --email "existing@example.com"
```

## 5. Verify production

Open these URLs after deployment:

```text
/api/health
/login
/signup
/community
/directory
/admin
```

`/api/health` should return:

```json
{"ok":true,"service":"sikhify-api"}
```

Then test:

1. create a normal account
2. log in/out
3. refresh the page while logged in
4. create a community post
5. upload a profile/post image
6. log in with the admin account
7. open the admin panel

## Important

Do not use the local `backend/data/sikhify.db` as production storage on Vercel. Vercel Functions are stateless; production records must live in the remote database. This project therefore switches to libSQL/Turso when `SIKHIFY_DATABASE_URL` is present.

## Loading directory data into production

The import scripts write to the same database the site uses, so with the Turso variables set in your shell they load straight into production:

```powershell
$env:SIKHIFY_DATABASE_URL="libsql://your-db.turso.io"
$env:SIKHIFY_DATABASE_AUTH_TOKEN="your-turso-token"

npm run directory:diagnose -- --no-http                   # what the database holds now (read-only)

npm run directory:import                                  # dry run
npm run directory:import -- --apply --publish             # knowledge directory (published, "Pending" verification)

npm run gurdwaras:import -- backend/seed/gurdwaras/wikidata-gurdwaras.json            # dry run
npm run gurdwaras:import -- backend/seed/gurdwaras/wikidata-gurdwaras.json --apply    # Gurdwaras (need verification in the admin)

npm run gurdwaras:import-historic                                                     # dry run
npm run gurdwaras:import-historic -- --apply --verify --by <your-admin-email>         # Panj Takht + historic Gurdwaras, verified by you

npm run directory:diagnose -- --api https://<your-site>.vercel.app                    # check the deployed API
```

Every script prints `Destination: TURSO/LIBSQL (<host>)` or `LOCAL SQLite (<file>)` before it writes — check it.
Re-running any import is safe: records are matched by `external_ref` / slug and updated, never duplicated.

**Why the public directory can show "0 Gurdwaras Found":** the public listing shows only records that are
*active and verified*. The Wikidata import alone creates only "needs verification" records, so the list stays
empty until the historic import runs with `--verify` (or an admin verifies records in `/admin/gurdwaras`).
`--verify` records your name in each record's verification log, so use it only for a file whose sources you accept.

**`backend/.env` and local development:** if `SIKHIFY_DATABASE_URL` is in `backend/.env`, `npm run dev` also uses
Turso (the API prints `database: Turso/libSQL` on start). To develop against `backend/data/sikhify.db`, comment out
the two Turso lines in `backend/.env` (`# SIKHIFY_DATABASE_URL=…`) and keep them in your shell only when importing.
`npm run directory:diagnose -- --db local` reads the local file regardless.
Tests (`npm test`) always use throwaway local databases, whatever `backend/.env` says.

## Release: guest submissions, homepage banners, directory visibility (schema 12)

Schema migration 12 runs automatically on the first request after deploying. It is additive only
(new columns with defaults and new tables — no existing row is changed):
`submissions`/`gurdwara_submissions` get `is_guest`, `guest_name`, `guest_email`, `reference`, `fingerprint`;
`media_videos` gets `duration_seconds`, `checked_at`; a new `home_banners` table is created.

1. **Back up first.** Turso: `turso db shell <db> .dump > sikhify-before-schema12.sql` (or create a
   branch/point-in-time restore point in the Turso dashboard).
2. **Deploy** (push to the Vercel-connected branch, or `vercel --prod`). Then check
   `GET /api/health` → `"schemaVersion": 12`.
3. **Optional data steps** (run locally with `backend/.env` pointing at production; each is a dry run
   unless `--apply` is given, writes a rollback file to `backend/backups/`, and runs in one transaction):
   - Gurdwara verification evidence audit:
     `npm run gurdwaras:audit-verification` → review the report →
     `npm run gurdwaras:audit-verification -- --apply --actor <master-admin email>`
     Rollback: `node backend/scripts/audit-gurdwara-verification.js --rollback backend/backups/<file>.json`
   - Gurbani media lengths and clip replacements:
     `node backend/scripts/curate-media.js` → `node backend/scripts/curate-media.js --apply`
     Rollback: `node backend/scripts/curate-media.js --rollback backend/backups/<file>.json`
4. **Smoke test:** homepage (no banner section until one is published), `/directory/gurdwaras`
   lists every published record with "Needs verification" labels, `/directory/gurdwaras/suggest`
   works signed out, Admin → Submissions shows both queues, Admin → Homepage banners.

Notes
- Guest submissions are rate-limited per client IP. On Vercel the real IP comes from `X-Forwarded-For`
  automatically; on any other host behind a proxy set `SIKHIFY_TRUST_PROXY=true`, otherwise every
  visitor shares one limit.
- Public Gurdwara listings now show every published (not archived) record; "Verified only" is a filter.
  Archiving a record is how it is unpublished.

### Data steps already applied to production (2026-10-10)
Run from a local checkout with `SIKHIFY_SKIP_MIGRATIONS=1` (data jobs never change the schema):
- Recovery point: `node backend/scripts/backup-database.js` → `backend/backups/db-2026-10-09T20-12-37-987Z.json` (keep private; not in git).
- Evidence audit: 62 Wikidata records verified (rollback file `backend/backups/gurdwara-verification-2026-10-09T20-15-19-215Z.json`:
  `SIKHIFY_SKIP_MIGRATIONS=1 node backend/scripts/audit-gurdwara-verification.js --rollback <that file>`).
- Chhattisgarh import: `node backend/scripts/import-gurdwaras.js backend/seed/gurdwaras/chhattisgarh-gurdwaras.json --apply` (17 new,
  all "needs verification"; re-running changes nothing). To undo, delete the rows whose `external_ref` appears in that file.
- Not applied yet: `node backend/scripts/curate-media.js --apply` (Gurbani media lengths + clip replacements).

Server configuration: Admin → Settings shows, to Master Admins only, whether each server setting is present
(never its value). Missing `SIKHIFY_PUBLIC_URL` (outside Vercel) or `RESEND_API_KEY`/`MAIL_FROM` are flagged there
and logged at start-up; set them in the host's environment variables and redeploy.

### Data steps applied to production (second pass, 2026-10-10)
All with `SIKHIFY_SKIP_MIGRATIONS=1`, after `node backend/scripts/backup-database.js` (→ `backend/backups/db-2026-10-09T20-50-18-651Z.json`):
- Evidence audit v2 (OpenStreetMap map listing as independent corroboration): 56 more Wikidata records verified.
  Rollback: `node backend/scripts/audit-gurdwara-verification.js --rollback backend/backups/gurdwara-verification-2026-10-09T21-01-35-985Z.json`
- Photos: `node backend/scripts/add-gurdwara-photos.js --apply` — 69 free-licensed Wikimedia Commons photos (the image Wikidata gives for that
  same Gurdwara), credited. Rollback: `… --rollback backend/backups/gurdwara-photos-2026-10-09T21-05-00-920Z.json`
- Directory entries: `node backend/scripts/audit-directory-entries.js --apply --actor <admin>` — 19 apps/websites/organizations whose links answer.
  Rollback: `… --rollback backend/backups/entries-verification-2026-10-09T21-10-17-456Z.json`

### Data steps applied to production (third pass, 2026-10-10)
All with `SIKHIFY_SKIP_MIGRATIONS=1`, each after a fresh `node backend/scripts/backup-database.js`
(→ `backend/backups/db-2026-10-09T22-18-12-339Z.json` and `db-2026-10-09T22-27-21-244Z.json`):
- Media curation: `node backend/scripts/curate-media.js --apply` — durations stored, 6 short clips replaced (originals archived).
  Rollback: `… --rollback backend/backups/media-curation-2026-10-09T22-13-50-609Z.json`
- Directory entries fact check: `node backend/scripts/audit-directory-facts.js --apply --actor <admin>` (facts must appear in the cited Wikipedia article).
  Rollback: `… --rollback backend/backups/entries-facts-2026-10-09T22-16-37-531Z.json`
- Evidence audit v3 (a Commons photograph of the Gurdwara whose camera geotag is ≤300 m from the Wikidata location): 7 more records verified.
  Rollback: `node backend/scripts/audit-gurdwara-verification.js --rollback backend/backups/gurdwara-verification-2026-10-09T22-23-19-558Z.json`
- Festival dates: `node backend/scripts/verify-observances-sgpc.js --apply --actor <admin>` — 15 dates checked against the official
  SGPC Nanakshahi Calendar 558 (https://sgpc.net/storage/2026/03/Calender_2026-1.pdf) and marked verified; the 13 observances with an
  upcoming verified date were published. The Guru Hargobind Sahib Ji candidate 2027-02-19 is NOT confirmed (SGPC: 16 Harh = 2026-06-30;
  7 Phagun = 2027-02-19 is Guru Har Rai Ji's Parkash) and stays unverified with a note. The Nanakshahi new year 2027 falls in calendar 559
  (not yet published) and stays unverified.
  Rollback: `node backend/scripts/verify-observances-sgpc.js --rollback backend/backups/observances-sgpc-2026-10-09T22-27-25-750Z.json`

### Data steps applied to production (fourth pass, 2026-10-10)
- Backup: `backend/backups/db-2026-10-09T22-46-31-845Z.json`.
- At the Master Admin's request, the remaining 151 Gurdwaras were bulk-verified **without** an individual evidence check
  (`node backend/scripts/bulk-verify-gurdwaras.js --apply --actor <admin>`); each record's verification log says so.
  Rollback: `node backend/scripts/bulk-verify-gurdwaras.js --rollback backend/backups/gurdwara-bulk-verify-2026-10-09T22-46-34-993Z.json`
- Submission limits relaxed (code, takes effect on deploy): guests 30/hour and 100/day per address, members 200/day,
  staff with `submission.review` unlimited; failed/invalid forms never count.

### Photos and privacy (2026-10-10)
- Backup: `backend/backups/db-2026-10-09T23-10-38-188Z.json`.
- `node backend/scripts/add-gurdwara-photos.js --apply` now also searches the Gurdwara's Commons category, its Wikipedia lead image and
  geotagged Commons photos within 100 m (file name must say Gurdwara / name this Gurdwara; free licences only): 6 photos added.
  Rollback: `… --rollback backend/backups/gurdwara-photos-2026-10-09T23-15-02-844Z.json`. 211 records have no free photo anywhere we
  can verify — add them in Admin → Gurdwaras (filter "Missing: No photo") with the photographer's permission.
- `/privacy-policy` is a real page; privacy requests arrive in Admin → Submissions as "A privacy or data request". Account deletion
  is handled by an administrator by hand (there is no self-service delete yet).

### Festival banners and festival order (schema 13)
- Migration 13 (additive): `home_banners.observance_id`. It runs automatically on the next start against the database
  (a backup was taken first: `backend/backups/db-2026-10-10T*.json`). To undo, the column can stay unused.
- Admin → Homepage banners → New banner → "Festival / important day": pick a published festival; the banner shows its
  verified date, Nanakshahi date and the Guru Sahib's artwork, and hides itself once the day has passed. Unpublish/delete as usual.
- New banners go to the top of the list; the homepage shows up to 5 live banners.
- Homepage festival cards: today, then ongoing, then nearest date first; a short row is topped up to 4 with the next verified dates.

### Staff notifications for submissions
- Every stored submission ("Submit / Update Information", privacy requests, "Suggest a Gurdwara") creates a notification
  for each active Admin and Moderator (type `submission_received`, linking to the right admin queue). The sender is not
  notified about their own; spam caught by the honeypot creates none.
- Staff see a pop-up in the corner of any page (newest unread, once per tab session) and the unread count on the bell,
  checked every 30 s while the tab is visible. No schema change.
