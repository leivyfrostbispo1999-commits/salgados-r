import { products } from '../data/products'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const featuredIds = ['pastel-carne', 'coxinha', 'enroladinho', 'suco-natural-garrafinha-300ml']

export function FeaturedProducts() {
  const featured = featuredIds.map((id) => products.find((product) => product.id === id)).filter(Boolean)

  return (
    <section id="mais-pedidos" className="scroll-mt-24 bg-[var(--sr-red)] py-16 text-[var(--sr-white)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Mais pedidos</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--sr-white)]">Mais pedidos da Salgados R</h2>
          </div>
          <a href="/cardapio" className="font-black text-[var(--sr-yellow)] underline decoration-[var(--sr-yellow)] decoration-4 underline-offset-4">
            Ver cardapio completo
          </a>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) =>
            product ? (
              <article key={product.id} className="sr-food-card p-5">
                <div className="grid h-28 place-items-center rounded-lg bg-[var(--sr-yellow)] text-5xl font-black text-[var(--sr-red)]">
                  {product.name.slice(0, 1)}
                </div>
                <h3 className="mt-5 text-xl font-black text-[var(--sr-white)]">{product.name}</h3>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-[var(--sr-white)]">{product.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--sr-yellow)] px-4 py-2 text-lg font-black text-[var(--sr-red)]">
                    {product.price}
                  </span>
                  <a
                    href={buildWhatsAppUrl({ name: product.name, price: product.price, quantity: 1 })}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-[var(--sr-red)] transition"
                  >
                    Pedir
                  </a>
                </div>
              </article>
            ) : null,
          )}
        </div>
      </div>
    </section>
  )
}
