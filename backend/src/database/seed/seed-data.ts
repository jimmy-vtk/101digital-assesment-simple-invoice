import { addDays } from '../../common/utils/date.util';
import { currencySymbol } from '../../invoices/currency';
import { PersistedInvoiceStatus } from '../../invoices/invoice-status';

/** Reviewer account id; matches `createdBy` in the Appendix A mock record. */
export const REVIEWER_USER_ID = 'ad1e0902-1928-4345-b513-60c86c94fc91';

export interface SeedInvoice {
  invoiceNumber: string;
  invoiceReference: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description: string | null;
  status: PersistedInvoiceStatus;
  customer: {
    fullname: string;
    email: string;
    mobileNumber: string | null;
    address: string | null;
  };
  taxRate: number;
  discount: number;
  /** Fraction of the total already paid (0..1); Paid invoices are always fully paid. */
  paidRatio: number;
  /** Exact amount paid; overrides paidRatio. */
  totalPaid?: number;
  item: { name: string; quantity: number; rate: number };
  createdAt?: string;
}

/**
 * Appendix A record, kept as provided except `status`: the mock says
 * "Overdue", but Overdue is derived and never stored. It is seeded as
 * Pending (partially paid) and is reported as Overdue since its due date has passed.
 */
export const MOCK_INVOICE: SeedInvoice = {
  invoiceNumber: 'IV1780488206995',
  invoiceReference: '#5721662',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  currencySymbol: 'AU$',
  description: 'Invoice is issued to Kanglee',
  status: PersistedInvoiceStatus.Pending,
  customer: {
    fullname: 'Paul',
    email: 'paul@101digital.io',
    mobileNumber: '947717364111',
    address: 'Singapore',
  },
  taxRate: 10,
  discount: 20,
  paidRatio: 0,
  totalPaid: 1451.34,
  item: { name: 'Honda RC150', quantity: 2, rate: 1000 },
  createdAt: '2026-06-03T12:03:26.995Z',
};

const CUSTOMERS = [
  { fullname: 'Paul Tran', email: 'paul.tran@example.com', address: 'Singapore' },
  {
    fullname: 'Linh Nguyen',
    email: 'linh.nguyen@example.com',
    address: 'Ho Chi Minh City, Vietnam',
  },
  { fullname: 'Olivia Smith', email: 'olivia.smith@example.com', address: 'Sydney, Australia' },
  {
    fullname: 'James Wilson',
    email: 'james.wilson@example.com',
    address: 'London, United Kingdom',
  },
  { fullname: 'Mei Chen', email: 'mei.chen@example.com', address: 'Kuala Lumpur, Malaysia' },
  { fullname: 'Arjun Patel', email: 'arjun.patel@example.com', address: 'Mumbai, India' },
  { fullname: 'Sofia Garcia', email: 'sofia.garcia@example.com', address: 'Madrid, Spain' },
  { fullname: 'Kanglee Holdings', email: 'accounts@kanglee.example.com', address: 'Singapore' },
  { fullname: 'Acme Corporation', email: 'billing@acme.example.com', address: 'New York, USA' },
  { fullname: 'Northwind Traders', email: 'ap@northwind.example.com', address: 'Seattle, USA' },
  { fullname: 'Emily Brown', email: 'emily.brown@example.com', address: 'Melbourne, Australia' },
  { fullname: 'Hiroshi Tanaka', email: 'hiroshi.tanaka@example.com', address: 'Tokyo, Japan' },
];

const PRODUCTS = [
  { name: 'Honda RC150', rate: 1000 },
  { name: 'Website Design Package', rate: 2500 },
  { name: 'Monthly SEO Retainer', rate: 850 },
  { name: 'Cloud Hosting (annual)', rate: 1199.99 },
  { name: 'Consulting Hours', rate: 150 },
  { name: 'Mobile App Maintenance', rate: 499.5 },
  { name: 'Office Chairs', rate: 289.9 },
  { name: 'Laptop Stand', rate: 45.25 },
  { name: 'UX Research Workshop', rate: 3200 },
  { name: 'Security Audit', rate: 5400 },
];

const CURRENCIES = ['AUD', 'AUD', 'AUD', 'USD', 'USD', 'SGD', 'GBP'];
const TAX_RATES = [10, 10, 10, 10, 0, 7.5, 20];
const PAYMENT_TERMS_DAYS = [7, 14, 30, 30, 45, 60];

/** Deterministic PRNG (mulberry32) so repeated seeds produce the same data. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}

/**
 * Generates `count` invoices with varied statuses, dates, currencies and
 * amounts. Dates are relative to `today` so a fresh seed always contains a
 * mix of upcoming, due-soon and overdue invoices.
 */
export function generateInvoices(today: string, count = 40): SeedInvoice[] {
  const random = createRandom(101);
  return Array.from({ length: count }, (_, i) => {
    const customer = random.pick(CUSTOMERS);
    const product = random.pick(PRODUCTS);
    const quantity = random.int(1, 12);
    const currency = random.pick(CURRENCIES);

    const roll = random.next();
    const status =
      roll < 0.3
        ? PersistedInvoiceStatus.Paid
        : roll < 0.65
          ? PersistedInvoiceStatus.Pending
          : PersistedInvoiceStatus.Draft;

    // Drafts are recent, pending invoices span the last quarter (some now
    // overdue), paid invoices go back further.
    const maxAgeDays = { Draft: 21, Pending: 75, Paid: 180 }[status];
    const invoiceDate = addDays(today, -random.int(0, maxAgeDays));
    const dueDate = addDays(invoiceDate, random.pick(PAYMENT_TERMS_DAYS));

    const subTotal = quantity * product.rate;
    const discount =
      random.next() < 0.3 ? Math.min(random.pick([10, 25, 50, 100]), subTotal / 2) : 0;

    return {
      invoiceNumber: `INV-${String(1001 + i)}`,
      invoiceReference: random.next() < 0.5 ? `#${random.int(1000000, 9999999)}` : null,
      invoiceDate,
      dueDate,
      currency,
      currencySymbol: currencySymbol(currency),
      description: `${product.name} for ${customer.fullname}`,
      status,
      customer: {
        fullname: customer.fullname,
        email: customer.email,
        mobileNumber: random.next() < 0.6 ? `+65${random.int(80000000, 99999999)}` : null,
        address: customer.address,
      },
      taxRate: random.pick(TAX_RATES),
      discount,
      paidRatio: status === PersistedInvoiceStatus.Pending ? random.pick([0, 0, 0.25, 0.5]) : 0,
      item: { name: product.name, quantity, rate: product.rate },
    };
  });
}
