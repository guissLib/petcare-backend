import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class DetachBookingStorage1770000000008 implements MigrationInterface {
  name = 'DetachBookingStorage1770000000008';

  async up(queryRunner: QueryRunner) {
    const notifications = await queryRunner.getTable('notifications');
    const bookingForeignKey = notifications?.foreignKeys.find(
      (foreignKey) => foreignKey.name === 'FK_notifications_booking',
    );
    if (bookingForeignKey) {
      await queryRunner.dropForeignKey('notifications', bookingForeignKey);
    }
  }

  async down(queryRunner: QueryRunner) {
    const notifications = await queryRunner.getTable('notifications');
    const bookings = await queryRunner.getTable('bookings');
    if (
      !notifications ||
      !bookings ||
      notifications.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_notifications_booking',
      )
    ) {
      return;
    }
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        name: 'FK_notifications_booking',
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }
}
