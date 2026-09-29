/** Statuses that are written to the database. */
export enum PersistedInvoiceStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Paid = 'Paid',
}

/** Statuses exposed by the API. `Overdue` is derived at read time, never stored. */
export enum InvoiceStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Paid = 'Paid',
  Overdue = 'Overdue',
}

/**
 * An unpaid invoice whose due date has passed is Overdue; otherwise the
 * persisted status is returned. Dates are `YYYY-MM-DD`, so string comparison
 * is chronological.
 *
 * Must stay in sync with the SQL filter in InvoicesService.applyStatusFilter.
 */
export function deriveInvoiceStatus(
  status: PersistedInvoiceStatus,
  dueDate: string,
  today: string,
): InvoiceStatus {
  if (status !== PersistedInvoiceStatus.Paid && dueDate < today) {
    return InvoiceStatus.Overdue;
  }
  return status as unknown as InvoiceStatus;
}
