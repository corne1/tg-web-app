import { config, isPlaceholderToken } from "../config.js";

const DEV_SESSION_SECRET = "dev-session-secret-change-me";

export type ProductionCheckInput = {
  nodeEnv: string | undefined;
  vercel: string | undefined;
  botToken: string;
  sessionSecret: string;
  sessionSecretConfigured: boolean;
  webAppUrl: string;
  webAppUrlConfigured: boolean;
  cronSecret: string;
  databaseUrl: string;
};

export function productionConfigError(input: ProductionCheckInput): string | null {
  const production = input.nodeEnv === "production" || Boolean(input.vercel);
  if (!production) return null;
  if (isPlaceholderToken(input.botToken)) {
    return "BOT_TOKEN is missing or still a placeholder";
  }
  if (
    !input.sessionSecretConfigured ||
    input.sessionSecret === DEV_SESSION_SECRET ||
    input.sessionSecret.length < 16
  ) {
    return "SESSION_SECRET is missing or still the dev placeholder";
  }
  if (!input.webAppUrlConfigured || input.webAppUrl.includes("localhost")) {
    return "WEBAPP_URL must be the public Mini App URL";
  }
  if (input.cronSecret.length < 16) {
    return "CRON_SECRET is required in production";
  }
  if (!input.databaseUrl) {
    return "DATABASE_URL is required in production";
  }
  return null;
}

export function assertProductionConfig(): void {
  const message = productionConfigError({
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    botToken: config.botToken,
    sessionSecret: config.sessionSecret,
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
    webAppUrl: config.webAppUrl,
    webAppUrlConfigured: Boolean(process.env.WEBAPP_URL),
    cronSecret: config.cronSecret,
    databaseUrl: config.databaseUrl,
  });
  if (message) throw new Error(message);
}
