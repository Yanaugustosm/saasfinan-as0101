// Service Worker — Sincronia PWA
// Versão simples: satisfaz os critérios de instalabilidade do Chrome Android
// (cache-first para assets estáticos, network-first para dados)

const CACHE_NAME = "sincronia-v1";
const PRECACHE = ["/", "/manifest.json"];

// Instalação: pré-carrega recursos essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first (dados sempre frescos), fallback para cache
self.addEventListener("fetch", (event) => {
  // Ignora requisições não-GET e requests para outros domínios (Firebase etc.)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Salva cópia no cache
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
