import type { Product } from '../data/products'
import { buildWhatsAppUrl } from '../utils/whatsapp'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {product.highlight ? (
            <span className="mb-2 inline-flex rounded bg-red-600 px-2 py-1 text-xs font-black uppercase tracking-wide text-white">
              {product.highlight}
            </span>
          ) : null}
          <h3 className="text-xl font-black text-zinc-950">{product.name}</h3>
        </div>
        <span className="whitespace-nowrap rounded bg-yellow-300 px-3 py-2 text-lg font-black text-black">
          {product.price}
        </span>
      </div>

      <p className="flex-1 text-sm font-medium leading-6 text-zinc-600">{product.description}</p>

      <a
        href={buildWhatsAppUrl(product.name)}
        target="_blank"
        rel="noreferrer"
        className="mt-5 rounded bg-black px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700"
      >
        Pedir pelo WhatsApp
      </a>
    </article>
  )
}
