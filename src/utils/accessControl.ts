import type { AuthUser } from './api'

export type Role = AuthUser['role']
export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.update_status'
  | 'orders.cancel'
  | 'products.view'
  | 'products.create'
  | 'products.update'
  | 'inventory.view'
  | 'inventory.update'
  | 'inventory.adjust'
  | 'customers.view'
  | 'reports.view_basic'
  | 'reports.view_full'
  | 'cash.view'
  | 'cash.open'
  | 'cash.close'
  | 'cash.adjust'
  | 'users.view'
  | 'users.create'
  | 'settings.view'
  | 'settings.update'
  | 'printing.view'
  | 'printing.configure'
  | 'printing.retry'
  | 'audit.view'
  | 'security.view'
  | 'security.manage'
  | 'system.manage'
  | 'backups.view'
  | 'backups.manage'
  | 'production.view'
  | 'production.manage'

const rolePermissions: Record<Role, readonly (Permission | '*')[]> = {
  SUPER_US: ['*'],
  ADMIN: [
    'dashboard.view',
    'orders.view',
    'orders.update_status',
    'orders.cancel',
    'products.view',
    'products.create',
    'products.update',
    'inventory.view',
    'inventory.update',
    'inventory.adjust',
    'customers.view',
    'reports.view_basic',
    'reports.view_full',
    'cash.view',
    'cash.open',
    'cash.close',
    'cash.adjust',
    'printing.view',
    'printing.retry',
    'settings.view',
    'production.view',
    'production.manage',
  ],
  GERENTE: [
    'dashboard.view',
    'orders.view',
    'orders.update_status',
    'orders.cancel',
    'products.view',
    'products.update',
    'inventory.view',
    'inventory.update',
    'inventory.adjust',
    'customers.view',
    'reports.view_basic',
    'cash.view',
    'cash.open',
    'cash.close',
    'cash.adjust',
    'printing.view',
    'printing.retry',
    'settings.view',
    'production.view',
    'production.manage',
  ],
  ATENDENTE: ['dashboard.view', 'orders.view', 'orders.update_status', 'products.view', 'printing.view'],
  FUNCIONARIO: ['dashboard.view', 'orders.view', 'orders.update_status', 'products.view', 'printing.view'],
}

export function displayRole(role: Role) {
  if (role === 'SUPER_US') return 'Super Usuario'
  if (role === 'ADMIN' || role === 'GERENTE') return 'Gerente'
  return 'Funcionario'
}

export function hasPermission(user: AuthUser | null, permission: Permission) {
  if (!user) return false
  const permissions = user.permissions?.length ? user.permissions : rolePermissions[user.role]
  return permissions.includes('*') || permissions.includes(permission)
}

export function allowedTabs(user: AuthUser | null) {
  return {
    dashboard: hasPermission(user, 'dashboard.view'),
    maturidade: hasPermission(user, 'dashboard.view'),
    pedidos: hasPermission(user, 'orders.view'),
    cozinha: hasPermission(user, 'orders.view'),
    produtos: hasPermission(user, 'products.view'),
    estoque: hasPermission(user, 'inventory.view'),
    calculos: hasPermission(user, 'production.view'),
    producaoDiaria: hasPermission(user, 'production.view'),
    vendas: hasPermission(user, 'cash.view'),
    clientes: hasPermission(user, 'customers.view'),
    caixa: hasPermission(user, 'cash.view'),
    contasReceber: hasPermission(user, 'cash.view'),
    relatorios: hasPermission(user, 'reports.view_basic'),
    custosPrecos: hasPermission(user, 'products.view'),
    usuarios: hasPermission(user, 'users.view'),
    impressao: hasPermission(user, 'printing.view'),
    auditoria: hasPermission(user, 'audit.view'),
    seguranca: hasPermission(user, 'security.view'),
  }
}
