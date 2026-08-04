import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mysql, { Pool } from 'mysql2/promise';
import { PetcareState } from '../../domains/shared/petcare-state';
import { PetcarePersistence } from '../../application/ports/petcare-persistence.port';

@Injectable()
export class MysqlPersistenceService
  implements PetcarePersistence, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MysqlPersistenceService.name);
  private readonly enabled = process.env.MYSQL_ENABLED === 'true';
  private pool?: Pool;

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('MySQL desactivado; se usará persistencia en memoria');
      return;
    }

    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER ?? 'petcare',
      password: process.env.MYSQL_PASSWORD ?? 'petcare',
      database: process.env.MYSQL_DATABASE ?? 'petcare',
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 10),
      ssl: ['true', 'required', 'require'].includes(
        (process.env.MYSQL_SSL ?? '').toLowerCase(),
      )
        ? { rejectUnauthorized: false }
        : undefined,
    });

    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS petcare_state (
          state_key VARCHAR(64) PRIMARY KEY,
          state_json JSON NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      this.pool = pool;
      this.logger.log('Persistencia MySQL habilitada');
    } catch (error) {
      await pool.end().catch(() => undefined);
      this.pool = undefined;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo conectar a MySQL; se usará memoria. ${message}`,
      );
    }
  }

  isAvailable() {
    return Boolean(this.pool);
  }

  async load(): Promise<Partial<PetcareState> | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query(
      'SELECT state_json FROM petcare_state WHERE state_key = ?',
      ['main'],
    );
    const row = (rows as Array<{ state_json: string | PetcareState }>)[0];
    if (!row) return null;
    if (typeof row.state_json !== 'string') return row.state_json;
    const parsed: unknown = JSON.parse(row.state_json);
    return parsed as Partial<PetcareState>;
  }

  async save(state: PetcareState) {
    if (!this.pool) return;
    await this.pool.execute(
      `INSERT INTO petcare_state (state_key, state_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)`,
      ['main', JSON.stringify(state)],
    );
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
