import express from "express";
import cors from "cors";
import { webhookCallback } from "grammy";
import { config } from "./config.js";
import { apiRouter } from "./routes.js";
import { parseCookies } from "./middleware.js";
import { createBot } from "./bot.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(parseCookies);

  const bot = createBot();
  if (bot) {
    app.post("/api/telegram/webhook", webhookCallback(bot, "express"));
  }

  app.use("/api", apiRouter);

  app.get("/api", (_req, res) => {
    res.json({
      service: "tg-app-server",
      webAppUrl: config.webAppUrl,
      botReady: !config.isDevToken,
    });
  });

  return app;
}
