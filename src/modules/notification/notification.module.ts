import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { ProviderModule } from '../provider/provider.module';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { NotificationsApplicationService } from './application/notifications.application.service';
import { NotificationSagaConsumer } from './application/notification-saga.consumer';
import { NotificationOrmEntity } from './infrastructure/persistence/entities/notification.orm-entity';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/repositories/typeorm-notification.repository';
import { NotificationsController } from './presentation/http/controllers/notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOrmEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => ProviderModule),
    SharedKernelModule,
  ],
  controllers: [NotificationsController],
  providers: [
    TypeOrmNotificationRepository,
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: TypeOrmNotificationRepository,
    },
    NotificationsApplicationService,
    NotificationSagaConsumer,
  ],
  exports: [NOTIFICATION_REPOSITORY, NotificationsApplicationService],
})
export class NotificationModule {}
