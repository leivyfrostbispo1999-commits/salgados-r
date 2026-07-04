import { DeliveryNotice } from './components/DeliveryNotice'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowToOrder } from './components/HowToOrder'
import { MenuSection } from './components/MenuSection'
import { OfficialMenu } from './components/OfficialMenu'
import { OperationsSuite } from './components/OperationsSuite'
import { RefillSection } from './components/RefillSection'
import { products } from './data/products'

function App() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main>
        <Hero />
        <DeliveryNotice />
        <section id="cardapio" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Cardapio</p>
            <h2 className="mt-2 text-3xl font-black text-zinc-950">Escolha entre balcao e delivery</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              Pasteis e salgados podem ser pedidos no WhatsApp. Sucos de copo sao apenas presenciais.
              Para delivery de suco, escolha a garrafinha natural de 300 ml.
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
              <a className="rounded bg-red-700 px-4 py-2 text-sm font-black text-white" href="#cardapio-oficial">
                Cardapio oficial
              </a>
            </div>
          </div>

          <MenuSection
            id="pasteis"
            title="Pasteis"
            eyebrow="massa crocante"
            category="pasteis"
            products={products}
            description="Disponiveis para consumo no estabelecimento e pedido por WhatsApp."
            badge="Delivery e balcao"
          />
          <MenuSection
            id="salgados"
            title="Salgados"
            eyebrow="quentinhos"
            category="salgados"
            products={products}
            description="Coxinha e enroladinho quentinhos para pedido rapido."
            badge="Delivery e balcao"
          />
          <MenuSection
            id="sucos"
            title="Sucos"
            eyebrow="presencial x delivery"
            category="sucos"
            products={products}
            description="Copos pequenos e grandes sao apenas para consumo no estabelecimento. Para entrega, somente garrafinha de 300 ml."
            badge="Regra dos sucos"
          />
        </section>
        <RefillSection />
        <OfficialMenu />
        <OperationsSuite />
        <HowToOrder />
      </main>
      <Footer />
    </div>
  )
}

export default App
