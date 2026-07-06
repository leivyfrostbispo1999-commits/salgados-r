import { Footer } from './Footer'
import { OfficialMenu } from './OfficialMenu'
import { PublicHeader } from './PublicHeader'

export function OfficialMenuPage() {
  return (
    <div className="min-h-screen bg-[var(--sr-red)]">
      <PublicHeader />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 rounded-[1.25rem] border border-[var(--sr-white)]/10 bg-[var(--sr-red)] p-4 text-[var(--sr-white)] shadow-[0_16px_42px_rgb(0_0_0_/_18%)] sm:p-5">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-black" aria-label="Breadcrumb">
              <a href="/" className="rounded-full bg-[var(--sr-red)] px-3 py-1.5 text-[var(--sr-yellow)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)]">
                Inicio
              </a>
              <span className="text-[var(--sr-white)] opacity-45">/</span>
              <a href="/cardapio" className="rounded-full bg-[var(--sr-red)] px-3 py-1.5 text-[var(--sr-yellow)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)]">
                Cardapio digital
              </a>
              <span className="text-[var(--sr-white)] opacity-45">/</span>
              <span className="text-[var(--sr-white)] opacity-80">Cardapio impresso</span>
            </nav>
            <a
              href="/cardapio"
              className="mt-3 inline-flex rounded-full border border-[var(--sr-white)]/20 bg-[var(--sr-red)] px-4 py-2 text-sm font-black text-[var(--sr-white)] transition hover:bg-[var(--sr-yellow)] hover:text-[var(--sr-red)] focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]/50"
            >
              ← Voltar para o cardapio digital
            </a>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Cardapio oficial em imagem</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sr-white)] opacity-70">
              Imagens oficiais para consulta. Para pedir com carrinho, use o cardapio digital.
            </p>
          </div>
        </div>
        <OfficialMenu />
      </main>
      <Footer />
    </div>
  )
}
