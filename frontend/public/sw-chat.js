/* Chat Web Push worker. Clicking a notification opens the thread and
   never marks the message seen — the viewport observer owns Seen. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'پیام جدید';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/chat' },
    dir: 'rtl',
    lang: 'fa',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/chat';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.includes(target));
    if (existing) {
      await existing.focus();
      return;
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(target);
    }
  })());
});
