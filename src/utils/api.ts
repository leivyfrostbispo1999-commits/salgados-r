export type ApiProduct = {
  id: string
  name: string
  category: string
  availability: 'delivery' | 'presencial' | 'ambos'
  priceCents: number
  price: number
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
}

export type ApiOrder = {
  id: string
  customerName: string
  phone: string
  channel: string
  notes: string
  status: 'RECEBIDO' | 'ACEITO' | 'PREPARANDO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'FINALIZADO' | 'CANCELADO'
  totalCents: number
  total: number
  createdAt: string
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
  role: 'SUPER_US' | 'ADMIN' | 'GERENTE' | 'ATENDENTE'
}

export type FinanceSummary = {
  revenue: number
  expenses: number
  estimatedProfit: number
  openSession: unknown | null
  byMethod: Array<{ method: string; total: number }>
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
  products: () => request<ApiProduct[]>('/products'),
  createProduct: (payload: {
    name: string
    category: string
    availability: string
    priceCents: number
  }) => request<ApiProduct>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  orders: () => request<ApiOrder[]>('/orders'),
  createOrder: (payload: {
    customerName: string
    phone: string
    channel: string
    notes: string
    items: Array<{ productId: string; quantity: number }>
  }) => request<ApiOrder>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id: string, status: ApiOrder['status']) =>
    request<ApiOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  stock: () => request<StockItem[]>('/stock'),
  updateStock: (id: string, payload: { quantity: number; minQuantity: number }) =>
    request<StockItem>(`/stock/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  summary: () => request<ReportSummary>('/reports/summary'),
  customers: () => request<unknown[]>('/customers'),
  auditLogs: () => request<unknown[]>('/audit-logs'),
  financeSummary: () => request<FinanceSummary>('/finance/summary'),
  printStatus: () => request<PrintStatus>('/printing/status'),
  testPrint: () => request<unknown>('/printing/test', { method: 'POST', body: JSON.stringify({}) }),
  notifications: () => request<unknown[]>('/notifications'),
  backupsStatus: () => request<unknown>('/backups/status'),
  securityStatus: () => request<SecurityStatus>('/security/status'),
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
