import bothIcon from "../../assets/onboarding/place/both.png";
import studioIcon from "../../assets/onboarding/place/studio.png";
import visitIcon from "../../assets/onboarding/place/visit.png";
import type { PlaceMode } from "../../lib/masterDraft";
import { cx } from "../../ui";

const ICONS: Record<PlaceMode, string> = {
  studio: studioIcon,
  visit: visitIcon,
  both: bothIcon,
};

/** Figma place-mode glyphs: cabinet / car / pin (mask → currentColor). */
export function PlaceModeIcon({
  mode,
  size = 20,
  className,
}: {
  mode: PlaceMode;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cx("ms-place-mode-icon", className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${ICONS[mode]})`,
        maskImage: `url(${ICONS[mode]})`,
      }}
      aria-hidden
    />
  );
}
