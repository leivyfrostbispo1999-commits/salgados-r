export function AdminAccessSection() {
  return (
    <section id="sistema" className="scroll-mt-24 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 rounded-lg border border-zinc-100 bg-[#F5F5F5] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Area administrativa</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1D1D1D]">Sistema operacional da loja</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-zinc-600">
              Acesso restrito para gestao de pedidos, produtos, cozinha, estoque, clientes, financeiro, relatorios e
              seguranca.
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-full bg-[#1D1D1D] px-6 py-4 text-center text-sm font-black text-white transition hover:bg-[#DA291C]"
          >
            Entrar no painel
          </a>
        </div>
      </div>
    </section>
  )
}
