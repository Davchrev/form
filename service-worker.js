const CACHE_NAME = 'registro-v19';
const URLS_TO_CACHE = [
  '/form/',
  '/form/index.html',
  '/form/css/formulario.css',
  '/form/js/formulario.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('registro-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase es la fuente de verdad: sus respuestas nunca pasan por Cache Storage.
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.method !== 'GET' || !esRecursoEstatico(event.request, url)) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(event.request);
        if (response) return response;
        throw new Error('Recurso no disponible sin conexión');
      })
      .catch(() => {
        return new Response('Modo offline - no hay conexión', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

function esRecursoEstatico(request, url) {
  const origenPermitido = url.origin === self.location.origin
    || url.origin === 'https://fonts.googleapis.com'
    || url.origin === 'https://fonts.gstatic.com'
    || url.origin === 'https://cdn.jsdelivr.net';
  const destinosEstaticos = new Set(['document', 'font', 'image', 'manifest', 'script', 'style']);

  return origenPermitido && destinosEstaticos.has(request.destination);
}
