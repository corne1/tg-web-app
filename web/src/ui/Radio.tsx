import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

/** Visual radio indicator (pair with RadioInput). */
export function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span className={cx("ms-radio", checked && "is-on")} aria-hidden />
  );
}

/** Full-bleed clipped native radio for custom rows. */
export function RadioInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="radio" className="ms-sheet-radio-input" {...props} />
  );
}

export function RadioOption({
  id,
  name,
  label,
  checked,
  onChange,
  className,
  labelClassName,
}: {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cx(
        "ms-sheet-item",
        "ms-sheet-item-row",
        checked && "is-active",
        className,
      )}
    >
      <RadioInput
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className={cx("ms-sheet-item-label", labelClassName)}>{label}</span>
      <RadioMark checked={checked} />
    </label>
  );
}
