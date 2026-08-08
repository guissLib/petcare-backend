import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { PersistenceHealth } from '../../application/ports/persistence-health.port';

@Injectable()
export class TypeOrmPersistenceHealth implements PersistenceHealth {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  isReady() {
    return this.dataSource.isInitialized;
  }
}
