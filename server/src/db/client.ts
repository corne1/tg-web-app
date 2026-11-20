import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

let client: Client | null = null;

function resolveDatabaseUrl(): string {
  if (config.databaseUrl) return config.databaseUrl;

  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
  if (isServerless) {
    throw new Error(
      "DATABASE_URL is required on Vercel. Create a free Turso DB and set DATABASE_URL + DATABASE_AUTH_TOKEN.",
    );
  }

  const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
  mkdirSync(dataDir, { recursive: true });
  const dbFile = resolve(dataDir, "app.db").replace(/\\/g, "/");
  return `file:${dbFile}`;
}

export async function enableForeignKeys(db: Client): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: resolveDatabaseUrl(),
      authToken: config.databaseAuthToken,
    });
  }
  return client;
}


export { migrate, withDb } from "./migrate.js";
