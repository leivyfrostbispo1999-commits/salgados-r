export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-black text-white shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#inicio" className="flex items-center gap-3" aria-label="SALGADOS R">
          <span className="grid size-11 place-items-center rounded bg-red-600 text-xl font-black text-yellow-300">
            R
          </span>
          <span>
            <span className="block text-lg font-black leading-5 tracking-wide">SALGADOS R</span>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-300">
              quente e rapido
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
          <a className="transition hover:text-yellow-300" href="#cardapio">
            Cardapio
          </a>
          <a className="transition hover:text-yellow-300" href="#refil">
            Refil
          </a>
          <a className="transition hover:text-yellow-300" href="#cardapio-oficial">
            Oficial
          </a>
          <a className="transition hover:text-yellow-300" href="#sistema">
            Sistema
          </a>
          <a className="transition hover:text-yellow-300" href="#como-pedir">
            Como pedir
          </a>
        </nav>

        <a
          href="#cardapio"
          className="rounded bg-yellow-300 px-4 py-2 text-sm font-black text-black transition hover:bg-white"
        >
          Ver cardapio
        </a>
      </div>
    </header>
  )
}
