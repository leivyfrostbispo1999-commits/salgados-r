const categories = [
  { href: '#pasteis', icon: 'P', label: 'Pasteis' },
  { href: '#salgados', icon: 'S', label: 'Salgados' },
  { href: '#sucos', icon: 'J', label: 'Sucos' },
  { href: '#refil', icon: 'R', label: 'Refil' },
  { href: '#cardapio-oficial', icon: 'O', label: 'Oficial' },
  { href: '#sistema', icon: 'A', label: 'Sistema' },
]

export function CategoryStrip() {
  return (
    <section className="border-b border-[var(--sr-white)]/10 bg-[var(--sr-red)]">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-5 sm:px-6">
        <div className="flex min-w-max gap-3">
          {categories.map((category) => (
            <a
              key={category.href}
              href={category.href}
              className="flex min-w-32 flex-col items-center gap-2 rounded-lg border border-[var(--sr-white)]/20 bg-[var(--sr-red)] px-5 py-4 text-center transition hover:-translate-y-1"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--sr-yellow)] text-lg font-black text-[var(--sr-red)]">
                {category.icon}
              </span>
              <span className="text-sm font-black text-[var(--sr-white)]">{category.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
