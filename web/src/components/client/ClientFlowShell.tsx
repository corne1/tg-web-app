import type { ReactNode } from "react";
import { BackIcon, IconButton } from "../../ui";

/** Client booking funnel chrome (toolbar + optional sticky footer). */
export function ClientFlowShell({
  title,
  onBack,
  children,
  footer,
  hideHeader = false,
}: {
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div className="master-setup ms-cabinet ms-client-flow">
      {!hideHeader && title && onBack ? (
        <header className="ms-bd-toolbar">
          <IconButton label="Назад" onClick={onBack}>
            <BackIcon />
          </IconButton>
          <h1 className="ms-bd-toolbar-title">{title}</h1>
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        </header>
      ) : null}
      <div className="ms-body ms-cab-body ms-client-body">{children}</div>
      {footer ? <footer className="ms-footer ms-client-footer">{footer}</footer> : null}
    </div>
  );
}
