import { Notification, NotificationType } from '@prisma/client';

export type NotificationResponse = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkTo: string | null;
  read: boolean;
  createdAt: string;
};

export function toNotificationResponse(
  notification: Notification,
): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    linkTo: notification.linkTo,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}
