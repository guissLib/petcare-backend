import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCommandProcessing1770000000011 implements MigrationInterface {
  name = 'AddPaymentCommandProcessing1770000000011';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE payment_command_inbox (
        event_id VARCHAR(64) NOT NULL,
        event_name VARCHAR(64) NOT NULL,
        received_at DATETIME(3) NOT NULL,
        completed_at DATETIME(3) NOT NULL,
        response_event_id VARCHAR(64) NULL,
        PRIMARY KEY (event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE payment_saga_outbox (
        event_id VARCHAR(64) NOT NULL,
        event_name VARCHAR(64) NOT NULL,
        payload JSON NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        next_attempt_at DATETIME(3) NOT NULL,
        locked_at DATETIME(3) NULL,
        locked_by VARCHAR(128) NULL,
        published_at DATETIME(3) NULL,
        last_error TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (event_id),
        KEY IDX_payment_saga_outbox_delivery (status, next_attempt_at),
        CONSTRAINT CHK_payment_saga_outbox_status
          CHECK (status IN ('pending', 'processing', 'published'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE payment_command_tokens (
        payment_id VARCHAR(64) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        outcome VARCHAR(16) NOT NULL,
        used_at DATETIME(3) NOT NULL,
        PRIMARY KEY (payment_id),
        UNIQUE KEY UQ_payment_command_tokens_hash (token_hash),
        CONSTRAINT FK_payment_command_tokens_payment
          FOREIGN KEY (payment_id) REFERENCES payments (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT CHK_payment_command_tokens_outcome
          CHECK (outcome IN ('confirmed', 'declined'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      ALTER TABLE payments
      ADD UNIQUE KEY UQ_payments_booking_id (booking_id)
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(
      'ALTER TABLE payments DROP INDEX UQ_payments_booking_id',
    );
    await queryRunner.query('DROP TABLE payment_command_tokens');
    await queryRunner.query('DROP TABLE payment_saga_outbox');
    await queryRunner.query('DROP TABLE payment_command_inbox');
  }
}
