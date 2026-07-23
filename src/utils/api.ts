export type ApiProduct = {
  id: string
  name: string
  description: string
  category: string
  categoryId: string | null
  categoryName: string
  categorySlug: string
  categorySortOrder: number
  subcategoryId: string | null
  subcategoryName: string
  subcategorySortOrder: number
  flavorId: string | null
  flavorName: string
  variantId: string | null
  variantName: string
  availability: 'delivery' | 'presencial' | 'ambos'
  priceCents: number
  price: number
  imageUrl: string
  unit: string
  volumeMl: number | null
  featured: boolean
  deliveryEnabled: boolean
  pickupEnabled: boolean
  dineInOnly: boolean
  establishmentOnly: boolean
  showPublic: boolean
  availableForSale: boolean
  availableForProduction: boolean
  stockControlled: boolean
  sortOrder: number
  active: boolean
  archivedAt: string | null
}

export type CatalogCategory = {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  sortOrder: number
  active: boolean
  showPublic: boolean
  showAdmin: boolean
  archivedAt: string | null
  productsCount: number
  activeProductsCount: number
  historicalProductsCount: number
  subcategoriesCount: number
}

export type CatalogSubcategory = {
  id: string
  categoryId: string
  categoryName: string
  name: string
  slug: string
  description: string
  sortOrder: number
  active: boolean
  showPublic: boolean
  showAdmin: boolean
  archivedAt: string | null
  productsCount: number
  activeProductsCount: number
}

export type CatalogFlavor = {
  id: string
  name: string
  slug: string
  description: string
  sortOrder: number
  active: boolean
}

export type CatalogVariant = {
  id: string
  name: string
  slug: string
  unit: string
  volumeMl: number | null
  sortOrder: number
  active: boolean
}

export type CatalogPayload = {
  categories: CatalogCategory[]
  subcategories: CatalogSubcategory[]
  flavors: CatalogFlavor[]
  variants: CatalogVariant[]
  products: ApiProduct[]
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

export type ManagementSummary = {
  filters: { startDate: string; endDate: string; category?: string; productId?: string; paymentMethod?: string }
  producedQuantity: number
  lostQuantity: number
  internalUseQuantity: number
  producedVolumeMl: number
  soldQuantity: number
  expectedRevenueCents: number
  expectedRevenue: number
  receivedCents: number
  received: number
  pix: number
  card: number
  cash: number
  pending: number
  refunds: number
  cost: number
  expenses: number
  missingCostCount: number
  grossProfit: number | null
  estimatedResult: number | null
  costCoveragePercent: number
  profitStatus: 'CALCULAVEL' | 'LUCRO_INDISPONIVEL'
}

export type ManagementSale = {
  id: string
  saleCode: string
  saleDate: string
  customerName: string
  total: number
  paid: number
  debt: number
  financialStatus: string
  status: string
}

export type ManagementReceivable = {
  id: string
  customer_name: string
  originalAmount: number
  paidAmount: number
  outstandingAmount: number
  due_date: string | null
  status: string
}

export type ManagementCostProduct = ApiProduct & {
  unit: string
  currentCostCents: number | null
  currentCost: number | null
  grossMarginPercent: number | null
  profitStatus: 'CALCULAVEL' | 'LUCRO_INDISPONIVEL'
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
    if (response.status === 401) tokenStore.clear()
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
    categoryId?: string | null
    subcategoryId?: string | null
    flavorId?: string | null
    variantId?: string | null
    availability: string
    priceCents: number
    unit?: string
    volumeMl?: number | null
    showPublic?: boolean
    availableForSale?: boolean
    availableForProduction?: boolean
    establishmentOnly?: boolean
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
  catalog: () => request<CatalogPayload>('/admin/catalog'),
  createCatalogCategory: (payload: Partial<CatalogCategory> & { name: string }) =>
    request<CatalogCategory>('/admin/catalog/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogCategory: (id: string, payload: Partial<CatalogCategory>) =>
    request<CatalogCategory>(`/admin/catalog/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveCatalogCategory: (id: string) =>
    request<CatalogCategory>(`/admin/catalog/categories/${id}/archive`, { method: 'POST' }),
  restoreCatalogCategory: (id: string) =>
    request<CatalogCategory>(`/admin/catalog/categories/${id}/restore`, { method: 'POST' }),
  createCatalogSubcategory: (payload: Partial<CatalogSubcategory> & { categoryId: string; name: string }) =>
    request<CatalogSubcategory>('/admin/catalog/subcategories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogSubcategory: (id: string, payload: Partial<CatalogSubcategory>) =>
    request<CatalogSubcategory>(`/admin/catalog/subcategories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveCatalogSubcategory: (id: string) =>
    request<CatalogSubcategory>(`/admin/catalog/subcategories/${id}/archive`, { method: 'POST' }),
  restoreCatalogSubcategory: (id: string) =>
    request<CatalogSubcategory>(`/admin/catalog/subcategories/${id}/restore`, { method: 'POST' }),
  createCatalogFlavor: (payload: Partial<CatalogFlavor> & { name: string }) =>
    request<CatalogFlavor>('/admin/catalog/flavors', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogFlavor: (id: string, payload: Partial<CatalogFlavor>) =>
    request<CatalogFlavor>(`/admin/catalog/flavors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createCatalogVariant: (payload: Partial<CatalogVariant> & { name: string }) =>
    request<CatalogVariant>('/admin/catalog/variants', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogVariant: (id: string, payload: Partial<CatalogVariant>) =>
    request<CatalogVariant>(`/admin/catalog/variants/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createCatalogProduct: (payload: Partial<ApiProduct> & { name: string; categoryId: string; availability: string; priceCents: number }) =>
    request<ApiProduct>('/admin/catalog/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogProduct: (id: string, payload: Partial<ApiProduct> & { priceCents?: number }) =>
    request<ApiProduct>(`/admin/catalog/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveCatalogProduct: (id: string) =>
    request<ApiProduct>(`/admin/catalog/products/${id}/archive`, { method: 'POST' }),
  restoreCatalogProduct: (id: string) =>
    request<ApiProduct>(`/admin/catalog/products/${id}/restore`, { method: 'POST' }),
  uploadCatalogProductImage: async (id: string, file: File) => {
    const response = await fetch(`/api/admin/catalog/products/${id}/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStore.get()}`,
        'Content-Type': file.type,
      },
      body: file,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Erro ao enviar imagem.' }))
      throw new Error(payload.error ?? 'Erro ao enviar imagem.')
    }
    return response.json() as Promise<ApiProduct>
  },
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
  managementSummary: (params: URLSearchParams) => request<ManagementSummary>(`/management/reports/summary?${params.toString()}`),
  managementProductsReport: (params: URLSearchParams) => request<unknown[]>(`/management/reports/products?${params.toString()}`),
  managementProduction: (params: URLSearchParams) => request<unknown[]>(`/management/production?${params.toString()}`),
  createManagementProduction: (payload: unknown) =>
    request<unknown>('/management/production', { method: 'POST', body: JSON.stringify(payload) }),
  managementSales: (params: URLSearchParams) => request<ManagementSale[]>(`/management/sales?${params.toString()}`),
  createManagementSale: (payload: unknown) =>
    request<ManagementSale>('/management/sales', { method: 'POST', body: JSON.stringify(payload) }),
  cancelManagementSale: (id: string, payload: { reason: string }) =>
    request<ManagementSale>(`/management/sales/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  refundManagementSale: (id: string, payload: { reason: string; method: string }) =>
    request<ManagementSale>(`/management/sales/${id}/refund`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelManagementProduction: (id: string, payload: { reason: string }) =>
    request<unknown>(`/management/production/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  managementReceivables: () => request<ManagementReceivable[]>('/management/receivables'),
  payManagementReceivable: (id: string, payload: { amountCents: number; paymentMethod: string; notes?: string }) =>
    request<unknown>(`/management/receivables/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) }),
  managementCostProducts: () => request<ManagementCostProduct[]>('/management/costs-prices/products'),
  updateManagementCostProduct: (id: string, payload: { priceCents?: number; costCents?: number | null; unit?: string; notes?: string }) =>
    request<ApiProduct>(`/management/costs-prices/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  managementPdfUrl: '/api/management/reports/pdf',
  managementCsvUrl: (params: URLSearchParams) => `/api/management/reports.csv?${params.toString()}`,
  settings: () => request<{ delivery?: DeliverySettings }>('/settings'),
  updateSettings: (payload: { delivery: DeliverySettings }) =>
    request<{ delivery?: DeliverySettings }>('/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
