import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiProduct } from '../utils/api'

type Props = {
  products: ApiProduct[]
  value: string
  onChange: (productId: string) => void
  includeInactive?: boolean
  placeholder?: string
  label?: string
}

function productSearchText(product: ApiProduct) {
  return [
    product.name,
    product.categoryName,
    product.category,
    product.subcategoryName,
    product.flavorName,
    product.variantName,
    product.unit,
    product.volumeMl ? `${product.volumeMl} ml` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function GroupedProductCombobox({ products, value, onChange, includeInactive = false, placeholder = 'BUSCAR PRODUTO', label = 'PRODUTO' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        if (!includeInactive && (!product.active || product.availableForSale === false)) return false
        const term = query
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
        return !term || productSearchText(product).includes(term)
      }),
    [includeInactive, products, query],
  )
  const selected = products.find((product) => product.id === value)

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; sortOrder: number; subgroups: Map<string, { name: string; sortOrder: number; products: ApiProduct[] }>; products: ApiProduct[] }>()
    for (const product of visibleProducts) {
      const categoryKey = product.categoryId || product.category || 'sem-categoria'
      if (!map.has(categoryKey)) {
        map.set(categoryKey, {
          name: product.categoryName || product.category || 'SEM CATEGORIA',
          sortOrder: product.categorySortOrder || 0,
          subgroups: new Map(),
          products: [],
        })
      }
      const group = map.get(categoryKey)!
      if (product.subcategoryId) {
        if (!group.subgroups.has(product.subcategoryId)) {
          group.subgroups.set(product.subcategoryId, {
            name: product.subcategoryName || 'SEM SUBCATEGORIA',
            sortOrder: product.subcategorySortOrder || 0,
            products: [],
          })
        }
        group.subgroups.get(product.subcategoryId)!.products.push(product)
      } else {
        group.products.push(product)
      }
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [visibleProducts])

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', key)
    }
  }, [])

  return (
    <div className="sr-combobox" ref={boxRef}>
      <label className="sr-combobox-label">
        {label}
        <button
          type="button"
          className="sr-combobox-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            setOpen((state) => !state)
            window.setTimeout(() => inputRef.current?.focus(), 0)
          }}
        >
          <span>{selected ? `${selected.name}${selected.active ? '' : ' - INATIVO'}` : placeholder}</span>
          <small>{selected ? [selected.categoryName, selected.subcategoryName].filter(Boolean).join(' > ') : 'DIGITE PARA FILTRAR'}</small>
        </button>
      </label>
      {open ? (
        <div className="sr-combobox-popover">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="BUSCAR POR PRODUTO, CATEGORIA, SABOR, VOLUME..."
            className="sr-combobox-search"
            autoComplete="off"
          />
          <div className="sr-combobox-list" role="listbox">
            {groups.length === 0 ? <p className="sr-combobox-empty">NENHUM PRODUTO ENCONTRADO.</p> : null}
            {groups.map((group) => (
              <div key={group.name} className="sr-combobox-group">
                <p>{group.name}</p>
                {[...group.subgroups.values()].map((subgroup) => (
                  <div key={`${group.name}-${subgroup.name}`} className="sr-combobox-subgroup">
                    <span>{subgroup.name}</span>
                    {subgroup.products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected={value === product.id}
                        onClick={() => {
                          onChange(product.id)
                          setOpen(false)
                          setQuery('')
                        }}
                      >
                        <strong>{product.name}</strong>
                        <small>{[product.flavorName, product.variantName, product.volumeMl ? `${product.volumeMl} ML` : '', product.active ? '' : 'INATIVO'].filter(Boolean).join(' · ')}</small>
                      </button>
                    ))}
                  </div>
                ))}
                {group.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={value === product.id}
                    onClick={() => {
                      onChange(product.id)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <strong>{product.name}</strong>
                    <small>{[product.variantName, product.active ? '' : 'INATIVO'].filter(Boolean).join(' · ')}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
