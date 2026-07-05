import { products } from '../data/products'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const featuredIds = ['pastel-carne', 'coxinha', 'enroladinho', 'suco-natural-garrafinha-300ml']

export function FeaturedProducts() {
  const featured = featuredIds.map((id) => products.find((product) => product.id === id)).filter(Boolean)

  return (
    <section id="mais-pedidos" className="scroll-mt-24 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Mais pedidos</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[#1D1D1D]">Mais pedidos da Salgados R</h2>
          </div>
          <a href="#cardapio" className="font-black text-[#DA291C] underline decoration-[#FFC72C] decoration-4 underline-offset-4">
            Ver cardapio completo
          </a>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) =>
            product ? (
              <article key={product.id} className="rounded-lg border border-zinc-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="grid h-28 place-items-center rounded-lg bg-[#FFC72C] text-5xl font-black text-[#DA291C]">
                  {product.name.slice(0, 1)}
                </div>
                <h3 className="mt-5 text-xl font-black text-[#1D1D1D]">{product.name}</h3>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-zinc-600">{product.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#F5F5F5] px-4 py-2 text-lg font-black text-[#1D1D1D]">
                    {product.price}
                  </span>
                  <a
                    href={buildWhatsAppUrl({ name: product.name, price: product.price, quantity: 1 })}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#FFC72C] px-4 py-3 text-sm font-black text-[#1D1D1D] transition hover:bg-[#DA291C] hover:text-white"
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
