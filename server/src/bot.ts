import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { bookingDeepLink, cabinetDeepLink, config } from "./config.js";

let botSingleton: Bot | null | undefined;

function appLinks() {
  const cabinet =
    cabinetDeepLink() ?? `${config.webAppUrl.replace(/\/$/, "")}/#cabinet`;
  return { cabinet };
}

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
    const { cabinet } = appLinks();
    const inline = new InlineKeyboard()
      .url("Мой кабинет", cabinet)
      .row()
      .webApp("Открыть приложение", config.webAppUrl);

    // ReplyKeyboard web_app cannot pass startapp — use same Mini App URL;
    // HomeRedirect treats default open as master cabinet flow.
    const replyKeyboard = new Keyboard()
      .webApp("Мой кабинет", config.webAppUrl)
      .resized();

    await ctx.reply(
      "Запись к мастеру.\n\n«Мой кабинет» — настройка и расписание.\nКлиенты записываются по вашей персональной ссылке.",
      { reply_markup: inline },
    );
    await ctx.reply("Быстрый доступ с клавиатуры:", {
      reply_markup: replyKeyboard,
    });
  });

  bot.command("cabinet", async (ctx) => {
    const { cabinet } = appLinks();
    await ctx.reply("Откройте кабинет мастера:", {
      reply_markup: new InlineKeyboard().url("Мой кабинет", cabinet),
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
      text: "Кабинет",
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

export { bookingDeepLink };
