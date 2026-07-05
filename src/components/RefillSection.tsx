import { buildWhatsAppUrl } from '../utils/whatsapp'

export function RefillSection() {
  return (
    <section id="refil" className="scroll-mt-24 bg-[#FFC72C] py-16 text-[#1D1D1D]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Refil de sucos naturais</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Refil para qualquer garrafa.</h2>
          <p className="mt-4 max-w-xl text-base font-bold leading-7 text-[#292929]">
            Para delivery, enviamos somente a garrafinha de 300 ml. No balcao, voce tambem pode aproveitar o refil
            por volume: R$ 1,00 a cada 100 ml.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 text-[#1D1D1D] shadow-sm">
            <p className="text-sm font-black uppercase text-[#DA291C]">Garrafinha</p>
            <p className="mt-2 text-3xl font-black">300 ml</p>
            <p className="mt-1 text-2xl font-black text-[#DA291C]">R$ 4,00</p>
          </div>
          <div className="rounded-lg bg-[#1D1D1D] p-5 text-white shadow-sm">
            <p className="text-sm font-black uppercase">Refil</p>
            <p className="mt-2 text-3xl font-black">100 ml</p>
            <p className="mt-1 text-2xl font-black text-[#FFC72C]">R$ 1,00</p>
          </div>
          <div className="rounded-lg bg-[#DA291C] p-5 text-white shadow-sm">
            <p className="text-sm font-black uppercase text-[#FFC72C]">Garrafa</p>
            <p className="mt-2 text-2xl font-black">Nossa ou sua</p>
            <p className="text-sm font-semibold text-red-50">Qualquer tamanho</p>
          </div>
        </div>

        <a
          href={buildWhatsAppUrl({ name: 'Refil de Suco - 100 ml', price: 'R$ 1,00', quantity: 1 })}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[#1D1D1D] px-6 py-4 text-center text-base font-black text-white transition hover:bg-[#DA291C] lg:col-start-2"
        >
          Consultar refil no WhatsApp
        </a>
      </div>
    </section>
  )
}
