import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { config } from "./config.js";

let botSingleton: Bot | null | undefined;

export function createBot(): Bot | null {
  if (botSingleton !== undefined) return botSingleton;

  if (config.isDevToken) {
    console.warn(
      "[bot] BOT_TOKEN is placeholder — bot disabled. Set BOT_TOKEN in .env",
    );
    botSingleton = null;
    return null;
  }

  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("Открыть", config.webAppUrl);
    const replyKeyboard = new Keyboard()
      .webApp("Открыть календарь", config.webAppUrl)
      .resized();

    await ctx.reply(
      "Календарь записи к психологу.\nОткройте Mini App кнопкой ниже.",
      { reply_markup: keyboard },
    );
    await ctx.reply("Или через клавиатуру:", {
      reply_markup: replyKeyboard,
    });
  });

  bot.catch((err) => {
    console.error("[bot] error", err.error);
  });

  botSingleton = bot;
  return bot;
}

/** Sets chat menu button to open the Mini App (Bot API setChatMenuButton). */
export async function configureMenuButton(bot: Bot): Promise<void> {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Open",
      web_app: { url: config.webAppUrl },
    },
  });
  console.log(`[bot] Menu button set to ${config.webAppUrl}`);
}

export function webhookUrl(): string {
  return `${config.webAppUrl.replace(/\/$/, "")}/api/telegram/webhook`;
}

export async function configureWebhook(bot: Bot): Promise<void> {
  const url = webhookUrl();
  await bot.api.setWebhook(url, {
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });
  console.log(`[bot] Webhook set to ${url}`);
}
