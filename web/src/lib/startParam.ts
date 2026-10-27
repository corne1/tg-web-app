/** Parse Telegram Mini App start_param: `p_<telegramUserId>`. */
export function parsePsychologistStartParam(
  startParam: string | undefined | null,
): number | null {
  if (!startParam) return null;
  const m = /^p_(\d+)$/.exec(startParam.trim());
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}
