import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    // Dynamic import: Vercel bundles the API entry as CJS; server is ESM.
    // Schema is applied once per isolate, before the first request is served.
    appPromise = (async () => {
      const { assertProductionConfig } = await import(
        "../server/src/lib/productionConfig.js"
      );
      const { migrate } = await import("../server/src/db/client.js");
      const { createApp } = await import("../server/src/app.js");
      assertProductionConfig();
      await migrate();
      return createApp();
    })().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  await new Promise<void>((resolve, reject) => {
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}
