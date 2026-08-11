import { Module } from '@nestjs/common';
import { PetModule } from '../pet/pet.module';
import { PromotionModule } from '../promotion/promotion.module';
import { ProviderModule } from '../provider/provider.module';
import { UserModule } from '../user/user.module';
import { BookingContextApplicationService } from './application/booking-context.application.service';
import { BookingContextController } from './presentation/http/booking-context.controller';

@Module({
  imports: [UserModule, PetModule, ProviderModule, PromotionModule],
  controllers: [BookingContextController],
  providers: [BookingContextApplicationService],
})
export class BookingContextModule {}
