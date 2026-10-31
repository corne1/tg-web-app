import type { ReactNode } from "react";
import { BackIcon, CloseIcon, IconButton } from "../../ui";

type Props = {
  step: 1 | 2 | 3 | 4;
  progressFilled: number;
  /** Top bar title; defaults to «Настройки записи». */
  topTitle?: string;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  toast?: string | null;
  toastTone?: "success" | "danger";
  onToastDismiss?: () => void;
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
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MasterSetupChrome({
  step,
  progressFilled,
  topTitle = "Настройки записи",
  onBack,
  onClose,
  children,
  footer,
  toast,
  toastTone = "success",
  onToastDismiss,
}: Props) {
  return (
    <div className="master-setup">
      {toast && (
        <div className={`ms-toast ms-toast-${toastTone}`} role="status">
          <span className="ms-toast-icon" aria-hidden>
            {toastTone === "danger" ? <ToastDangerIcon /> : <ToastSuccessIcon />}
          </span>
          <p className="ms-toast-text">{toast}</p>
          {onToastDismiss && (
            <button
              type="button"
              className="ms-toast-close"
              aria-label="Закрыть"
              onClick={onToastDismiss}
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
          )}
        </div>
      )}

      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
          <header className="ms-top">
            <IconButton label="Назад" onClick={onBack}>
              <BackIcon />
            </IconButton>
            <div className="ms-top-titles">
              <h1 className="ms-top-title">{topTitle}</h1>
              <p className="ms-top-sub">Шаг {step} из 4</p>
            </div>
            <IconButton label="Закрыть" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </header>

          <div className="ms-progress" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`ms-progress-seg ${i <= progressFilled ? "is-on" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ms-body">{children}</div>
      {footer && <footer className="ms-footer">{footer}</footer>}
    </div>
  );
}
