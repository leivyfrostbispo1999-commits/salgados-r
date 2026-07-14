export type ApiProduct = {
  id: string
  name: string
  description: string
  category: string
  availability: 'delivery' | 'presencial' | 'ambos'
  priceCents: number
  price: number
  featured: boolean
  deliveryEnabled: boolean
  pickupEnabled: boolean
  dineInOnly: boolean
  stockControlled: boolean
  sortOrder: number
  active: boolean
}

export type ApiOrderItem = {
  id: string
  productId: string
  productName: string
  unitPriceCents: number
  unitPrice: number
  quantity: number
  totalCents: number
  total: number
  notes: string
}

export type ApiOrder = {
  id: string
  orderNumber: number | null
  customerName: string
  phone: string
  address: string
  number: string
  complement: string
  reference: string
  neighborhood: string
  channel: string
  paymentMethod: 'pix' | 'dinheiro' | 'cartao'
  changeFor: number | null
  notes: string
  status: 'RECEBIDO' | 'ACEITO' | 'PREPARANDO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'FINALIZADO' | 'CANCELADO'
  totalCents: number
  total: number
  subtotal: number
  deliveryFee: number
  createdAt: string
  updatedAt: string
  items: ApiOrderItem[]
}

export type StockItem = {
  id: string
  name: string
  unit: string
  quantity: number
  minQuantity: number
  low: boolean
}

export type ReportSummary = {
  today: string
  revenue: number
  monthRevenue: number
  orders: number
  finalizedOrders: number
  averageTicket: number
  pendingOrders: number
  deliveredOrders: number
  canceledOrders: number
  lowStockItems: number
  loyaltyCustomers: number
  paymentMethods: Array<{ method: string; quantity: number; total: number }>
  topProducts: Array<{ productName: string; quantity: number; total: number }>
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'SUPER_US' | 'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'FUNCIONARIO'
  displayRole?: string
  permissions?: string[]
  active?: boolean
  createdAt?: string
}

export type FinanceSummary = {
  revenue: number
  expenses: number
  estimatedProfit: number
  openSession: unknown | null
  byMethod: Array<{ method: string; total: number }>
}

export type DeliverySettings = {
  delivery_enabled: boolean
  delivery_fee_default: number
  delivery_notes: string
  updatedAt?: string
}

export type PrintStatus = {
  mode: string
  configured: boolean
  message: string
  pending: number
  failed: number
}

export type SecurityStatus = {
  api: string
  database: string
  auth: string
  cors: string
  loginRateLimit: string
  recentLoginFailures: unknown[]
}

export type ProductionUnit = 'unidade' | 'litro' | 'ml' | 'cento' | 'pacote' | 'kg' | 'g'
export type ProductionRoundingMode = 'proporcional' | 'cima' | 'baixo'

export type ProductionForecastItem = {
  id?: string
  forecastId?: string
  productId: string | null
  customName: string
  category: string
  unit: ProductionUnit
  quantity: number
  salePriceCents: number
  salePrice?: number
  estimatedUnitCostCents: number | null
  estimatedUnitCost?: number | null
  notes: string
  sortOrder: number
  revenueCents?: number
  revenue?: number
  costCents?: number | null
  cost?: number | null
  profitCents?: number | null
  profit?: number | null
  marginPercent?: number | null
  bottleEquivalent?: number | null
  bottleNote?: string
}

export type ProductionForecastSummary = {
  revenueTotalCents: number
  revenueTotal: number
  costTotalCents: number
  costTotal: number
  profitTotalCents: number
  profitTotal: number
  marginPercent: number | null
  totalUnits: number
  totalMl: number
  totalLiters: number
  itemsCount: number
  missingCostCount: number
  byCategory: Array<{
    category: string
    revenueTotalCents: number
    revenueTotal: number
    costTotalCents: number
    costTotal: number
    profitTotalCents: number
    profitTotal: number
    quantity: number
    itemsCount: number
    missingCostCount: number
  }>
  importantItems: ProductionForecastItem[]
  items: ProductionForecastItem[]
}

export type ProductionForecast = {
  id: string
  name: string
  weekday: string
  dateReference: string | null
  scenario: string
  notes: string
  roundingMode: ProductionRoundingMode
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
  items: ProductionForecastItem[]
  summary: ProductionForecastSummary
}

export type ProductionItemTemplate = {
  id: string
  name: string
  category: string
  unit: ProductionUnit
  defaultSalePriceCents: number
  defaultSalePrice: number
  defaultEstimatedUnitCostCents: number | null
  defaultEstimatedUnitCost: number | null
  productId: string | null
  active: boolean
}

const tokenStore = {
  get: () => localStorage.getItem('salgados-r-token') || '',
  set: (token: string) => localStorage.setItem('salgados-r-token', token),
  clear: () => localStorage.removeItem('salgados-r-token'),
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get()
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Erro na API.' }))
    throw new Error(payload.error ?? 'Erro na API.')
  }

  return response.json() as Promise<T>
}

export const api = {
  token: tokenStore,
  authStatus: () => request<{ hasUsers: boolean; roles: string[] }>('/auth/status'),
  login: async (payload: { email: string; password: string }) => {
    const result = await request<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    tokenStore.set(result.token)
    return result
  },
  bootstrap: async (payload: { name: string; email: string; password: string }) => {
    const result = await request<{ user: AuthUser; token: string }>('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    tokenStore.set(result.token)
    return result
  },
  me: () => request<AuthUser>('/auth/me'),
  users: () => request<AuthUser[]>('/users'),
  createUser: (payload: { name: string; email: string; password: string; role: AuthUser['role'] }) =>
    request<AuthUser>('/users', { method: 'POST', body: JSON.stringify(payload) }),
  products: () => request<ApiProduct[]>('/products'),
  publicProducts: () => request<ApiProduct[]>('/products/public'),
  createProduct: (payload: {
    name: string
    description?: string
    category: string
    availability: string
    priceCents: number
    active?: boolean
    featured?: boolean
    deliveryEnabled?: boolean
    pickupEnabled?: boolean
    dineInOnly?: boolean
    stockControlled?: boolean
    sortOrder?: number
  }) => request<ApiProduct>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: Partial<ApiProduct> & { priceCents?: number }) =>
    request<ApiProduct>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  orders: () => request<ApiOrder[]>('/orders'),
  createOrder: (payload: {
    customerName: string
    phone: string
    address?: string
    number?: string
    complement?: string
    reference?: string
    neighborhood?: string
    channel: string
    paymentMethod?: string
    changeFor?: string
    notes: string
    items: Array<{ productId: string; quantity: number; notes?: string }>
  }) => request<ApiOrder>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id: string, status: ApiOrder['status'], expectedUpdatedAt?: string) =>
    request<ApiOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, expectedUpdatedAt }) }),
  stock: () => request<StockItem[]>('/stock'),
  createStockItem: (payload: { name: string; unit: string; quantity: number; minQuantity: number }) =>
    request<StockItem>('/inventory', { method: 'POST', body: JSON.stringify(payload) }),
  moveStock: (id: string, payload: { type: 'entrada' | 'saida' | 'ajuste'; quantity: number; reason?: string }) =>
    request<StockItem>(`/inventory/${id}/movement`, { method: 'POST', body: JSON.stringify(payload) }),
  updateStock: (id: string, payload: { quantity: number; minQuantity: number }) =>
    request<StockItem>(`/stock/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  summary: () => request<ReportSummary>('/reports/summary'),
  cashCurrent: () => request<{ openSession: unknown | null; movements: unknown[] }>('/cash/current'),
  cashOpen: (payload: { openingAmountCents: number }) =>
    request<unknown>('/cash/open', { method: 'POST', body: JSON.stringify(payload) }),
  cashClose: (payload: { closingAmountCents: number }) =>
    request<unknown>('/cash/close', { method: 'POST', body: JSON.stringify(payload) }),
  cashMovement: (payload: { type: 'entrada' | 'saida'; amountCents: number; paymentMethod: string; description: string }) =>
    request<unknown>('/cash/movements', { method: 'POST', body: JSON.stringify(payload) }),
  cashExpense: (payload: { description: string; amountCents: number }) =>
    request<unknown>('/cash/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  customers: () => request<unknown[]>('/customers'),
  auditLogs: () => request<unknown[]>('/audit-logs'),
  financeSummary: () => request<FinanceSummary>('/finance/summary'),
  printStatus: () => request<PrintStatus>('/printing/status'),
  testPrint: () => request<unknown>('/printing/test', { method: 'POST', body: JSON.stringify({}) }),
  notifications: () => request<unknown[]>('/notifications'),
  backupsStatus: () => request<unknown>('/backups/status'),
  securityStatus: () => request<SecurityStatus>('/security/status'),
  productionForecasts: () => request<ProductionForecast[]>('/admin/production-forecasts'),
  productionForecast: (id: string) => request<ProductionForecast>(`/admin/production-forecasts/${id}`),
  createProductionForecast: (payload: Partial<ProductionForecast> & { items: ProductionForecastItem[] }) =>
    request<ProductionForecast>('/admin/production-forecasts', { method: 'POST', body: JSON.stringify(payload) }),
  updateProductionForecast: (id: string, payload: Partial<ProductionForecast> & { items?: ProductionForecastItem[] }) =>
    request<ProductionForecast>(`/admin/production-forecasts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProductionForecast: (id: string) =>
    request<{ ok: boolean }>(`/admin/production-forecasts/${id}`, { method: 'DELETE' }),
  duplicateProductionForecast: (id: string, payload: { name?: string; weekday?: string; dateReference?: string | null }) =>
    request<ProductionForecast>(`/admin/production-forecasts/${id}/duplicate`, { method: 'POST', body: JSON.stringify(payload) }),
  productionTemplates: () => request<ProductionItemTemplate[]>('/admin/production-item-templates'),
  settings: () => request<{ delivery?: DeliverySettings }>('/settings'),
  updateSettings: (payload: { delivery: DeliverySettings }) =>
    request<{ delivery?: DeliverySettings }>('/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
