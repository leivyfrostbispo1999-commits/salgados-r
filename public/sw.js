const CACHE_NAME = 'salgados-r-v20260716-pwa-install-footer'
const OFFLINE_URL = '/offline.html'
const CORE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/pwa-icons/icon-192.png',
  '/pwa-icons/icon-512.png',
  '/pwa-icons/maskable-192.png',
  '/pwa-icons/maskable-512.png',
  '/pwa-icons/apple-touch-icon-180.png',
  '/og-image.png',
  '/assets-reais/optimized/logomarca-oficial-header.webp',
  '/assets-reais/optimized/produto-pastel-clean.webp',
  '/assets-reais/optimized/produto-coxinha-clean.webp',
  '/assets-reais/optimized/produto-enroladinho-clean.webp',
  '/assets-reais/optimized/refil-sucos-v2.webp',
]

const PRIVATE_PREFIXES = [
  '/api',
  '/admin',
  '/login',
  '/sistema',
]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isStaticAsset(request, url) {
  return (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/assets-reais/') ||
    url.pathname.startsWith('/produtos/') ||
    url.pathname.startsWith('/cardapio/') ||
    url.pathname.startsWith('/pwa-icons/')
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || !isSameOrigin(url) || isPrivatePath(url.pathname)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !isPrivatePath(url.pathname)) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/').then((cached) => cached || caches.match(OFFLINE_URL))),
    )
    return
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
      }),
    )
    return
  }

  event.respondWith(fetch(request))
})
