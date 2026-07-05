import { Footer } from './Footer'
import { PublicHeader } from './PublicHeader'

const realAssets = {
  logo: '/assets-reais/logo-salgados-r.png',
  pastel: '/assets-reais/pastel.png',
  coxinha: '/assets-reais/coxinha.png',
  enroladinho: '/assets-reais/enroladinho.png',
  cardapio: '/assets-reais/cardapio-oficial.png',
  refil: '/assets-reais/refil-sucos.png',
}

const categories = [
  { label: 'Pasteis', href: '/cardapio?categoria=pasteis', image: realAssets.pastel, text: 'Massa crocante' },
  { label: 'Salgados', href: '/cardapio?categoria=salgados', image: realAssets.coxinha, text: 'Quentinhos' },
  { label: 'Sucos', href: '/cardapio?categoria=sucos', image: realAssets.refil, text: 'Goiaba e maracuja' },
  { label: 'Refil', href: '/cardapio?categoria=refil', image: realAssets.refil, text: 'A partir de R$ 4,00' },
]

const featured = [
  {
    name: 'Pastel de Carne',
    description: 'Massa sequinha e recheio caprichado.',
    price: 'R$ 5,00',
    href: '/cardapio?produto=pastel-carne',
    imageUrl: realAssets.pastel,
    textureClass: 'sr-texture-pastel',
  },
  {
    name: 'Coxinha',
    description: 'Crocante por fora, cremosa por dentro.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=coxinha',
    imageUrl: realAssets.coxinha,
    textureClass: 'sr-texture-coxinha',
  },
  {
    name: 'Enroladinho',
    description: 'Douradinho e pronto para pedir.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=enroladinho',
    imageUrl: realAssets.enroladinho,
    textureClass: 'sr-texture-enroladinho',
  },
  {
    name: 'Suco Natural',
    description: 'Goiaba ou maracuja geladinho.',
    price: 'A partir de R$ 4,00',
    href: '/cardapio?produto=suco-natural-garrafinha-300ml',
    imageUrl: realAssets.refil,
    textureClass: 'sr-texture-coxinha',
  },
]

const steps = [
  { title: 'Escolha', text: 'Pastel, salgado ou suco natural.' },
  { title: 'Adicione', text: 'Monte o pedido em poucos toques.' },
  { title: 'Confirme', text: 'Finalize pelo site ou WhatsApp.' },
]

export function PublicHome() {
  return (
    <div className="min-h-screen bg-[var(--sr-red-dark)] text-white">
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
    <section className="sr-hero-stage overflow-hidden text-white">
      <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <img src={realAssets.logo} alt="SALGADOS R" className="h-auto w-[min(88vw,420px)] drop-shadow-[0_22px_36px_rgba(0,0,0,0.34)]" />
          <span className="mt-7 inline-flex rounded-full bg-[var(--sr-yellow)] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--sr-black)] shadow-[0_14px_30px_rgba(0,0,0,0.2)]">
            Loja popular, quente e saborosa
          </span>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.88] tracking-tight sm:text-6xl lg:text-7xl">
            Pastel crocante, coxinha dourada e suco geladinho.
          </h1>
          <p className="mt-5 max-w-xl text-lg font-black leading-8 text-white/88">
            Cardapio forte, pedido rapido e aquele visual de fome na hora.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/cardapio" className="sr-primary-cta">
              Pedir agora
            </a>
            <a href="/cardapio-oficial" className="sr-secondary-cta">
              Ver cardapio oficial
            </a>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {['Pasteis R$ 5', 'Coxinha R$ 4', 'Suco R$ 4'].map((item) => (
              <span key={item} className="rounded-2xl border border-white/15 bg-black/22 px-3 py-3 text-center text-sm font-black text-white shadow-[0_18px_38px_rgba(0,0,0,0.18)] backdrop-blur">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px] lg:min-h-[580px]">
          <div className="sr-hero-plate">
            <img src={realAssets.pastel} alt="Pastel crocante da Salgados R" className="sr-hero-product sr-hero-product-pastel" />
            <img src={realAssets.coxinha} alt="Coxinha da Salgados R" className="sr-hero-product sr-hero-product-coxinha" />
            <img src={realAssets.enroladinho} alt="Enroladinho da Salgados R" className="sr-hero-product sr-hero-product-enroladinho" />
            <div className="sr-price-burst">
              <span>A partir de</span>
              <strong>R$ 4,00</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CategoryStripHome() {
  return (
    <section className="bg-[var(--sr-yellow)] py-8 text-[var(--sr-black)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <a key={category.label} href={category.href} className="group sr-category-tile">
              <img src={category.image} alt="" className="h-24 w-28 object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.24)] transition group-hover:scale-110" />
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
    <section className="sr-hot-bg py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Mais pedidos</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Fome bateu, pediu.</h2>
          </div>
          <a href="/cardapio" className="rounded-full bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-black)] shadow-[0_18px_34px_rgba(0,0,0,0.2)] transition hover:scale-[1.03]">
            Ver todos
          </a>
        </div>

        <div className="mt-9 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <article key={item.name} className={`sr-food-card ${item.textureClass}`}>
              <div className="sr-food-media">
                <img src={item.imageUrl} alt={item.name} width="900" height="640" loading="lazy" className="sr-food-image" />
                <span className="sr-food-badge">Mais pedido</span>
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
    <section className="bg-[var(--sr-red)] py-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="text-white">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Cardapio oficial</p>
          <h2 className="mt-2 text-4xl font-black leading-none tracking-tight sm:text-5xl">Visual de loja real, produto real.</h2>
          <p className="mt-4 max-w-xl text-base font-bold leading-7 text-white/82">
            As imagens oficiais ficam aqui para consulta. Para pedir, use o cardapio digital com carrinho.
          </p>
          <a href="/cardapio-oficial" className="sr-secondary-cta mt-7 inline-flex">
            Abrir cardapio
          </a>
        </div>
        <a href="/cardapio-oficial" className="sr-official-preview">
          <img src={realAssets.cardapio} alt="Cardapio oficial da Salgados R" />
        </a>
      </div>
    </section>
  )
}

function HowItWorksHome() {
  return (
    <section id="como-pedir" className="scroll-mt-24 bg-[var(--sr-yellow)] py-16 text-[var(--sr-black)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-red-dark)]">Como funciona</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Pedido rapido, sem cara de sistema.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-[var(--sr-radius-xl)] bg-[var(--sr-red-dark)] p-6 text-white shadow-[var(--sr-shadow-premium)]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sr-yellow)] text-xl font-black text-[var(--sr-black)]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl font-black">{step.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-white/78">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function RefillBannerHome() {
  return (
    <section id="refil" className="scroll-mt-24 bg-[linear-gradient(180deg,var(--sr-yellow),var(--sr-orange))] pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-5 overflow-hidden rounded-[var(--sr-radius-xl)] bg-[var(--sr-red-dark)] p-6 text-white shadow-[var(--sr-shadow-premium)] sm:p-8 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Refil de sucos naturais</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-white">A partir de R$ 4,00</h2>
            <p className="mt-2 max-w-2xl text-lg font-black leading-7 text-white/86">Goiaba e maracuja geladinhos.</p>
          </div>
          <img src={realAssets.refil} alt="Refil de sucos naturais da Salgados R" className="h-48 w-full rounded-3xl object-cover shadow-[0_24px_46px_rgba(0,0,0,0.32)]" />
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-[var(--sr-red-dark)] py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Bateu a fome?</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Abre o cardapio e pede quente.</h2>
        </div>
        <a href="/cardapio" className="sr-primary-cta">
          Pedir agora
        </a>
      </div>
    </section>
  )
}
