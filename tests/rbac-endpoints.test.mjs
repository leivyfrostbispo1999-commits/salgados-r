import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')

function expectRouteAuth(pathSnippet, permission) {
  const escaped = pathSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`app\\.(?:get|post|patch|delete)\\([^\\n]*${escaped}[^\\n]*auth\\('${permission}'\\)`)
  assert.match(source, pattern, `${pathSnippet} should require ${permission}`)
}

describe('RBAC endpoint declarations', () => {
  it('keeps public catalog public and internal catalog protected', () => {
    assert.match(source, /app\.get\('\/api\/products\/public', async/)
    expectRouteAuth('/api/products', 'products.view')
  })

  it('protects security, audit, backups and users with sensitive permissions', () => {
    expectRouteAuth('/api/security/status', 'security')
    expectRouteAuth('/api/audit-logs', 'audit')
    expectRouteAuth('/api/backups/status', 'backups.view')
    expectRouteAuth('/api/users', 'users')
    expectRouteAuth('/api/users', 'users.create')
  })

  it('protects product mutation endpoints with mutation permissions', () => {
    expectRouteAuth('/api/products', 'products.create')
    expectRouteAuth('/api/products/:id', 'products.update')
    expectRouteAuth('/api/products/:id/availability', 'products.update')
  })

  it('protects order cancellation with cancel permission', () => {
    expectRouteAuth('/api/orders/:id/status', 'orders.update_status')
    expectRouteAuth('/api/orders/:id/cancel', 'orders.cancel')
  })

  it('keeps order status transitions centralized and conflict-aware', () => {
    assert.match(source, /function canTransitionOrderStatus/)
    assert.match(source, /orderStatusTransitions/)
    assert.match(source, /expectedUpdatedAt/)
    assert.match(source, /res\.status\(409\)\.json\(\{ error: 'O pedido foi atualizado por outro operador/)
  })

  it('protects cash, stock and production mutations', () => {
    expectRouteAuth('/api/inventory', 'inventory.adjust')
    expectRouteAuth('/api/inventory/:id', 'inventory.update')
    expectRouteAuth('/api/inventory/:id/movement', 'inventory.adjust')
    expectRouteAuth('/api/cash/movements', 'cash.adjust')
    expectRouteAuth('/api/cash/expenses', 'cash.adjust')
    expectRouteAuth('/api/admin/production-forecasts', 'production.manage')
  })

  it('protects management financial endpoints', () => {
    expectRouteAuth('/api/management/production', 'production')
    expectRouteAuth('/api/management/production', 'production.manage')
    expectRouteAuth('/api/management/production/:id/cancel', 'production.manage')
    expectRouteAuth('/api/management/sales', 'cash.view')
    expectRouteAuth('/api/management/sales', 'cash.adjust')
    expectRouteAuth('/api/management/sales/:id/cancel', 'cash.adjust')
    expectRouteAuth('/api/management/sales/:id/refund', 'cash.adjust')
    expectRouteAuth('/api/management/receivables', 'cash.view')
    expectRouteAuth('/api/management/receivables/:id/payments', 'cash.adjust')
    expectRouteAuth('/api/management/reports/pdf', 'reports')
  })

  it('audits denied permission attempts in the auth middleware', () => {
    assert.match(source, /audit\(req, 'denied', 'permission', permission/)
  })
})
