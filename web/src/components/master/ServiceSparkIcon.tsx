/** Figma Fill Icon Gray sparkles (21446:15581): 1 large + 2 small filled 4-point stars. */
export function ServiceSparkIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Paths were optically undersized in 20×20; scale to fill Fill Icon slot. */}
      <g transform="translate(10 10) scale(1.85) translate(-10.7 -8.15)">
        <path
          fill="currentColor"
          d="M9.5 3.2 10.55 7.15 14.5 8.2 10.55 9.25 9.5 13.2 8.45 9.25 4.5 8.2 8.45 7.15Z"
        />
        <path
          fill="currentColor"
          d="M14.6 3.1 15.05 4.7 16.65 5.15 15.05 5.6 14.6 7.2 14.15 5.6 12.55 5.15 14.15 4.7Z"
        />
        <path
          fill="currentColor"
          d="M15.35 9.85 15.7 11.05 16.9 11.4 15.7 11.75 15.35 12.95 15 11.75 13.8 11.4 15 11.05Z"
        />
      </g>
    </svg>
  );
}
