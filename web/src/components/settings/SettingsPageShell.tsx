import type { ReactNode } from "react";
import { BackIcon, CloseIcon, IconButton } from "../../ui";
import { MsToast } from "../master/MsToast";

/** Cabinet settings page chrome (no onboarding wizard header/progress). */
export function SettingsPageShell({
  title,
  onBack,
  onClose,
  children,
  footer,
  toast,
  toastDescription,
  toastTone = "success",
  onToastDismiss,
}: {
  title: string;
  onBack: () => void;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  toast?: string | null;
  toastDescription?: string | null;
  toastTone?: "success" | "danger";
  onToastDismiss?: () => void;
}) {
  return (
    <div className="master-setup ms-cabinet">
      {toast ? (
        <MsToast
          message={toast}
          description={toastDescription}
          tone={toastTone}
          onDismiss={onToastDismiss}
        />
      ) : null}
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={onBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">{title}</h1>
        {onClose ? (
          <IconButton label="Закрыть" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        ) : (
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        )}
      </header>
      <div className="ms-body ms-cab-body">{children}</div>
      {footer ? <footer className="ms-footer">{footer}</footer> : null}
    </div>
  );
}
