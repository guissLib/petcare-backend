import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mysql, { Pool } from 'mysql2/promise';
import { Booking, Notification, Pet, Promotion, User } from './petcare.types';

export interface PetcareState {
  users: User[];
  pets: Pet[];
  bookings: Booking[];
  promotions: Promotion[];
  notifications: Notification[];
}

@Injectable()
export class MysqlPersistenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MysqlPersistenceService.name);
  private readonly enabled = process.env.MYSQL_ENABLED === 'true';
  private pool?: Pool;

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('MySQL desactivado; se usará persistencia en memoria');
      return;
    }
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER ?? 'petcare',
      password: process.env.MYSQL_PASSWORD ?? 'petcare',
      database: process.env.MYSQL_DATABASE ?? 'petcare',
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 10),
    });
    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS petcare_state (
        state_key VARCHAR(64) PRIMARY KEY,
        state_json JSON NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    this.logger.log('Persistencia MySQL habilitada');
  }

  async load(): Promise<Partial<PetcareState> | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query('SELECT state_json FROM petcare_state WHERE state_key = ?', ['main']);
    const row = (rows as Array<{ state_json: string | PetcareState }>)[0];
    if (!row) return null;
    return typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json;
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
