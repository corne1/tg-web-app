import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: string;
};

export function ScreenShell({ title, subtitle, children, footer, backTo }: Props) {
  return (
    <div className="screen">
      {backTo && (
        <Link to={backTo} className="back-link">
          ← Назад
        </Link>
      )}
      {(title || subtitle) && (
        <header className="screen-header">
          {title && <h1 className="screen-title">{title}</h1>}
          {subtitle && <p className="screen-subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="screen-body">{children}</div>
      {footer && <footer className="screen-footer">{footer}</footer>}
    </div>
  );
}
