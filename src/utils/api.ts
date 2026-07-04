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
  status: 'novo' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
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
  orders: number
  pendingOrders: number
  lowStockItems: number
  loyaltyCustomers: number
  topProducts: Array<{ productName: string; quantity: number; total: number }>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Erro na API.' }))
    throw new Error(payload.error ?? 'Erro na API.')
  }

  return response.json() as Promise<T>
}

export const api = {
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
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
