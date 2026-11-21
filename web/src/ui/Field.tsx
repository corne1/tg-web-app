import { createContext, useContext, useId, type ReactNode } from "react";
import { cx } from "./cx";

/** Lets Input/Textarea pick up the Field label's htmlFor target id. */
export const FieldControlIdContext = createContext<string | undefined>(
  undefined,
);

export function useFieldControlId(
  explicitId?: string,
): string | undefined {
  const fromField = useContext(FieldControlIdContext);
  return explicitId ?? fromField;
}

export function Field({
  label,
  htmlFor,
  optional,
  error,
  as = "div",
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  error?: string;
  as?: "div" | "label" | "fieldset";
  className?: string;
  children: ReactNode;
}) {
  const autoId = useId();
  /** `as="label"` used to wrap the control in <label>; that nests the clear
   *  button inside the label and breaks typing/focus in Telegram Desktop. */
  const controlId = htmlFor ?? (as === "label" ? autoId : undefined);

  const labelNode = (
    <>
      {label}
      {optional ? (
        <>
          {" "}
          <span className="ms-optional">необязательно</span>
        </>
      ) : null}
    </>
  );

  const body = (
    <>
      {as === "fieldset" ? (
        <legend className="ms-label">{labelNode}</legend>
      ) : controlId ? (
        <label className="ms-label" htmlFor={controlId}>
          {labelNode}
        </label>
      ) : (
        <span className="ms-label">{labelNode}</span>
      )}
      {children}
      {error ? <span className="ms-field-error">{error}</span> : null}
    </>
  );

  if (as === "fieldset") {
    return <fieldset className={cx("ms-field", className)}>{body}</fieldset>;
  }

  return (
    <FieldControlIdContext.Provider value={controlId}>
      <div className={cx("ms-field", className)}>{body}</div>
    </FieldControlIdContext.Provider>
  );
}
