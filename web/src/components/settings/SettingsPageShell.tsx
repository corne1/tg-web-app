import type { ReactNode } from "react";
import { BackIcon, CloseIcon, IconButton, cx } from "../../ui";
import { MsToast } from "../master/MsToast";

/** Cabinet settings page chrome (no onboarding wizard header/progress). */
export function SettingsPageShell({
  title,
  lead,
  titlePlacement = "page",
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
  /** Shown under page title when `titlePlacement="page"`. */
  lead?: string;
  /**
   * `page` (default) — back-only bar + Heading 5 title in body (Figma cabinet settings).
   * `toolbar` — centered title in top bar (legacy).
   */
  titlePlacement?: "toolbar" | "page";
  onBack: () => void;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  toast?: string | null;
  toastDescription?: string | null;
  toastTone?: "success" | "danger";
  onToastDismiss?: () => void;
}) {
  const pageTitle = titlePlacement === "page";

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
      <header className={cx("ms-bd-toolbar", pageTitle && "is-page")}>
        <IconButton label="Назад" onClick={onBack}>
          <BackIcon />
        </IconButton>
        {!pageTitle ? <h1 className="ms-bd-toolbar-title">{title}</h1> : null}
        {!pageTitle && onClose ? (
          <IconButton label="Закрыть" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        ) : !pageTitle ? (
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        ) : null}
      </header>
      <div className="ms-body ms-cab-body">
        {pageTitle ? (
          <section className="ms-page-head">
            <h1 className="ms-page-title">{title}</h1>
            {lead ? <p className="ms-page-lead">{lead}</p> : null}
          </section>
        ) : null}
        {children}
      </div>
      {footer ? <footer className="ms-footer">{footer}</footer> : null}
    </div>
  );
}
