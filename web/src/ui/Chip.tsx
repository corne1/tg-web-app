import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Chip({ active, className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      role="radio"
      aria-checked={active}
      className={cx("ms-chip", active && "is-active", className)}
      {...props}
    />
  );
}

export function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="ms-chips" role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
}
