import type { Product } from '../data/products'
import { buildWhatsAppUrl } from '../utils/whatsapp'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const canOrder = product.availability !== 'presencial'
  const availabilityLabel =
    product.availability === 'presencial'
      ? 'Somente no estabelecimento'
      : product.availability === 'delivery'
        ? 'Delivery'
        : 'Delivery e presencial'

  return (
    <article className="sr-food-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {product.highlight ? (
            <span className="mb-2 inline-flex rounded-full bg-[var(--sr-yellow)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--sr-red)]">
              {product.highlight}
            </span>
          ) : null}
          <h3 className="text-xl font-black text-[var(--sr-white)]">{product.name}</h3>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
              product.availability === 'presencial'
                ? 'border-2 border-[var(--sr-yellow)] bg-[var(--sr-red)] text-[var(--sr-white)]'
                : product.availability === 'delivery'
                  ? 'bg-[var(--sr-yellow)] text-[var(--sr-red)]'
                  : 'bg-[var(--sr-yellow)] text-[var(--sr-red)]'
            }`}
          >
            {availabilityLabel}
          </span>
        </div>
        <span className="whitespace-nowrap rounded-full bg-[var(--sr-yellow)] px-4 py-2 text-lg font-black text-[var(--sr-red)]">
          {product.price}
        </span>
      </div>

      <p className="flex-1 text-sm font-medium leading-6 text-[var(--sr-white)]">{product.description}</p>

      {canOrder ? (
        <a
          href={buildWhatsAppUrl({ name: product.name, price: product.price, quantity: 1 })}
          target="_blank"
          rel="noreferrer"
          className="mt-5 rounded-full bg-[var(--sr-yellow)] px-4 py-3 text-center text-sm font-black text-[var(--sr-red)] transition"
        >
          Pedir no WhatsApp
        </a>
      ) : (
        <p className="mt-5 rounded-full border-2 border-[var(--sr-yellow)] px-4 py-3 text-center text-sm font-black text-[var(--sr-white)]">
          Disponivel apenas no balcao
        </p>
      )}
    </article>
  )
}
