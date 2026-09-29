const amountFormat = new Intl.NumberFormat('en', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `AU$2,180.00`, using the display symbol the API stores with the invoice. */
export function formatMoney(amount: number, currencySymbol: string): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol}${amountFormat.format(Math.abs(amount))}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `2026-06-03` -> `3 Jun 2026`. Built by hand rather than with Intl, whose
 * short month names vary by browser/ICU version ("Sep" vs "Sept"), and read
 * straight from the string so the day never shifts with the user's timezone.
 */
export function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) return date;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : dateTimeFormat.format(parsed);
}

/** Today's date as `YYYY-MM-DD` in the user's local timezone (for date inputs). */
export function todayLocal(now = new Date()): string {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
