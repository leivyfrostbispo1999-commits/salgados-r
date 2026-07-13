export const roleLabels = {
  SUPER_US: 'Super Usuario',
  ADMIN: 'Gerente',
  GERENTE: 'Gerente',
  ATENDENTE: 'Funcionario',
  FUNCIONARIO: 'Funcionario',
}

export const allowedRoles = ['SUPER_US', 'ADMIN', 'GERENTE', 'ATENDENTE']

export const rolePermissions = {
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
  ATENDENTE: [
    'dashboard.view',
    'orders.view',
    'orders.update_status',
    'products.view',
    'printing.view',
  ],
  FUNCIONARIO: [
    'dashboard.view',
    'orders.view',
    'orders.update_status',
    'products.view',
    'printing.view',
  ],
}

export const permissionAliases = {
  orders: 'orders.view',
  products: 'products.update',
  stock: 'inventory.view',
  reports: 'reports.view_basic',
  users: 'users.view',
  finance: 'cash.view',
  audit: 'audit.view',
  printing: 'printing.view',
  settings: 'settings.view',
  security: 'security.view',
  production: 'production.view',
}

export function normalizeRole(role) {
  if (role === 'FUNCIONARIO') return 'ATENDENTE'
  return allowedRoles.includes(role) ? role : ''
}

export function displayRole(role) {
  return roleLabels[role] || role || 'Equipe'
}

export function permissionsFor(role) {
  return rolePermissions[role] || []
}

export function hasPermission(userOrRole, permission) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role
  if (!role) return false
  const permissions = permissionsFor(role)
  if (permissions.includes('*')) return true
  const required = permissionAliases[permission] || permission
  return permissions.includes(required)
}

export function authorizationStatus(userOrRole, permission) {
  if (!userOrRole) return 401
  return hasPermission(userOrRole, permission) ? 200 : 403
}
