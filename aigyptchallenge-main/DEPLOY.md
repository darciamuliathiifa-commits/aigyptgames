# AIGYPT Challenge — Vercel + Supabase Deployment

## Vercel project settings
- Root Directory: leave empty (repository root)
- Framework Preset: Other or Vite
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm run build:vercel`
- Output Directory: `artifacts/aigypt/dist/public`

## Required environment variables
Add these for Production, Preview, and Development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET`

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend variables.

## Deployment checks
1. Open `/api/healthz`. It must return `status: ok` and all Supabase booleans must be `true`.
2. Open `/`, `/join`, `/gallery`, `/leaderboard`, and refresh each page.
3. Create a test participant.
4. Create up to 3 entries.
5. Upload one poster and submit an Instagram URL.
6. Verify the submission in admin.
7. Test voting from another browser/device.
