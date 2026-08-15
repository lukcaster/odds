const CACHE = 'odds-v7';
const ASSETS = ['/', '/index.html', '/icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const req = e.request;

    // API calls zawsze z sieci (live kursy / ranking / sentyment)
    if (req.url.includes('/api/')) return;

    // HTML / nawigacja → network-first, żeby nowa wersja apki od razu się pojawiała
    const isDoc = req.mode === 'navigate' || req.destination === 'document';
    if (isDoc) {
        e.respondWith(
            fetch(req)
                .then(res => {
                    caches.open(CACHE).then(c => c.put('/index.html', res.clone()));
                    return res;
                })
                .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
        );
        return;
    }

    // Reszta (ikony itp.) → cache-first
    e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
