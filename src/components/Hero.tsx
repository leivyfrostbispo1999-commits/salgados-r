export function Hero() {
  return (
    <section id="inicio" className="bg-red-700 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            Lanche rapido, preco justo
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            Salgados quentinhos, pasteis crocantes e sucos gelados.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium text-red-50">
            Cardapio direto: pasteis e salgados para pedir no WhatsApp, sucos de copo para consumo no
            estabelecimento e garrafinha de suco natural para delivery.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#cardapio"
              className="rounded bg-yellow-300 px-6 py-4 text-center text-base font-black text-black shadow-[6px_6px_0_#111] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Ver cardapio
            </a>
            <a
              href="#refil"
              className="rounded border-2 border-white px-6 py-4 text-center text-base font-black text-white transition hover:bg-white hover:text-black"
            >
              Conhecer refil
            </a>
          </div>
        </div>

        <div className="relative min-h-[310px] overflow-hidden rounded-lg bg-yellow-300 p-5 text-black shadow-[10px_10px_0_#111]">
          <div className="absolute inset-x-0 top-0 h-16 bg-black" />
          <div className="relative mt-10 rounded-lg bg-white p-5 shadow-xl">
            <div className="rounded-lg border-4 border-red-600 bg-red-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Combo popular</p>
              <h2 className="mt-2 text-3xl font-black">Balcao + Delivery</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-700">
                Sucos de copo ficam no estabelecimento. Para entrega, vai suco natural geladinho.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <span className="rounded bg-black px-3 py-5 text-sm font-black text-yellow-300">Pastel</span>
                <span className="rounded bg-red-600 px-3 py-5 text-sm font-black text-white">Coxinha</span>
                <span className="rounded bg-yellow-300 px-3 py-5 text-sm font-black text-black">Garrafinha</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
