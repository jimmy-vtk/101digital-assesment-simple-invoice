import bcrypt from 'bcryptjs';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import { todayUtc } from '../../common/utils/date.util';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { calculateInvoiceAmounts } from '../../invoices/invoice-calculator';
import { PersistedInvoiceStatus } from '../../invoices/invoice-status';
import { User } from '../../users/user.entity';
import { generateInvoices, MOCK_INVOICE, REVIEWER_USER_ID, SeedInvoice } from './seed-data';

export interface ReviewerAccount {
  email: string;
  password: string;
  fullname: string;
}

export interface SeedResult {
  userId: string;
  inserted: number;
  total: number;
}

/**
 * Idempotent seed: runs pending migrations, upserts the reviewer account
 * (resetting its password to the configured value) and inserts any seed
 * invoices that don't exist yet. Safe to run repeatedly.
 */
export async function seedDatabase(
  dataSource: DataSource,
  reviewer: ReviewerAccount,
  today: string = todayUtc(),
): Promise<SeedResult> {
  await dataSource.runMigrations({ transaction: 'each' });
  return dataSource.transaction(async (manager) => {
    const user = await upsertReviewer(manager, reviewer);
    const invoices = [MOCK_INVOICE, ...generateInvoices(today)];
    let inserted = 0;
    for (const data of invoices) {
      if (await insertInvoiceIfMissing(manager, data, user.id)) inserted++;
    }
    return { userId: user.id, inserted, total: invoices.length };
  });
}

async function upsertReviewer(manager: EntityManager, reviewer: ReviewerAccount): Promise<User> {
  const users = manager.getRepository(User);
  const email = reviewer.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(reviewer.password, 10);
  const existing = await users.findOneBy({ email });
  if (existing) {
    return users.save({ ...existing, passwordHash, fullname: reviewer.fullname });
  }
  // Reuse the mock record's createdBy id unless another user already has it.
  const idTaken = await users.existsBy({ id: REVIEWER_USER_ID });
  return users.save(
    users.create({
      ...(idTaken ? {} : { id: REVIEWER_USER_ID }),
      email,
      passwordHash,
      fullname: reviewer.fullname,
    }),
  );
}

async function insertInvoiceIfMissing(
  manager: EntityManager,
  data: SeedInvoice,
  userId: string,
): Promise<boolean> {
  const invoices = manager.getRepository(Invoice);
  if (await invoices.existsBy({ invoiceNumber: data.invoiceNumber })) return false;

  const base = calculateInvoiceAmounts({
    items: [data.item],
    taxRate: data.taxRate,
    discount: data.discount,
  });
  const totalPaid =
    data.totalPaid ??
    (data.status === PersistedInvoiceStatus.Paid
      ? base.totalAmount
      : new Decimal(base.totalAmount).times(data.paidRatio).toDecimalPlaces(2).toNumber());
  const amounts = calculateInvoiceAmounts({
    items: [data.item],
    taxRate: data.taxRate,
    discount: data.discount,
    totalPaid,
  });

  await invoices.save(
    invoices.create({
      invoiceNumber: data.invoiceNumber,
      invoiceReference: data.invoiceReference,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      description: data.description,
      status: data.status,
      customer: data.customer,
      taxRate: data.taxRate,
      ...amounts,
      createdBy: userId,
      ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
      items: [data.item],
    }),
  );
  return true;
}
