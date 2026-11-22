import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Root cabinet tabs — no page slide / remount flash between them. */
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
 * Landing on a cabinet tab root skips the page animation (tab bar owns that UX).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const skipFirst = useRef(true);
  const prevPathRef = useRef(location.pathname);

  const fromPath = prevPathRef.current;
  const toPath = location.pathname;
  const toTab = isCabinetTabRoot(toPath);
  const fromTab = isCabinetTabRoot(fromPath);
  /** Same URL re-push, or any navigation that lands on a tab root. */
  const skipAnim =
    skipFirst.current ||
    fromPath === toPath ||
    toTab ||
    (fromTab && toTab);

  useLayoutEffect(() => {
    skipFirst.current = false;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const tone =
    navType === "POP" ? "back" : navType === "REPLACE" ? "replace" : "forward";

  /**
   * Tab roots key by pathname so a same-tab history push (new location.key)
   * does not remount the screen. Deeper routes keep location.key for enter anim.
   */
  const transitionKey = toTab ? `tab:${toPath}` : location.key;

  return (
    <div className="page-transition-root">
      <div
        key={transitionKey}
        className={
          skipAnim
            ? "page-transition"
            : `page-transition page-transition--${tone}`
        }
      >
        {children}
      </div>
    </div>
  );
}
