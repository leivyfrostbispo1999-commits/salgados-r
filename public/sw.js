const CACHE_NAME = 'salgados-r-v20260711-hero-sem-sobreposicao'
const HERO_REVISION = 'hero-sem-sobreposicao-com-cards'
self.__SR_HERO_REVISION = HERO_REVISION
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.png',
  '/og-image.png',
  '/assets-reais/logomarca-oficial-clean.png',
  '/assets-reais/logomarca-oficial-header.png',
  '/assets-reais/produto-pastel-clean.png',
  '/assets-reais/produto-coxinha-clean.png',
  '/assets-reais/produto-enroladinho-clean.png',
  '/assets-reais/refil-sucos-v2.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
