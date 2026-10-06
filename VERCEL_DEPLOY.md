# Sikhify — Vercel deployment

This build is prepared for a **single Vercel deployment**:

- Vite/React frontend → Vercel static output (`dist/`)
- Node.js API → Vercel Function (`/api/index.js`)
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
Output directory: dist
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

Do not use the old local `server/data/sikhify.db` as production storage on Vercel. Vercel Functions are stateless; production records must live in the remote database. This project therefore switches to libSQL/Turso when `SIKHIFY_DATABASE_URL` is present.
