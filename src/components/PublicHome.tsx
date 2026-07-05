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
    mark: 'P',
  },
  {
    name: 'Pastel de Frango',
    description: 'Frango suculento em massa sequinha.',
    price: 'R$ 5,00',
    href: '/cardapio?produto=pastel-frango',
    mark: 'F',
  },
  {
    name: 'Coxinha',
    description: 'Casquinha crocante e recheio caprichado.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=coxinha',
    mark: 'C',
  },
  {
    name: 'Suco na Garrafinha',
    description: 'Suco natural 300 ml para pedido online.',
    price: 'R$ 4,00',
    href: '/cardapio?produto=suco-natural-garrafinha-300ml',
    mark: 'S',
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
    <section className="overflow-hidden bg-[linear-gradient(135deg,#FFF8DD_0%,#FFC72C_52%,#DA291C_52%,#D71920_100%)]">
      <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#DA291C] shadow-sm">
            Delivery e retirada
          </span>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Pasteis crocantes, salgados quentinhos.
          </h1>
          <p className="mt-5 max-w-xl text-lg font-bold leading-8 text-[#4A4A4A]">
            Monte seu pedido em poucos cliques e confirme pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/cardapio"
              className="rounded-full bg-[#1D1D1D] px-7 py-4 text-center text-base font-black text-white shadow-lg transition hover:scale-[1.02] hover:bg-[#DA291C]"
            >
              Pedir agora
            </a>
            <a
              href="/cardapio"
              className="rounded-full bg-white px-7 py-4 text-center text-base font-black text-[#1D1D1D] shadow-lg transition hover:scale-[1.02]"
            >
              Ver cardapio
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black">a partir de R$ 4,00</span>
            <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black">suco natural 300 ml</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-5 top-8 h-24 w-24 rounded-full bg-white/30" />
          <div className="absolute -right-4 bottom-4 h-32 w-32 rounded-full bg-[#FFC72C]/50" />
          <div className="relative rounded-[2rem] bg-white p-4 shadow-2xl">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#FFF1B8]">
              <img
                src="/cardapio/cardapio-principal.jpeg"
                alt="Produtos do cardapio da Salgados R"
                className="aspect-[4/3] w-full scale-110 object-cover object-top"
              />
            </div>
            <div className="absolute bottom-8 left-8 rounded-2xl bg-white px-5 py-4 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#DA291C]">Mais pedido</p>
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
    <section className="bg-white py-6">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
        <div className="flex min-w-max gap-3">
          {categories.map((category) => (
            <a
              key={category.label}
              href={category.href}
              className="group flex min-w-32 items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FFC72C] hover:shadow-md"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFC72C] text-lg font-black text-[#DA291C]">
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
    <section className="bg-[#F6F6F6] py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#DA291C]">Mais pedidos</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">Favoritos da Salgados R</h2>
          </div>
          <a href="/cardapio" className="font-black text-[#DA291C] underline decoration-[#FFC72C] decoration-4 underline-offset-4">
            Ver todos
          </a>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <article key={item.name} className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,#FFC72C,#DA291C)] text-6xl font-black text-white">
                {item.mark}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black">{item.name}</h3>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-[#4A4A4A]">{item.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#FFC72C] px-4 py-2 text-base font-black">{item.price}</span>
                  <a href={item.href} className="rounded-full bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
                    Adicionar
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
    <section id="como-pedir" className="scroll-mt-24 bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#DA291C]">Como funciona</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Pedido rapido, sem complicar.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-3xl border border-zinc-100 bg-[#F6F6F6] p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFC72C] text-lg font-black text-[#DA291C]">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-black">{step.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#4A4A4A]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function RefillBannerHome() {
  return (
    <section id="refil" className="scroll-mt-24 bg-white pb-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-5 rounded-[2rem] bg-[#FFC72C] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#DA291C]">Refil de sucos naturais</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">R$ 1,00 a cada 100 ml.</h2>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#4A4A4A]">
              Garrafinha de 300 ml por R$ 4,00. Refil no balcao para nossa garrafa ou a sua.
            </p>
          </div>
          <a href="/cardapio?categoria=refil" className="rounded-full bg-[#1D1D1D] px-6 py-4 text-center font-black text-white">
            Ver detalhes
          </a>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-[#DA291C] py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFC72C]">Bateu a fome?</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Seu pedido comeca no cardapio.</h2>
        </div>
        <a href="/cardapio" className="rounded-full bg-[#FFC72C] px-7 py-4 text-center font-black text-[#1D1D1D]">
          Pedir agora
        </a>
      </div>
    </section>
  )
}
