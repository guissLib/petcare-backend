import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PETCARE_PAYMENT_GATEWAY } from '../shared-kernel/application/ports/integration.ports';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository';
import { PaymentsApplicationService } from './application/payments.application.service';
import { PaymentSagaConsumer } from './application/payment-saga.consumer';
import { PaymentCommandService } from './application/payment-command.service';
import { MockPaymentGateway } from './infrastructure/integrations/mock-payment.gateway';
import { PaymentSagaOutboxPublisherService } from './infrastructure/messaging/payment-saga-outbox-publisher.service';
import {
  PaymentCommandInboxOrmEntity,
  PaymentCommandTokenOrmEntity,
  PaymentSagaOutboxOrmEntity,
} from './infrastructure/persistence/entities/payment-command.orm-entities';
import { PaymentOrmEntity } from './infrastructure/persistence/entities/payment.orm-entity';
import { TypeOrmPaymentRepository } from './infrastructure/persistence/repositories/typeorm-payment.repository';
import { PaymentInternalController } from './presentation/http/controllers/payment-internal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentOrmEntity,
      PaymentCommandInboxOrmEntity,
      PaymentCommandTokenOrmEntity,
      PaymentSagaOutboxOrmEntity,
    ]),
    SharedKernelModule,
  ],
  controllers: [PaymentInternalController],
  providers: [
    TypeOrmPaymentRepository,
    {
      provide: PAYMENT_REPOSITORY,
      useExisting: TypeOrmPaymentRepository,
    },
    {
      provide: PETCARE_PAYMENT_GATEWAY,
      useClass: MockPaymentGateway,
    },
    PaymentsApplicationService,
    PaymentCommandService,
    PaymentSagaConsumer,
    PaymentSagaOutboxPublisherService,
  ],
  exports: [PAYMENT_REPOSITORY, PaymentsApplicationService],
})
export class PaymentModule {}
