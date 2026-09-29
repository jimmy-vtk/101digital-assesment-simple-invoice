import { describe, expect, it } from 'vitest';
import {
  createInvoiceSchema,
  fieldForServerMessage,
  toCreateInvoiceRequest,
} from '../invoices/createInvoiceSchema';
import { parseInvoiceQuery } from '../invoices/useInvoiceQueryParams';
import { addDays, formatDate, formatMoney } from './format';

describe('formatting', () => {
  it('formats money with the invoice currency symbol', () => {
    expect(formatMoney(2180, 'AU$')).toBe('AU$2,180.00');
    expect(formatMoney(728.66, '£')).toBe('£728.66');
    expect(formatMoney(0.3, 'US$')).toBe('US$0.30');
  });

  it('formats date-only strings without timezone shifts', () => {
    expect(formatDate('2026-06-03')).toBe('3 Jun 2026');
    expect(formatDate('2026-09-30')).toBe('30 Sep 2026');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 30)).toBe('2026-03-02');
  });
});

describe('parseInvoiceQuery', () => {
  it('applies defaults', () => {
    expect(parseInvoiceQuery(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: 'invoiceDate',
      ordering: 'DESC',
      status: undefined,
      keyword: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
  });

  it('ignores invalid values from hand-edited URLs', () => {
    const query = parseInvoiceQuery(
      new URLSearchParams(
        'page=-2&pageSize=999&sortBy=hack&ordering=up&status=Late&fromDate=yesterday',
      ),
    );
    expect(query).toMatchObject({ page: 1, pageSize: 10, sortBy: 'invoiceDate', ordering: 'DESC' });
    expect(query.status).toBeUndefined();
    expect(query.fromDate).toBeUndefined();
  });

  it('accepts valid values (ordering is case-insensitive)', () => {
    expect(
      parseInvoiceQuery(
        new URLSearchParams(
          'page=3&pageSize=20&sortBy=totalAmount&ordering=asc&status=Overdue&keyword=%20paul%20',
        ),
      ),
    ).toMatchObject({
      page: 3,
      pageSize: 20,
      sortBy: 'totalAmount',
      ordering: 'ASC',
      status: 'Overdue',
      keyword: 'paul',
    });
  });
});

describe('create invoice form mapping', () => {
  const values = {
    invoiceNumber: ' INV-9 ',
    invoiceReference: '',
    invoiceDate: '2026-06-03',
    dueDate: '2026-07-03',
    currency: 'AUD' as const,
    description: '  ',
    customer: {
      fullname: ' Paul ',
      email: 'paul@101digital.io',
      mobileNumber: '',
      address: 'Singapore',
    },
    item: { name: 'Honda RC150', quantity: '2', rate: '1000' },
    taxRate: '',
    discount: '20',
  };

  it('passes schema validation', () => {
    expect(createInvoiceSchema.safeParse(values).success).toBe(true);
  });

  it('builds the API request: trims, drops blanks, converts numbers, defaults tax to 10%', () => {
    expect(toCreateInvoiceRequest(values)).toEqual({
      invoiceNumber: 'INV-9',
      invoiceReference: undefined,
      invoiceDate: '2026-06-03',
      dueDate: '2026-07-03',
      currency: 'AUD',
      description: undefined,
      customer: {
        fullname: 'Paul',
        email: 'paul@101digital.io',
        mobileNumber: undefined,
        address: 'Singapore',
      },
      items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
      taxRate: 10,
      discount: 20,
    });
  });

  it('rejects more than 2 decimal places in money fields', () => {
    const result = createInvoiceSchema.safeParse({
      ...values,
      item: { ...values.item, rate: '10.999' },
    });
    expect(result.success).toBe(false);
  });

  it('maps server messages to form fields', () => {
    expect(fieldForServerMessage('items.0.rate must be a positive number')).toBe('item.rate');
    expect(fieldForServerMessage('customer.email must be an email')).toBe('customer.email');
    expect(fieldForServerMessage('dueDate must be on or after invoiceDate')).toBe('dueDate');
    expect(fieldForServerMessage('Something else entirely')).toBeUndefined();
  });
});
