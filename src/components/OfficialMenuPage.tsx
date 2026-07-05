import { Footer } from './Footer'
import { OfficialMenu } from './OfficialMenu'
import { PublicHeader } from './PublicHeader'

export function OfficialMenuPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicHeader />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 rounded-[1.25rem] border border-white/10 bg-white/8 p-4 text-white shadow-[0_16px_42px_rgba(0,0,0,0.28)] sm:p-5">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-black" aria-label="Breadcrumb">
              <a href="/" className="rounded-full bg-white/10 px-3 py-1.5 text-[#FFD51E] transition hover:bg-[#FFD51E] hover:text-[#050505]">
                Inicio
              </a>
              <span className="text-white/45">/</span>
              <a href="/cardapio" className="rounded-full bg-white/10 px-3 py-1.5 text-[#FFD51E] transition hover:bg-[#FFD51E] hover:text-[#050505]">
                Cardapio digital
              </a>
              <span className="text-white/45">/</span>
              <span className="text-white/82">Cardapio impresso</span>
            </nav>
            <a
              href="/cardapio"
              className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-[#FFD51E] hover:text-[#050505] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
            >
              ← Voltar para o cardapio digital
            </a>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Cardapio oficial em imagem</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
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
