import {
  clientInitial,
  clientVisitsLabel,
  type BookingClient,
} from "../../lib/bookingClients";
import { cx } from "../../ui";

type Props = {
  client: BookingClient;
  /** Compact line under name (steps 3–4). */
  servicesLine?: string | null;
  durationPriceLine?: string | null;
  /** Step 2: selected client card with check + notes chip. */
  selected?: boolean;
  onNotesClick?: () => void;
  className?: string;
};

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="11" fill="#12B76A" />
      <path
        d="M6.5 11.25 9.4 14.1 15.5 8"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" fill="#067FF9" />
      <path
        d="M8 7.25V11M8 5.25h.01"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="#067FF9"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingClientSummary({
  client,
  servicesLine,
  durationPriceLine,
  selected = false,
  onNotesClick,
  className,
}: Props) {
  const hasNotes = client.notes.length > 0;

  if (selected) {
    return (
      <div className={cx("ms-nb-card", "is-selected", "ms-nb-client-picked", className)}>
        <span
          className={cx("ms-nb-avatar", `tone-${client.avatarTone}`)}
          aria-hidden
        >
          {clientInitial(client.name)}
        </span>
        <div className="ms-nb-card-main">
          <span className="ms-nb-card-name">{client.name}</span>
          <span className="ms-nb-card-phone">{client.phone}</span>
          <span className="ms-nb-card-meta">{clientVisitsLabel(client)}</span>
          {hasNotes && onNotesClick ? (
            <button
              type="button"
              className="ms-nb-note-chip"
              onClick={onNotesClick}
            >
              <InfoIcon />
              <span>Есть важная заметка</span>
              <ChevronIcon />
            </button>
          ) : null}
        </div>
        <span className="ms-nb-picked-check" aria-hidden>
          <CheckIcon />
        </span>
      </div>
    );
  }

  return (
    <div className={cx("ms-nb-summary", className)}>
      <div
        className={cx("ms-nb-avatar", "ms-nb-summary-avatar", `tone-${client.avatarTone}`)}
      >
        {clientInitial(client.name)}
      </div>
      <div className="ms-nb-summary-copy">
        <p className="ms-nb-summary-name">{client.name}</p>
        {servicesLine ? (
          <p className="ms-nb-summary-services">{servicesLine}</p>
        ) : null}
        {durationPriceLine ? (
          <p className="ms-nb-summary-meta">{durationPriceLine}</p>
        ) : null}
        {!servicesLine && !durationPriceLine ? (
          <p className="ms-nb-summary-meta">{client.phone}</p>
        ) : null}
      </div>
    </div>
  );
}
