import { useEffect, useState } from 'react'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const menuItems = [
  { href: '/', icon: 'I', label: 'Inicio' },
  { href: '/cardapio', icon: 'C', label: 'Cardapio' },
  { href: '/carrinho', icon: 'P', label: 'Carrinho' },
  { href: '/#como-pedir', icon: '3', label: 'Como pedir' },
  { href: '/#refil', icon: 'R', label: 'Refil' },
  { href: buildWhatsAppUrl({ name: 'Atendimento Salgados R', price: 'consulta', quantity: 1 }), icon: 'W', label: 'WhatsApp' },
  { href: '/admin', icon: 'A', label: 'Area administrativa' },
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
      <header className="sticky top-0 z-40 border-b border-[#EFE0C8] bg-[#FFFDF7]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#EFE0C8] bg-white text-[#050505] shadow-sm transition hover:border-[#D90416] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50 lg:hidden"
              aria-label="Abrir menu"
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>
            <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Salgados R - inicio">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8B0008,#D90416)] text-2xl font-black text-[#FFD51E] shadow-sm sm:h-12 sm:w-12">
                R
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-base font-black tracking-tight text-[#050505] sm:text-xl">SALGADOS R</span>
                <span className="block whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-[#99000D] sm:text-xs">
                  pasteis e sucos
                </span>
              </span>
            </a>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-black text-[#050505] lg:flex">
            <a href="/cardapio" className="transition hover:text-[#99000D]">Cardapio</a>
            <a href="/#como-pedir" className="transition hover:text-[#99000D]">Como pedir</a>
            <a href="/#refil" className="transition hover:text-[#99000D]">Refil</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/carrinho"
              className="relative grid h-11 min-w-11 place-items-center rounded-full bg-[#FFF3B0] px-3 text-sm font-black text-[#050505] transition hover:bg-[#FFD51E] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50 sm:block sm:h-auto sm:px-4 sm:py-3"
              aria-label={`Carrinho com ${cartCount} itens`}
            >
              <span className="sm:hidden">{cartCount}</span>
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[#D90416] px-1 text-xs text-white">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <a
              href="/cardapio"
              className="hidden rounded-full bg-[#FFD51E] px-5 py-3 text-sm font-black text-[#050505] shadow-sm transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50 sm:inline-flex"
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
          <aside className="relative flex h-full w-[min(88vw,380px)] flex-col bg-[#FFFDF7] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8B0008,#D90416)] text-xl font-black text-[#FFD51E]">
                  R
                </span>
                <strong className="text-lg font-black text-[#050505]">SALGADOS R</strong>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF3B0] text-xl font-black text-[#050505]"
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
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-black text-[#050505] transition hover:bg-[#FFD51E] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF3B0] text-sm text-[#99000D]">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto rounded-2xl bg-[#050505] p-4">
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
