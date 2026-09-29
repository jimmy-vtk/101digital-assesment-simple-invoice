import { deriveInvoiceStatus, InvoiceStatus, PersistedInvoiceStatus } from './invoice-status';

describe('deriveInvoiceStatus', () => {
  const today = '2026-09-29';

  it.each([PersistedInvoiceStatus.Draft, PersistedInvoiceStatus.Pending])(
    'returns Overdue for %s invoices past their due date',
    (status) => {
      expect(deriveInvoiceStatus(status, '2026-09-28', today)).toBe(InvoiceStatus.Overdue);
    },
  );

  it('never marks a Paid invoice as Overdue', () => {
    expect(deriveInvoiceStatus(PersistedInvoiceStatus.Paid, '2020-01-01', today)).toBe(
      InvoiceStatus.Paid,
    );
  });

  it('is not Overdue on the due date itself', () => {
    expect(deriveInvoiceStatus(PersistedInvoiceStatus.Pending, today, today)).toBe(
      InvoiceStatus.Pending,
    );
  });

  it.each([PersistedInvoiceStatus.Draft, PersistedInvoiceStatus.Pending])(
    'returns the persisted %s status when not yet due',
    (status) => {
      expect(deriveInvoiceStatus(status, '2026-10-01', today)).toBe(status);
    },
  );

  it('compares across month and year boundaries correctly', () => {
    expect(deriveInvoiceStatus(PersistedInvoiceStatus.Pending, '2025-12-31', '2026-01-01')).toBe(
      InvoiceStatus.Overdue,
    );
  });
});
