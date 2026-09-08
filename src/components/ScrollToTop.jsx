import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset the document scroll position when the route path changes.
 *
 * Hash links are intentional in-page navigation, so they are left to the
 * browser/React Router. Query-only changes (for example test/modal state)
 * also keep their current position because pathname is the only dependency.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const previousPathname = useRef(null);

  useEffect(() => {
    const pathnameChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    if (!pathnameChanged || hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [hash, pathname]);

  return null;
}
