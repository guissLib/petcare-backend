import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundedPaymentStatus1770000000007 implements MigrationInterface {
  name = 'AddRefundedPaymentStatus1770000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE payments DROP CHECK CHK_payments_status',
    );
    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT CHK_payments_status
      CHECK (status IN ('paid', 'pending', 'failed', 'refunded'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payments
      SET status = 'failed',
      failure_reason = 'Estado refunded revertido por migración'
      WHERE status = 'refunded'
    `);
    await queryRunner.query(
      'ALTER TABLE payments DROP CHECK CHK_payments_status',
    );
    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT CHK_payments_status
      CHECK (status IN ('paid', 'pending', 'failed'))
    `);
  }
}
