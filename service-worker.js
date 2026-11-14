const CACHE_NAME = 'the-club-pwa-v1';
const OFFLINE_PAGE = './offline.html';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_PAGE, './img/pwa-icon-192.png']))
    )
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter(key => key.startsWith('the-club-pwa-') && key !== CACHE_NAME)
            .map(key => caches.delete(key)));
        await self.clients.claim()
    })())
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || request.mode !== 'navigate') return;

    event.respondWith(
        fetch(request).catch(async () => {
            const cachedPage = await caches.match(OFFLINE_PAGE);
            if (cachedPage) return cachedPage;
            throw new Error('Página offline não encontrada no cache.')
        })
    )
});

self.addEventListener('notificationclick', event => {
    const target = new URL(event.notification.data?.url || './index.html', self.registration.scope).href;
    event.notification.close();
    event.waitUntil((async () => {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const appWindow = clients.find(client => client.url.startsWith(self.registration.scope));
        if (appWindow) {
            await appWindow.navigate(target);
            return appWindow.focus()
        }
        return self.clients.openWindow(target)
    })())
});
