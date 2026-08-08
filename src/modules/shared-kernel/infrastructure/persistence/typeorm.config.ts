import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export function createTypeOrmOptions(): DataSourceOptions {
  const ssl = readBoolean(process.env.MYSQL_SSL, false);
  const sslOptions = ssl
    ? {
        rejectUnauthorized: true,
        ...(process.env.MYSQL_SSL_CA
          ? {
              ca: readFileSync(
                resolve(process.cwd(), process.env.MYSQL_SSL_CA),
                'utf8',
              ),
            }
          : {}),
      }
    : undefined;

  return {
    type: 'mysql',
    host: required('MYSQL_HOST'),
    port: numberEnvironment('MYSQL_PORT', 3306),
    username: required('MYSQL_USER'),
    password: required('MYSQL_PASSWORD'),
    database: required('MYSQL_DATABASE'),
    charset: 'utf8mb4',
    timezone: 'Z',
    entities: [
      resolve(
        __dirname,
        '../../../*/infrastructure/persistence/entities/*.orm-entity{.ts,.js}',
      ),
    ],
    migrations: [resolve(__dirname, 'migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: readBoolean(process.env.TYPEORM_LOGGING, false),
    ssl: sslOptions,
    extra: {
      connectionLimit: numberEnvironment('MYSQL_POOL_SIZE', 10),
    },
  };
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnvironment(name: string, fallback: number) {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return ['true', '1', 'yes', 'required'].includes(value.trim().toLowerCase());
}
