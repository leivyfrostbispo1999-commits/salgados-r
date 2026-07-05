const menuImages = [
  {
    src: '/cardapio/cardapio-principal.jpeg',
    alt: 'Cardapio oficial com pasteis, salgados e sucos de copo para consumo presencial.',
    title: 'Cardapio principal',
  },
  {
    src: '/cardapio/refil-sucos-naturais.jpeg',
    alt: 'Cardapio oficial do refil de sucos naturais de goiaba e maracuja.',
    title: 'Refil de sucos naturais',
  },
]

export function OfficialMenu() {
  return (
    <section id="cardapio-oficial" className="scroll-mt-24 bg-[#F6F6F6] pb-16 text-[#1D1D1D]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Cardapio oficial</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Imagens do cardapio da SALGADOS R</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
          Referencia visual oficial do balcao, incluindo os sucos de copo presenciais e a regra do refil.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {menuImages.map((image) => (
            <a key={image.src} href={image.src} target="_blank" rel="noreferrer" className="group rounded-[1.5rem] bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <figure className="overflow-hidden rounded-[1.25rem]">
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                <figcaption className="px-2 py-4 text-sm font-black text-[#DA291C]">{image.title} - clique para ampliar</figcaption>
              </figure>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
