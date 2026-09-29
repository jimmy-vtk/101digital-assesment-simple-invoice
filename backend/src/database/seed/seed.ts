import { DataSource } from 'typeorm';
import { buildDataSourceOptions, databaseConfigFromEnv, loadEnvFile } from '../typeorm.config';
import { seedDatabase } from './seeder';

/** CLI entry point for `npm run seed`. */
async function main(): Promise<void> {
  loadEnvFile();
  const reviewer = {
    email: requireEnv('SEED_USER_EMAIL'),
    password: requireEnv('SEED_USER_PASSWORD'),
    fullname: process.env.SEED_USER_FULLNAME?.trim() || 'Reviewer',
  };

  const dataSource = new DataSource(buildDataSourceOptions(databaseConfigFromEnv(process.env)));
  await dataSource.initialize();
  try {
    const { inserted, total } = await seedDatabase(dataSource, reviewer);
    console.log(
      `Seed complete: reviewer ${reviewer.email}; ${inserted} of ${total} invoices inserted.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
