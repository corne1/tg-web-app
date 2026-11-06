import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Enter animation on route change.
 * PUSH → from right, POP → from left, REPLACE → fade.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const skipAnim = useRef(true);

  useLayoutEffect(() => {
    skipAnim.current = false;
  }, []);

  const tone =
    navType === "POP" ? "back" : navType === "REPLACE" ? "replace" : "forward";

  return (
    <div className="page-transition-root">
      <div
        key={location.key}
        className={
          skipAnim.current
            ? "page-transition"
            : `page-transition page-transition--${tone}`
        }
      >
        {children}
      </div>
    </div>
  );
}
