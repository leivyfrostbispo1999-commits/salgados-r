export function Footer() {
  return (
    <footer id="atendimento" className="bg-[#F5F5F5] py-12 text-[#1D1D1D]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="text-xl font-black">SALGADOS R</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">Salgados, pasteis e sucos naturais.</p>
        </div>
        <div>
          <p className="font-black">Cardapio</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-zinc-600">
            <a href="/cardapio?categoria=pasteis">Pasteis</a>
            <a href="/cardapio?categoria=salgados">Salgados</a>
            <a href="/cardapio?categoria=sucos">Sucos</a>
            <a href="/cardapio?categoria=refil">Refil</a>
          </div>
        </div>
        <div>
          <p className="font-black">Atendimento</p>
          <p className="mt-3 text-sm font-semibold text-zinc-600">WhatsApp: +55 71 99702-1801</p>
          <p className="mt-2 text-sm font-semibold text-zinc-600">Delivery: suco somente na garrafinha 300 ml.</p>
        </div>
        <div>
          <p className="font-black">Sistema</p>
          <a href="/admin" className="mt-3 inline-flex text-sm font-black text-[#DA291C]">
            Area administrativa
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-zinc-200 px-4 pt-6 text-sm font-semibold text-zinc-500 sm:px-6">
        © 2026 Salgados R. Todos os direitos reservados.
      </div>
    </footer>
  )
}
