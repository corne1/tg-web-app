import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type Ref,
} from "react";
import { cx } from "./cx";
import { useFieldControlId } from "./Field";
import { InputClearIcon } from "./icons";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Show clear control when the field has text. Default: on for text-like types. */
  clearable?: boolean;
};

const NO_CLEAR_TYPES = new Set([
  "checkbox",
  "radio",
  "file",
  "hidden",
  "range",
  "button",
  "submit",
  "reset",
  "image",
  "color",
]);

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  {
    invalid,
    className,
    clearable,
    value,
    defaultValue,
    onChange,
    onMouseDown,
    disabled,
    readOnly,
    type = "text",
    id,
    ...props
  },
  forwardedRef,
) {
  const autoId = useId();
  const fieldId = useFieldControlId(id);
  const inputId = fieldId ?? autoId;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(
    () => String(defaultValue ?? ""),
  );
  const current = String(controlled ? (value ?? "") : uncontrolled);
  const allowClear = clearable ?? !NO_CLEAR_TYPES.has(type);
  const showClear =
    allowClear && !disabled && !readOnly && current.length > 0;

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setUncontrolled(e.target.value);
    onChange?.(e);
  };

  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || readOnly) return;

    if (!controlled) setUncontrolled("");

    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (!onChange) return;

    const native = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    native?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    onChange({
      ...e,
      target: el,
      currentTarget: el,
    } as unknown as ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={cx("ms-input-wrap", showClear && "has-clear")}>
      <input
        {...props}
        ref={setInputRef}
        id={inputId}
        type={type}
        className={cx(
          "ms-input",
          invalid && "is-invalid",
          showClear && "has-clear",
          className,
        )}
        value={controlled ? value : uncontrolled}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        onMouseDown={(e) => {
          // Telegram Desktop WebView often keeps keyboard focus on the chat
          // composer; force the field to take focus on primary click.
          if (!disabled && !readOnly && e.button === 0) {
            e.currentTarget.focus();
          }
          onMouseDown?.(e);
        }}
      />
      {showClear ? (
        <button
          type="button"
          className="ms-input-clear"
          aria-label="Очистить"
          tabIndex={-1}
          onMouseDown={(ev) => {
            ev.preventDefault();
          }}
          onClick={handleClear}
        >
          <InputClearIcon />
        </button>
      ) : null}
    </div>
  );
});
