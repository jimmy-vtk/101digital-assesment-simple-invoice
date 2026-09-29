import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Invoice, INVOICE_NUMBER_UNIQUE } from './entities/invoice.entity';
import { PersistedInvoiceStatus } from './invoice-status';
import { InvoicesService } from './invoices.service';

const USER_ID = 'ad1e0902-1928-4345-b513-60c86c94fc91';

const dto = (overrides: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto => ({
  invoiceNumber: 'INV-1',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  customer: { fullname: 'Paul', email: 'paul@101digital.io' },
  items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
  taxRate: 10,
  discount: 20,
  ...overrides,
});

function uniqueViolation(constraint: string) {
  return new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint,
    }),
  );
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  // Only the repository methods the service uses.
  let repo: {
    create: jest.Mock<Invoice, [Partial<Invoice>]>;
    save: jest.Mock<Promise<Invoice>, [Partial<Invoice>]>;
    findOne: jest.Mock<Promise<Invoice | null>, [unknown]>;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((entity) => entity as Invoice),
      save: jest.fn(async (entity) => ({ ...entity, invoiceId: 'new-id' }) as Invoice),
      findOne: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [InvoicesService, { provide: getRepositoryToken(Invoice), useValue: repo }],
    }).compile();
    service = moduleRef.get(InvoicesService);
  });

  describe('create', () => {
    beforeEach(() => {
      repo.findOne.mockImplementation(
        async () =>
          ({
            ...(repo.save.mock.calls[0][0] as Invoice),
            invoiceId: 'new-id',
            createdAt: new Date(),
            items: [],
          }) as Invoice,
      );
    });

    it('always persists new invoices as Draft with server-calculated totals', async () => {
      await service.create(dto(), USER_ID);

      const saved = repo.save.mock.calls[0][0] as Invoice;
      expect(saved.status).toBe(PersistedInvoiceStatus.Draft);
      expect(saved).toMatchObject({
        invoiceSubTotal: 2000,
        totalTax: 200,
        totalDiscount: 20,
        totalAmount: 2180,
        totalPaid: 0,
        balanceAmount: 2180,
        currencySymbol: 'AU$',
        createdBy: USER_ID,
      });
    });

    it('maps a unique-constraint violation on invoice number to 409 Conflict', async () => {
      repo.save.mockRejectedValueOnce(uniqueViolation(INVOICE_NUMBER_UNIQUE));
      await expect(service.create(dto(), USER_ID)).rejects.toThrow(
        new ConflictException('Invoice number "INV-1" already exists'),
      );
    });

    it('rethrows unrelated database errors', async () => {
      repo.save.mockRejectedValueOnce(uniqueViolation('some_other_constraint'));
      await expect(service.create(dto(), USER_ID)).rejects.toBeInstanceOf(QueryFailedError);
    });

    it('rejects a discount larger than subtotal plus tax with 400', async () => {
      await expect(service.create(dto({ discount: 5000 }), USER_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws 404 when the invoice does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        new NotFoundException('Invoice not found'),
      );
    });
  });
});
