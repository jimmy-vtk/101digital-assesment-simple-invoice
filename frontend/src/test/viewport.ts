/**
 * jsdom has no layout engine or matchMedia. This stub answers min-width
 * queries (what MUI's breakpoints use) from a chosen viewport width so tests
 * can exercise both the desktop table and the mobile card layout.
 */
const WIDTHS = { mobile: 375, desktop: 1280 } as const;
let width: number = WIDTHS.desktop;

export function setViewport(viewport: keyof typeof WIDTHS): void {
  width = WIDTHS[viewport];
}

function matches(query: string): boolean {
  const min = /min-width:\s*([\d.]+)px/.exec(query);
  const max = /max-width:\s*([\d.]+)px/.exec(query);
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    get matches() {
      return matches(query);
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
