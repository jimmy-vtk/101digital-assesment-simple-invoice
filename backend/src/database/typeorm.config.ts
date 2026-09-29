import { DataSourceOptions } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { User } from '../users/user.entity';
import { InitialSchema1790000000000 } from './migrations/1790000000000-InitialSchema';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Single source of truth for TypeORM options, shared by the Nest app, the
 * migration CLI and the seed script. Entities and migrations are listed
 * explicitly (not globbed) so they resolve identically under ts-node, jest
 * and the compiled build.
 */
export function buildDataSourceOptions(db: DatabaseConfig): DataSourceOptions {
  return {
    type: 'postgres',
    ...db,
    // gen_random_uuid() is built into PostgreSQL 13+; no uuid-ossp extension needed.
    uuidExtension: 'pgcrypto',
    entities: [User, Invoice, InvoiceItem],
    migrations: [InitialSchema1790000000000],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
  };
}

export function databaseConfigFromEnv(env: NodeJS.ProcessEnv): DatabaseConfig {
  const required = (key: string): string => {
    const value = env[key];
    if (!value) throw new Error(`Missing required environment variable ${key}`);
    return value;
  };
  return {
    host: required('DB_HOST'),
    port: Number(env.DB_PORT ?? 5432),
    username: required('DB_USERNAME'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  };
}

/** Loads `.env` from the working directory if present; real env vars win. */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the process environment.
  }
}
