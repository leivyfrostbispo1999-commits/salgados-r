export function normalizeCatalogKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function slugifyCatalogName(value) {
  return normalizeCatalogKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function assertCatalogName(value, label = 'Nome') {
  const name = String(value || '').trim().replace(/\s+/g, ' ')
  if (name.length < 2) throw new Error(`${label} invalido.`)
  return name
}

export function assertNonNegativeInteger(value, label) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} invalido.`)
  return parsed
}

export function assertSubcategoryBelongsToCategory({ subcategory, categoryId }) {
  if (!subcategory) return
  if (subcategory.category_id !== categoryId) {
    throw new Error('Subcategoria nao pertence a categoria selecionada.')
  }
}

export function catalogDuplicate(items, candidateName, scope = {}) {
  const key = normalizeCatalogKey(candidateName)
  return items.find((item) => {
    const sameName = normalizeCatalogKey(item.name) === key || normalizeCatalogKey(item.slug) === key
    if (!sameName) return false
    if (scope.categoryId && item.category_id !== scope.categoryId) return false
    if (scope.ignoreId && item.id === scope.ignoreId) return false
    return true
  })
}

export function groupProductsByCatalog(products) {
  const groups = []
  const categoryMap = new Map()

  for (const product of products) {
    const categoryId = product.categoryId || product.category_id || product.category || 'sem-categoria'
    let category = categoryMap.get(categoryId)
    if (!category) {
      category = {
        id: categoryId,
        name: product.categoryName || product.category_name || product.category || 'Sem categoria',
        sortOrder: Number(product.categorySortOrder || product.category_sort_order || 0),
        subcategories: [],
        products: [],
      }
      categoryMap.set(categoryId, category)
      groups.push(category)
    }

    const subcategoryId = product.subcategoryId || product.subcategory_id || ''
    if (subcategoryId) {
      let subcategory = category.subcategories.find((item) => item.id === subcategoryId)
      if (!subcategory) {
        subcategory = {
          id: subcategoryId,
          name: product.subcategoryName || product.subcategory_name || 'Sem subcategoria',
          sortOrder: Number(product.subcategorySortOrder || product.subcategory_sort_order || 0),
          products: [],
        }
        category.subcategories.push(subcategory)
      }
      subcategory.products.push(product)
    } else {
      category.products.push(product)
    }
  }

  const sortProducts = (a, b) => Number(a.sortOrder || a.sort_order || 0) - Number(b.sortOrder || b.sort_order || 0) || a.name.localeCompare(b.name)
  groups.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  for (const category of groups) {
    category.products.sort(sortProducts)
    category.subcategories.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    for (const subcategory of category.subcategories) subcategory.products.sort(sortProducts)
  }

  return groups
}
