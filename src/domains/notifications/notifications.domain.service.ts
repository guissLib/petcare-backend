import { Injectable } from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import { createId, now } from '../shared/input';
import { Booking, Notification } from '../shared/petcare.types';
import { UsersDomainService } from '../users/users.domain.service';

@Injectable()
export class NotificationsDomainService {
  constructor(
    private readonly store: PetcareStoreService,
    private readonly users: UsersDomainService,
  ) {}

  listByUser(userId: string) {
    this.users.getById(userId);
    return this.store.data.notifications.filter(
      (notification) => notification.userId === userId,
    );
  }

  send(
    userId: string,
    booking: Booking,
    type: Notification['type'],
    message: string,
  ) {
    const notification: Notification = {
      id: createId('notification'),
      userId,
      bookingId: booking.id,
      type,
      message,
      channel: 'mock-push',
      sentAt: now(),
      read: false,
    };
    this.store.data.notifications.push(notification);
    return notification;
  }
}
