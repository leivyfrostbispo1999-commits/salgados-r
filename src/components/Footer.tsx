export function Footer() {
  return (
    <footer id="atendimento" className="bg-[linear-gradient(135deg,#3A0004,var(--sr-red-dark))] py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <img src="/assets-reais/logo-salgados-r.png" alt="SALGADOS R" className="h-16 w-52 rounded-2xl object-cover shadow-xl" />
          <p className="mt-2 text-sm font-semibold leading-6 text-white/75">Salgados, pasteis e sucos naturais.</p>
        </div>
        <div>
          <p className="font-black">Cardapio</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-white/75">
            <a href="/cardapio?categoria=pasteis">Pasteis</a>
            <a href="/cardapio?categoria=salgados">Salgados</a>
            <a href="/cardapio?categoria=sucos">Sucos</a>
            <a href="/cardapio?categoria=refil">Refil</a>
          </div>
        </div>
        <div>
          <p className="font-black">Atendimento</p>
          <p className="mt-3 text-sm font-semibold text-white/75">WhatsApp: +55 71 99702-1801</p>
          <p className="mt-2 text-sm font-semibold text-white/75">Escolha, peça e confirme pelo WhatsApp.</p>
        </div>
        <div>
          <p className="font-black">Salgados R</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
            Lanchonete popular com cardapio digital, retirada, consumo no local e delivery.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 px-4 pt-6 text-sm font-semibold text-white/60 sm:px-6">
        © 2026 Salgados R. Todos os direitos reservados.
      </div>
    </footer>
  )
}
