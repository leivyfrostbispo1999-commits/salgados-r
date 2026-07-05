import { useEffect, useState } from 'react'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const menuItems = [
  { href: '/', icon: 'I', label: 'Inicio' },
  { href: '/cardapio', icon: 'C', label: 'Cardapio' },
  { href: '/carrinho', icon: 'P', label: 'Carrinho' },
  { href: '/#como-pedir', icon: '3', label: 'Como pedir' },
  { href: '/#refil', icon: 'R', label: 'Refil' },
  { href: buildWhatsAppUrl({ name: 'Atendimento Salgados R', price: 'consulta', quantity: 1 }), icon: 'W', label: 'WhatsApp' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

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

  function close() {
    setOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--sr-red-dark)]/92 shadow-[0_10px_28px_rgba(48,0,5,0.20)] backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-sm transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-black)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]/50 lg:hidden"
              aria-label="Abrir menu"
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>
            <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Salgados R - inicio">
              <img
                src="/assets-reais/logo-salgados-r.png"
                alt="SALGADOS R"
                className="h-10 w-[132px] rounded-xl object-cover object-center shadow-[0_8px_18px_rgba(0,0,0,0.22)] sm:w-[160px]"
              />
            </a>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-black text-white lg:flex">
            <a href="/" className="transition hover:text-[var(--sr-yellow)]">Inicio</a>
            <a href="/cardapio" className="transition hover:text-[var(--sr-yellow)]">Cardapio</a>
            <a href="/#como-pedir" className="transition hover:text-[var(--sr-yellow)]">Como pedir</a>
            <a href="/#refil" className="transition hover:text-[var(--sr-yellow)]">Refil</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/carrinho"
              className="relative grid h-10 min-w-10 place-items-center rounded-full bg-white/10 px-3 text-sm font-black text-white transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-black)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]/50 sm:block sm:h-auto sm:px-4 sm:py-2.5"
              aria-label={`Carrinho com ${cartCount} itens`}
            >
              <span className="sm:hidden">{cartCount}</span>
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--sr-yellow)] px-1 text-xs text-[var(--sr-black)]">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <a
              href="/cardapio"
              className="hidden rounded-full bg-[var(--sr-yellow)] px-5 py-2.5 text-sm font-black text-[var(--sr-black)] shadow-[0_12px_22px_rgba(0,0,0,0.20)] transition hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]/50 sm:inline-flex"
            >
              Pedir agora
            </a>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[min(88vw,360px)] flex-col bg-[var(--sr-red-dark)] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <img src="/assets-reais/logo-salgados-r.png" alt="SALGADOS R" className="h-12 w-40 rounded-xl object-cover shadow-xl" />
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sr-yellow)] text-xl font-black text-[var(--sr-black)]"
                aria-label="Fechar menu"
              >
                x
              </button>
            </div>

            <nav className="mt-8 grid gap-2">
              {menuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  target={item.label === 'WhatsApp' ? '_blank' : undefined}
                  rel={item.label === 'WhatsApp' ? 'noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-black text-white transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-black)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]/50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sr-yellow)] text-sm text-[var(--sr-black)]">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto rounded-2xl bg-black/28 p-4">
              <p className="text-sm font-bold leading-6 text-white/85">
                Monte seu pedido no site ou chame no WhatsApp: +55 71 99702-1801.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
