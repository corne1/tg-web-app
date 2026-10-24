import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { apiRouter } from "./routes.js";
import { parseCookies } from "./middleware.js";

export function createApp() {
  const app = express();

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

  return app;
}
