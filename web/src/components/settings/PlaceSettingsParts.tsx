import type { ReactNode } from "react";
import { PlaceModeIcon } from "../master/PlaceModeIcon";
import type { PlaceMode } from "../../lib/masterDraft";

function PlaceLeadIcon({ children }: { children: ReactNode }) {
  return (
    <span className="ms-place-lead" aria-hidden>
      {children}
    </span>
  );
}

export function PlaceIcon({ mode }: { mode: PlaceMode }) {
  return (
    <PlaceLeadIcon>
      <PlaceModeIcon mode={mode} />
    </PlaceLeadIcon>
  );
}

export function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M9 15.5A6.5 6.5 0 1 0 9 2.5a6.5 6.5 0 0 0 0 13ZM17 17l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="9"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 9V7a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMapPinSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 17s5-4.2 5-8.2A5 5 0 0 0 5 8.8C5 12.8 10 17 10 17Z"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="1.6" fill="#623DF5" />
    </svg>
  );
}

export function SectionHeading({
  icon,
  title,
}: {
  icon: "studio" | "visit";
  title: string;
}) {
  return (
    <div className="ms-place-section-head">
      <PlaceLeadIcon>
        <PlaceModeIcon mode={icon} />
      </PlaceLeadIcon>
      <h3 className="ms-place-section-title">{title}</h3>
    </div>
  );
}
