import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BookingsApplicationService } from './bookings.application.service';

@Injectable()
export class PendingBookingExpirationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(private readonly bookings: BookingsApplicationService) {}

  onModuleInit() {
    void this.expire();
    this.timer = setInterval(() => void this.expire(), 60_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async expire() {
    try {
      await this.bookings.expirePendingPayments();
    } catch {
      // Expiration will be retried on the next interval.
    }
  }
}
