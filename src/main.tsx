import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing
        if (!installingWorker) return

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('salgados-r-pwa-update', { detail: registration }))
          }
        })
      })
    }).catch(() => undefined)
  })

  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('salgados-r-pwa-activate-update', () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
  })
}
