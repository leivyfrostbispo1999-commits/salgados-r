import { useEffect, useMemo, useState } from 'react'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const navItems = [
  { href: '/', label: 'Inicio', match: 'home' },
  { href: '/cardapio', label: 'Cardapio', match: 'cardapio' },
  { href: '/#como-pedir', label: 'Como pedir', match: 'como-pedir' },
  { href: '/#refil', label: 'Refil', match: 'refil' },
] as const

const menuItems = [
  ...navItems.map((item, index) => ({ ...item, icon: ['I', 'C', '3', 'R'][index] })),
  { href: '/carrinho', icon: 'P', label: 'Carrinho' },
  { href: buildWhatsAppUrl({ name: 'Atendimento Salgados R', price: 'consulta', quantity: 1 }), icon: 'W', label: 'WhatsApp' },
]

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
    return currentLocation.hash === `#${match}`
  }

  return (
    <>
      <header className="relative z-40 border-b border-[var(--sr-yellow)] bg-[var(--sr-red)]">
        <div className="mx-auto grid min-h-[78px] w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-2 sm:min-h-[88px] sm:px-6 lg:min-h-[92px] lg:grid-cols-[minmax(230px,1fr)_auto_minmax(230px,1fr)] lg:px-8 xl:px-4">
          <div className="flex min-w-0 items-center justify-start">
            <a href="/" className="flex min-w-0 items-center" aria-label="Salgados R - inicio">
              <img
                src="/assets-reais/logomarca-oficial-header.png"
                alt="SALGADOS R"
                className="sr-logo-mark h-[58px] w-[188px] object-contain object-left sm:h-[72px] sm:w-[248px] lg:h-[78px] lg:w-[272px]"
              />
            </a>
          </div>

          <nav aria-label="Menu principal" className="hidden items-center justify-center gap-6 text-base font-black text-[var(--sr-white)] lg:flex xl:gap-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive(item.match) ? 'page' : undefined}
                className={`relative px-2 py-3 tracking-wide transition hover:text-[var(--sr-yellow)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] ${
                  isActive(item.match) ? 'after:absolute after:inset-x-2 after:bottom-1 after:h-1 after:rounded-full after:bg-[var(--sr-yellow)]' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 items-center justify-start gap-1.5 sm:justify-end sm:gap-3">
            <a
              href="/carrinho"
              className="relative grid h-11 min-w-11 place-items-center rounded-full border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] px-3 text-sm font-black text-[var(--sr-white)] transition hover:-translate-y-0.5 hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] sm:block sm:h-auto sm:px-5 sm:py-3"
              aria-label={`Carrinho com ${cartCount} itens`}
            >
              <span className="sm:hidden">{cartCount}</span>
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--sr-yellow)] px-1 text-xs text-[var(--sr-red)]">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <a
              href="/cardapio"
              className="hidden min-h-11 items-center rounded-full bg-[var(--sr-yellow)] px-6 py-3 text-sm font-black text-[var(--sr-red)] shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] md:inline-flex"
            >
              Pedir agora
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] lg:hidden"
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
                    {item.icon}
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
