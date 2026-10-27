// Reçoit les notifications (annonces et canaux suivis) et les affiche sur l'appareil.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Nouvelle annonce', {
    body: data.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    tag: data.tag || 'annonce',
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction, // appel : reste affiché jusqu'à ce qu'on le touche
    vibrate: data.call ? [600, 300, 600, 300, 600, 300, 600] : data.requireInteraction ? [400, 200, 400] : undefined,
    // Appel : boutons Répondre / Refuser (Android, ordinateur ; l'iPhone affiche seulement la notification)
    actions: data.call ? [{ action: 'answer', title: '📞 Répondre' }, { action: 'decline', title: '✕ Refuser' }] : [],
    data: { url: data.url || './#annonces' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'decline') return; // Refuser : on ferme simplement la notification
  const url = new URL(event.notification.data?.url || './#annonces', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.navigate(url).catch(() => {}); return w.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
