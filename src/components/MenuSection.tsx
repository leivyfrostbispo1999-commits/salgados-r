import type { Product, ProductCategory } from '../data/products'
import { ProductCard } from './ProductCard'

type MenuSectionProps = {
  id: string
  title: string
  eyebrow: string
  category: ProductCategory
  products: Product[]
  description?: string
  badge?: string
}

export function MenuSection({ id, title, eyebrow, category, products, description, badge }: MenuSectionProps) {
  const filteredProducts = products.filter((product) => product.category === category)

  return (
    <section id={id} className="scroll-mt-24 py-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1D1D1D]">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">{description}</p> : null}
        </div>
        <span className="w-fit rounded-full bg-[#1D1D1D] px-4 py-2 text-sm font-black text-[#FFC72C]">
          {badge ?? 'Pedido rapido'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
