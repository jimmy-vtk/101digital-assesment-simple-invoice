import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from '../../src/app.setup';

export interface TestApp {
  app: INestApplication<App>;
  dataSource: DataSource;
  close(): Promise<void>;
}

/**
 * Boots the real Nest app (same pipeline as main.ts) against a throwaway
 * PostgreSQL container and applies the real migrations. Requires Docker.
 */
export async function startTestApp(): Promise<TestApp> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  ).start();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_HOST: container.getHost(),
    DB_PORT: String(container.getPort()),
    DB_USERNAME: container.getUsername(),
    DB_PASSWORD: container.getPassword(),
    DB_NAME: container.getDatabase(),
    JWT_SECRET: 'e2e-secret-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '3600',
  });

  // Loaded after env is set: ConfigModule validates env when AppModule loads.
  const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

  return {
    app,
    dataSource,
    close: async () => {
      await app.close();
      await container.stop();
    },
  };
}
