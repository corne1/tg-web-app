import type { TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid, className, ...props }: Props) {
  return (
    <textarea
      className={cx("ms-textarea", invalid && "is-invalid", className)}
      {...props}
    />
  );
}
