import type { ReactNode } from "react";
import { BackIcon, CloseIcon, IconButton } from "../../ui";
import { MsToast } from "./MsToast";

type Props = {
  step: 1 | 2 | 3 | 4;
  progressFilled: number;
  /** Top bar title; defaults to «Настройки записи». */
  topTitle?: string;
  /** Hide wizard step label + progress (profile edit entry). */
  hideWizardChrome?: boolean;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  toast?: string | null;
  /** Secondary toast line (e.g. service title under «Услуга добавлена»). */
  toastDescription?: string | null;
  toastTone?: "success" | "danger";
  onToastDismiss?: () => void;
};

export function MasterSetupChrome({
  step,
  progressFilled,
  topTitle = "Настройки записи",
  hideWizardChrome = false,
  onBack,
  onClose,
  children,
  footer,
  toast,
  toastDescription,
  toastTone = "success",
  onToastDismiss,
}: Props) {
  return (
    <div className="master-setup">
      {toast ? (
        <MsToast
          message={toast}
          description={toastDescription}
          tone={toastTone}
          onDismiss={onToastDismiss}
        />
      ) : null}

      {!hideWizardChrome ? (
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
      ) : null}

      <div className="ms-body">{children}</div>
      {footer && <footer className="ms-footer">{footer}</footer>}
    </div>
  );
}
