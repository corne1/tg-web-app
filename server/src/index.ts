import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { apiRouter } from "./routes.js";
import { parseCookies } from "./middleware.js";
import { configureMenuButton, createBot } from "./bot.js";

const app = express();
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const webDist = resolve(rootDir, "web/dist");

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(parseCookies);

app.use("/api", apiRouter);

app.get("/api", (_req, res) => {
  res.json({
    service: "tg-app-server",
    webAppUrl: config.webAppUrl,
    botReady: !config.isDevToken,
  });
});

if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(resolve(webDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      service: "tg-app-server",
      hint: "Run npm run build -w web to serve the Mini App from this process",
      webAppUrl: config.webAppUrl,
      botReady: !config.isDevToken,
    });
  });
}

const server = app.listen(config.port, () => {
  console.log(`[server] http://localhost:${config.port}`);
});

const bot = createBot();
if (bot) {
  void (async () => {
    try {
      await configureMenuButton(bot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[bot] menu button:", message);
    }
    try {
      await bot.start({
        onStart: (info) => console.log(`[bot] @${info.username} polling`),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[bot] polling failed — API still running:", message);
    }
  })();
}

function shutdown() {
  server.close();
  bot?.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
