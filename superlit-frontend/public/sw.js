self.addEventListener('push', event => {
  let payload = { title: 'New notification', body: '...' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = { title: 'Notification', body: event.data.text() };
    }
  }

  const title = payload.title || 'Alert';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/badge.png',
    data: payload.data || {},
    tag: payload.tag || undefined, // helps replace previous notifications of same tag
    renotify: payload.renotify || false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
