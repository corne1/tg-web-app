import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TelegramUser } from "./telegramAuth.js";

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../data");
if (!isServerless) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = resolve(dataDir, "users.json");

export type StoredUser = {
  id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

type Store = Record<string, StoredUser>;

let memoryStore: Store = {};

function load(): Store {
  if (isServerless) return memoryStore;
  if (!existsSync(dbPath)) return {};
  try {
    return JSON.parse(readFileSync(dbPath, "utf8")) as Store;
  } catch {
    return {};
  }
}

function save(store: Store): void {
  if (isServerless) {
    memoryStore = store;
    return;
  }
  writeFileSync(dbPath, JSON.stringify(store, null, 2), "utf8");
}

export function upsertUser(user: TelegramUser): StoredUser {
  const store = load();
  const key = String(user.id);
  const now = new Date().toISOString();
  const prev = store[key];
  const next: StoredUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name ?? null,
    username: user.username ?? null,
    language_code: user.language_code ?? null,
    is_premium: Boolean(user.is_premium),
    photo_url: user.photo_url ?? null,
    created_at: prev?.created_at ?? now,
    updated_at: now,
    last_seen_at: now,
  };
  store[key] = next;
  save(store);
  return next;
}

export function getUser(id: number): StoredUser | null {
  return load()[String(id)] ?? null;
}
