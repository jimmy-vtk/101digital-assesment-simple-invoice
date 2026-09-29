import { DataSource } from 'typeorm';
import { buildDataSourceOptions, databaseConfigFromEnv, loadEnvFile } from './typeorm.config';

/** Applies pending migrations. Used by the Docker entrypoint (compiled build). */
async function main(): Promise<void> {
  loadEnvFile();
  const dataSource = new DataSource(buildDataSourceOptions(databaseConfigFromEnv(process.env)));
  await dataSource.initialize();
  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    console.log(
      applied.length > 0
        ? `Applied migrations: ${applied.map((m) => m.name).join(', ')}`
        : 'Database schema is up to date.',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
