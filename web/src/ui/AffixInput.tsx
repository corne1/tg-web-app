import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";
import { Input } from "./Input";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  disabledVisual?: boolean;
  prefix?: string;
  suffix?: string;
};

export function AffixInput({
  invalid,
  disabledVisual,
  prefix,
  suffix = "₽",
  className,
  ...props
}: Props) {
  return (
    <div
      className={cx(
        "ms-input-affix",
        prefix && "ms-input-affix-prefix",
        disabledVisual && "is-disabled",
        className,
      )}
    >
      {prefix ? <span className="ms-prefix">{prefix}</span> : null}
      <Input invalid={invalid} {...props} />
      {suffix ? <span className="ms-affix">{suffix}</span> : null}
    </div>
  );
}
