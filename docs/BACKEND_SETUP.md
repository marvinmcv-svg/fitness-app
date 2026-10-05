# Backend setup (Supabase)

The app runs without a backend: guests' data stays on their device. Connect Supabase to turn on member accounts (Google and email sign-up), syncing of profiles and meals, and photo macro estimates.

## 1. Create the project and tables

1. Create a Supabase project.
2. Apply the migrations in `drizzle/` in order (SQL editor, `psql`, or `npx drizzle-kit migrate` with `DATABASE_URL` set):
   - `0000_init.sql`: training tables
   - `0001_members_and_macros.sql`: `profiles` and `food_logs`
   Every table has row-level security, so members can only read and write their own rows.
3. Copy `.env.example` to `.env`. Fill in the project URL and publishable key from **Project Settings → API**.

## 2. Turn on Google sign-in

1. In Google Cloud Console, go to **APIs & Services → Credentials** and create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: your app's URL (and `http://localhost:5173` for local dev).
   - Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. In Supabase, go to **Authentication → Sign In / Providers → Google**. Enable it and paste the client ID and secret.
3. In Supabase, go to **Authentication → URL Configuration**:
   - Set **Site URL** to your app's URL.
   - Add each URL you run the app from (production, `http://localhost:5173`) to **Redirect URLs**.

Email sign-up works as soon as the project exists. Supabase sends a confirmation email by default; you can change this under **Authentication → Sign In / Providers → Email**.

## 3. Photo macro estimates

The `estimate-macros` Edge Function sends the meal photo to Claude and returns each food's estimated grams, calories and macros.

```bash
supabase functions deploy estimate-macros
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Only signed-in members can call it: the platform verifies their JWT. Barcode scanning uses Open Food Facts and needs no key.

## Notes

- Google sign-in redirects through Supabase, so it needs a real URL. It does not work inside the claude.ai preview panel, which also blocks network calls to Supabase. Use the preview to try the app as a guest; test sign-in on a deployed URL or locally with `npm run dev`.
- Workouts are still saved on the device only. Profiles and meals sync for members.
