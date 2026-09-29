import { calculateInvoiceAmounts, InvoiceCalculationError } from './invoice-calculator';

describe('calculateInvoiceAmounts', () => {
  it('reproduces the Appendix A mock invoice totals', () => {
    expect(
      calculateInvoiceAmounts({
        items: [{ quantity: 2, rate: 1000 }],
        taxRate: 10,
        discount: 20,
        totalPaid: 1451.34,
      }),
    ).toEqual({
      invoiceSubTotal: 2000,
      totalTax: 200,
      totalDiscount: 20,
      totalAmount: 2180,
      totalPaid: 1451.34,
      balanceAmount: 728.66,
    });
  });

  it('applies tax to the subtotal before subtracting the discount', () => {
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 1, rate: 100 }],
      taxRate: 10,
      discount: 50,
    });
    expect(result.totalTax).toBe(10); // 10% of 100, not of 50
    expect(result.totalAmount).toBe(60);
  });

  it('avoids floating-point drift', () => {
    // 0.1 + 0.2 style errors: 3 × 0.1 = 0.30000000000000004 in plain JS.
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 3, rate: 0.1 }],
      taxRate: 0,
      discount: 0,
    });
    expect(result.invoiceSubTotal).toBe(0.3);
    expect(result.totalAmount).toBe(0.3);
  });

  it('rounds tax half-up to 2 decimal places', () => {
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 3, rate: 99.99 }],
      taxRate: 10,
      discount: 5,
    });
    expect(result.invoiceSubTotal).toBe(299.97);
    expect(result.totalTax).toBe(30); // 29.997 -> 30.00
    expect(result.totalAmount).toBe(324.97);
  });

  it('supports fractional tax rates', () => {
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 1, rate: 200 }],
      taxRate: 7.5,
      discount: 0,
    });
    expect(result.totalTax).toBe(15);
    expect(result.totalAmount).toBe(215);
  });

  it('sums multiple line items', () => {
    const result = calculateInvoiceAmounts({
      items: [
        { quantity: 2, rate: 10.5 },
        { quantity: 1, rate: 4.25 },
      ],
      taxRate: 0,
      discount: 0,
    });
    expect(result.invoiceSubTotal).toBe(25.25);
  });

  it('defaults totalPaid to 0 so balance equals total', () => {
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 1, rate: 100 }],
      taxRate: 10,
      discount: 0,
    });
    expect(result.totalPaid).toBe(0);
    expect(result.balanceAmount).toBe(110);
  });

  it('allows a discount equal to subtotal plus tax (zero total)', () => {
    const result = calculateInvoiceAmounts({
      items: [{ quantity: 1, rate: 100 }],
      taxRate: 10,
      discount: 110,
    });
    expect(result.totalAmount).toBe(0);
  });

  it('rejects a discount larger than subtotal plus tax', () => {
    expect(() =>
      calculateInvoiceAmounts({
        items: [{ quantity: 1, rate: 100 }],
        taxRate: 10,
        discount: 110.01,
      }),
    ).toThrow(InvoiceCalculationError);
  });

  it('rejects a payment larger than the total', () => {
    expect(() =>
      calculateInvoiceAmounts({
        items: [{ quantity: 1, rate: 100 }],
        taxRate: 0,
        discount: 0,
        totalPaid: 100.01,
      }),
    ).toThrow(InvoiceCalculationError);
  });
});
