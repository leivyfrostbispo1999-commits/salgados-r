import { buildWhatsAppUrl } from '../utils/whatsapp'

export function RefillSection() {
  return (
    <section id="refil" className="scroll-mt-24 bg-[var(--sr-red)] py-16 text-[var(--sr-white)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Refil de sucos naturais</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">A partir de R$ 4,00</h2>
          <p className="mt-4 max-w-xl text-base font-bold leading-7 text-[var(--sr-white)]">
            Goiaba e maracujá geladinhos.
          </p>
        </div>

        <figure className="sr-refill-art">
          <img src="/assets-reais/refil-sucos.png" alt="Refil de sucos naturais da Salgados R" loading="lazy" />
        </figure>

        <a
          href={buildWhatsAppUrl({ name: 'Refil de Suco - 100 ml', price: 'R$ 1,00', quantity: 1 })}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[var(--sr-yellow)] px-6 py-4 text-center text-base font-black text-[var(--sr-red)] transition lg:col-start-2"
        >
          Consultar refil no WhatsApp
        </a>
      </div>
    </section>
  )
}
