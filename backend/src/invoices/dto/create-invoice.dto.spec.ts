import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { flattenValidationErrors } from '../../common/validation/validation-exception.factory';
import { CreateInvoiceDto } from './create-invoice.dto';

const validPayload = () => ({
  invoiceNumber: 'INV-1',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  customer: { fullname: 'Paul', email: 'paul@101digital.io' },
  items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
});

function validate(payload: object) {
  const dto = plainToInstance(CreateInvoiceDto, payload);
  return { dto, messages: flattenValidationErrors(validateSync(dto)) };
}

describe('CreateInvoiceDto validation', () => {
  it('accepts a valid payload and applies defaults (tax 10%, discount 0)', () => {
    const { dto, messages } = validate(validPayload());
    expect(messages).toEqual([]);
    expect(dto.taxRate).toBe(10);
    expect(dto.discount).toBe(0);
  });

  describe('due date', () => {
    it('rejects a due date before the invoice date', () => {
      const { messages } = validate({ ...validPayload(), dueDate: '2026-06-02' });
      expect(messages).toEqual(['dueDate must be on or after invoiceDate']);
    });

    it('accepts a due date equal to the invoice date', () => {
      const { messages } = validate({ ...validPayload(), dueDate: '2026-06-03' });
      expect(messages).toEqual([]);
    });

    it.each(['2026-02-30', '03/06/2026', '2026-6-3', '2026-06-03T00:00:00Z'])(
      'rejects invalid date %s',
      (dueDate) => {
        const { messages } = validate({ ...validPayload(), dueDate });
        expect(messages).toEqual(['dueDate must be a valid date in YYYY-MM-DD format']);
      },
    );
  });

  it('requires customer name and a valid email', () => {
    const { messages } = validate({
      ...validPayload(),
      customer: { fullname: '   ', email: 'nope' },
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        'customer.fullname should not be empty',
        'customer.email must be an email',
      ]),
    );
  });

  it('requires exactly one line item', () => {
    const item = validPayload().items[0];
    expect(validate({ ...validPayload(), items: [] }).messages).toContain(
      'items must contain at least 1 elements',
    );
    expect(validate({ ...validPayload(), items: [item, item] }).messages).toContain(
      'items must contain no more than 1 elements',
    );
  });

  it('keeps array-level errors when nested items are also invalid', () => {
    const bad = { name: 'x', quantity: 0, rate: 1 };
    const { messages } = validate({ ...validPayload(), items: [bad, bad] });
    expect(messages).toEqual(
      expect.arrayContaining([
        'items must contain no more than 1 elements',
        'items.0.quantity must be a positive number',
      ]),
    );
  });

  it('requires a positive integer quantity and positive rate', () => {
    const { messages } = validate({
      ...validPayload(),
      items: [{ name: 'W', quantity: 1.5, rate: 0 }],
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        'items.0.quantity must be an integer number',
        'items.0.rate must be a positive number',
      ]),
    );
  });

  it('rejects negative tax and discount', () => {
    const { messages } = validate({ ...validPayload(), taxRate: -1, discount: -5 });
    expect(messages).toEqual(
      expect.arrayContaining([
        'taxRate must not be less than 0',
        'discount must not be less than 0',
      ]),
    );
  });

  it('normalises currency to upper case and rejects unknown codes', () => {
    expect(validate({ ...validPayload(), currency: 'usd' }).dto.currency).toBe('USD');
    expect(validate({ ...validPayload(), currency: 'XXZ' }).messages).toEqual([
      'currency must be a valid ISO4217 currency code',
    ]);
  });
});
