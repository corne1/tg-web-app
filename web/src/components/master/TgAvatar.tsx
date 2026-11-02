import { useState } from "react";
import { cx } from "../../ui";

/** Telegram-like avatar palette (stable by user id). */
const TG_AVATAR_COLORS = [
  "#E17076",
  "#7BC862",
  "#E5CA77",
  "#65AADD",
  "#A695E7",
  "#EE7AAE",
  "#6EC9CB",
  "#FAA774",
] as const;

export function telegramAvatarColor(userId: number): string {
  const id = Math.abs(Math.trunc(userId));
  return TG_AVATAR_COLORS[id % TG_AVATAR_COLORS.length];
}

/** First letter of display name, as Telegram does without a photo. */
export function telegramAvatarLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const ch = [...trimmed][0] ?? "?";
  return ch.toUpperCase();
}

type Props = {
  photoUrl?: string | null;
  name: string;
  userId?: number | null;
  className?: string;
  size?: number;
  alt?: string;
};

/**
 * Telegram-style avatar: public `photo_url` if present, otherwise colored
 * circle with the first letter of the name.
 */
export function TgAvatar({
  photoUrl,
  name,
  userId = 0,
  className,
  size = 64,
  alt = "",
}: Props) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(photoUrl) && !broken;
  const letter = telegramAvatarLetter(name);
  const bg = telegramAvatarColor(userId ?? 0);

  return (
    <span
      className={cx("tg-avatar", showPhoto && "has-photo", className)}
      style={{
        width: size,
        height: size,
        fontSize: size,
        backgroundColor: showPhoto ? undefined : bg,
      }}
      aria-hidden={alt ? undefined : true}
    >
      {showPhoto ? (
        <img
          className="tg-avatar-img"
          src={photoUrl!}
          alt={alt}
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="tg-avatar-letter">{letter}</span>
      )}
    </span>
  );
}
