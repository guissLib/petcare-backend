import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type {
  ContextSnapshotEnvelope,
  ContextSnapshotEventType,
} from '../../messaging/context-snapshot.types';

export type IntegrationOutboxStatus = 'pending' | 'processing' | 'published';

@Entity({ name: 'integration_outbox' })
@Index('IDX_integration_outbox_delivery', ['status', 'nextAttemptAt'])
@Index(
  'UQ_integration_outbox_aggregate_version',
  ['eventType', 'aggregateId', 'aggregateVersion'],
  { unique: true },
)
export class IntegrationOutboxOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: ContextSnapshotEventType;

  @Column({ name: 'schema_version', type: 'tinyint', unsigned: true })
  schemaVersion!: number;

  @Column({ name: 'source_service', type: 'varchar', length: 64 })
  sourceService!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 32 })
  aggregateType!: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 64 })
  aggregateId!: string;

  @Column({ name: 'aggregate_version', type: 'bigint', unsigned: true })
  aggregateVersion!: string;

  @Column({ name: 'occurred_at', type: 'datetime', precision: 3 })
  occurredAt!: Date;

  @Column({ type: 'json' })
  data!: object;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: IntegrationOutboxStatus;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts!: number;

  @Column({ name: 'next_attempt_at', type: 'datetime', precision: 3 })
  nextAttemptAt!: Date;

  @Column({ name: 'locked_at', type: 'datetime', precision: 3, nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'locked_by', type: 'varchar', length: 128, nullable: true })
  lockedBy!: string | null;

  @Column({
    name: 'published_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  publishedAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}

export function toContextSnapshotEnvelope(
  record: IntegrationOutboxOrmEntity,
): ContextSnapshotEnvelope {
  return {
    eventId: record.id,
    eventType: record.eventType,
    schemaVersion: 1,
    sourceService: 'petcare-backend',
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    aggregateVersion: Number(record.aggregateVersion),
    occurredAt: record.occurredAt.toISOString(),
    data: record.data,
  };
}
