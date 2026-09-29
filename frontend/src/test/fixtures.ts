import type { InvoiceDetail, InvoiceSummary, UserProfile } from '../api/types';

export const TEST_USER: UserProfile = {
  id: 'ad1e0902-1928-4345-b513-60c86c94fc91',
  email: 'reviewer@simpleinvoice.dev',
  fullname: 'Test Reviewer',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const TEST_PASSWORD = 'Password123!';

/** The Appendix A mock invoice as the API returns it. */
export const MOCK_INVOICE: InvoiceDetail = {
  invoiceId: '099ca7da-a290-40fa-93b9-1c43ae7bb887',
  invoiceNumber: 'IV1780488206995',
  invoiceReference: '#5721662',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  currencySymbol: 'AU$',
  customer: {
    fullname: 'Paul',
    email: 'paul@101digital.io',
    mobileNumber: '947717364111',
    address: 'Singapore',
  },
  totalAmount: 2180,
  balanceAmount: 728.66,
  status: 'Overdue',
  description: 'Invoice is issued to Kanglee',
  items: [
    {
      id: 'b1c2d3e4-0000-0000-0000-000000000001',
      name: 'Honda RC150',
      quantity: 2,
      rate: 1000,
      amount: 2000,
    },
  ],
  taxRate: 10,
  invoiceSubTotal: 2000,
  totalTax: 200,
  totalDiscount: 20,
  totalPaid: 1451.34,
  createdAt: '2026-06-03T12:03:26.995Z',
  createdBy: TEST_USER.id,
};

export function toSummary(invoice: InvoiceDetail): InvoiceSummary {
  const {
    invoiceId,
    invoiceNumber,
    invoiceReference,
    invoiceDate,
    dueDate,
    currency,
    currencySymbol,
  } = invoice;
  const { customer, totalAmount, balanceAmount, status } = invoice;
  return {
    invoiceId,
    invoiceNumber,
    invoiceReference,
    invoiceDate,
    dueDate,
    currency,
    currencySymbol,
    customer,
    totalAmount,
    balanceAmount,
    status,
  };
}

const CUSTOMERS = ['Acme Corporation', 'Linh Nguyen', 'Olivia Smith', 'Northwind Traders'];
const STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue'] as const;

/** A deterministic set of invoices: the mock plus `count - 1` generated ones. */
export function buildInvoices(count = 12): InvoiceDetail[] {
  const generated = Array.from({ length: count - 1 }, (_, i): InvoiceDetail => {
    const n = i + 1;
    const total = 100 * n + 0.5;
    return {
      ...MOCK_INVOICE,
      invoiceId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      invoiceNumber: `INV-${1000 + n}`,
      invoiceReference: null,
      invoiceDate: `2026-08-${String(n).padStart(2, '0')}`,
      dueDate: `2026-09-${String(n).padStart(2, '0')}`,
      customer: { ...MOCK_INVOICE.customer, fullname: CUSTOMERS[n % CUSTOMERS.length] },
      status: STATUSES[n % STATUSES.length],
      totalAmount: total,
      balanceAmount: total,
      totalPaid: 0,
    };
  });
  return [MOCK_INVOICE, ...generated];
}
