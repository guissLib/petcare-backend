import { Module } from '@nestjs/common';
import { EVENT_BUS } from './application/ports/event-bus.port';
import { LocalEventBus } from './infrastructure/events/local-event-bus.service';

@Module({
  providers: [
    LocalEventBus,
    {
      provide: EVENT_BUS,
      useExisting: LocalEventBus,
    },
  ],
  exports: [EVENT_BUS],
})
export class SharedKernelModule {}
