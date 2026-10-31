import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({
  label,
  className,
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx("ms-icon-btn", className)}
      {...props}
    >
      {children}
    </button>
  );
}
