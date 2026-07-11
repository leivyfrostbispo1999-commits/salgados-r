import { Footer } from './Footer'
import { PublicHeader } from './PublicHeader'

const realAssets = {
  logo: '/assets-reais/logomarca-oficial-clean.png',
  pastel: '/assets-reais/produto-pastel-clean.png',
  coxinha: '/assets-reais/produto-coxinha-clean.png',
  enroladinho: '/assets-reais/produto-enroladinho-clean.png',
  cardapio: '/assets-reais/cardapio-oficial.png',
  refil: '/assets-reais/refil-sucos-v2.png',
}

const categories = [
  { label: 'Pasteis', href: '/cardapio?categoria=pasteis', mark: 'P', text: 'Massa crocante' },
  { label: 'Salgados', href: '/cardapio?categoria=salgados', mark: 'S', text: 'Quentinhos' },
  { label: 'Sucos', href: '/cardapio?categoria=sucos', mark: 'J', text: 'Goiaba e maracujá' },
  { label: 'Refil', href: '/cardapio?categoria=refil', mark: 'R', text: 'A partir de R$ 4,00' },
]

const featured = [
  {
    name: 'Pastel de Carne',
    description: 'Massa sequinha e recheio caprichado.',
    price: 'R$ 5,00',
    href: '/cardapio?produto=pastel-carne',
    imageUrl: realAssets.pastel,
  },
  {
    name: 'Coxinha',
    description: 'Crocante por fora, cremosa por dentro.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=coxinha',
    imageUrl: realAssets.coxinha,
  },
  {
    name: 'Enroladinho',
    description: 'Douradinho e pronto para pedir.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=enroladinho',
    imageUrl: realAssets.enroladinho,
  },
  {
    name: 'Suco Natural',
    description: 'Goiaba ou maracujá geladinho.',
    price: 'A partir de R$ 4,00',
    href: '/cardapio?produto=suco-natural-garrafinha-300ml',
    imageUrl: realAssets.refil,
    imageClassName: 'sr-food-image sr-food-image-refil',
  },
]

const steps = [
  { title: 'Escolha', text: 'Pastel, salgado ou suco natural.' },
  { title: 'Adicione', text: 'Monte o pedido em poucos toques.' },
  { title: 'Confirme', text: 'Finalize pelo site ou WhatsApp.' },
]

export function PublicHome() {
  return (
    <div className="min-h-screen bg-[var(--sr-red)] text-[var(--sr-white)]">
      <PublicHeader />
      <main>
        <Hero />
        <CategoryStripHome />
        <FeaturedHome />
        <OfficialMenuHome />
        <HowItWorksHome />
        <RefillBannerHome />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

function Hero() {
  return (
    <section className="sr-hero-stage sr-hero-poster overflow-hidden text-[var(--sr-white)]">
      <div className="mx-auto flex min-h-[calc(100vh-112px)] max-w-[92rem] flex-col justify-center px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-96px)] lg:py-16">
        <div className="relative z-10">
          <span className="sr-hero-kicker inline-flex rounded-full bg-[var(--sr-yellow)] px-7 py-4 text-2xl font-black uppercase text-[var(--sr-white)] sm:px-11 sm:text-4xl">
            Loja popular, quente e saborosa
          </span>
          <h1 className="sr-hero-title mt-12 font-black uppercase">
            <span>Pastel caprichado,</span>
            <span>Coxinha crocante</span>
            <span>E enroladinho</span>
            <span>Douradinho.</span>
          </h1>
          <p className="sr-hero-subtitle mt-8 font-black uppercase text-[var(--sr-white)]">
            Cardapio forte, pedido rapido e aquele visual de fome na hora.
          </p>
          <div className="sr-hero-actions mt-11 flex flex-col gap-5 sm:flex-row">
            <a href="/cardapio" className="sr-primary-cta">
              Pedir agora
            </a>
            <a href="/cardapio" className="sr-secondary-cta">
              Ver cardápio
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function CategoryStripHome() {
  return (
    <section className="bg-[var(--sr-red)] py-5 text-[var(--sr-white)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <a key={category.label} href={category.href} className="group sr-category-tile">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--sr-yellow)] text-lg font-black text-[var(--sr-red)]">
                {category.mark}
              </span>
              <span>
                <strong>{category.label}</strong>
                <small>{category.text}</small>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedHome() {
  return (
    <section className="sr-hot-bg scroll-mt-20 py-12 text-[var(--sr-white)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Mais pedidos</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--sr-white)] sm:text-4xl">Fome bateu, pediu.</h2>
          </div>
          <a href="/cardapio" className="rounded-full bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-white)] transition">
            Ver todos
          </a>
        </div>

        <div className="mt-7 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <article key={item.name} className="sr-food-card">
              <div className="sr-food-media">
                <img src={item.imageUrl} alt={item.name} width="900" height="640" loading="lazy" className={item.imageClassName || 'sr-food-image'} />
              </div>
              <div className="sr-food-body">
                <h3 className="sr-food-name">{item.name}</h3>
                <p className="sr-food-description">{item.description}</p>
                <span className="sr-food-price">{item.price}</span>
                <a href={item.href} className="sr-food-action">
                  + Adicionar
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function OfficialMenuHome() {
  return (
    <section className="bg-[var(--sr-red)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-[var(--sr-white)]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Cardapio oficial</p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Imagem oficial como consulta.</h2>
          <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-[var(--sr-white)]">
            Para pedir, use o cardapio digital.
          </p>
        </div>
        <a href="/cardapio-oficial" className="sr-secondary-cta">
          Ver cardápio oficial
        </a>
      </div>
    </section>
  )
}

function HowItWorksHome() {
  return (
    <section id="como-pedir" className="scroll-mt-20 bg-[var(--sr-red)] py-12 text-[var(--sr-white)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Como funciona</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pedido rapido, sem cara de sistema.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-[22px] border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] p-5 text-[var(--sr-white)]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sr-yellow)] text-xl font-black text-[var(--sr-white)]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl font-black">{step.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--sr-white)]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function RefillBannerHome() {
  return (
    <section id="refil" className="scroll-mt-20 bg-[var(--sr-red)] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 overflow-hidden rounded-[28px] border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] p-6 text-[var(--sr-white)] sm:p-8 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Refil de sucos naturais</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--sr-white)]">A partir de R$ 4,00</h2>
            <p className="mt-2 max-w-2xl text-lg font-black leading-7 text-[var(--sr-white)]">Goiaba e maracujá geladinhos.</p>
          </div>
          <figure className="sr-refill-art" aria-label="Arte oficial do refil de sucos naturais">
            <img src={realAssets.refil} alt="Refil de sucos naturais da Salgados R" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-[var(--sr-red)] py-12 text-[var(--sr-white)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Bateu a fome?</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Abre o cardapio e pede quente.</h2>
        </div>
        <a href="/cardapio" className="sr-primary-cta">
          Pedir agora
        </a>
      </div>
    </section>
  )
}
