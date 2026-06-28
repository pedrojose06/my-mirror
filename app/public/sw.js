// ponytail: service worker mínimo. Existe para tornar o app instalável (Chrome
// exige um SW com handler de fetch) e dar um offline básico. Estratégia
// network-first: sempre tenta a rede, cai pro cache só quando offline.
// Sem Workbox, sem precache de lista de assets. Subir pra stale-while-revalidate
// ou precache do app shell se a performance offline virar requisito.
const CACHE = "luxai-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Só GET; deixa POST (evaluate/suggestions/speak) passar direto pra rede.
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
  );
});
