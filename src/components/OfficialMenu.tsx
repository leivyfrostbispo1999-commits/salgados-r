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
    <section id="cardapio-oficial" className="scroll-mt-24 bg-zinc-950 py-12 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Cardapio oficial</p>
        <h2 className="mt-2 text-3xl font-black">Imagens do cardapio da SALGADOS R</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-300">
          Referencia visual oficial do balcao, incluindo os sucos de copo presenciais e a regra do refil.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {menuImages.map((image) => (
            <figure key={image.src} className="overflow-hidden rounded-lg bg-black shadow-lg">
              <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
              <figcaption className="px-4 py-3 text-sm font-black text-yellow-300">{image.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
