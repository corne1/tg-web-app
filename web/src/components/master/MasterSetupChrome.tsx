import type { ReactNode } from "react";

type Props = {
  step: 1 | 2 | 3 | 4;
  progressFilled: number;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  toast?: string | null;
  toastTone?: "success" | "danger";
};

export function MasterSetupChrome({
  step,
  progressFilled,
  onBack,
  onClose,
  children,
  footer,
  toast,
  toastTone = "success",
}: Props) {
  return (
    <div className="master-setup">
      {toast && (
        <div className={`ms-toast ms-toast-${toastTone}`} role="status">
          {toast}
        </div>
      )}

      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
          <header className="ms-top">
            <button type="button" className="ms-icon-btn" aria-label="Назад" onClick={onBack}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M12.5 4.5 7 10l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="ms-top-titles">
              <h1 className="ms-top-title">Настройки записи</h1>
              <p className="ms-top-sub">Шаг {step} из 4</p>
            </div>
            <button type="button" className="ms-icon-btn" aria-label="Закрыть" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M4.5 4.5l9 9M13.5 4.5l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
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
