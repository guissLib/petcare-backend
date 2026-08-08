import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCheckoutFields1770000000004 implements MigrationInterface {
  name = 'AddPaymentCheckoutFields1770000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await hasColumn(queryRunner, 'payments', 'user_id'))) {
      await queryRunner.query(
        'ALTER TABLE payments ADD COLUMN user_id VARCHAR(64) NULL AFTER id',
      );
    }
    if (!(await hasColumn(queryRunner, 'payments', 'paid_at'))) {
      await queryRunner.query(
        'ALTER TABLE payments ADD COLUMN paid_at DATETIME(3) NULL AFTER created_at',
      );
    }
    if (!(await hasColumn(queryRunner, 'payments', 'failure_reason'))) {
      await queryRunner.query(
        'ALTER TABLE payments ADD COLUMN failure_reason VARCHAR(255) NULL AFTER paid_at',
      );
    }
    if (!(await hasColumn(queryRunner, 'payments', 'attempts'))) {
      await queryRunner.query(
        'ALTER TABLE payments ADD COLUMN attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER failure_reason',
      );
    }
    if (
      !(await hasIndex(queryRunner, 'payments', 'IDX_payments_user_status'))
    ) {
      await queryRunner.query(
        'CREATE INDEX IDX_payments_user_status ON payments (user_id, status)',
      );
    }
    if (!(await hasForeignKey(queryRunner, 'payments', 'FK_payments_user'))) {
      await queryRunner.query(`
        ALTER TABLE payments
        ADD CONSTRAINT FK_payments_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
    }
    if (!(await hasColumn(queryRunner, 'bookings', 'payment_expires_at'))) {
      await queryRunner.query(
        'ALTER TABLE bookings ADD COLUMN payment_expires_at DATETIME(3) NULL AFTER payment_id',
      );
    }
    if (
      !(await hasIndex(queryRunner, 'bookings', 'IDX_bookings_payment_expiry'))
    ) {
      await queryRunner.query(
        'CREATE INDEX IDX_bookings_payment_expiry ON bookings (status, payment_expires_at)',
      );
    }
    if (!(await hasColumn(queryRunner, 'bookings', 'idempotency_key'))) {
      await queryRunner.query(
        'ALTER TABLE bookings ADD COLUMN idempotency_key VARCHAR(100) NULL AFTER payment_expires_at',
      );
    }
    if (
      !(await hasIndex(queryRunner, 'bookings', 'UQ_bookings_idempotency_key'))
    ) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX UQ_bookings_idempotency_key ON bookings (idempotency_key)',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await hasForeignKey(queryRunner, 'payments', 'FK_payments_user')) {
      await queryRunner.query(
        'ALTER TABLE payments DROP FOREIGN KEY FK_payments_user',
      );
    }
    if (await hasIndex(queryRunner, 'payments', 'IDX_payments_user_status')) {
      await queryRunner.query(
        'DROP INDEX IDX_payments_user_status ON payments',
      );
    }
    if (await hasColumn(queryRunner, 'payments', 'attempts')) {
      await queryRunner.query('ALTER TABLE payments DROP COLUMN attempts');
    }
    if (await hasColumn(queryRunner, 'payments', 'failure_reason')) {
      await queryRunner.query(
        'ALTER TABLE payments DROP COLUMN failure_reason',
      );
    }
    if (await hasColumn(queryRunner, 'payments', 'paid_at')) {
      await queryRunner.query('ALTER TABLE payments DROP COLUMN paid_at');
    }
    if (await hasColumn(queryRunner, 'payments', 'user_id')) {
      await queryRunner.query('ALTER TABLE payments DROP COLUMN user_id');
    }
    if (
      await hasIndex(queryRunner, 'bookings', 'IDX_bookings_payment_expiry')
    ) {
      await queryRunner.query(
        'DROP INDEX IDX_bookings_payment_expiry ON bookings',
      );
    }
    if (await hasColumn(queryRunner, 'bookings', 'payment_expires_at')) {
      await queryRunner.query(
        'ALTER TABLE bookings DROP COLUMN payment_expires_at',
      );
    }
    if (
      await hasIndex(queryRunner, 'bookings', 'UQ_bookings_idempotency_key')
    ) {
      await queryRunner.query(
        'DROP INDEX UQ_bookings_idempotency_key ON bookings',
      );
    }
    if (await hasColumn(queryRunner, 'bookings', 'idempotency_key')) {
      await queryRunner.query(
        'ALTER TABLE bookings DROP COLUMN idempotency_key',
      );
    }
  }
}

async function hasColumn(
  queryRunner: QueryRunner,
  table: string,
  column: string,
) {
  const rows = (await queryRunner.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [table, column],
  )) as Array<{ COLUMN_NAME: string }>;
  return rows.length > 0;
}

async function hasIndex(
  queryRunner: QueryRunner,
  table: string,
  index: string,
) {
  const rows = (await queryRunner.query(
    `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `,
    [table, index],
  )) as Array<{ INDEX_NAME: string }>;
  return rows.length > 0;
}

async function hasForeignKey(
  queryRunner: QueryRunner,
  table: string,
  constraint: string,
) {
  const rows = (await queryRunner.query(
    `
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
    [table, constraint],
  )) as Array<{ CONSTRAINT_NAME: string }>;
  return rows.length > 0;
}
