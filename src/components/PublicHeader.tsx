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
      <header className="relative z-40 border-b border-[var(--sr-yellow)] bg-[var(--sr-red)]">
        <div className="mx-auto flex h-[86px] max-w-7xl items-center justify-between px-4 py-2 sm:h-24 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] lg:hidden"
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
                src="/assets-reais/logomarca-oficial-header.png"
                alt="SALGADOS R"
                className="sr-logo-mark h-[72px] w-[230px] object-contain object-left sm:h-[82px] sm:w-[292px]"
              />
            </a>
          </div>

          <nav className="hidden items-center gap-6 text-base font-black text-[var(--sr-white)] lg:flex">
            <a href="/" className="transition hover:text-[var(--sr-yellow)]">Inicio</a>
            <a href="/cardapio" className="transition hover:text-[var(--sr-yellow)]">Cardapio</a>
            <a href="/#como-pedir" className="transition hover:text-[var(--sr-yellow)]">Como pedir</a>
            <a href="/#refil" className="transition hover:text-[var(--sr-yellow)]">Refil</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/carrinho"
              className="relative grid h-11 min-w-11 place-items-center rounded-full border border-[var(--sr-yellow)] bg-[var(--sr-red)] px-3 text-sm font-black text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] sm:block sm:h-auto sm:px-5 sm:py-3"
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
              className="hidden min-h-11 items-center rounded-full bg-[var(--sr-yellow)] px-6 py-3 text-sm font-black text-[var(--sr-white)] transition hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)] sm:inline-flex"
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
            className="absolute inset-0 bg-[var(--sr-red)]"
            onClick={close}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[min(88vw,360px)] flex-col bg-[var(--sr-red)] p-5 text-[var(--sr-white)]">
            <div className="flex items-center justify-between gap-4">
              <img src="/assets-reais/logomarca-oficial-header.png" alt="SALGADOS R" className="sr-logo-mark h-24 w-[310px] object-contain object-left" />
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sr-yellow)] text-xl font-black text-[var(--sr-red)]"
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
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-black text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sr-yellow)] text-sm text-[var(--sr-red)]">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ))}
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
