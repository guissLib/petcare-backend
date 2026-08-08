import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PETCARE_PAYMENT_GATEWAY } from '../shared-kernel/application/ports/integration.ports';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository';
import { PaymentsApplicationService } from './application/payments.application.service';
import { MockPaymentGateway } from './infrastructure/integrations/mock-payment.gateway';
import { PaymentOrmEntity } from './infrastructure/persistence/entities/payment.orm-entity';
import { TypeOrmPaymentRepository } from './infrastructure/persistence/repositories/typeorm-payment.repository';
import { PaymentsController } from './presentation/http/controllers/payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentOrmEntity]), SharedKernelModule],
  controllers: [PaymentsController],
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
  ],
  exports: [PAYMENT_REPOSITORY, PaymentsApplicationService],
})
export class PaymentModule {}
