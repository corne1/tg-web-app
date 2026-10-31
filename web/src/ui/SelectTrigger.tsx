import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { ChevronDownIcon } from "./icons";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  invalid?: boolean;
  value: ReactNode;
};

export function SelectTrigger({
  invalid,
  value,
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cx("ms-select", invalid && "is-invalid", className)}
      {...props}
    >
      <span>{value}</span>
      <ChevronDownIcon className="ms-select-chevron" />
    </button>
  );
}
