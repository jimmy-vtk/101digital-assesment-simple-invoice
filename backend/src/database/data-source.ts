import { DataSource } from 'typeorm';
import { buildDataSourceOptions, databaseConfigFromEnv, loadEnvFile } from './typeorm.config';

// Used by the TypeORM CLI (migration:run / migration:generate).
loadEnvFile();

export default new DataSource(buildDataSourceOptions(databaseConfigFromEnv(process.env)));
