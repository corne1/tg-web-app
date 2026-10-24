# BotFather + deploy checklist

Do not commit real tokens. Copy `.env.example` to `.env`.

## 1. Create the bot

1. Open Telegram, chat with `@BotFather`.
2. `/newbot` — pick name and username.
3. Copy the token into `.env` as `BOT_TOKEN=...`.
4. Optional: `/setmenubutton` → choose bot → set button text + HTTPS Mini App URL.
   The server also calls `setChatMenuButton` on startup when `BOT_TOKEN` and `WEBAPP_URL` are set.

## 2. Local HTTPS tunnel

Telegram Mini Apps require HTTPS in production. For local testing:

```bash
# terminal A
npm run dev

# terminal B — expose Vite (5173)
npx cloudflared tunnel --url http://localhost:5173
# or: ngrok http 5173
```

Put the tunnel HTTPS URL into:

- `.env` → `WEBAPP_URL` and `CORS_ORIGIN`
- BotFather Menu Button / restart server so `/start` buttons use the new URL

API calls from the Mini App go to the same origin via Vite proxy (`/api` → `:3001`) in dev. In production, point the frontend `fetch` base or reverse-proxy `/api` to the Node server.

## 3. Production

1. Build: `npm run build`
2. Host `web/dist` on HTTPS (Cloudflare Pages, Vercel, Nginx, etc.).
3. Run `server` with `BOT_TOKEN`, `WEBAPP_URL`, `CORS_ORIGIN`, `SESSION_SECRET`.
4. Reverse-proxy `/api` to the Node process, or set the frontend API origin.
5. Set Menu Button / `WEBAPP_URL` to the production Mini App URL.
6. Open the bot in Telegram → `/start` → Open App.
