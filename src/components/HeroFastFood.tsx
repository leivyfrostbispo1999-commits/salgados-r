import { buildWhatsAppUrl } from '../utils/whatsapp'

export function HeroFastFood() {
  return (
    <section className="relative overflow-hidden bg-[#FFC72C]">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[#DA291C] lg:block" />
      <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#DA291C] shadow-sm">
            Pastel crocante, atendimento direto
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight text-[#1D1D1D] sm:text-6xl lg:text-7xl">
            Como voce quer seu pedido hoje?
          </h1>
          <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-[#292929]">
            Pasteis crocantes, salgados quentinhos e sucos naturais para balcao ou delivery, com a regra certa para
            cada tipo de consumo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={buildWhatsAppUrl({ name: 'Pedido pelo cardapio da Salgados R', price: 'consultar itens', quantity: 1 })}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#1D1D1D] px-7 py-4 text-center text-base font-black text-white shadow-lg transition hover:bg-[#DA291C] focus:outline-none focus:ring-4 focus:ring-white/70"
            >
              Peca pelo WhatsApp
            </a>
            <a
              href="/cardapio"
              className="rounded-full bg-white px-7 py-4 text-center text-base font-black text-[#1D1D1D] shadow-lg transition hover:translate-y-[-1px] focus:outline-none focus:ring-4 focus:ring-white/70"
            >
              Montar pedido
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-6 h-28 w-28 rounded-full bg-white/50" />
          <div className="absolute -right-8 bottom-8 h-40 w-40 rounded-full bg-[#FFC72C]/70" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-4 shadow-2xl">
            <img
              src="/cardapio/cardapio-principal.jpeg"
              alt="Pasteis, coxinha, enroladinho e sucos do cardapio oficial da Salgados R"
              className="aspect-[4/3] w-full scale-110 rounded-[1.5rem] object-cover object-top"
            />
            <div className="absolute bottom-8 left-8 rounded-lg bg-white px-5 py-4 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#DA291C]">Delivery</p>
              <p className="text-lg font-black text-[#1D1D1D]">Suco natural geladinho</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
