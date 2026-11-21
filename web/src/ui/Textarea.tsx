import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";
import { useFieldControlId } from "./Field";

/** Default limit for description / about / note textareas. */
export const TEXTAREA_MAX_LEN = 300;

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  /**
   * Show `n/max` under the field.
   * Defaults to true when `maxLength` is set.
   */
  showCount?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  function Textarea(
    {
      invalid,
      className,
      maxLength,
      showCount,
      value,
      defaultValue,
      onChange,
      onMouseDown,
      disabled,
      readOnly,
      id,
      ...props
    },
    ref,
  ) {
    const autoId = useId();
    const fieldId = useFieldControlId(id);
    const textareaId = fieldId ?? autoId;
    const controlled = value !== undefined;
    const [uncontrolled, setUncontrolled] = useState(
      () => String(defaultValue ?? ""),
    );
    const current = String(controlled ? (value ?? "") : uncontrolled);
    const limit =
      typeof maxLength === "number" && Number.isFinite(maxLength)
        ? maxLength
        : undefined;
    const countVisible = showCount ?? limit != null;

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next =
        limit != null ? e.target.value.slice(0, limit) : e.target.value;
      if (!controlled) setUncontrolled(next);
      if (next !== e.target.value) {
        e.target.value = next;
      }
      onChange?.(e);
    };

    const handleMouseDown = (e: MouseEvent<HTMLTextAreaElement>) => {
      if (!disabled && !readOnly && e.button === 0) {
        e.currentTarget.focus();
      }
      onMouseDown?.(e);
    };

    return (
      <>
        <textarea
          {...props}
          ref={ref}
          id={textareaId}
          className={cx("ms-textarea", invalid && "is-invalid", className)}
          maxLength={limit}
          value={controlled ? value : uncontrolled}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          onMouseDown={handleMouseDown}
        />
        {countVisible && limit != null ? (
          <span className="ms-char-count" aria-live="polite">
            {Math.min(current.length, limit)}/{limit}
          </span>
        ) : null}
      </>
    );
  },
);
