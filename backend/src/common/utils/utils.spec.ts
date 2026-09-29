import { addDays, isDateOnly, todayUtc } from './date.util';
import { escapeLike } from './sql.util';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeLike('IV-1780')).toBe('IV-1780');
  });
});

describe('date utils', () => {
  it('formats today in UTC regardless of local timezone', () => {
    expect(todayUtc(new Date('2026-09-29T23:30:00-05:00'))).toBe('2026-09-30');
  });

  it('validates strict calendar dates', () => {
    expect(isDateOnly('2028-02-29')).toBe(true); // leap year
    expect(isDateOnly('2026-02-29')).toBe(false);
    expect(isDateOnly('2026-13-01')).toBe(false);
    expect(isDateOnly(20260101)).toBe(false);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
