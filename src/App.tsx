import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowToOrder } from './components/HowToOrder'
import { MenuSection } from './components/MenuSection'
import { RefillSection } from './components/RefillSection'
import { products } from './data/products'

function App() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main>
        <Hero />
        <section id="cardapio" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Cardapio</p>
            <h2 className="mt-2 text-3xl font-black text-zinc-950">Escolha seu pedido</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              Produtos organizados por categoria para voce pedir rapido pelo WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a className="rounded bg-black px-4 py-2 text-sm font-black text-yellow-300" href="#pasteis">
                Pasteis
              </a>
              <a className="rounded bg-black px-4 py-2 text-sm font-black text-yellow-300" href="#salgados">
                Salgados
              </a>
              <a className="rounded bg-black px-4 py-2 text-sm font-black text-yellow-300" href="#sucos">
                Sucos
              </a>
            </div>
          </div>

          <MenuSection
            id="pasteis"
            title="Pasteis"
            eyebrow="massa crocante"
            category="pasteis"
            products={products}
          />
          <MenuSection
            id="salgados"
            title="Salgados"
            eyebrow="quentinhos"
            category="salgados"
            products={products}
          />
          <MenuSection id="sucos" title="Sucos" eyebrow="gelados" category="sucos" products={products} />
        </section>
        <RefillSection />
        <HowToOrder />
      </main>
      <Footer />
    </div>
  )
}

export default App
