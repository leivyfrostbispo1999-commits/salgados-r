import { Footer } from './Footer'
import { PublicHeader } from './PublicHeader'

const categories = [
  { label: 'Pasteis', href: '/cardapio?categoria=pasteis', mark: 'P' },
  { label: 'Salgados', href: '/cardapio?categoria=salgados', mark: 'S' },
  { label: 'Sucos', href: '/cardapio?categoria=sucos', mark: 'J' },
  { label: 'Refil', href: '/cardapio?categoria=refil', mark: 'R' },
  { label: 'Mais pedidos', href: '/cardapio?categoria=mais-pedidos', mark: '+' },
]

const featured = [
  {
    name: 'Pastel de Carne',
    description: 'Recheio bem temperado e massa crocante.',
    price: 'R$ 5,00',
    href: '/cardapio?produto=pastel-carne',
    imageUrl: '/produtos/pastel-carne.png',
    imageAlt: 'Pastel crocante recheado com carne',
  },
  {
    name: 'Pastel de Frango',
    description: 'Frango suculento em massa sequinha.',
    price: 'R$ 5,00',
    href: '/cardapio?produto=pastel-frango',
    imageUrl: '/produtos/pastel-frango.png',
    imageAlt: 'Pastel crocante recheado com frango',
  },
  {
    name: 'Coxinha',
    description: 'Casquinha crocante e recheio caprichado.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=coxinha',
    imageUrl: '/produtos/coxinha.png',
    imageAlt: 'Coxinha dourada e crocante',
  },
  {
    name: 'Suco na Garrafinha',
    description: 'Suco natural 300 ml para pedido online.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=suco-natural-garrafinha-300ml',
    imageUrl: '/produtos/garrafinha-refil.png',
    imageAlt: 'Garrafinha de suco natural 300 ml',
  },
]

const steps = [
  { title: 'Escolha no cardapio', text: 'Veja os produtos e adicione ao carrinho.' },
  { title: 'Finalize o pedido', text: 'Informe seus dados e a forma de pagamento.' },
  { title: 'Confirme pelo WhatsApp', text: 'Envie a mensagem pronta para agilizar.' },
]

export function PublicHome() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1D]">
      <PublicHeader />
      <main>
        <Hero />
        <CategoryStripHome />
        <FeaturedHome />
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
    <section className="overflow-hidden bg-[radial-gradient(circle_at_20%_15%,#FFE047_0,#FFD51E_18%,transparent_35%),linear-gradient(135deg,#8B0008_0%,#D90416_58%,#99000D_100%)] text-white">
      <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.92fr]">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-[#FFD51E] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#050505] shadow-sm">
            Delivery e retirada
          </span>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
            Salgados quentinhos, pasteis crocantes e sucos gelados.
          </h1>
          <p className="mt-5 max-w-xl text-lg font-bold leading-8 text-white/85">
            Monte seu pedido em poucos cliques, veja os precos e confirme pelo WhatsApp oficial da Salgados R.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/cardapio"
              className="rounded-full bg-[#FFD51E] px-7 py-4 text-center text-base font-black text-[#050505] shadow-lg transition hover:scale-[1.02] hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
            >
              Ver cardapio
            </a>
            <a
              href="/#refil"
              className="rounded-full border border-white/35 bg-white/10 px-7 py-4 text-center text-base font-black text-white shadow-lg transition hover:scale-[1.02] hover:bg-white hover:text-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
            >
              Conhecer refil
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">a partir de R$ 4,00</span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">suco natural 300 ml</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-5 top-8 h-24 w-24 rounded-full bg-[#FFD51E]/25" />
          <div className="absolute -right-4 bottom-4 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative rounded-[2rem] border border-white/15 bg-white p-3 shadow-2xl sm:p-4">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#FFF8E8]">
              <img
                src="/cardapio/cardapio-principal.jpeg"
                alt="Produtos do cardapio da Salgados R"
                className="aspect-[4/3] w-full scale-110 object-cover object-top"
              />
            </div>
            <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-[#050505] px-5 py-4 text-white shadow-xl sm:right-auto">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FFD51E]">Mais pedido</p>
              <p className="text-lg font-black">Pastel + suco natural</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CategoryStripHome() {
  return (
    <section className="bg-[#FFF8E8] py-6">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
        <div className="flex min-w-max gap-3">
          {categories.map((category) => (
            <a
              key={category.label}
              href={category.href}
              className="group flex min-w-32 items-center gap-3 rounded-2xl border border-[#EFE0C8] bg-[#FFFDF7] px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FFD51E] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFD51E] text-lg font-black text-[#99000D]">
                {category.mark}
              </span>
              <span className="text-sm font-black">{category.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedHome() {
  return (
    <section className="bg-[#FFFDF7] py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#99000D]">Mais pedidos</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[#050505]">Favoritos da Salgados R</h2>
          </div>
          <a href="/cardapio" className="font-black text-[#99000D] underline decoration-[#FFD51E] decoration-4 underline-offset-4">
            Ver todos
          </a>
        </div>

        <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <article
              key={item.name}
              className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#F0D39B] bg-[linear-gradient(180deg,#FFF8EC_0%,#FFF4DD_58%,#FFEFC8_100%)] p-3 shadow-[0_18px_44px_rgba(83,38,0,0.12),0_0_0_1px_rgba(255,213,30,0.16)] transition duration-[250ms] hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(139,0,8,0.20),0_0_30px_rgba(255,213,30,0.16)]"
            >
              <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_38%,#FFFDF7_0,#FFE7A3_46%,#F4B51A_100%)]">
                <div className="absolute inset-x-8 bottom-6 h-9 rounded-full bg-black/18 blur-xl transition duration-[250ms] group-hover:bg-black/24" />
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  width="900"
                  height="640"
                  loading="lazy"
                  className="relative aspect-[1.08/1] w-full object-cover object-center drop-shadow-[0_18px_18px_rgba(75,35,0,0.18)] transition duration-[250ms] group-hover:scale-[1.045]"
                />
                <span className="absolute left-4 top-4 rounded-full bg-[#FFD51E] px-3.5 py-2 text-xs font-black uppercase tracking-wide text-[#050505] shadow-[0_10px_22px_rgba(0,0,0,0.14)]">
                  🔥 Mais pedido
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-black tracking-[0.24em] text-[#99000D]">★★★★★</p>
                <h3 className="mt-2 text-2xl font-black leading-[1.02] tracking-tight text-[#050505]">{item.name}</h3>
                <p className="mt-2 min-h-12 text-sm font-medium leading-6 text-[#5F4030]">{item.description}</p>
                <div className="mt-auto pt-4">
                  <div className="mb-3">
                    <span className="rounded-full bg-[#FFD51E] px-5 py-2.5 text-xl font-black text-[#050505] shadow-[0_10px_22px_rgba(255,213,30,0.32)]">
                      {item.price}
                    </span>
                  </div>
                  <a
                    href={item.href}
                    className="block min-h-14 rounded-2xl bg-[linear-gradient(135deg,#050505,#2A1610)] px-5 py-4 text-center text-base font-black text-white shadow-[0_14px_28px_rgba(5,5,5,0.22)] transition duration-[250ms] hover:scale-[1.015] hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                  >
                    + Adicionar
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksHome() {
  return (
    <section id="como-pedir" className="scroll-mt-24 bg-[#FFF8E8] py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#99000D]">Como funciona</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-[#050505]">Pedido rapido, sem complicar.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-3xl border border-[#EFE0C8] bg-[#FFFDF7] p-6 shadow-sm">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFD51E] text-lg font-black text-[#99000D]">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-black text-[#050505]">{step.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#4A3329]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function RefillBannerHome() {
  return (
    <section id="refil" className="scroll-mt-24 bg-[#FFF8E8] pb-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-5 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#FFD51E,#FFF3B0)] p-6 shadow-[0_18px_48px_rgba(139,0,8,0.12)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#99000D]">Refil de sucos naturais</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#050505]">R$ 1,00 a cada 100 ml.</h2>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#4A3329]">
              Garrafinha de 300 ml por R$ 4,00. Refil no balcao para nossa garrafa ou a sua.
            </p>
          </div>
          <a href="/cardapio?categoria=refil" className="rounded-xl bg-[#050505] px-6 py-4 text-center font-black text-white transition hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-white/70">
            Ver detalhes
          </a>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-[linear-gradient(135deg,#8B0008,#D90416)] py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFD51E]">Bateu a fome?</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Seu pedido comeca no cardapio.</h2>
        </div>
        <a href="/cardapio" className="rounded-xl bg-[#FFD51E] px-7 py-4 text-center font-black text-[#050505] transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
          Pedir agora
        </a>
      </div>
    </section>
  )
}
