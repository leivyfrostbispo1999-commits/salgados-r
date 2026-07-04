import { buildWhatsAppUrl } from '../utils/whatsapp'

export function RefillSection() {
  return (
    <section id="refil" className="scroll-mt-24 bg-black py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Refil de sucos</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Refil para qualquer garrafa.</h2>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-zinc-200">
            R$ 1,00 a cada 100 ml. O cliente pode devolver nossa garrafinha ou levar sua propria garrafa.
            Valido para qualquer tamanho de garrafa.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 text-black">
            <p className="text-sm font-black uppercase text-red-700">Delivery</p>
            <p className="mt-2 text-3xl font-black">300 ml</p>
            <p className="mt-1 text-2xl font-black text-red-700">R$ 4,00</p>
          </div>
          <div className="rounded-lg bg-yellow-300 p-5 text-black">
            <p className="text-sm font-black uppercase">Refil</p>
            <p className="mt-2 text-3xl font-black">100 ml</p>
            <p className="mt-1 text-2xl font-black text-red-700">R$ 1,00</p>
          </div>
          <div className="rounded-lg bg-red-700 p-5 text-white">
            <p className="text-sm font-black uppercase text-yellow-300">Garrafa</p>
            <p className="mt-2 text-2xl font-black">Nossa ou sua</p>
            <p className="text-sm font-semibold text-red-50">Qualquer tamanho</p>
          </div>
        </div>

        <a
          href={buildWhatsAppUrl({ name: 'Refil de Suco - 100 ml', price: 'R$ 1,00', quantity: 1 })}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-yellow-300 px-6 py-4 text-center text-base font-black text-black transition hover:bg-white lg:col-start-2"
        >
          Pedir refil no WhatsApp
        </a>
      </div>
    </section>
  )
}
