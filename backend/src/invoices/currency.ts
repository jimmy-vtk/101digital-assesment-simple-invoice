/** Preferred display symbols; others fall back to Intl (e.g. "CHF"). */
const SYMBOLS: Record<string, string> = {
  AUD: 'AU$',
  USD: 'US$',
  GBP: '£',
  EUR: '€',
  SGD: 'S$',
  NZD: 'NZ$',
  JPY: '¥',
  VND: '₫',
};

export function currencySymbol(currency: string): string {
  const code = currency.toUpperCase();
  if (SYMBOLS[code]) return SYMBOLS[code];
  try {
    const part = new Intl.NumberFormat('en', { style: 'currency', currency: code })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? code;
  } catch {
    return code;
  }
}
