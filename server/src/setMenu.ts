import { Bot } from "grammy";
import { config } from "./config.js";

if (config.isDevToken) {
  console.error("Set a real BOT_TOKEN in .env first");
  process.exit(1);
}

const bot = new Bot(config.botToken);

await bot.api.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "Open",
    web_app: { url: config.webAppUrl },
  },
});

console.log(`[bot] Menu button set to ${config.webAppUrl}`);
process.exit(0);
