import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    // Dynamic import: Vercel bundles the API entry as CJS; server is ESM.
    appPromise = import("../server/src/app.js").then((m) => m.createApp());
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
