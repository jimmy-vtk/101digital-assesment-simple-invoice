import Decimal from 'decimal.js';

export interface LineItemInput {
  quantity: number;
  rate: number;
}

export interface InvoiceAmountsInput {
  items: LineItemInput[];
  /** Tax percentage, e.g. 10 for 10%. */
  taxRate: number;
  /** Flat discount amount in invoice currency. */
  discount: number;
  totalPaid?: number;
}

export interface InvoiceAmounts {
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
}

export class InvoiceCalculationError extends Error {}

const money = (value: Decimal.Value) =>
  new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/**
 * Server-side invoice totals, using decimal arithmetic (no float drift):
 *
 *   subTotal      = Σ quantity × rate
 *   taxAmount     = subTotal × (taxRate / 100)
 *   totalAmount   = subTotal + taxAmount − discount
 *   balanceAmount = totalAmount − totalPaid
 *
 * Tax is applied before the discount, as the specification's formula states.
 * Every amount is rounded half-up to 2 decimal places.
 */
export function calculateInvoiceAmounts(input: InvoiceAmountsInput): InvoiceAmounts {
  const subTotal = money(
    input.items.reduce(
      (sum, item) => sum.plus(new Decimal(item.quantity).times(item.rate)),
      new Decimal(0),
    ),
  );
  const tax = money(subTotal.times(input.taxRate).dividedBy(100));
  const discount = money(input.discount);
  const total = subTotal.plus(tax).minus(discount);
  const paid = money(input.totalPaid ?? 0);

  if (total.isNegative()) {
    throw new InvoiceCalculationError('discount must not exceed the invoice subtotal plus tax');
  }
  if (paid.greaterThan(total)) {
    throw new InvoiceCalculationError('totalPaid must not exceed totalAmount');
  }

  return {
    invoiceSubTotal: subTotal.toNumber(),
    totalTax: tax.toNumber(),
    totalDiscount: discount.toNumber(),
    totalAmount: total.toNumber(),
    totalPaid: paid.toNumber(),
    balanceAmount: total.minus(paid).toNumber(),
  };
}
