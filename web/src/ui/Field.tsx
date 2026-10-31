import type { ReactNode } from "react";
import { cx } from "./cx";

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
  const Tag = as;
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

  return (
    <Tag className={cx("ms-field", className)}>
      {as === "fieldset" ? (
        <legend className="ms-label">{labelNode}</legend>
      ) : htmlFor ? (
        <label className="ms-label" htmlFor={htmlFor}>
          {labelNode}
        </label>
      ) : (
        <span className="ms-label">{labelNode}</span>
      )}
      {children}
      {error ? <span className="ms-field-error">{error}</span> : null}
    </Tag>
  );
}
