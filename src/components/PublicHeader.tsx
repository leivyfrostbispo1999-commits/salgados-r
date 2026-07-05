import { useState } from 'react'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const menuItems = [
  { href: '#cardapio', icon: 'C', label: 'Cardapio' },
  { href: '#mais-pedidos', icon: 'M', label: 'Mais pedidos' },
  { href: '#refil', icon: 'R', label: 'Refil' },
  { href: '#como-pedir', icon: 'P', label: 'Como pedir' },
  { href: '#cardapio-oficial', icon: 'O', label: 'Cardapio oficial' },
  { href: '#sistema', icon: 'S', label: 'Sistema' },
  { href: '#atendimento', icon: 'W', label: 'Atendimento' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-sm transition hover:border-[#DA291C] focus:outline-none focus:ring-4 focus:ring-[#FFC72C]/50"
              aria-label="Abrir menu"
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>
            <a href="/" className="flex items-center gap-3" aria-label="Salgados R - inicio">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#DA291C] text-2xl font-black text-[#FFC72C] shadow-sm">
                R
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight text-[#1D1D1D]">SALGADOS R</span>
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#DA291C]">
                  pasteis e sucos
                </span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={buildWhatsAppUrl({ name: 'Pedido pelo site', price: 'cardapio aberto', quantity: 1 })}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full bg-[#1D1D1D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#DA291C] sm:inline-flex"
            >
              WhatsApp
            </a>
            <a
              href="/admin"
              className="rounded-full bg-[#FFC72C] px-5 py-3 text-sm font-black text-[#1D1D1D] shadow-sm transition hover:bg-[#ffd85c] focus:outline-none focus:ring-4 focus:ring-[#FFC72C]/50"
            >
              Entrar
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
          <aside className="relative flex h-full w-[min(88vw,380px)] flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#DA291C] text-xl font-black text-[#FFC72C]">
                  R
                </span>
                <strong className="text-lg font-black text-[#1D1D1D]">SALGADOS R</strong>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-xl font-black text-zinc-900"
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
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-black text-zinc-900 transition hover:bg-[#FFC72C]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F5F5] text-sm text-[#DA291C]">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto rounded-lg bg-[#F5F5F5] p-4">
              <p className="text-sm font-bold leading-6 text-zinc-700">
                Atendimento pelo WhatsApp oficial: +55 71 99702-1801.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
