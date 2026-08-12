import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { SagaMessageName } from '../../../../shared-kernel/application/ports/saga-message-bus.port';

@Entity({ name: 'payment_command_inbox' })
export class PaymentCommandInboxOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ name: 'event_name', type: 'varchar', length: 64 })
  eventName!: SagaMessageName;

  @Column({ name: 'received_at', type: 'datetime', precision: 3 })
  receivedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', precision: 3 })
  completedAt!: Date;

  @Column({
    name: 'response_event_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  responseEventId!: string | null;
}

export type PaymentSagaOutboxStatus = 'pending' | 'processing' | 'published';

@Entity({ name: 'payment_saga_outbox' })
@Index('IDX_payment_saga_outbox_delivery', ['status', 'nextAttemptAt'])
export class PaymentSagaOutboxOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ name: 'event_name', type: 'varchar', length: 64 })
  eventName!: SagaMessageName;

  @Column({ type: 'json' })
  payload!: object;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: PaymentSagaOutboxStatus;

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

export type PaymentTokenOutcome = 'confirmed' | 'declined';

@Entity({ name: 'payment_command_tokens' })
@Index('UQ_payment_command_tokens_hash', ['tokenHash'], { unique: true })
export class PaymentCommandTokenOrmEntity {
  @PrimaryColumn({ name: 'payment_id', type: 'varchar', length: 64 })
  paymentId!: string;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 16 })
  outcome!: PaymentTokenOutcome;

  @Column({ name: 'used_at', type: 'datetime', precision: 3 })
  usedAt!: Date;
}
