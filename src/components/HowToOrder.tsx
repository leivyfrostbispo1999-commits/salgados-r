const steps = [
  {
    title: 'Escolha no cardapio',
    description: 'Veja pasteis, salgados, sucos e refil em uma lista simples.',
  },
  {
    title: 'Clique no WhatsApp',
    description: 'A mensagem ja vai com produto, preco e quantidade.',
  },
  {
    title: 'Confira a regra dos sucos',
    description: 'Copo e apenas presencial. Delivery de suco natural geladinho.',
  },
]

export function HowToOrder() {
  return (
    <section id="como-pedir" className="scroll-mt-24 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-red)]">Como pedir</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--sr-black)]">Pedido rapido, sem complicar.</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-zinc-100 bg-[#F5F5F5] p-6 shadow-sm">
              <span className="grid size-12 place-items-center rounded-full bg-[var(--sr-yellow)] text-lg font-black text-[var(--sr-red)]">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-black text-[var(--sr-black)]">{step.title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
