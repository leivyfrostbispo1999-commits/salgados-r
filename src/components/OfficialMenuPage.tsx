import { Footer } from './Footer'
import { OfficialMenu } from './OfficialMenu'
import { PublicHeader } from './PublicHeader'

export function OfficialMenuPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicHeader />
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/8 p-5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
            <a href="/cardapio" className="text-sm font-black text-[#FFD51E] transition hover:text-white">← Voltar para o cardapio</a>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Cardapio oficial em imagem</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
              Imagens oficiais para consulta. Para pedir, prefira o cardapio digital.
            </p>
          </div>
        </div>
        <OfficialMenu />
      </main>
      <Footer />
    </div>
  )
}
