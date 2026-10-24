import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { config } from "./config.js";

export function createBot(): Bot | null {
  if (config.isDevToken) {
    console.warn(
      "[bot] BOT_TOKEN is placeholder — bot polling disabled. Set BOT_TOKEN in .env",
    );
    return null;
  }

  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("Open App", config.webAppUrl);
    const replyKeyboard = new Keyboard()
      .webApp("Open Mini App", config.webAppUrl)
      .resized();

    await ctx.reply(
      "Welcome. Open the Mini App with the button below.",
      { reply_markup: keyboard },
    );
    await ctx.reply("Or use the persistent keyboard:", {
      reply_markup: replyKeyboard,
    });
  });

  bot.catch((err) => {
    console.error("[bot] error", err.error);
  });

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
