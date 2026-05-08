import crypto from 'crypto';

export const buildNotificationPayload = ({
  notificationId,
  title,
  body,
  link = '/',
  type = 'system',
  recipientType = 'user',
  extraData = {},
}) => {
  const safeId = notificationId || crypto.randomUUID();
  const stringData = Object.entries({
    notificationId: safeId,
    link,
    type,
    recipientType,
    ...extraData,
  }).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

  return {
    notification: {
      title: String(title || 'Update'),
      body: String(body || ''),
    },
    data: stringData,
    webpush: {
      fcmOptions: {
        link: String(link || '/'),
      },
      notification: {
        tag: safeId,
        renotify: false,
      },
    },
    android: {
      priority: 'high',
      notification: { channelId: 'default' },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } },
    },
  };
};

export default buildNotificationPayload;
