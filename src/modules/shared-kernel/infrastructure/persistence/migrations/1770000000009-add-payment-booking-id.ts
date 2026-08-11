import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddPaymentBookingId1770000000009 implements MigrationInterface {
  name = 'AddPaymentBookingId1770000000009';

  async up(queryRunner: QueryRunner) {
    const payments = await queryRunner.getTable('payments');
    if (!payments) {
      return;
    }
    if (!payments.columns.some((column) => column.name === 'booking_id')) {
      await queryRunner.addColumn(
        'payments',
        new TableColumn({
          name: 'booking_id',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }

    const refreshedPayments = await queryRunner.getTable('payments');
    if (
      refreshedPayments &&
      !refreshedPayments.indices.some(
        (index) => index.name === 'IDX_payments_booking_id',
      )
    ) {
      await queryRunner.createIndex(
        'payments',
        new TableIndex({
          name: 'IDX_payments_booking_id',
          columnNames: ['booking_id'],
        }),
      );
    }

    const bookings = (await queryRunner.query(
      "SHOW TABLES LIKE 'bookings'",
    )) as unknown[];
    if (bookings.length > 0) {
      await queryRunner.query(`
        UPDATE payments p
        INNER JOIN bookings b ON b.payment_id = p.id
        SET p.booking_id = b.id
        WHERE p.booking_id IS NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner) {
    const payments = await queryRunner.getTable('payments');
    if (!payments) {
      return;
    }
    const index = payments.indices.find(
      (candidate) => candidate.name === 'IDX_payments_booking_id',
    );
    if (index) {
      await queryRunner.dropIndex('payments', index);
    }
    const refreshedPayments = await queryRunner.getTable('payments');
    if (
      refreshedPayments?.columns.some((column) => column.name === 'booking_id')
    ) {
      await queryRunner.dropColumn('payments', 'booking_id');
    }
  }
}
