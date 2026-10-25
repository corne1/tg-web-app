import { createBot, configureMenuButton, configureWebhook } from "./bot.js";
import { config } from "./config.js";

if (config.isDevToken) {
  console.error("Set a real BOT_TOKEN in .env first");
  process.exit(1);
}

const bot = createBot();
if (!bot) {
  console.error("Bot failed to initialize");
  process.exit(1);
}

await configureMenuButton(bot);
await configureWebhook(bot);

console.log("[bot] Menu + webhook configured for", config.webAppUrl);
process.exit(0);
