import type { ReactNode } from "react";
import { cx } from "./cx";

export function Modal({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="ms-modal-root" role="presentation">
      <button
        type="button"
        className="ms-modal-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={cx("ms-modal", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
