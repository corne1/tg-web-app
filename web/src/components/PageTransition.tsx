import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Root cabinet tabs — tab bar lives inside each screen; skip page slide between them. */
const CABINET_TAB_ROOTS = new Set([
  "/cabinet",
  "/cabinet/clients",
  "/cabinet/profile",
]);

function isCabinetTabRoot(pathname: string): boolean {
  return CABINET_TAB_ROOTS.has(pathname);
}

/**
 * Enter animation on route change.
 * PUSH → from right, POP → from left, REPLACE → fade.
 * Tab-bar switches skip the page animation (bar keeps its own active-state motion).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const skipFirst = useRef(true);
  const prevPathRef = useRef(location.pathname);

  const fromPath = prevPathRef.current;
  const toPath = location.pathname;
  const tabSwitch =
    fromPath !== toPath &&
    isCabinetTabRoot(fromPath) &&
    isCabinetTabRoot(toPath);

  useLayoutEffect(() => {
    skipFirst.current = false;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const tone =
    navType === "POP" ? "back" : navType === "REPLACE" ? "replace" : "forward";

  const animate = !skipFirst.current && !tabSwitch;

  return (
    <div className="page-transition-root">
      <div
        key={location.key}
        className={
          animate
            ? `page-transition page-transition--${tone}`
            : "page-transition"
        }
      >
        {children}
      </div>
    </div>
  );
}
