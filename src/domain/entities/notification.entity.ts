import type { NotificationPrimitives } from '../shared/types';

export class Notification {
  private constructor(private readonly props: NotificationPrimitives) {}

  static create(
    props: Omit<NotificationPrimitives, 'read' | 'channel'> & {
      read?: boolean;
      channel?: 'mock-push';
    },
  ) {
    return new Notification({
      ...props,
      channel: props.channel ?? 'mock-push',
      read: props.read ?? false,
    });
  }

  static rehydrate(props: NotificationPrimitives) {
    return new Notification(props);
  }

  get userId() {
    return this.props.userId;
  }

  toPrimitives() {
    return { ...this.props };
  }
}
