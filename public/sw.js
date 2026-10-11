// Сервис-воркер: показывает уведомления и открывает кабинет по нажатию.
// Пуш с сервера приходит в событие push (JSON: { title, body, url }); без сервера кабинет показывает
// уведомления сам через registration.showNotification.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { body: e.data && e.data.text() }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Новая запись', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: d.url || './#/admin' },
      tag: d.tag,
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data && e.notification.data.url) || './#/admin', self.registration.scope).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.navigate(url).then((w) => (w || c).focus())
      return self.clients.openWindow(url)
    }),
  )
})
