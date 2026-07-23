import { useCallback, useEffect, useMemo, useState } from 'react'

type InstallOutcome = 'accepted' | 'dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>
}

type InstallDialog = 'ios' | 'unsupported' | 'internal-browser' | null

type PwaUpdateEvent = CustomEvent<ServiceWorkerRegistration>

function isNavigatorStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone)
}

function isIosDevice() {
  const ua = window.navigator.userAgent
  const platform = window.navigator.platform
  return /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isInternalBrowser() {
  const ua = window.navigator.userAgent.toLowerCase()
  return /instagram|fbav|fban|messenger|line|wv|gmail|micromessenger/.test(ua)
}

export function usePwaInstall() {
  const demoMode = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return ''
    if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') return ''
    return new URLSearchParams(window.location.search).get('pwa-demo') || ''
  }, [])

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dialog, setDialog] = useState<InstallDialog>(() => {
    if (demoMode === 'ios') return 'ios'
    if (demoMode === 'unsupported') return 'unsupported'
    if (demoMode === 'internal') return 'internal-browser'
    return null
  })
  const [message, setMessage] = useState('')
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const isIos = useMemo(() => (typeof window === 'undefined' ? false : isIosDevice()), [])
  const isInInternalBrowser = useMemo(() => (typeof window === 'undefined' ? false : isInternalBrowser()), [])

  useEffect(() => {
    function refreshStandalone() {
      const standalone = isNavigatorStandalone()
      setIsStandalone(standalone)
      setIsInstalled(standalone)
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setMessage('')
    }

    function handleInstalled() {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setMessage('SALGADOS R INSTALADO COM SUCESSO.')
    }

    function handleUpdate(event: Event) {
      setUpdateRegistration((event as PwaUpdateEvent).detail)
    }

    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    refreshStandalone()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('salgados-r-pwa-update', handleUpdate)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener?.('change', refreshStandalone)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('salgados-r-pwa-update', handleUpdate)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      media.removeEventListener?.('change', refreshStandalone)
    }
  }, [])

  const openInstructions = useCallback(() => {
    if (isInInternalBrowser) {
      setDialog('internal-browser')
      return
    }

    if (isIos) {
      setDialog('ios')
      return
    }

    setDialog('unsupported')
  }, [isInInternalBrowser, isIos])

  const install = useCallback(async () => {
    if (isInstalled || isStandalone) return

    if (isInInternalBrowser || !deferredPrompt) {
      openInstructions()
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)

    if (choice.outcome === 'accepted') {
      setMessage('INSTALAÇÃO INICIADA PELO NAVEGADOR.')
      return
    }

    setMessage('INSTALAÇÃO RECUSADA NESTA SESSÃO.')
  }, [deferredPrompt, isInInternalBrowser, isInstalled, isStandalone, openInstructions])

  const activateUpdate = useCallback(() => {
    updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    window.dispatchEvent(new Event('salgados-r-pwa-activate-update'))
  }, [updateRegistration])

  return {
    canInstall: (Boolean(deferredPrompt) || demoMode === 'install') && !isInstalled && !isStandalone && !isInInternalBrowser,
    dialog,
    hasDirectInstall: Boolean(deferredPrompt),
    install,
    isInstalled: isInstalled || demoMode === 'installed',
    isInInternalBrowser: isInInternalBrowser || demoMode === 'internal',
    isIos: isIos || demoMode === 'ios',
    isOnline,
    isStandalone: isStandalone || demoMode === 'standalone',
    message,
    openInstructions,
    setDialog,
    updateAvailable: Boolean(updateRegistration?.waiting) || demoMode === 'update',
    activateUpdate,
  }
}
