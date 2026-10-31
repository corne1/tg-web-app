import type { ReactNode } from "react";
import { cx } from "./cx";

export function BottomSheet({
  open,
  onClose,
  compact,
  sheetClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  compact?: boolean;
  /** Extra class on the sheet panel (e.g. `ms-sheet-hours`, `ms-sheet-picker`). */
  sheetClassName?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="ms-sheet-root" role="presentation">
      <button
        type="button"
        className="ms-modal-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={cx(
          "ms-sheet",
          sheetClassName,
          compact && "is-compact",
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHandle() {
  return <div className="ms-sheet-handle" aria-hidden />;
}

export function SheetSimpleHeader({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  return (
    <>
      <SheetHandle />
      <h3 className="ms-sheet-title">{title}</h3>
      {lead ? <p className="ms-sheet-lead">{lead}</p> : null}
    </>
  );
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="ms-sheet-footer">{children}</div>;
}

export function SheetPickerGroup({ children }: { children: ReactNode }) {
  return <div className="ms-sheet-picker-group">{children}</div>;
}

export function SheetRadioList({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ul
      className={cx("ms-sheet-list", className)}
      role="radiogroup"
      aria-label={label}
    >
      {children}
    </ul>
  );
}

export function SheetList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <ul className={cx("ms-sheet-list", className)}>{children}</ul>;
}

export function SheetItem({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx(
        "ms-sheet-item",
        active && "is-active",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SheetAltAction({
  label,
  onClick,
  trailing,
}: {
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" className="ms-sheet-alt-action" onClick={onClick}>
      <span className="ms-sheet-alt-action-label">{label}</span>
      {trailing}
    </button>
  );
}
