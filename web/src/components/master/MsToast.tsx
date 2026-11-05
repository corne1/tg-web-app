type Props = {
  message: string;
  tone?: "success" | "danger";
  onDismiss?: () => void;
};

function ToastSuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#12B76A" />
      <path
        d="M6.25 10.25 8.75 12.75 13.75 7.75"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastDangerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#D92D20" />
      <path
        d="M10 6.25V10.75M10 13.75H10.0083"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Shared toast for master UI (no legacy dark bar). */
export function MsToast({
  message,
  tone = "success",
  onDismiss,
}: Props) {
  return (
    <div className={`ms-toast ms-toast-${tone}`} role="status">
      <span className="ms-toast-icon" aria-hidden>
        {tone === "danger" ? <ToastDangerIcon /> : <ToastSuccessIcon />}
      </span>
      <p className="ms-toast-text">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          className="ms-toast-close"
          aria-label="Закрыть"
          onClick={onDismiss}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M5 5l10 10M15 5 5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
