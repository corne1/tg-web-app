import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(root, "data/e2e.db").replace(/\\/g, "/");
const webPort = 5174;
const apiPort = 3011;
const webOrigin = `http://127.0.0.1:${webPort}`;
const apiOrigin = `http://127.0.0.1:${apiPort}`;

export const e2eSecret = "e2e-local-secret";

export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: webOrigin,
    viewport: { width: 402, height: 874 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -w server",
      cwd: root,
      url: `${apiOrigin}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: String(apiPort),
        E2E_SECRET: e2eSecret,
        E2E_CITIES: "1",
        DATABASE_URL: `file:${dbPath}`,
        BOT_TOKEN: "000000:REPLACE_ME",
        BOT_USERNAME: "",
        SESSION_SECRET: "e2e-session-secret",
        WEBAPP_URL: webOrigin,
        CORS_ORIGIN: webOrigin,
      },
    },
    {
      command: "npm run dev -w web -- --host 127.0.0.1 --port 5174 --strictPort",
      cwd: root,
      url: webOrigin,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_PROXY: apiOrigin,
      },
    },
  ],
});
