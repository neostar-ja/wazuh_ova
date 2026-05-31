/* SOC Center Service Worker — Web Push Notifications */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = { title: 'SOC Alert', body: 'New critical alert detected', url: '/wazuh/alerts' };
  try { data = { ...data, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/wazuh/favicon.ico',
      badge: '/wazuh/favicon.ico',
      tag: 'soc-alert',
      requireInteraction: true,
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/wazuh/alerts';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/wazuh') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
