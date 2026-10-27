# BotFather + deploy checklist

Do not commit real tokens. Copy `.env.example` to `.env`.

## 1. Create the bot

1. Open Telegram, chat with `@BotFather`.
2. `/newbot` — pick name and username.
3. Copy the token into `.env` as `BOT_TOKEN=...`.
4. Optional: `/setmenubutton` → choose bot → set button text + HTTPS Mini App URL.
   Locally, `npm run start` also calls `setChatMenuButton` when `BOT_TOKEN` and `WEBAPP_URL` are set.
   After a Vercel deploy, run `npm run bot:menu` once (or use BotFather).

## 2. Local HTTPS tunnel

Telegram Mini Apps require HTTPS. For local testing:

```bash
# terminal A
npm run dev

# terminal B — expose Vite (5173)
npx cloudflared tunnel --protocol http2 --url http://localhost:5173
# or: ngrok http 5173
```

Put the tunnel HTTPS URL into `.env` → `WEBAPP_URL` and `CORS_ORIGIN`, then restart the server.

API calls use the Vite proxy (`/api` → `:3001`) in dev.

## 3. Production on Vercel (recommended)

Static Mini App + `/api` serverless in one project. Bot **polling** does not run on Vercel — Menu Button / BotFather is enough to open the app; run `npm run start` locally only if you need `/start` replies.

1. Install deps: `npm install`
2. Deploy:
   ```bash
   npx vercel login
   npx vercel --prod
   ```
3. In Vercel → Project → Settings → Environment Variables (Production):
   - `BOT_TOKEN`
   - `BOT_USERNAME` (без `@`, для deep link `t.me/<bot>?startapp=p_<id>`)
   - `SESSION_SECRET` (long random string)
   - `WEBAPP_URL` = `https://<your-project>.vercel.app` (stable production URL)
   - `CORS_ORIGIN` = same URL (optionally also `http://localhost:5173`)
   - `DATABASE_URL` + `DATABASE_AUTH_TOKEN` — Turso libSQL (обязательно на Vercel; локально без них используется `./data/app.db`)
   - `CRON_SECRET` (опционально, для `/api/cron/reminders`)
4. Redeploy after setting env (`npx vercel --prod`).
5. Disable **Deployment Protection** for Production (Settings → Deployment Protection), otherwise Telegram shows “Log in to Vercel”.
6. Put the same production URL into local `.env` as `WEBAPP_URL` / `CORS_ORIGIN`, then:
   ```bash
   npm run bot:menu
   ```
7. Open the bot in Telegram → Menu / Open App.

See `env.example` for the full list. Local DB file: `./data/app.db` (gitignored).

### Bot replies on Vercel

Polling does not run on Vercel. After deploy, register the webhook once:

```bash
# WEBAPP_URL must be the production Vercel URL
npm run bot:menu
```

This sets Menu Button + `setWebhook` → `https://<app>/api/telegram/webhook`.  
Then `/start` in Telegram is handled by the serverless function.

Local `npm run start` deletes the webhook and uses polling again — re-run `npm run bot:menu` before relying on production `/start`.
