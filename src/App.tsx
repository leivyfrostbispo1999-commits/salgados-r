import { AdminAccessSection } from './components/AdminAccessSection'
import { CategoryStrip } from './components/CategoryStrip'
import { FeaturedProducts } from './components/FeaturedProducts'
import { Footer } from './components/Footer'
import { HeroFastFood } from './components/HeroFastFood'
import { HowToOrder } from './components/HowToOrder'
import { MenuSection } from './components/MenuSection'
import { OfficialMenu } from './components/OfficialMenu'
import { OperationsSuite } from './components/OperationsSuite'
import { PublicHeader } from './components/PublicHeader'
import { RefillSection } from './components/RefillSection'
import { products } from './data/products'

function App() {
  const path = window.location.pathname

  if (path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/sistema')) {
    return <OperationsSuite />
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <HeroFastFood />
        <CategoryStrip />
        <FeaturedProducts />
        <section id="cardapio" className="bg-[#F5F5F5] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Cardapio</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-[#1D1D1D]">
                Escolha entre consumo no estabelecimento e delivery
              </h2>
              <p className="mt-3 text-base font-semibold leading-7 text-zinc-600">
                Pasteis e salgados podem ser pedidos no WhatsApp. Sucos de copo sao apenas presenciais. Para entrega,
                trabalhamos somente com suco natural na garrafinha de 300 ml.
              </p>
            </div>

            <div className="mt-8 rounded-lg border-2 border-[#FFC72C] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#DA291C]">Atencao</p>
              <p className="mt-2 text-base font-bold leading-7 text-[#292929]">
                Os sucos de copo sao vendidos apenas no estabelecimento. Para entrega, trabalhamos somente com suco na
                garrafinha de 300 ml.
              </p>
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
          </div>
        </section>
        <RefillSection />
        <HowToOrder />
        <OfficialMenu />
        <AdminAccessSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
