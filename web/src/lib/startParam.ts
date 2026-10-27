export type EntryContext =
  | { mode: "master" }
  | { mode: "client"; masterId: number }
  | { mode: "client"; slug: string }
  | { mode: "default" };

/**
 * Telegram Mini App start_param:
 * - cabinet | master → master cabinet / onboarding
 * - p_<telegramUserId> → client booking by master tg id
 * - book_<slug> → client booking by master slug
 */
export function parseEntryContext(
  startParam: string | undefined | null,
): EntryContext {
  if (!startParam) return { mode: "default" };
  const raw = startParam.trim();

  if (raw === "cabinet" || raw === "master") {
    return { mode: "master" };
  }

  const byId = /^p_(\d+)$/.exec(raw);
  if (byId) {
    const masterId = Number(byId[1]);
    if (Number.isFinite(masterId)) return { mode: "client", masterId };
  }

  const bySlug = /^book_([a-zA-Z0-9_-]+)$/.exec(raw);
  if (bySlug) {
    return { mode: "client", slug: bySlug[1] };
  }

  return { mode: "default" };
}

/** @deprecated use parseEntryContext */
export function parsePsychologistStartParam(
  startParam: string | undefined | null,
): number | null {
  const ctx = parseEntryContext(startParam);
  return ctx.mode === "client" && "masterId" in ctx ? ctx.masterId : null;
}
