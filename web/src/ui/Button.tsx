import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "ms-btn-primary",
  secondary: "ms-btn-secondary",
  outline: "ms-btn-outline",
  danger: "ms-btn-danger",
  ghost: "ms-btn-ghost-text",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cx(VARIANT_CLASS[variant], className)}
      {...props}
    />
  );
}
