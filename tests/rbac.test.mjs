import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  authorizationStatus,
  displayRole,
  hasPermission,
  normalizeRole,
  permissionsFor,
} from '../server/access-control.js'

const roles = ['SUPER_US', 'ADMIN', 'GERENTE', 'ATENDENTE', 'FUNCIONARIO']

describe('RBAC role compatibility', () => {
  it('normalizes public FUNCIONARIO to the legacy ATENDENTE database role', () => {
    assert.equal(normalizeRole('FUNCIONARIO'), 'ATENDENTE')
    assert.equal(normalizeRole('ATENDENTE'), 'ATENDENTE')
  })

  it('keeps ADMIN and ATENDENTE legacy roles visually compatible', () => {
    assert.equal(displayRole('ADMIN'), 'Gerente')
    assert.equal(displayRole('ATENDENTE'), 'Funcionario')
    assert.equal(displayRole('FUNCIONARIO'), 'Funcionario')
  })

  it('has a permission matrix for every supported role', () => {
    for (const role of roles) {
      assert.ok(permissionsFor(role).length > 0, `${role} should have declared permissions`)
    }
  })
})

describe('RBAC matrix', () => {
  it('allows SUPER_US to access security, audit, backups and users', () => {
    for (const permission of ['security.view', 'audit.view', 'backups.view', 'users.view', 'users.create']) {
      assert.equal(hasPermission('SUPER_US', permission), true, permission)
      assert.equal(authorizationStatus({ role: 'SUPER_US' }, permission), 200, permission)
    }
  })

  it('blocks GERENTE and ADMIN legacy from sensitive security areas', () => {
    for (const role of ['GERENTE', 'ADMIN']) {
      for (const permission of ['security.view', 'audit.view', 'backups.view', 'users.view', 'users.create']) {
        assert.equal(hasPermission(role, permission), false, `${role} ${permission}`)
        assert.equal(authorizationStatus({ role }, permission), 403, `${role} ${permission}`)
      }
    }
  })

  it('allows GERENTE and ADMIN legacy to operate approved modules', () => {
    for (const role of ['GERENTE', 'ADMIN']) {
      for (const permission of ['orders.view', 'orders.update_status', 'products.view', 'inventory.view', 'cash.view', 'printing.view']) {
        assert.equal(hasPermission(role, permission), true, `${role} ${permission}`)
      }
    }
  })

  it('blocks FUNCIONARIO and ATENDENTE legacy from financial and administrative actions', () => {
    for (const role of ['FUNCIONARIO', 'ATENDENTE']) {
      for (const permission of [
        'security.view',
        'audit.view',
        'backups.view',
        'users.view',
        'users.create',
        'reports.view_basic',
        'reports.view_full',
        'cash.view',
        'cash.close',
        'inventory.adjust',
        'products.update',
        'products.create',
        'settings.update',
      ]) {
        assert.equal(hasPermission(role, permission), false, `${role} ${permission}`)
        assert.equal(authorizationStatus({ role }, permission), 403, `${role} ${permission}`)
      }
    }
  })

  it('allows FUNCIONARIO and ATENDENTE legacy only for operational basics', () => {
    for (const role of ['FUNCIONARIO', 'ATENDENTE']) {
      for (const permission of ['dashboard.view', 'orders.view', 'orders.update_status', 'products.view', 'printing.view']) {
        assert.equal(hasPermission(role, permission), true, `${role} ${permission}`)
      }
    }
  })
})

describe('RBAC request status helper', () => {
  it('returns 401 when no authenticated user exists', () => {
    assert.equal(authorizationStatus(null, 'security.view'), 401)
    assert.equal(authorizationStatus(undefined, 'orders.view'), 401)
  })

  it('does not trust a role sent separately from the authenticated user object', () => {
    const forgedBody = { role: 'SUPER_US' }
    const authenticatedUser = { role: 'ATENDENTE', body: forgedBody }
    assert.equal(authorizationStatus(authenticatedUser, 'security.view'), 403)
  })
})
