import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const swSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

function pngSize(path) {
  const buffer = readFileSync(new URL(path, import.meta.url))
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG')
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

describe('PWA manifest', () => {
  it('declares installable public app metadata without private routes', () => {
    assert.equal(manifest.name, 'SALGADOS R')
    assert.equal(manifest.short_name, 'SALGADOS R')
    assert.equal(manifest.lang, 'pt-BR')
    assert.equal(manifest.start_url, '/')
    assert.equal(manifest.scope, '/')
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.orientation, 'any')
    assert.equal(manifest.background_color, '#DC0008')
    assert.equal(manifest.theme_color, '#DC0008')
    assert.doesNotMatch(JSON.stringify(manifest), /localhost|127\.0\.0\.1|\/admin|\/api/)
  })

  it('points to real any and maskable icons with correct sizes', () => {
    const expected = new Map([
      ['/pwa-icons/icon-192.png', { size: '192x192', purpose: 'any', width: 192, height: 192 }],
      ['/pwa-icons/icon-512.png', { size: '512x512', purpose: 'any', width: 512, height: 512 }],
      ['/pwa-icons/maskable-192.png', { size: '192x192', purpose: 'maskable', width: 192, height: 192 }],
      ['/pwa-icons/maskable-512.png', { size: '512x512', purpose: 'maskable', width: 512, height: 512 }],
    ])

    for (const [src, expectation] of expected) {
      const icon = manifest.icons.find((item) => item.src === src)
      assert.ok(icon, `${src} should exist in manifest`)
      assert.equal(icon.sizes, expectation.size)
      assert.equal(icon.type, 'image/png')
      assert.equal(icon.purpose, expectation.purpose)

      const size = pngSize(`../public${src}`)
      assert.equal(size.width, expectation.width)
      assert.equal(size.height, expectation.height)
    }

    assert.ok(existsSync(new URL('../public/pwa-icons/apple-touch-icon-180.png', import.meta.url)))
  })
})

describe('PWA service worker safety', () => {
  it('uses explicit versioned cache and removes old caches', () => {
    assert.match(swSource, /const CACHE_NAME = 'salgados-r-v\d{8}-pwa-install-footer'/)
    assert.match(swSource, /caches\s*\.\s*keys\(\)/)
    assert.match(swSource, /caches\.delete\(key\)/)
  })

  it('does not intercept non-GET, cross-origin or private requests', () => {
    assert.match(swSource, /request\.method !== 'GET'/)
    assert.match(swSource, /!isSameOrigin\(url\)/)
    assert.match(swSource, /isPrivatePath\(url\.pathname\)/)
    for (const prefix of ['/api', '/admin', '/login', '/sistema']) {
      assert.match(swSource, new RegExp(`'${prefix}'`))
    }
  })

  it('only allows offline fallback for public navigation', () => {
    assert.match(swSource, /request\.mode === 'navigate'/)
    assert.match(swSource, /caches\.match\(OFFLINE_URL\)/)
    assert.doesNotMatch(swSource, /cache\.put\(request, copy\)[\s\S]{0,80}request\.mode === 'navigate'/)
  })

  it('declares the required offline page and public assets', () => {
    assert.match(swSource, /const OFFLINE_URL = '\/offline\.html'/)
    for (const asset of [
      '/manifest.webmanifest',
      '/pwa-icons/icon-192.png',
      '/pwa-icons/icon-512.png',
      '/pwa-icons/maskable-192.png',
      '/pwa-icons/maskable-512.png',
      '/pwa-icons/apple-touch-icon-180.png',
    ]) {
      assert.match(swSource, new RegExp(`'${asset.replaceAll('/', '\\/')}'`))
    }
  })
})
