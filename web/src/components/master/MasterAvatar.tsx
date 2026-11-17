import { resolveMasterAvatarSrc } from "../../lib/masterAvatar";

type Props = {
  /** Server `profile.avatarUrl` when known. */
  remote?: string | null;
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
};

/** Renders the photo the master chose on onboarding step 1. */
export function MasterAvatar({
  remote,
  className,
  width = 48,
  height = 48,
  alt = "",
}: Props) {
  return (
    <img
      className={className}
      src={resolveMasterAvatarSrc(remote)}
      width={width}
      height={height}
      alt={alt}
      decoding="async"
    />
  );
}
