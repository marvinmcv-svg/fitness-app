# Backend setup (Supabase)

The app runs without a backend: guests' data stays on their device. Connect Supabase to turn on member accounts (Google and email sign-up), syncing of profiles and meals, and photo macro estimates.

## 1. Create the project and tables

1. Create a Supabase project.
2. Apply the migrations in `drizzle/` in order (SQL editor, `psql`, or `npx drizzle-kit migrate` with `DATABASE_URL` set):
   - `0000_init.sql`: training tables
   - `0001_members_and_macros.sql`: `profiles` and `food_logs`
   - `0002_waitlist.sql`: `waitlist` (landing page sign-ups; anyone can add, nobody can read through the API)
   Every table has row-level security, so members can only read and write their own rows.
3. Copy `.env.example` to `.env`. Fill in the project URL and publishable key from **Project Settings → API**.
4. In Vercel (**fuerzaflow → Settings → Environment Variables**), add the same two values as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview, then redeploy. The app and the landing page waitlist both use them.

## 2. Turn on Google sign-in

1. In Google Cloud Console, go to **APIs & Services → Credentials** and create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: `https://fuerzaflow.vercel.app` (and `http://localhost:5173` for local dev).
   - Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. In Supabase, go to **Authentication → Sign In / Providers → Google**. Enable it and paste the client ID and secret.
3. In Supabase, go to **Authentication → URL Configuration**:
   - Set **Site URL** to `https://fuerzaflow.vercel.app/app/`.
   - Add each URL you run the app from to **Redirect URLs**: `https://fuerzaflow.vercel.app/app/`, `https://fuerzaflow.vercel.app/app/**` and `http://localhost:5173/**`.

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

## 4. AI coach

The coach has two parts:

- **Rules-based coaching** works with no setup, offline and free: the daily brief on Today, the readiness check before each workout, the post-workout summary with personal records, the weekly review, and safety replies for red-flag messages.
- **Chat coach (Claude)**: runs through the Vercel Function `api/coach.ts`. To turn it on:
  1. Create an API key at console.anthropic.com. Set a monthly spend limit there.
  2. In Vercel, open **fuerzaflow → Settings → Environment Variables** and add `ANTHROPIC_API_KEY`, for Production and Preview.
  3. Redeploy (or push any commit).

Until the key is set, the chat shows "The AI coach isn't connected yet" and everything else keeps working.

The function only answers requests from the app's own domain. It allows 30 requests per IP per hour on each server instance, and caps message and context size. Those limits are a speed bump, not real protection: anyone can call a public endpoint. Before a public launch, require a signed-in Supabase session in `api/coach.ts`, and keep the spend limit on your Anthropic key.

Cost: each question uses Claude Opus 5.5 at medium effort. That's about 8–10k input tokens of instructions and athlete data, mostly cached, plus a short reply: roughly 1–3 US cents per question at current prices.
