import { PwaInstallCard } from './PwaInstallCard'

export function Footer() {
  return (
    <footer id="atendimento" className="bg-[var(--sr-red)] py-12 text-[var(--sr-white)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.25fr_0.85fr_1fr_1fr] lg:items-start">
        <div>
          <img src="/assets-reais/optimized/logomarca-oficial-header.webp" alt="SALGADOS R" width="520" height="223" loading="lazy" decoding="async" className="sr-logo-mark h-24 w-[310px] object-contain object-left" />
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sr-white)]">Salgados, pasteis e sucos naturais.</p>
        </div>
        <div>
          <p className="font-black">Cardapio</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--sr-white)]">
            <a href="/cardapio?categoria=pasteis">Pasteis</a>
            <a href="/cardapio?categoria=salgados">Salgados</a>
            <a href="/cardapio?categoria=sucos">Sucos</a>
            <a href="/cardapio?categoria=refil">Refil</a>
          </div>
        </div>
        <div>
          <p className="font-black">Atendimento</p>
          <p className="mt-3 text-sm font-semibold text-[var(--sr-white)]">WhatsApp: +55 71 99702-1801</p>
          <p className="mt-2 text-sm font-semibold text-[var(--sr-white)]">Peça pelo site ou WhatsApp.</p>
        </div>
        <div>
          <p className="font-black">Salgados R</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sr-white)]">
            Lanchonete popular com cardapio digital, retirada, consumo no local e delivery.
          </p>
          <PwaInstallCard />
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-[var(--sr-yellow)] px-4 pt-5 text-sm font-semibold text-[var(--sr-white)] sm:px-6">
        © 2026 Salgados R. Todos os direitos reservados.
      </div>
    </footer>
  )
}
