export function DeliveryNotice() {
  return (
    <section className="bg-yellow-300 py-8 text-black">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Atencao</p>
          <h2 className="mt-2 text-3xl font-black">Sucos de copo nao saem para entrega.</h2>
        </div>
        <div className="rounded-lg bg-black p-5 text-white">
          <p className="text-lg font-black text-yellow-300">Para delivery</p>
          <p className="mt-2 text-base font-semibold leading-7">
            Os sucos de copo sao vendidos apenas no estabelecimento. Para entrega, trabalhamos somente
            com suco natural geladinho a partir de R$ 4,00.
          </p>
        </div>
      </div>
    </section>
  )
}
