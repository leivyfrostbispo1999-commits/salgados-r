const menuImages = [
  {
    src: '/assets-reais/cardapio-oficial.png',
    alt: 'Cardapio oficial com pasteis, salgados e sucos de copo para consumo presencial.',
    title: 'Cardapio principal',
  },
]

export function OfficialMenu() {
  return (
    <section id="cardapio-oficial" className="scroll-mt-20 bg-[var(--sr-red)] pb-12 pt-2 text-[var(--sr-white)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Cardapio oficial</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Imagens oficiais da SALGADOS R</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--sr-white)]">
          Referencia visual oficial do balcao, incluindo os sucos de copo presenciais e a regra do refil.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {menuImages.map((image) => (
            <a key={image.src} href={image.src} target="_blank" rel="noreferrer" className="group rounded-[1.25rem] border border-[var(--sr-white)]/10 bg-[var(--sr-red)] p-3 transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[var(--sr-yellow)]">
              <figure className="overflow-hidden rounded-[1.25rem]">
                <img src={image.src} alt={image.alt} className="h-[min(54vw,420px)] w-full object-cover object-top transition duration-200 group-hover:scale-[1.015]" loading="lazy" />
                <figcaption className="flex items-center justify-between gap-3 px-2 py-4 text-sm font-black text-[var(--sr-white)]">
                  <span>{image.title}</span>
                  <span className="rounded-full bg-[var(--sr-yellow)] px-3 py-1.5 text-xs text-[var(--sr-red)]">Abrir maior</span>
                </figcaption>
              </figure>
            </a>
          ))}
          <article className="rounded-[1.25rem] border border-[var(--sr-white)]/10 bg-[var(--sr-red)] p-3">
            <figure className="sr-refill-art h-72 sm:h-[420px]">
              <img src="/assets-reais/refil-sucos.png" alt="Refil de sucos naturais da Salgados R" loading="lazy" />
            </figure>
            <div className="flex items-center justify-between gap-3 px-2 py-4 text-sm font-black text-[var(--sr-white)]">
              <span>Goiaba e maracujá geladinhos.</span>
              <a href="/cardapio?categoria=refil" className="rounded-full bg-[var(--sr-yellow)] px-3 py-1.5 text-xs text-[var(--sr-red)]">
                Pedir
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
