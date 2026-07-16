import { useEffect, useMemo, useState } from 'react'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const navItems = [
  { href: '/', label: 'Inicio', match: 'home', icon: 'home' },
  { href: '/cardapio', label: 'Cardapio', match: 'cardapio', icon: 'menu' },
  { href: '/#como-pedir', label: 'Como pedir', match: 'como-pedir', icon: 'bag' },
  { href: '/#refil', label: 'Refil', match: 'refil', icon: 'cup' },
  { href: '/admin', label: 'Admin', match: 'admin', icon: 'shield' },
] as const

const menuItems = [
  ...navItems,
  { href: '/carrinho', icon: 'cart', label: 'Carrinho' },
  { href: buildWhatsAppUrl({ name: 'Atendimento Salgados R', price: 'consulta', quantity: 1 }), icon: 'whatsapp', label: 'WhatsApp' },
]

type IconName = (typeof menuItems)[number]['icon']

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const currentLocation = useMemo(() => {
    if (typeof window === 'undefined') return { pathname: '/', hash: '' }
    return { pathname: window.location.pathname, hash: window.location.hash }
  }, [])

  useEffect(() => {
    function syncCart() {
      try {
        const cart = JSON.parse(localStorage.getItem('salgados-r-cart') || '[]') as Array<{ quantity: number }>
        setCartCount(cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
      } catch {
        setCartCount(0)
      }
    }

    syncCart()
    window.addEventListener('storage', syncCart)
    window.addEventListener('salgados-r-cart', syncCart)
    return () => {
      window.removeEventListener('storage', syncCart)
      window.removeEventListener('salgados-r-cart', syncCart)
    }
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    if (!open) return undefined
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  function close() {
    setOpen(false)
  }

  function isActive(match: (typeof navItems)[number]['match']) {
    if (match === 'home') return currentLocation.pathname === '/' && !currentLocation.hash
    if (match === 'cardapio') return currentLocation.pathname.startsWith('/cardapio')
    if (match === 'admin') return currentLocation.pathname.startsWith('/admin')
    return currentLocation.hash === `#${match}`
  }

  return (
    <>
      <header className="sr-public-header">
        <div className="sr-header-shell">
          <div className="sr-header-brand">
            <a href="/" className="sr-header-logo-link" aria-label="Salgados R - inicio">
              <img
                src="/assets-reais/logomarca-oficial-header.png"
                alt="SALGADOS R"
                className="sr-logo-mark"
              />
            </a>
          </div>

          <nav aria-label="Menu principal" className="sr-header-nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive(item.match) ? 'page' : undefined}
                className="sr-header-nav-link"
              >
                <Icon name={item.icon} />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="sr-header-actions">
            <a href="/cardapio" className="sr-header-order">
              <Icon name="whatsapp" />
              <span>Pedir agora</span>
            </a>
            <a
              href="/carrinho"
              className="sr-header-cart"
              aria-label={`Carrinho com ${cartCount} itens`}
            >
              <Icon name="cart" />
              <span>{cartCount}</span>
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="sr-header-menu-button"
              aria-label="Abrir menu"
              aria-expanded={open}
              aria-controls="salgados-mobile-menu"
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--sr-red)]"
            onClick={close}
            aria-label="Fechar menu"
          />
          <aside id="salgados-mobile-menu" className="relative flex h-full w-[min(88vw,360px)] flex-col bg-[var(--sr-red)] p-5 text-[var(--sr-white)]" aria-label="Menu movel">
            <div className="flex items-center justify-between gap-4">
              <img src="/assets-reais/logomarca-oficial-header.png" alt="SALGADOS R" className="sr-logo-mark h-20 w-[260px] object-contain object-left" />
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sr-yellow)] text-xl font-black text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]"
                aria-label="Fechar menu"
              >
                x
              </button>
            </div>

            <nav className="mt-8 grid gap-2" aria-label="Menu movel principal">
              {menuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  target={item.label === 'WhatsApp' ? '_blank' : undefined}
                  rel={item.label === 'WhatsApp' ? 'noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-black text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sr-yellow)] text-sm text-[var(--sr-red)]">
                    <Icon name={item.icon} />
                  </span>
                  {item.label}
                </a>
              ))}
              <a
                href="/cardapio"
                onClick={close}
                className="mt-3 rounded-full bg-[var(--sr-yellow)] px-5 py-4 text-center text-base font-black text-[var(--sr-red)] shadow-[0_8px_20px_rgba(0,0,0,0.18)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]"
              >
                Pedir agora
              </a>
            </nav>

            <div className="mt-auto rounded-2xl border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] p-4">
              <p className="text-sm font-bold leading-6 text-[var(--sr-white)]">
                Monte seu pedido no site ou chame no WhatsApp: +55 71 99702-1801.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string[]> = {
    home: ['M3 11.5 12 4l9 7.5', 'M5.5 10.5V20h5v-5.5h3V20h5v-9.5'],
    menu: ['M6 7h12', 'M6 12h12', 'M6 17h12'],
    bag: ['M7 9h10l-1 11H8L7 9Z', 'M9 9a3 3 0 0 1 6 0', 'M10 14l2 2 4-4'],
    cup: ['M7 4h10l-1 15H8L7 4Z', 'M9 8h6', 'M17 8h2a2 2 0 0 1 0 4h-2'],
    shield: ['M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z', 'M12 8v7', 'M12 18h.01'],
    cart: ['M4 5h2l2 10h9l2-7H7', 'M9 20h.01', 'M17 20h.01'],
    whatsapp: ['M5 19l1-3a7 7 0 1 1 3 3l-4 1Z', 'M9.5 8.8c.4 3 2.2 4.8 5.4 5.7', 'M10 8h.01', 'M15 14h.01'],
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
