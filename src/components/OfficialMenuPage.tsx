import { Footer } from './Footer'
import { OfficialMenu } from './OfficialMenu'
import { PublicHeader } from './PublicHeader'

export function OfficialMenuPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <PublicHeader />
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 rounded-[1.5rem] bg-white p-5 shadow-sm">
            <a href="/cardapio" className="text-sm font-black text-[#DA291C]">← Voltar para o cardapio</a>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[#1D1D1D]">Cardapio oficial em imagem</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600">
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
