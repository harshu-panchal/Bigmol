/* global self, clients */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: new URL(self.location.href).searchParams.get('apiKey') || '',
  authDomain: new URL(self.location.href).searchParams.get('authDomain') || '',
  projectId: new URL(self.location.href).searchParams.get('projectId') || '',
  storageBucket: new URL(self.location.href).searchParams.get('storageBucket') || '',
  messagingSenderId: new URL(self.location.href).searchParams.get('messagingSenderId') || '',
  appId: new URL(self.location.href).searchParams.get('appId') || '',
});

const messaging = firebase.messaging();
const seenIds = new Set();

messaging.onBackgroundMessage((payload) => {
  const notificationId = payload?.data?.notificationId || payload?.messageId;
  if (notificationId && seenIds.has(notificationId)) return;
  if (notificationId) seenIds.add(notificationId);

  const title = payload?.notification?.title || 'Notification';
  const options = {
    body: payload?.notification?.body || '',
    data: payload?.data || {},
    tag: notificationId || undefined,
    renotify: false,
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
      return null;
    })
  );
});
