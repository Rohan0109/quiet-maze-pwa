# The Quiet Maze

A React + TypeScript PWA for a gentle 30-day digital-habit trail. The six tabs, onboarding, local backups, Scale accountability, partner signing flow, reminders, and existing `quiet-maze-v1` browser data are retained in the React version.

## Run locally

Use Node.js 22 LTS (`.nvmrc`). Vite's dev server needs Web Crypto support unavailable in Node 16; Node 16 is also end-of-life.

Install the declared dependencies and start Vite:

```sh
npm install
npm run dev
```

For a local production build:

```sh
npm run build
npm run preview
```

The app works without Supabase configuration and keeps data in the browser under the existing `quiet-maze-v1` key. Existing Quiet Maze installs on the same browser migrate automatically. No dependency install was run as part of this conversion; `node_modules` is not included.

## Google sign-in and cloud sync

The Google account is used for identity. App records are stored in the Supabase project, not in Google Drive. Without sign-in, journal entries, body measurements, and habit data stay on the device. Cloud sync uploads the app state, including journal and body records, as one private JSON document.

1. Create a Supabase project and run `supabase/migrations/202610130001_private_app_state.sql` in its SQL Editor.
2. In Supabase Authentication, enable Google and configure its OAuth client. Use the Supabase callback URL shown in the provider setup as the Google OAuth redirect URI.
3. Add the deployed app URL to Supabase Authentication URL Configuration. For this repository, the URL is `https://rohan0109.github.io/quiet-maze-pwa/`.
4. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and anon/public key. The anon key is designed to be public; row-level security is what protects each account’s rows.
5. Add these repository Actions secrets so the GitHub Pages build includes the public client configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and (when push is configured) `VITE_VAPID_PUBLIC_KEY`.

The migration enables row-level security on both tables. Review those policies before adding any new table or broadening access. Supabase encrypts data in transit and at rest, but this is **not end-to-end encryption**: a project administrator or provider with database access could read the JSON. Leave cloud sign-in off if that is not acceptable. Exported JSON backups are also unencrypted. When merging a pre-existing account and device copy, back up both first; the app currently syncs the cloud document after account sign-in.

## Web push reminders

Web Push uses a VAPID public/private keypair. Generate it once, keep the private key only in Supabase secrets, and keep the public key in the frontend environment. Normal operation does not require key rotation; rotate only if the private key is exposed or you intentionally replace it. Anyone with the private key can send pushes as this app.

1. Generate one VAPID keypair using a trusted Web Push key generator. Do not commit the private key or paste it into frontend code.
2. Set `VITE_VAPID_PUBLIC_KEY` in `.env.local` and in the GitHub Actions repository secrets.
3. Set Supabase Edge Function secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a separate random `PUSH_CRON_SECRET`. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.
4. Deploy the function with JWT verification disabled because it checks the separate cron secret itself:

   ```sh
   supabase functions deploy send-reminders --no-verify-jwt
   ```

5. Enable `pg_cron`, `pg_net`, and Vault in the Supabase dashboard. Save `PUSH_CRON_SECRET` in Vault under the name `push_cron_secret`, replace `PROJECT_REF` in `supabase/cron.sql`, then run that SQL in the database editor. It invokes the sender every five minutes.
6. Sign in to the installed HTTPS PWA, choose reminder times, and enable push notifications on each device.

The edge function sends generic reminder text only; journal and body data are never included in push payloads. Browser/OS notification permission is required. iOS requires the app to be added to the Home Screen. Calendar reminders remain available without an account or backend.

## Free tier and operations

The source code and keys can be used without a recurring key-rotation task, but no hosted backend or push service can be promised free forever. Supabase quotas, free-tier policies, project inactivity/pause behavior, and browser push delivery are controlled by those providers and can change. The scheduled sender checks only a small table suitable for a personal app; a public multi-user service would need monitoring, abuse controls, a privacy policy, and support.

## Deploy

GitHub Actions builds the Vite app and deploys `dist` to Pages when changes are pushed to `main`. The Vite base path is configured for this repository as `/quiet-maze-pwa/`. Set up the repository secrets above before enabling accounts or push. The `public` directory contains the manifest, service worker, and app icons.