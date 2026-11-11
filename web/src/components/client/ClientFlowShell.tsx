import type { ReactNode } from "react";
import { BackIcon, IconButton } from "../../ui";

/** Client booking funnel chrome (toolbar + optional sticky footer). */
export function ClientFlowShell({
  title,
  onBack,
  children,
  footer,
  hideHeader = false,
  progressFilled,
  progressTotal = 5,
}: {
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
  /** 1-based filled segments under the toolbar (Figma client funnel). */
  progressFilled?: number;
  progressTotal?: number;
}) {
  const showProgress =
    !hideHeader &&
    typeof progressFilled === "number" &&
    progressTotal > 0;

  return (
    <div className="master-setup ms-cabinet ms-client-flow">
      {!hideHeader && title && onBack ? (
        <header className="ms-bd-toolbar ms-client-toolbar">
          <IconButton label="Назад" onClick={onBack}>
            <BackIcon />
          </IconButton>
          <h1 className="ms-bd-toolbar-title">{title}</h1>
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        </header>
      ) : null}
      {showProgress ? (
        <div className="ms-progress ms-client-progress" aria-hidden>
          {Array.from({ length: progressTotal }, (_, i) => (
            <span
              key={i}
              className={`ms-progress-seg ${i < progressFilled ? "is-on" : ""}`}
            />
          ))}
        </div>
      ) : null}
      <div className="ms-body ms-cab-body ms-client-body">{children}</div>
      {footer ? <footer className="ms-footer ms-client-footer">{footer}</footer> : null}
    </div>
  );
}
