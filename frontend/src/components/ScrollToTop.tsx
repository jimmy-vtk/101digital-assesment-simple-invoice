import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Starts each page at the top (list query-string changes don't count as a new page). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
