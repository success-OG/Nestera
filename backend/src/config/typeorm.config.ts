import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const poolExtra = {
  max: parseInt(
    process.env.DATABASE_POOL_MAX || (isProduction ? '30' : '10'),
    10,
  ),
  min: parseInt(
    process.env.DATABASE_POOL_MIN || (isProduction ? '5' : '2'),
    10,
  ),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '2000',
    10,
  ),
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
  extra: poolExtra,
});
