import bcrypt from 'bcryptjs';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import { todayUtc } from '../../common/utils/date.util';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { calculateInvoiceAmounts } from '../../invoices/invoice-calculator';
import { PersistedInvoiceStatus } from '../../invoices/invoice-status';
import { User } from '../../users/user.entity';
import { buildDataSourceOptions, databaseConfigFromEnv, loadEnvFile } from '../typeorm.config';
import { generateInvoices, MOCK_INVOICE, REVIEWER_USER_ID, SeedInvoice } from './seed-data';

/**
 * Idempotent seed: runs pending migrations, upserts the reviewer account
 * (resetting its password to the configured value) and inserts any seed
 * invoices that don't exist yet. Safe to run repeatedly.
 */
async function seed(): Promise<void> {
  loadEnvFile();
  const email = requireEnv('SEED_USER_EMAIL').trim().toLowerCase();
  const password = requireEnv('SEED_USER_PASSWORD');
  const fullname = process.env.SEED_USER_FULLNAME?.trim() || 'Reviewer';

  const dataSource = new DataSource(buildDataSourceOptions(databaseConfigFromEnv(process.env)));
  await dataSource.initialize();
  try {
    await dataSource.runMigrations({ transaction: 'each' });
    const inserted = await dataSource.transaction(async (manager) => {
      const user = await upsertReviewer(manager, email, password, fullname);
      const invoices = [MOCK_INVOICE, ...generateInvoices(todayUtc())];
      let count = 0;
      for (const data of invoices) {
        if (await insertInvoiceIfMissing(manager, data, user.id)) count++;
      }
      return { count, total: invoices.length };
    });
    console.log(
      `Seed complete: reviewer ${email}; ${inserted.count} of ${inserted.total} invoices inserted.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

async function upsertReviewer(
  manager: EntityManager,
  email: string,
  password: string,
  fullname: string,
): Promise<User> {
  const users = manager.getRepository(User);
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await users.findOneBy({ email });
  if (existing) {
    return users.save({ ...existing, passwordHash, fullname });
  }
  // Reuse the mock record's createdBy id unless another user already has it.
  const idTaken = await users.existsBy({ id: REVIEWER_USER_ID });
  return users.save(
    users.create({ ...(idTaken ? {} : { id: REVIEWER_USER_ID }), email, passwordHash, fullname }),
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

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
