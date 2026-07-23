import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertSubcategoryBelongsToCategory,
  catalogDuplicate,
  groupProductsByCatalog,
  normalizeCatalogKey,
  slugifyCatalogName,
} from '../server/catalog-domain.js'
import { readFileSync } from 'node:fs'

test('normaliza nomes equivalentes para detectar duplicidade de catalogo', () => {
  assert.equal(normalizeCatalogKey('  SALGADOS  '), 'salgados')
  assert.equal(normalizeCatalogKey('Calabrésa'), 'calabresa')
  assert.equal(slugifyCatalogName('Suco de Goiaba 300 ml'), 'suco-de-goiaba-300-ml')
  assert.ok(catalogDuplicate([{ id: '1', name: 'Salgados', slug: 'salgados' }], ' salgados '))
})

test('impede subcategoria de outra categoria', () => {
  assert.doesNotThrow(() => assertSubcategoryBelongsToCategory({ subcategory: { category_id: 'sucos' }, categoryId: 'sucos' }))
  assert.throws(
    () => assertSubcategoryBelongsToCategory({ subcategory: { category_id: 'sucos' }, categoryId: 'salgados' }),
    /Subcategoria nao pertence/,
  )
})

test('agrupa produtos dinamicamente por categoria e subcategoria', () => {
  const groups = groupProductsByCatalog([
    { id: '1', name: 'Pastel de Carne', categoryId: 'salgados', categoryName: 'Salgados', subcategoryId: 'pasteis', subcategoryName: 'Pasteis', sortOrder: 2 },
    { id: '2', name: 'Coxinha', categoryId: 'salgados', categoryName: 'Salgados', subcategoryId: 'outros', subcategoryName: 'Outros salgados', sortOrder: 1 },
    { id: '3', name: 'Suco de Acerola', categoryId: 'sucos', categoryName: 'Sucos', subcategoryId: 'acerola', subcategoryName: 'Acerola', sortOrder: 1 },
  ])
  assert.equal(groups.length, 2)
  assert.equal(groups[0].name, 'Salgados')
  assert.equal(groups[0].subcategories.length, 2)
  assert.equal(groups[1].subcategories[0].name, 'Acerola')
})

test('login preserva email e senha sem uppercase visual nem normalizacao de senha no frontend', () => {
  const source = readFileSync('src/components/OperationsSuite.tsx', 'utf8')
  const css = readFileSync('src/index.css', 'utf8')
  assert.match(source, /autoCapitalize="none"/)
  assert.match(source, /autoComplete="username"/)
  assert.match(source, /autoComplete="current-password"/)
  assert.doesNotMatch(source, /password\.toUpperCase|password\.toLowerCase|password\.trim/)
  assert.match(css, /\.sr-admin-auth-form input[\s\S]*text-transform: none;/)
})

test('endpoints administrativos do catalogo exigem RBAC no backend', () => {
  const server = readFileSync('server/index.js', 'utf8')
  for (const route of [
    '/api/admin/catalog',
    '/api/admin/catalog/categories',
    '/api/admin/catalog/subcategories',
    '/api/admin/catalog/flavors',
    '/api/admin/catalog/variants',
    '/api/admin/catalog/products',
  ]) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(server, new RegExp(`['"]${escaped}[^'"]*['"], auth\\('products\\.`))
  }
})

test('upload de imagem de produto e persistido e validado', () => {
  const server = readFileSync('server/index.js', 'utf8')
  const compose = readFileSync('docker-compose.yml', 'utf8')
  assert.match(server, /\/api\/admin\/catalog\/products\/:id\/image'[\s\S]*auth\('products\.update'\)/)
  assert.match(server, /express\.raw\(\{ type: \['image\/png', 'image\/jpeg', 'image\/webp'\], limit: '2mb' \}\)/)
  assert.match(server, /Formato de imagem nao permitido/)
  assert.match(compose, /salgados-r-uploads:\/app\/uploads/)
  assert.match(compose, /salgados-r-uploads:\/usr\/share\/nginx\/html\/uploads:ro/)
})
