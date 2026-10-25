import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
};

export function SecondaryButton({
  fullWidth = true,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`btn btn-secondary ${fullWidth ? "btn-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
