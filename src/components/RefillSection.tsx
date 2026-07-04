import { buildWhatsAppUrl } from '../utils/whatsapp'

export function RefillSection() {
  return (
    <section id="refil" className="scroll-mt-24 bg-black py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Refil de sucos</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Garrafinha hoje, refil sempre que quiser.</h2>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-zinc-200">
            Sabores de goiaba e maracuja. Voce pode trazer sua propria garrafa ou devolver a garrafinha
            da casa no proximo pedido.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 text-black">
            <p className="text-sm font-black uppercase text-red-700">Garrafinha</p>
            <p className="mt-2 text-3xl font-black">300 ml</p>
            <p className="mt-1 text-2xl font-black text-red-700">R$ 4,00</p>
          </div>
          <div className="rounded-lg bg-yellow-300 p-5 text-black">
            <p className="text-sm font-black uppercase">Refil</p>
            <p className="mt-2 text-3xl font-black">100 ml</p>
            <p className="mt-1 text-2xl font-black text-red-700">R$ 1,00</p>
          </div>
          <div className="rounded-lg bg-red-700 p-5 text-white">
            <p className="text-sm font-black uppercase text-yellow-300">Sabores</p>
            <p className="mt-2 text-2xl font-black">Goiaba</p>
            <p className="text-2xl font-black">Maracuja</p>
          </div>
        </div>

        <a
          href={buildWhatsAppUrl({ name: 'Refil de Suco - 100 ml', price: 'R$ 1,00' })}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-yellow-300 px-6 py-4 text-center text-base font-black text-black transition hover:bg-white lg:col-start-2"
        >
          Pedir refil pelo WhatsApp
        </a>
      </div>
    </section>
  )
}
