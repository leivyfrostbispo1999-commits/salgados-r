import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { allowedRoles, displayRole, hasPermission, normalizeRole, permissionsFor } from './access-control.js'
import {
  calculatePaymentTotals,
  calculateRefillCents,
  calculateCostCoverage,
  csvSafe,
  deriveReceivableStatus,
  financialStatusFor,
  grossProfitStatus,
  receivablePaymentMethods,
  saleStatuses,
  toCents,
  toQuantity,
  volumeRoundingModes,
} from './management-domain.js'

const { Pool } = pg
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-this-secret'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'salgadosr',
  user: process.env.PGUSER || 'salgadosr',
  password: process.env.PGPASSWORD || 'salgadosr',
})

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  const allowedOrigin = process.env.APP_ORIGIN || 'https://salgadosr.duckdns.org'
  const origin = req.headers.origin
  if (!origin || origin === allowedOrigin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

const loginAttempts = new Map()

function rateLimitLogin(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = loginAttempts.get(key) || { count: 0, firstAt: now, blockedUntil: 0 }
  if (entry.blockedUntil > now) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' })
  }
  if (now - entry.firstAt > 15 * 60 * 1000) {
    entry.count = 0
    entry.firstAt = now
  }
  entry.count += 1
  if (entry.count > 8) entry.blockedUntil = now + 10 * 60 * 1000
  loginAttempts.set(key, entry)
  next()
}

const productsSeed = [
  ['pastel-carne', 'Pastel de Carne', 'pasteis', 'ambos', 500, 'Pastel crocante com recheio de carne bem temperada.', true],
  ['pastel-frango', 'Pastel de Frango', 'pasteis', 'ambos', 500, 'Frango suculento em massa sequinha e dourada.', false],
  ['pastel-misto', 'Pastel Misto', 'pasteis', 'ambos', 500, 'Queijo com presunto em uma combinacao classica.', false],
  ['pastel-calabresa-queijo', 'Pastel de Calabresa com Queijo', 'pasteis', 'ambos', 600, 'Calabresa marcante com queijo derretido.', true],
  ['pastel-frango-queijo', 'Pastel de Frango com Queijo', 'pasteis', 'ambos', 700, 'Frango temperado com queijo cremoso.', false],
  ['coxinha', 'Coxinha', 'salgados', 'ambos', 400, 'Massa macia, casquinha crocante e recheio caprichado.', true],
  ['enroladinho', 'Enroladinho', 'salgados', 'ambos', 400, 'Salgado pratico, dourado e perfeito para qualquer hora.', true],
  ['suco-goiaba-pequeno', 'Suco de Goiaba pequeno - copo', 'sucos', 'presencial', 200, 'Vendido apenas para consumo no estabelecimento.', false],
  ['suco-goiaba-grande', 'Suco de Goiaba grande - copo', 'sucos', 'presencial', 400, 'Vendido apenas para consumo no estabelecimento.', false],
  ['suco-maracuja-pequeno', 'Suco de Maracuja pequeno - copo', 'sucos', 'presencial', 200, 'Vendido apenas para consumo no estabelecimento.', false],
  ['suco-maracuja-grande', 'Suco de Maracuja grande - copo', 'sucos', 'presencial', 400, 'Vendido apenas para consumo no estabelecimento.', false],
  ['suco-natural-garrafinha-300ml', 'Suco Natural na Garrafinha 300 ml', 'sucos', 'delivery', 400, 'Unica opcao de suco para delivery. Sabores: goiaba e maracuja.', true],
  ['refil-suco-100ml', 'Refil de Suco - 100 ml', 'refil', 'presencial', 100, 'R$ 1,00 a cada 100 ml. Traga sua garrafa ou devolva a nossa.', false],
]

const stockSeed = [
  ['Massa de pastel', 'un', 80, 20],
  ['Recheio de carne', 'porcao', 45, 15],
  ['Recheio de frango', 'porcao', 45, 15],
  ['Calabresa', 'porcao', 25, 10],
  ['Queijo', 'porcao', 40, 15],
  ['Coxinha pronta', 'un', 60, 20],
  ['Enroladinho pronto', 'un', 60, 20],
  ['Garrafinha 300 ml', 'un', 90, 25],
  ['Polpa de goiaba', 'litro', 8, 3],
  ['Polpa de maracuja', 'litro', 8, 3],
]

const orderStatuses = ['RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'FINALIZADO', 'CANCELADO']
const terminalOrderStatuses = ['FINALIZADO', 'CANCELADO']
const orderStatusTransitions = {
  RECEBIDO: ['ACEITO', 'PREPARANDO', 'CANCELADO'],
  ACEITO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['SAIU_PARA_ENTREGA', 'FINALIZADO', 'CANCELADO'],
  SAIU_PARA_ENTREGA: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
}

function canTransitionOrderStatus({ currentStatus, nextStatus, user }) {
  if (!orderStatuses.includes(nextStatus)) {
    return { allowed: false, status: 400, error: 'Status invalido.' }
  }
  if (terminalOrderStatuses.includes(currentStatus)) {
    return { allowed: false, status: 409, error: 'Pedido encerrado nao pode voltar para a fila operacional.' }
  }
  if (nextStatus === 'CANCELADO' && !hasPermission(user, 'orders.cancel')) {
    return { allowed: false, status: 403, error: 'Permissao insuficiente para cancelar pedido.' }
  }
  if (!orderStatusTransitions[currentStatus]?.includes(nextStatus)) {
    return { allowed: false, status: 409, error: `Transicao nao permitida: ${currentStatus} para ${nextStatus}.` }
  }
  return { allowed: true }
}

function money(cents) {
  return Number(cents || 0) / 100
}

function productDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    availability: row.availability,
    priceCents: row.price_cents,
    price: money(row.price_cents),
    featured: Boolean(row.featured),
    deliveryEnabled: Boolean(row.delivery_enabled),
    pickupEnabled: Boolean(row.pickup_enabled),
    dineInOnly: Boolean(row.dine_in_only),
    stockControlled: Boolean(row.stock_controlled),
    sortOrder: Number(row.sort_order || 0),
    active: row.active,
  }
}

const productionUnits = ['unidade', 'litro', 'ml', 'cento', 'pacote', 'kg', 'g']
const productionRoundingModes = ['proporcional', 'cima', 'baixo']

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

function safeNonNegative(value, fallback = 0) {
  return Math.max(0, safeNumber(value, fallback))
}

function safeCents(value, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

function productionItemDto(row) {
  const quantity = Number(row.quantity || 0)
  const salePriceCents = row.sale_price_cents || 0
  const unitCostCents = row.estimated_unit_cost_cents
  return {
    id: row.id,
    forecastId: row.forecast_id,
    productId: row.product_id,
    customName: row.custom_name,
    category: row.category,
    unit: row.unit,
    quantity,
    salePriceCents,
    salePrice: money(salePriceCents),
    estimatedUnitCostCents: unitCostCents,
    estimatedUnitCost: unitCostCents === null || unitCostCents === undefined ? null : money(unitCostCents),
    notes: row.notes || '',
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function calculateProductionSummary(items, options = {}) {
  const roundingMode = productionRoundingModes.includes(options.roundingMode) ? options.roundingMode : 'proporcional'
  const byCategory = {}
  let revenueTotalCents = 0
  let costTotalCents = 0
  let profitTotalCents = 0
  let totalUnits = 0
  let totalMl = 0
  let missingCostCount = 0

  const calculatedItems = items.map((item) => {
    const quantity = safeNonNegative(item.quantity)
    const unit = productionUnits.includes(item.unit) ? item.unit : 'unidade'
    const salePriceCents = safeCents(item.salePriceCents ?? item.sale_price_cents)
    const unitCostRaw = item.estimatedUnitCostCents ?? item.estimated_unit_cost_cents
    const hasCost = unitCostRaw !== null && unitCostRaw !== undefined && unitCostRaw !== ''
    const estimatedUnitCostCents = hasCost ? safeCents(unitCostRaw) : null
    const revenueCents = Math.round(quantity * salePriceCents)
    const costCents = hasCost ? Math.round(quantity * estimatedUnitCostCents) : null
    const profitCents = hasCost ? revenueCents - costCents : null
    const marginPercent = revenueCents > 0 && profitCents !== null ? (profitCents / revenueCents) * 100 : null
    const category = item.category || 'outros'
    const ml = unit === 'litro' ? quantity * 1000 : unit === 'ml' ? quantity : 0
    const bottleRaw = ml > 0 ? ml / 300 : null
    const bottleEquivalent =
      bottleRaw === null ? null : roundingMode === 'cima' ? Math.ceil(bottleRaw) : roundingMode === 'baixo' ? Math.floor(bottleRaw) : bottleRaw

    revenueTotalCents += revenueCents
    if (hasCost) {
      costTotalCents += costCents
      profitTotalCents += profitCents
    } else {
      missingCostCount += 1
    }
    if (unit === 'unidade' || unit === 'cento' || unit === 'pacote') totalUnits += quantity
    totalMl += ml

    byCategory[category] ||= {
      category,
      revenueTotalCents: 0,
      revenueTotal: 0,
      costTotalCents: 0,
      costTotal: 0,
      profitTotalCents: 0,
      profitTotal: 0,
      quantity: 0,
      itemsCount: 0,
      missingCostCount: 0,
    }
    byCategory[category].revenueTotalCents += revenueCents
    if (hasCost) {
      byCategory[category].costTotalCents += costCents
      byCategory[category].profitTotalCents += profitCents
    } else {
      byCategory[category].missingCostCount += 1
    }
    byCategory[category].quantity += quantity
    byCategory[category].itemsCount += 1

    return {
      ...item,
      quantity,
      unit,
      salePriceCents,
      salePrice: money(salePriceCents),
      estimatedUnitCostCents,
      estimatedUnitCost: estimatedUnitCostCents === null ? null : money(estimatedUnitCostCents),
      revenueCents,
      revenue: money(revenueCents),
      costCents,
      cost: costCents === null ? null : money(costCents),
      profitCents,
      profit: profitCents === null ? null : money(profitCents),
      marginPercent,
      bottleEquivalent,
      bottleNote:
        bottleRaw === null ? '' : `${quantity} ${unit} equivalem aproximadamente a ${bottleRaw.toFixed(2).replace('.', ',')} garrafinhas de 300 ml.`,
    }
  })

  const byCategoryList = Object.values(byCategory).map((item) => ({
    ...item,
    revenueTotal: money(item.revenueTotalCents),
    costTotal: money(item.costTotalCents),
    profitTotal: money(item.profitTotalCents),
  }))
  const marginPercent = revenueTotalCents > 0 && missingCostCount < items.length ? (profitTotalCents / revenueTotalCents) * 100 : null

  return {
    revenueTotalCents,
    revenueTotal: money(revenueTotalCents),
    costTotalCents,
    costTotal: money(costTotalCents),
    profitTotalCents,
    profitTotal: money(profitTotalCents),
    marginPercent,
    totalUnits,
    totalMl,
    totalLiters: totalMl / 1000,
    itemsCount: items.length,
    missingCostCount,
    byCategory: byCategoryList,
    importantItems: [...calculatedItems].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
    items: calculatedItems,
  }
}

async function productionForecastDto(row, includeItems = false) {
  const forecast = {
    id: row.id,
    name: row.name,
    weekday: row.weekday,
    dateReference: row.date_reference,
    scenario: row.scenario,
    notes: row.notes || '',
    roundingMode: row.rounding_mode || 'proporcional',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
  }

  const items = includeItems
    ? await query('SELECT * FROM production_forecast_items WHERE forecast_id = $1 ORDER BY sort_order, created_at, id', [row.id])
    : { rows: [] }
  const itemDtos = items.rows.map(productionItemDto)
  const summary = calculateProductionSummary(itemDtos, { roundingMode: forecast.roundingMode })
  return includeItems ? { ...forecast, items: itemDtos, summary } : { ...forecast, summary }
}

function userDto(row) {
  const role = normalizeRole(row.role) || row.role
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    displayRole: displayRole(role),
    permissions: permissionsFor(role),
    active: row.active,
    createdAt: row.created_at,
  }
}

function signUser(row) {
  const user = userDto(row)
  const token = jwt.sign(user, jwtSecret, { expiresIn: '12h' })
  return { user, token }
}

async function orderDto(row) {
  const items = await query(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC, id ASC`,
    [row.id],
  )

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    number: row.address_number,
    complement: row.complement,
    reference: row.reference,
    neighborhood: row.neighborhood,
    channel: row.channel,
    paymentMethod: row.payment_method,
    changeForCents: row.change_for_cents,
    changeFor: money(row.change_for_cents),
    couponCode: row.coupon_code,
    notes: row.notes,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    subtotal: money(row.subtotal_cents),
    discountCents: row.discount_cents,
    discount: money(row.discount_cents),
    deliveryFeeCents: row.delivery_fee_cents || 0,
    deliveryFee: money(row.delivery_fee_cents),
    totalCents: row.total_cents,
    total: money(row.total_cents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.rows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPriceCents: item.unit_price_cents,
      unitPrice: money(item.unit_price_cents),
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
      notes: item.notes || '',
    })),
  }
}

function auth(permission) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Login necessario.' })

    try {
      req.user = jwt.verify(token, jwtSecret)
    } catch {
      return res.status(401).json({ error: 'Sessao invalida.' })
    }

    if (!hasPermission(req.user, permission)) {
      audit(req, 'denied', 'permission', permission, null, { path: req.path, method: req.method }).catch(() => undefined)
      return res.status(403).json({ error: 'Permissao insuficiente.' })
    }
    next()
  }
}

async function query(sql, params = []) {
  return pool.query(sql, params)
}

async function audit(req, action, entity, entityId, beforeData = null, afterData = null) {
  await query(
    `INSERT INTO audit_logs (id, user_id, ip_address, action, entity, entity_id, before_data, after_data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      randomUUID(),
      req.user?.id || null,
      req.ip || req.socket.remoteAddress || null,
      action,
      entity,
      entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ],
  )
}

async function auditWithClient(client, req, action, entity, entityId, beforeData = null, afterData = null) {
  await client.query(
    `INSERT INTO audit_logs (id, user_id, ip_address, action, entity, entity_id, before_data, after_data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      randomUUID(),
      req.user?.id || null,
      req.ip || req.socket.remoteAddress || null,
      action,
      entity,
      entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ],
  )
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      availability TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      image_url TEXT,
      promotion_price_cents INTEGER,
      promotion_label TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      address TEXT,
      neighborhood TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      neighborhood TEXT,
      channel TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'pix',
      coupon_code TEXT,
      notes TEXT,
      status TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      min_quantity NUMERIC NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      type TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'pix',
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      discount_percent INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      ip_address TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      before_data JSONB,
      after_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      content TEXT NOT NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      opened_by TEXT,
      closed_by TEXT,
      opening_amount_cents INTEGER NOT NULL DEFAULT 0,
      closing_amount_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'OPEN',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      provider TEXT NOT NULL DEFAULT 'manual',
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      amount_cents INTEGER NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id TEXT PRIMARY KEY,
      neighborhood TEXT UNIQUE NOT NULL,
      fee_cents INTEGER NOT NULL DEFAULT 0,
      eta_minutes INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS backups_log (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      file_path TEXT,
      size_bytes BIGINT,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS production_forecasts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weekday TEXT NOT NULL,
      date_reference DATE,
      scenario TEXT NOT NULL DEFAULT 'Personalizado',
      notes TEXT NOT NULL DEFAULT '',
      rounding_mode TEXT NOT NULL DEFAULT 'proporcional',
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS production_forecast_items (
      id TEXT PRIMARY KEY,
      forecast_id TEXT NOT NULL REFERENCES production_forecasts(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      custom_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity NUMERIC NOT NULL DEFAULT 0,
      sale_price_cents INTEGER NOT NULL DEFAULT 0,
      estimated_unit_cost_cents INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS production_item_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      default_sale_price_cents INTEGER NOT NULL DEFAULT 0,
      default_estimated_unit_cost_cents INTEGER,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      price_cents INTEGER NOT NULL,
      valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
      valid_until DATE,
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_cost_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      cost_cents INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT 'unidade',
      source TEXT NOT NULL DEFAULT 'manual',
      valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
      valid_until DATE,
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS commercial_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS production_entries (
      id TEXT PRIMARY KEY,
      production_date DATE NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      responsible TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'RASCUNHO',
      notes TEXT NOT NULL DEFAULT '',
      cancel_reason TEXT,
      created_by TEXT,
      updated_by TEXT,
      cancelled_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cancelled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS production_entry_items (
      id TEXT PRIMARY KEY,
      production_entry_id TEXT NOT NULL REFERENCES production_entries(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name_snapshot TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'unidade',
      quantity_produced NUMERIC NOT NULL DEFAULT 0,
      quantity_lost NUMERIC NOT NULL DEFAULT 0,
      quantity_internal_use NUMERIC NOT NULL DEFAULT 0,
      volume_ml INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS management_sales (
      id TEXT PRIMARY KEY,
      sale_code TEXT UNIQUE NOT NULL,
      sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      subtotal_cents INTEGER NOT NULL DEFAULT 0,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      surcharge_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL DEFAULT 0,
      paid_cents INTEGER NOT NULL DEFAULT 0,
      debt_cents INTEGER NOT NULL DEFAULT 0,
      financial_status TEXT NOT NULL DEFAULT 'PAGO',
      status TEXT NOT NULL DEFAULT 'CONFIRMADO',
      notes TEXT NOT NULL DEFAULT '',
      cancel_reason TEXT,
      created_by TEXT,
      cancelled_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cancelled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS management_sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES management_sales(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name_snapshot TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity NUMERIC NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'unidade',
      volume_ml INTEGER,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      unit_cost_cents INTEGER,
      subtotal_cents INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_entries (
      id TEXT PRIMARY KEY,
      sale_id TEXT REFERENCES management_sales(id) ON DELETE CASCADE,
      receivable_id TEXT,
      method TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS receivables (
      id TEXT PRIMARY KEY,
      sale_id TEXT REFERENCES management_sales(id) ON DELETE SET NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      original_amount_cents INTEGER NOT NULL,
      paid_amount_cents INTEGER NOT NULL DEFAULT 0,
      outstanding_amount_cents INTEGER NOT NULL,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'ABERTA',
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS receivable_payments (
      id TEXT PRIMARY KEY,
      receivable_id TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS report_exports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      filters JSONB NOT NULL,
      generated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT')
  await query(`
    CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START 100;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS dine_in_only BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_controlled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;
    ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for_cents INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_number TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS complement TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

    ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS cash_session_id TEXT;
    ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS created_by TEXT;

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_orders INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent_cents INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'unidade';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Outros';
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'dinheiro';
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier TEXT;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT;

    CREATE INDEX IF NOT EXISTS idx_production_entries_date ON production_entries (production_date);
    CREATE INDEX IF NOT EXISTS idx_production_items_product ON production_entry_items (product_id);
    CREATE INDEX IF NOT EXISTS idx_management_sales_date ON management_sales (sale_date);
    CREATE INDEX IF NOT EXISTS idx_management_sale_items_product ON management_sale_items (product_id);
    CREATE INDEX IF NOT EXISTS idx_payment_entries_sale ON payment_entries (sale_id);
    CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables (status);
    CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables (due_date);
    CREATE INDEX IF NOT EXISTS idx_product_price_history_validity ON product_price_history (product_id, valid_from, valid_until);
    CREATE INDEX IF NOT EXISTS idx_product_cost_history_validity ON product_cost_history (product_id, valid_from, valid_until);
    CREATE INDEX IF NOT EXISTS idx_payment_entries_receivable ON payment_entries (receivable_id);
  `)

  await query('ALTER TABLE management_sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT')
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_management_sales_idempotency_key ON management_sales (idempotency_key) WHERE idempotency_key IS NOT NULL')
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_price_history_price_non_negative') THEN
        ALTER TABLE product_price_history ADD CONSTRAINT chk_product_price_history_price_non_negative CHECK (price_cents >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_cost_history_cost_non_negative') THEN
        ALTER TABLE product_cost_history ADD CONSTRAINT chk_product_cost_history_cost_non_negative CHECK (cost_cents >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_production_entries_status') THEN
        ALTER TABLE production_entries ADD CONSTRAINT chk_production_entries_status CHECK (status IN ('RASCUNHO', 'CONFIRMADO', 'CANCELADO'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_production_entry_items_non_negative') THEN
        ALTER TABLE production_entry_items ADD CONSTRAINT chk_production_entry_items_non_negative CHECK (quantity_produced >= 0 AND quantity_lost >= 0 AND quantity_internal_use >= 0 AND (volume_ml IS NULL OR volume_ml >= 0));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_money_non_negative') THEN
        ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_money_non_negative CHECK (subtotal_cents >= 0 AND discount_cents >= 0 AND surcharge_cents >= 0 AND total_cents >= 0 AND paid_cents >= 0 AND debt_cents >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_status') THEN
        ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_status CHECK (status IN ('CONFIRMADO', 'CANCELADO', 'ESTORNADO'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_financial_status') THEN
        ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_financial_status CHECK (financial_status IN ('PAGO', 'PARCIAL', 'EM_DIVIDA', 'CANCELADO', 'ESTORNADO'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sale_items_non_negative') THEN
        ALTER TABLE management_sale_items ADD CONSTRAINT chk_management_sale_items_non_negative CHECK (quantity >= 0 AND (volume_ml IS NULL OR volume_ml >= 0) AND unit_price_cents >= 0 AND (unit_cost_cents IS NULL OR unit_cost_cents >= 0) AND subtotal_cents >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_entries_amount_positive') THEN
        ALTER TABLE payment_entries ADD CONSTRAINT chk_payment_entries_amount_positive CHECK (amount_cents > 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_entries_method') THEN
        ALTER TABLE payment_entries ADD CONSTRAINT chk_payment_entries_method CHECK (method IN ('pix', 'cartao', 'dinheiro', 'divida', 'estorno'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivables_money_non_negative') THEN
        ALTER TABLE receivables ADD CONSTRAINT chk_receivables_money_non_negative CHECK (original_amount_cents >= 0 AND paid_amount_cents >= 0 AND outstanding_amount_cents >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivables_status') THEN
        ALTER TABLE receivables ADD CONSTRAINT chk_receivables_status CHECK (status IN ('ABERTA', 'PARCIALMENTE_PAGA', 'PAGA', 'CANCELADA', 'VENCIDA'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivable_payments_amount_positive') THEN
        ALTER TABLE receivable_payments ADD CONSTRAINT chk_receivable_payments_amount_positive CHECK (amount_cents > 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivable_payments_method') THEN
        ALTER TABLE receivable_payments ADD CONSTRAINT chk_receivable_payments_method CHECK (payment_method IN ('pix', 'cartao', 'dinheiro'));
      END IF;
    END $$;
  `)

  await query(
    `INSERT INTO commercial_settings (key, value)
     VALUES ('refill_rule', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify({ blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' })],
  )

  for (const category of ['Ingredientes', 'Embalagens', 'Gas', 'Energia', 'Transporte', 'Manutencao', 'Taxas', 'Outros']) {
    await query('INSERT INTO expense_categories (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [
      category.toLowerCase().replace(/\s+/g, '-'),
      category,
    ])
  }

  for (const [index, category] of ['pasteis', 'salgados', 'sucos', 'refil'].entries()) {
    await query(
      `INSERT INTO categories (id, name, slug, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [category, category.charAt(0).toUpperCase() + category.slice(1), category, index],
    )
  }

  await query(`
    UPDATE products
    SET
      delivery_enabled = availability IN ('delivery', 'ambos'),
      pickup_enabled = availability IN ('delivery', 'ambos', 'presencial'),
      dine_in_only = availability = 'presencial'
    WHERE TRUE
  `)

  const productCount = await query('SELECT COUNT(*)::int AS total FROM products')
  if (productCount.rows[0].total === 0) {
    for (const product of productsSeed) {
      await query(
        `INSERT INTO products (id, name, category, availability, price_cents, description, featured, delivery_enabled, pickup_enabled, dine_in_only, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $4 IN ('delivery', 'ambos'), TRUE, $4 = 'presencial', 0)
         ON CONFLICT (id) DO NOTHING`,
        product,
      )
    }
  } else {
    for (const product of productsSeed) {
      await query(
        `UPDATE products
         SET description = CASE WHEN description = '' THEN $2 ELSE description END,
             featured = featured OR $3,
             availability = $4,
             delivery_enabled = $4 IN ('delivery', 'ambos'),
             pickup_enabled = TRUE,
             dine_in_only = $4 = 'presencial'
         WHERE id = $1`,
        [product[0], product[5], product[6], product[3]],
      )
    }
  }

  const stockCount = await query('SELECT COUNT(*)::int AS total FROM stock_items')
  if (stockCount.rows[0].total === 0) {
    for (const item of stockSeed) {
      await query(
        `INSERT INTO stock_items (id, name, unit, quantity, min_quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), ...item],
      )
    }
  }

  const templateCount = await query('SELECT COUNT(*)::int AS total FROM production_item_templates')
  if (templateCount.rows[0].total === 0) {
    for (const product of productsSeed) {
      await query(
        `INSERT INTO production_item_templates (
          id, name, category, unit, default_sale_price_cents, default_estimated_unit_cost_cents, product_id
        ) VALUES ($1, $2, $3, $4, $5, NULL, $6)
        ON CONFLICT (id) DO NOTHING`,
        [randomUUID(), product[1], product[2], product[2] === 'sucos' || product[2] === 'refil' ? 'litro' : 'unidade', product[4], product[0]],
      )
    }
  }

  const forecastCount = await query('SELECT COUNT(*)::int AS total FROM production_forecasts')
  if (forecastCount.rows[0].total === 0) {
    const forecastId = randomUUID()
    await query(
      `INSERT INTO production_forecasts (id, name, weekday, scenario, notes, rounding_mode)
       VALUES ($1, 'Exemplo Segunda-feira', 'segunda', 'Segunda normal', 'Modelo inicial para previsao de producao.', 'proporcional')`,
      [forecastId],
    )
    const juiceLiterPrice = Math.round(400 / 0.3)
    const exampleItems = [
      ['pastel-frango', 'Pastel de Frango', 'pasteis', 'unidade', 20, 500],
      ['pastel-carne', 'Pastel de Carne', 'pasteis', 'unidade', 15, 500],
      ['pastel-misto', 'Pastel Misto', 'pasteis', 'unidade', 12, 500],
      ['pastel-frango-queijo', 'Pastel de Frango com Queijo', 'pasteis', 'unidade', 10, 700],
      ['pastel-calabresa-queijo', 'Pastel de Calabresa com Queijo', 'pasteis', 'unidade', 10, 600],
      ['coxinha', 'Coxinha', 'salgados', 'unidade', 5, 400],
      ['enroladinho', 'Enroladinho', 'salgados', 'unidade', 3, 400],
      [null, 'Suco de Maracuja', 'sucos', 'litro', 2, juiceLiterPrice],
      [null, 'Suco de Goiaba', 'sucos', 'litro', 2, juiceLiterPrice],
    ]
    for (const [index, item] of exampleItems.entries()) {
      await query(
        `INSERT INTO production_forecast_items (
          id, forecast_id, product_id, custom_name, category, unit, quantity, sale_price_cents,
          estimated_unit_cost_cents, notes, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10)`,
        [
          randomUUID(),
          forecastId,
          item[0],
          item[1],
          item[2],
          item[3],
          item[4],
          item[5],
          item[3] === 'litro' ? 'Preco equivalente da garrafinha 300 ml por R$ 4,00.' : '',
          index,
        ],
      )
    }
  }

  await query(
    `INSERT INTO coupons (id, code, description, discount_percent)
     VALUES ($1, 'PRIMEIRACOMPRA', 'Cupom de primeira compra', 10)
     ON CONFLICT (code) DO NOTHING`,
    [randomUUID()],
  )

  await query(
    `INSERT INTO store_settings (key, value)
     VALUES ('delivery', $1)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify({ delivery_enabled: false, delivery_fee_default: 0, delivery_notes: 'Entrega simples ainda em configuracao.' })],
  )
}

async function getProduct(id) {
  const result = await query('SELECT * FROM products WHERE id = $1 AND active = TRUE', [id])
  return result.rows[0]
}

async function getSetting(key, fallback) {
  const result = await query('SELECT value FROM store_settings WHERE key = $1', [key])
  return result.rows[0]?.value || fallback
}

function parseCents(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Math.round(Number(String(value).replace(',', '.')) * 100)
  return Number.isFinite(parsed) ? parsed : null
}

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ ok: true, service: 'salgados-r-api', database: 'postgresql', timestamp: new Date().toISOString() })
})

app.get('/api/auth/status', async (_req, res) => {
  const count = await query('SELECT COUNT(*)::int AS total FROM users')
  res.json({ hasUsers: count.rows[0].total > 0, roles: ['SUPER_US', 'GERENTE', 'FUNCIONARIO'] })
})

app.get('/api/auth/me', auth('orders'), async (req, res) => {
  res.json(req.user)
})

app.post('/api/auth/logout', auth('orders'), async (req, res) => {
  await audit(req, 'logout', 'auth', req.user.id, null, null)
  res.json({ ok: true })
})

app.post('/api/auth/bootstrap', async (req, res) => {
  const count = await query('SELECT COUNT(*)::int AS total FROM users')
  if (count.rows[0].total > 0) return res.status(409).json({ error: 'Bootstrap ja foi realizado.' })

  const { name, email, password } = req.body
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Informe nome, email e senha com no minimo 8 caracteres.' })
  }

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)
  const created = await query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'SUPER_US')
     RETURNING *`,
    [id, name, email.toLowerCase(), passwordHash],
  )

  res.status(201).json(signUser(created.rows[0]))
})

app.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body
  const result = await query('SELECT * FROM users WHERE email = $1 AND active = TRUE', [String(email || '').toLowerCase()])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
    await audit(req, 'login_failed', 'auth', String(email || '').toLowerCase(), null, null)
    return res.status(401).json({ error: 'Email ou senha invalidos.' })
  }

  req.user = userDto(user)
  await audit(req, 'login', 'auth', user.id, null, { role: user.role })
  res.json(signUser(user))
})

app.get('/api/users', auth('users'), async (_req, res) => {
  const result = await query('SELECT * FROM users ORDER BY created_at DESC')
  res.json(result.rows.map(userDto))
})

app.post('/api/users', auth('users.create'), async (req, res) => {
  const { name, email, password } = req.body
  const role = normalizeRole(req.body.role)
  if (!name || !email || !password || !allowedRoles.includes(role)) return res.status(400).json({ error: 'Usuario invalido.' })

  const passwordHash = await bcrypt.hash(password, 12)
  const created = await query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [randomUUID(), name, email.toLowerCase(), passwordHash, role],
  )
  await audit(req, 'create', 'users', created.rows[0].id, null, userDto(created.rows[0]))
  res.status(201).json(userDto(created.rows[0]))
})

app.get('/api/products/public', async (_req, res) => {
  const result = await query('SELECT * FROM products WHERE active = TRUE ORDER BY category, sort_order, price_cents, name')
  res.json(result.rows.map(productDto))
})

app.get('/api/products', auth('products.view'), async (_req, res) => {
  const result = await query('SELECT * FROM products ORDER BY category, sort_order, price_cents, name')
  res.json(result.rows.map(productDto))
})

app.post('/api/products', auth('products.create'), async (req, res) => {
  const {
    name,
    description = '',
    category,
    availability,
    priceCents,
    imageUrl = '',
    promotionPriceCents = null,
    promotionLabel = '',
    featured = false,
    deliveryEnabled = availability !== 'presencial',
    pickupEnabled = true,
    dineInOnly = availability === 'presencial',
    stockControlled = false,
    sortOrder = 0,
  } = req.body
  if (!name || !category || !availability || !Number.isInteger(priceCents)) {
    return res.status(400).json({ error: 'Produto invalido.' })
  }

  const created = await query(
    `INSERT INTO products (
      id, name, description, category, availability, price_cents, image_url, promotion_price_cents, promotion_label,
      featured, delivery_enabled, pickup_enabled, dine_in_only, stock_controlled, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      randomUUID(),
      name,
      description,
      category,
      availability,
      priceCents,
      imageUrl,
      promotionPriceCents,
      promotionLabel,
      featured,
      deliveryEnabled,
      pickupEnabled,
      dineInOnly,
      stockControlled,
      sortOrder,
    ],
  )
  await audit(req, 'create', 'products', created.rows[0].id, null, productDto(created.rows[0]))
  res.status(201).json(productDto(created.rows[0]))
})

app.patch('/api/products/:id', auth('products.update'), async (req, res) => {
  const current = await query('SELECT * FROM products WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Produto nao encontrado.' })

  const row = current.rows[0]
  const updated = await query(
    `UPDATE products
     SET name = $1, description = $2, category = $3, availability = $4, price_cents = $5, active = $6,
         featured = $7, delivery_enabled = $8, pickup_enabled = $9, dine_in_only = $10,
         stock_controlled = $11, sort_order = $12, updated_at = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.description ?? row.description,
      req.body.category ?? row.category,
      req.body.availability ?? row.availability,
      Number.isInteger(req.body.priceCents) ? req.body.priceCents : row.price_cents,
      typeof req.body.active === 'boolean' ? req.body.active : row.active,
      typeof req.body.featured === 'boolean' ? req.body.featured : row.featured,
      typeof req.body.deliveryEnabled === 'boolean' ? req.body.deliveryEnabled : row.delivery_enabled,
      typeof req.body.pickupEnabled === 'boolean' ? req.body.pickupEnabled : row.pickup_enabled,
      typeof req.body.dineInOnly === 'boolean' ? req.body.dineInOnly : row.dine_in_only,
      typeof req.body.stockControlled === 'boolean' ? req.body.stockControlled : row.stock_controlled,
      Number.isInteger(req.body.sortOrder) ? req.body.sortOrder : row.sort_order,
      req.params.id,
    ],
  )
  await audit(req, 'update', 'products', req.params.id, productDto(row), productDto(updated.rows[0]))
  res.json(productDto(updated.rows[0]))
})

app.patch('/api/products/:id/availability', auth('products.update'), async (req, res) => {
  req.body.active = typeof req.body.active === 'boolean' ? req.body.active : undefined
  req.body.deliveryEnabled = typeof req.body.deliveryEnabled === 'boolean' ? req.body.deliveryEnabled : undefined
  req.body.pickupEnabled = typeof req.body.pickupEnabled === 'boolean' ? req.body.pickupEnabled : undefined
  req.body.dineInOnly = typeof req.body.dineInOnly === 'boolean' ? req.body.dineInOnly : undefined
  const current = await query('SELECT * FROM products WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Produto nao encontrado.' })
  const row = current.rows[0]
  const updated = await query(
    `UPDATE products
     SET active = $1, delivery_enabled = $2, pickup_enabled = $3, dine_in_only = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [
      req.body.active ?? row.active,
      req.body.deliveryEnabled ?? row.delivery_enabled,
      req.body.pickupEnabled ?? row.pickup_enabled,
      req.body.dineInOnly ?? row.dine_in_only,
      req.params.id,
    ],
  )
  await audit(req, 'availability', 'products', req.params.id, productDto(row), productDto(updated.rows[0]))
  res.json(productDto(updated.rows[0]))
})

function normalizeProductionItem(item, index = 0) {
  const name = String(item.customName || item.name || '').trim()
  const category = String(item.category || 'outros').trim()
  const unit = productionUnits.includes(item.unit) ? item.unit : 'unidade'
  const quantity = safeNonNegative(item.quantity)
  const salePriceCents = safeCents(item.salePriceCents ?? item.sale_price_cents)
  const hasCost = item.estimatedUnitCostCents !== null && item.estimatedUnitCostCents !== undefined && item.estimatedUnitCostCents !== ''
  const estimatedUnitCostCents = hasCost ? safeCents(item.estimatedUnitCostCents ?? item.estimated_unit_cost_cents) : null
  if (!name) throw new Error('Informe o nome do item.')
  if (!category) throw new Error('Informe a categoria do item.')
  return {
    id: item.id || randomUUID(),
    productId: item.productId || item.product_id || null,
    customName: name,
    category,
    unit,
    quantity,
    salePriceCents,
    estimatedUnitCostCents,
    notes: String(item.notes || ''),
    sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index,
  }
}

async function replaceForecastItems(forecastId, items) {
  await query('DELETE FROM production_forecast_items WHERE forecast_id = $1', [forecastId])
  for (const [index, rawItem] of (items || []).entries()) {
    const item = normalizeProductionItem(rawItem, index)
    await query(
      `INSERT INTO production_forecast_items (
        id, forecast_id, product_id, custom_name, category, unit, quantity, sale_price_cents,
        estimated_unit_cost_cents, notes, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        item.id,
        forecastId,
        item.productId,
        item.customName,
        item.category,
        item.unit,
        item.quantity,
        item.salePriceCents,
        item.estimatedUnitCostCents,
        item.notes,
        item.sortOrder,
      ],
    )
  }
}

app.get('/api/admin/production-forecasts', auth('production'), async (_req, res) => {
  const result = await query('SELECT * FROM production_forecasts ORDER BY updated_at DESC, created_at DESC')
  const forecasts = await Promise.all(result.rows.map((row) => productionForecastDto(row, true)))
  res.json(forecasts)
})

app.get('/api/admin/production-forecasts/weekday/:weekday', auth('production'), async (req, res) => {
  const result = await query('SELECT * FROM production_forecasts WHERE weekday = $1 ORDER BY updated_at DESC', [req.params.weekday])
  const forecasts = await Promise.all(result.rows.map((row) => productionForecastDto(row, true)))
  res.json(forecasts)
})

app.post('/api/admin/production-forecasts', auth('production.manage'), async (req, res) => {
  const name = String(req.body.name || '').trim()
  const weekday = String(req.body.weekday || '').trim()
  if (!name || !weekday) return res.status(400).json({ error: 'Informe nome e dia da semana.' })
  const roundingMode = productionRoundingModes.includes(req.body.roundingMode) ? req.body.roundingMode : 'proporcional'
  try {
    ;(req.body.items || []).forEach((item, index) => normalizeProductionItem(item, index))
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Item invalido.' })
  }
  const created = await query(
    `INSERT INTO production_forecasts (
      id, name, weekday, date_reference, scenario, notes, rounding_mode, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING *`,
    [
      randomUUID(),
      name,
      weekday,
      req.body.dateReference || null,
      req.body.scenario || 'Personalizado',
      req.body.notes || '',
      roundingMode,
      req.user.id,
    ],
  )
  await replaceForecastItems(created.rows[0].id, req.body.items || [])
  const dto = await productionForecastDto(created.rows[0], true)
  await audit(req, 'create', 'production_forecasts', created.rows[0].id, null, { name, weekday, items: dto.items.length })
  res.status(201).json(dto)
})

app.get('/api/admin/production-forecasts/:id', auth('production'), async (req, res) => {
  const result = await query('SELECT * FROM production_forecasts WHERE id = $1', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Previsao nao encontrada.' })
  res.json(await productionForecastDto(result.rows[0], true))
})

app.patch('/api/admin/production-forecasts/:id', auth('production.manage'), async (req, res) => {
  const current = await query('SELECT * FROM production_forecasts WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Previsao nao encontrada.' })
  try {
    if (req.body.items) req.body.items.forEach((item, index) => normalizeProductionItem(item, index))
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Item invalido.' })
  }
  const row = current.rows[0]
  const roundingMode = productionRoundingModes.includes(req.body.roundingMode) ? req.body.roundingMode : row.rounding_mode
  const updated = await query(
    `UPDATE production_forecasts
     SET name = $1, weekday = $2, date_reference = $3, scenario = $4, notes = $5,
         rounding_mode = $6, updated_by = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.weekday ?? row.weekday,
      req.body.dateReference ?? row.date_reference,
      req.body.scenario ?? row.scenario,
      req.body.notes ?? row.notes,
      roundingMode,
      req.user.id,
      req.params.id,
    ],
  )
  if (req.body.items) await replaceForecastItems(req.params.id, req.body.items)
  const dto = await productionForecastDto(updated.rows[0], true)
  await audit(req, 'update', 'production_forecasts', req.params.id, row, { name: dto.name, weekday: dto.weekday, items: dto.items.length })
  res.json(dto)
})

app.delete('/api/admin/production-forecasts/:id', auth('production.manage'), async (req, res) => {
  const current = await query('SELECT * FROM production_forecasts WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Previsao nao encontrada.' })
  await query('DELETE FROM production_forecasts WHERE id = $1', [req.params.id])
  await audit(req, 'delete', 'production_forecasts', req.params.id, current.rows[0], null)
  res.json({ ok: true })
})

app.post('/api/admin/production-forecasts/:id/duplicate', auth('production.manage'), async (req, res) => {
  const current = await query('SELECT * FROM production_forecasts WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Previsao nao encontrada.' })
  const source = await productionForecastDto(current.rows[0], true)
  const created = await query(
    `INSERT INTO production_forecasts (
      id, name, weekday, date_reference, scenario, notes, rounding_mode, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING *`,
    [
      randomUUID(),
      req.body.name || `${source.name} (copia)`,
      req.body.weekday || source.weekday,
      req.body.dateReference || null,
      req.body.scenario || source.scenario,
      source.notes,
      source.roundingMode,
      req.user.id,
    ],
  )
  await replaceForecastItems(created.rows[0].id, source.items)
  const dto = await productionForecastDto(created.rows[0], true)
  await audit(req, 'duplicate', 'production_forecasts', created.rows[0].id, { sourceId: req.params.id }, { name: dto.name, weekday: dto.weekday })
  res.status(201).json(dto)
})

app.get('/api/admin/production-forecasts/:id/summary', auth('production'), async (req, res) => {
  const result = await query('SELECT * FROM production_forecasts WHERE id = $1', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Previsao nao encontrada.' })
  const dto = await productionForecastDto(result.rows[0], true)
  res.json(dto.summary)
})

app.get('/api/admin/production-item-templates', auth('production'), async (_req, res) => {
  const result = await query('SELECT * FROM production_item_templates ORDER BY category, name')
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      defaultSalePriceCents: row.default_sale_price_cents,
      defaultSalePrice: money(row.default_sale_price_cents),
      defaultEstimatedUnitCostCents: row.default_estimated_unit_cost_cents,
      defaultEstimatedUnitCost:
        row.default_estimated_unit_cost_cents === null ? null : money(row.default_estimated_unit_cost_cents),
      productId: row.product_id,
      active: row.active,
    })),
  )
})

app.post('/api/admin/production-item-templates', auth('production.manage'), async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Informe o nome do template.' })
  const created = await query(
    `INSERT INTO production_item_templates (
      id, name, category, unit, default_sale_price_cents, default_estimated_unit_cost_cents, product_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      randomUUID(),
      name,
      req.body.category || 'outros',
      productionUnits.includes(req.body.unit) ? req.body.unit : 'unidade',
      safeCents(req.body.defaultSalePriceCents),
      req.body.defaultEstimatedUnitCostCents === null || req.body.defaultEstimatedUnitCostCents === undefined
        ? null
        : safeCents(req.body.defaultEstimatedUnitCostCents),
      req.body.productId || null,
    ],
  )
  await audit(req, 'create', 'production_item_templates', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.patch('/api/admin/production-item-templates/:id', auth('production.manage'), async (req, res) => {
  const current = await query('SELECT * FROM production_item_templates WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Template nao encontrado.' })
  const row = current.rows[0]
  const updated = await query(
    `UPDATE production_item_templates
     SET name = $1, category = $2, unit = $3, default_sale_price_cents = $4,
         default_estimated_unit_cost_cents = $5, product_id = $6, active = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.category ?? row.category,
      productionUnits.includes(req.body.unit) ? req.body.unit : row.unit,
      Number.isInteger(req.body.defaultSalePriceCents) ? safeCents(req.body.defaultSalePriceCents) : row.default_sale_price_cents,
      req.body.defaultEstimatedUnitCostCents === undefined ? row.default_estimated_unit_cost_cents : req.body.defaultEstimatedUnitCostCents === null ? null : safeCents(req.body.defaultEstimatedUnitCostCents),
      req.body.productId ?? row.product_id,
      typeof req.body.active === 'boolean' ? req.body.active : row.active,
      req.params.id,
    ],
  )
  await audit(req, 'update', 'production_item_templates', req.params.id, row, updated.rows[0])
  res.json(updated.rows[0])
})

app.delete('/api/admin/production-item-templates/:id', auth('production.manage'), async (req, res) => {
  const current = await query('SELECT * FROM production_item_templates WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Template nao encontrado.' })
  await query('UPDATE production_item_templates SET active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id])
  await audit(req, 'delete', 'production_item_templates', req.params.id, current.rows[0], { active: false })
  res.json({ ok: true })
})

app.get('/api/categories', async (_req, res) => {
  const result = await query('SELECT * FROM categories WHERE active = TRUE ORDER BY sort_order, name')
  res.json(result.rows)
})

app.post('/api/categories', auth('products.create'), async (req, res) => {
  const { name, slug, sortOrder = 0 } = req.body
  if (!name || !slug) return res.status(400).json({ error: 'Categoria invalida.' })
  const created = await query(
    `INSERT INTO categories (id, name, slug, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), name, slug, Number(sortOrder)],
  )
  await audit(req, 'create', 'categories', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.patch('/api/categories/:id', auth('products.update'), async (req, res) => {
  const current = await query('SELECT * FROM categories WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Categoria nao encontrada.' })
  const row = current.rows[0]
  const updated = await query(
    `UPDATE categories
     SET name = $1, slug = $2, sort_order = $3, active = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.slug ?? row.slug,
      Number(req.body.sortOrder ?? row.sort_order),
      typeof req.body.active === 'boolean' ? req.body.active : row.active,
      req.params.id,
    ],
  )
  await audit(req, 'update', 'categories', req.params.id, row, updated.rows[0])
  res.json(updated.rows[0])
})

app.get('/api/orders', auth('orders'), async (req, res) => {
  const status = req.query.status
  const result = status
    ? await query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status])
    : await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100')

  res.json(await Promise.all(result.rows.map(orderDto)))
})

app.get('/api/orders/today', auth('orders'), async (_req, res) => {
  const result = await query('SELECT * FROM orders WHERE created_at::date = CURRENT_DATE ORDER BY created_at DESC')
  res.json(await Promise.all(result.rows.map(orderDto)))
})

app.post('/api/orders', async (req, res) => {
  const {
    customerName,
    phone = req.body.customerPhone || '',
    address = '',
    number = '',
    complement = '',
    reference = '',
    neighborhood = '',
    channel = req.body.orderType || 'retirada',
    paymentMethod = 'pix',
    changeFor = null,
    changeForCents = null,
    couponCode = '',
    notes = '',
    items = [],
  } = req.body
  const phoneClean = String(phone || '').trim()
  const orderType = String(channel || '').toLowerCase()
  if (!customerName || !phoneClean || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Informe nome, WhatsApp e ao menos um item.' })
  }
  if (!['retirada', 'local', 'delivery', 'presencial'].includes(orderType)) {
    return res.status(400).json({ error: 'Tipo de pedido invalido.' })
  }

  const deliverySettings = await getSetting('delivery', {
    delivery_enabled: false,
    delivery_fee_default: 0,
    delivery_notes: 'Entrega simples ainda em configuracao.',
  })
  if (orderType === 'delivery' && !deliverySettings.delivery_enabled) {
    return res.status(400).json({ error: 'Entrega esta desativada no momento. Escolha retirada ou consumo no local.' })
  }
  if (orderType === 'delivery' && (!neighborhood || !address || !number)) {
    return res.status(400).json({ error: 'Para entrega, informe bairro, endereco e numero.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const orderItems = []
    for (const item of items) {
      const product = await getProduct(item.productId)
      const quantity = Number(item.quantity || 1)
      if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error('Item invalido no pedido.')
      if (orderType === 'delivery' && (product.availability === 'presencial' || product.dine_in_only || !product.delivery_enabled)) {
        throw new Error(`${product.name} e somente para consumo no estabelecimento.`)
      }
      if (orderType !== 'delivery' && product.pickup_enabled === false && product.dine_in_only === false) {
        throw new Error(`${product.name} nao esta disponivel para esse tipo de pedido.`)
      }
      orderItems.push({
        id: randomUUID(),
        product,
        quantity,
        notes: String(item.notes || '').slice(0, 300),
        totalCents: product.price_cents * quantity,
      })
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalCents, 0)
    let discountCents = 0
    if (couponCode) {
      const coupon = await client.query('SELECT * FROM coupons WHERE code = $1 AND active = TRUE', [couponCode.toUpperCase()])
      if (coupon.rows[0]) discountCents = Math.floor((subtotal * coupon.rows[0].discount_percent) / 100)
    }
    const deliveryFeeCents = orderType === 'delivery' ? Number(deliverySettings.delivery_fee_default || 0) : 0
    const total = Math.max(subtotal - discountCents + deliveryFeeCents, 0)
    const parsedChangeForCents = changeForCents ?? parseCents(changeFor)

    let customerId = null
    if (phoneClean) {
      const existing = await client.query('SELECT * FROM customers WHERE phone = $1', [phoneClean])
      customerId = existing.rows[0]?.id || randomUUID()
      if (existing.rows[0]) {
        await client.query(
          `UPDATE customers
           SET name = $1, address = $2, neighborhood = $3, last_order_at = NOW(),
               total_orders = total_orders + 1, total_spent_cents = total_spent_cents + $4,
               points = points + $5, updated_at = NOW()
           WHERE phone = $6`,
          [customerName, address, neighborhood, total, Math.floor(total / 100), phoneClean],
        )
      } else {
        await client.query(
          `INSERT INTO customers (id, name, phone, address, neighborhood, points, last_order_at, total_orders, total_spent_cents)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), 1, $7)`,
          [customerId, customerName, phoneClean, address, neighborhood, Math.floor(total / 100), total],
        )
      }
    }

    const orderId = randomUUID()
    await client.query(
      `INSERT INTO orders (
        id, customer_id, customer_name, phone, address, address_number, complement, reference,
        neighborhood, channel, payment_method, change_for_cents, coupon_code, notes, status,
        subtotal_cents, discount_cents, delivery_fee_cents, total_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'RECEBIDO', $15, $16, $17, $18)`,
      [
        orderId,
        customerId,
        customerName,
        phoneClean,
        address,
        number,
        complement,
        reference,
        neighborhood,
        orderType,
        paymentMethod,
        parsedChangeForCents,
        couponCode.toUpperCase(),
        notes,
        subtotal,
        discountCents,
        deliveryFeeCents,
        total,
      ],
    )

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, unit_price_cents, quantity, total_cents, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [item.id, orderId, item.product.id, item.product.name, item.product.price_cents, item.quantity, item.totalCents, item.notes],
      )
    }

    await client.query(
      `INSERT INTO payments (id, order_id, provider, method, status, amount_cents, metadata)
       VALUES ($1, $2, 'manual', $3, $4, $5, $6)`,
      [
        randomUUID(),
        orderId,
        paymentMethod,
        paymentMethod === 'pix' ? 'AGUARDANDO_PAGAMENTO' : 'PENDING',
        total,
        JSON.stringify({ mode: 'manual', note: 'Integracao automatica depende de credenciais do provedor.' }),
      ],
    )

    await client.query(
      `INSERT INTO notifications (id, type, title, message)
       VALUES ($1, 'ORDER_CREATED', 'Pedido novo', $2)`,
      [randomUUID(), `Pedido #${orderId.slice(0, 8).toUpperCase()} recebido.`],
    )

    await client.query('COMMIT')
    const order = await query('SELECT * FROM orders WHERE id = $1', [orderId])
    await audit({ user: null, ip: null, socket: { remoteAddress: null } }, 'create', 'orders', orderId, null, order.rows[0])
    res.status(201).json(await orderDto(order.rows[0]))
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: error.message || 'Erro ao criar pedido.' })
  } finally {
    client.release()
  }
})

app.get('/api/orders/:id', auth('orders'), async (req, res) => {
  const result = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Pedido nao encontrado.' })
  res.json(await orderDto(result.rows[0]))
})

app.patch('/api/orders/:id/status', auth('orders.update_status'), async (req, res) => {
  const legacyMap = {
    novo: 'RECEBIDO',
    preparando: 'PREPARANDO',
    pronto: 'PRONTO',
    entregue: 'FINALIZADO',
    cancelado: 'CANCELADO',
  }
  const nextStatus = legacyMap[req.body.status] || req.body.status

  const current = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  const expectedUpdatedAt = req.body.expectedUpdatedAt
  if (expectedUpdatedAt && new Date(current.rows[0].updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    await audit(req, 'conflict', 'orders', req.params.id, current.rows[0], { expectedUpdatedAt, status: nextStatus })
    return res.status(409).json({ error: 'O pedido foi atualizado por outro operador. Recarregue os dados.' })
  }

  const transition = canTransitionOrderStatus({
    currentStatus: current.rows[0].status,
    nextStatus,
    user: req.user,
  })
  if (!transition.allowed) {
    await audit(req, 'denied_status', 'orders', req.params.id, current.rows[0], { status: nextStatus, error: transition.error })
    return res.status(transition.status).json({ error: transition.error })
  }

  const updated = await query(
    `UPDATE orders
     SET status = $1,
         finalized_at = CASE WHEN $1 = 'FINALIZADO' THEN NOW() ELSE finalized_at END,
         cancelled_at = CASE WHEN $1 = 'CANCELADO' THEN NOW() ELSE cancelled_at END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [nextStatus, req.params.id],
  )

  if (nextStatus === 'CANCELADO' && current.rows[0].status !== 'CANCELADO' && current.rows[0].phone) {
    await query(
      `UPDATE customers
       SET points = GREATEST(points - $1, 0), updated_at = NOW()
       WHERE phone = $2`,
      [Math.floor(current.rows[0].total_cents / 100), current.rows[0].phone],
    )
  }

  await audit(req, 'status', 'orders', req.params.id, current.rows[0], updated.rows[0])
  if (nextStatus === 'FINALIZADO' && current.rows[0].status !== 'FINALIZADO') {
    const existingMovement = await query("SELECT id FROM cash_movements WHERE order_id = $1 AND type = 'entrada' LIMIT 1", [
      req.params.id,
    ])
    if (!existingMovement.rows[0]) {
      const openSession = await query("SELECT id FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
      await query(
        `INSERT INTO cash_movements (id, cash_session_id, order_id, type, method, description, amount_cents, created_by)
         VALUES ($1, $2, $3, 'entrada', $4, $5, $6, $7)`,
        [
          randomUUID(),
          openSession.rows[0]?.id || null,
          req.params.id,
          updated.rows[0].payment_method,
          `Pedido #${updated.rows[0].order_number || req.params.id.slice(0, 8)}`,
          updated.rows[0].total_cents,
          req.user.id,
        ],
      )
    }
  }
  await query(
    `INSERT INTO notifications (id, type, title, message)
     VALUES ($1, 'ORDER_STATUS', 'Status atualizado', $2)`,
    [randomUUID(), `Pedido #${req.params.id.slice(0, 8).toUpperCase()} agora esta ${nextStatus}.`],
  )
  res.json(await orderDto(updated.rows[0]))
})

app.patch('/api/orders/:id/cancel', auth('orders.cancel'), async (req, res) => {
  const current = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  const updated = await query("UPDATE orders SET status = 'CANCELADO', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [
    req.params.id,
  ])
  await audit(req, 'cancel', 'orders', req.params.id, current.rows[0], updated.rows[0])
  res.json(await orderDto(updated.rows[0]))
})

app.get('/api/stock', auth('stock'), async (_req, res) => {
  const result = await query('SELECT * FROM stock_items ORDER BY name')
  res.json(
    result.rows.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      minQuantity: Number(item.min_quantity),
      low: Number(item.quantity) <= Number(item.min_quantity),
      updatedAt: item.updated_at,
    })),
  )
})

app.get('/api/inventory', auth('stock'), async (_req, res) => {
  const result = await query('SELECT * FROM stock_items ORDER BY name')
  res.json(
    result.rows.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      minQuantity: Number(item.min_quantity),
      low: Number(item.quantity) <= Number(item.min_quantity),
      updatedAt: item.updated_at,
      recipeConfigured: false,
      warning: 'Produto sem ficha tecnica quando aplicavel.',
    })),
  )
})

app.post('/api/inventory', auth('inventory.adjust'), async (req, res) => {
  const { name, unit = 'unidade', quantity = 0, minQuantity = 0 } = req.body
  if (!name) return res.status(400).json({ error: 'Informe o nome do item de estoque.' })
  const created = await query(
    `INSERT INTO stock_items (id, name, unit, quantity, min_quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [randomUUID(), name, unit, Number(quantity), Number(minQuantity)],
  )
  await audit(req, 'create', 'stock_items', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.patch('/api/inventory/:id', auth('inventory.update'), async (req, res) => {
  const current = await query('SELECT * FROM stock_items WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Item de estoque nao encontrado.' })
  const row = current.rows[0]
  const updated = await query(
    `UPDATE stock_items
     SET name = $1, unit = $2, quantity = $3, min_quantity = $4, active = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.unit ?? row.unit,
      Number(req.body.quantity ?? row.quantity),
      Number(req.body.minQuantity ?? row.min_quantity),
      typeof req.body.active === 'boolean' ? req.body.active : row.active,
      req.params.id,
    ],
  )
  await audit(req, 'update', 'stock_items', req.params.id, row, updated.rows[0])
  res.json(updated.rows[0])
})

app.post('/api/inventory/:id/movement', auth('inventory.adjust'), async (req, res) => {
  const current = await query('SELECT * FROM stock_items WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Item de estoque nao encontrado.' })
  const quantity = Number(req.body.quantity || 0)
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Informe uma quantidade maior que zero.' })
  const type = req.body.type === 'saida' ? 'saida' : req.body.type === 'ajuste' ? 'ajuste' : 'entrada'
  const nextQuantity =
    type === 'saida'
      ? Number(current.rows[0].quantity) - quantity
      : type === 'ajuste'
        ? quantity
        : Number(current.rows[0].quantity) + quantity
  const updated = await query('UPDATE stock_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [
    nextQuantity,
    req.params.id,
  ])
  await audit(req, `stock_${type}`, 'stock_items', req.params.id, current.rows[0], {
    ...updated.rows[0],
    reason: req.body.reason || '',
  })
  res.json(updated.rows[0])
})

app.patch('/api/stock/:id', auth('inventory.update'), async (req, res) => {
  const current = await query('SELECT * FROM stock_items WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Item de estoque nao encontrado.' })

  const quantity = Number(req.body.quantity ?? current.rows[0].quantity)
  const minQuantity = Number(req.body.minQuantity ?? current.rows[0].min_quantity)
  if (Number.isNaN(quantity) || Number.isNaN(minQuantity)) {
    return res.status(400).json({ error: 'Quantidade invalida.' })
  }

  const updated = await query(
    'UPDATE stock_items SET quantity = $1, min_quantity = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [quantity, minQuantity, req.params.id],
  )
  await audit(req, 'update', 'stock_items', req.params.id, current.rows[0], updated.rows[0])
  res.json(updated.rows[0])
})

function periodFilter(queryParams) {
  const today = new Date().toISOString().slice(0, 10)
  const startDate = String(queryParams.startDate || queryParams.start || today).slice(0, 10)
  const endDate = String(queryParams.endDate || queryParams.end || startDate).slice(0, 10)
  if (startDate > endDate) return { error: 'Data inicial nao pode ser posterior a data final.' }
  return { startDate, endDate }
}

async function currentCostCents(productId) {
  const result = await query(
    `SELECT cost_cents FROM product_cost_history
     WHERE product_id = $1 AND valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY valid_from DESC, created_at DESC LIMIT 1`,
    [productId],
  )
  return result.rows[0]?.cost_cents ?? null
}

function managementSaleDto(row) {
  return {
    id: row.id,
    saleCode: row.sale_code,
    saleDate: row.sale_date,
    customerName: row.customer_name,
    subtotalCents: row.subtotal_cents,
    subtotal: money(row.subtotal_cents),
    discountCents: row.discount_cents,
    surchargeCents: row.surcharge_cents,
    totalCents: row.total_cents,
    total: money(row.total_cents),
    paidCents: row.paid_cents,
    paid: money(row.paid_cents),
    debtCents: row.debt_cents,
    debt: money(row.debt_cents),
    financialStatus: row.financial_status,
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

async function managementSummary({ startDate, endDate, category = '', productId = '', paymentMethod = '' }) {
  const saleFilters = [startDate, endDate]
  const saleWhere = ["ms.status = 'CONFIRMADO'", 'ms.sale_date::date BETWEEN $1 AND $2']
  if (category) {
    saleFilters.push(category)
    saleWhere.push(`msi.category = $${saleFilters.length}`)
  }
  if (productId) {
    saleFilters.push(productId)
    saleWhere.push(`msi.product_id = $${saleFilters.length}`)
  }
  const productionFilters = [startDate, endDate]
  const productionWhere = ["pe.status <> 'CANCELADO'", 'pe.production_date BETWEEN $1 AND $2']
  if (category) {
    productionFilters.push(category)
    productionWhere.push(`pei.category = $${productionFilters.length}`)
  }
  if (productId) {
    productionFilters.push(productId)
    productionWhere.push(`pei.product_id = $${productionFilters.length}`)
  }
  const production = await query(
    `SELECT COALESCE(SUM(pei.quantity_produced), 0)::numeric AS produced,
            COALESCE(SUM(pei.quantity_lost), 0)::numeric AS lost,
            COALESCE(SUM(pei.quantity_internal_use), 0)::numeric AS internal_use,
            COALESCE(SUM(pei.volume_ml), 0)::int AS volume_ml
     FROM production_entry_items pei
     JOIN production_entries pe ON pe.id = pei.production_entry_id
     WHERE ${productionWhere.join(' AND ')}`,
    productionFilters,
  )
  const sales = await query(
    `SELECT COALESCE(SUM(msi.quantity), 0)::numeric AS sold,
            COALESCE(SUM(msi.subtotal_cents), 0)::int AS expected_cents,
            COALESCE(SUM(CASE WHEN msi.unit_cost_cents IS NULL THEN 0 ELSE ROUND(msi.quantity * msi.unit_cost_cents)::int END), 0)::int AS cost_cents,
            COALESCE(SUM(CASE WHEN msi.unit_cost_cents IS NULL THEN 0 ELSE msi.subtotal_cents END), 0)::int AS covered_revenue_cents,
            COUNT(*) FILTER (WHERE msi.unit_cost_cents IS NULL)::int AS missing_cost_count
     FROM management_sale_items msi
     JOIN management_sales ms ON ms.id = msi.sale_id
     WHERE ${saleWhere.join(' AND ')}`,
    saleFilters,
  )
  const paymentFilters = [startDate, endDate]
  const paymentWhere = ["ms.status = 'CONFIRMADO'", 'ms.sale_date::date BETWEEN $1 AND $2']
  if (paymentMethod) {
    paymentFilters.push(paymentMethod)
    paymentWhere.push(`pe.method = $${paymentFilters.length}`)
  }
  const payments = await query(
    `SELECT pe.method, COALESCE(SUM(pe.amount_cents), 0)::int AS total_cents
     FROM payment_entries pe
     JOIN management_sales ms ON ms.id = pe.sale_id
     WHERE ${paymentWhere.join(' AND ')}
     GROUP BY pe.method`,
    paymentFilters,
  )
  const receivables = await query(
    "SELECT COALESCE(SUM(outstanding_amount_cents), 0)::int AS open_cents FROM receivables WHERE created_at::date BETWEEN $1 AND $2 AND status <> 'CANCELADA'",
    [startDate, endDate],
  )
  const expenses = await query('SELECT COALESCE(SUM(amount_cents), 0)::int AS total_cents FROM expenses WHERE expense_date BETWEEN $1 AND $2', [
    startDate,
    endDate,
  ])
  const refunds = await query(
    `SELECT COALESCE(SUM(pe.amount_cents), 0)::int AS total_cents
     FROM payment_entries pe
     JOIN management_sales ms ON ms.id = pe.sale_id
     WHERE pe.method = 'estorno' AND ms.cancelled_at::date BETWEEN $1 AND $2`,
    [startDate, endDate],
  )
  const paymentMap = Object.fromEntries(payments.rows.map((item) => [item.method, Number(item.total_cents || 0)]))
  const expectedCents = Number(sales.rows[0].expected_cents || 0)
  const coveredRevenueCents = Number(sales.rows[0].covered_revenue_cents || 0)
  const costCents = Number(sales.rows[0].cost_cents || 0)
  const expenseCents = Number(expenses.rows[0].total_cents || 0)
  const missingCostCount = Number(sales.rows[0].missing_cost_count || 0)
  const receivedCents = (paymentMap.pix || 0) + (paymentMap.cartao || 0) + (paymentMap.dinheiro || 0)
  const grossProfitCents = missingCostCount > 0 ? null : expectedCents - costCents
  const estimatedResultCents = grossProfitCents === null ? null : grossProfitCents - expenseCents
  return {
    filters: { startDate, endDate, category, productId, paymentMethod },
    producedQuantity: Number(production.rows[0].produced || 0),
    lostQuantity: Number(production.rows[0].lost || 0),
    internalUseQuantity: Number(production.rows[0].internal_use || 0),
    producedVolumeMl: Number(production.rows[0].volume_ml || 0),
    soldQuantity: Number(sales.rows[0].sold || 0),
    expectedRevenueCents: expectedCents,
    expectedRevenue: money(expectedCents),
    receivedCents,
    received: money(receivedCents),
    pixCents: paymentMap.pix || 0,
    pix: money(paymentMap.pix || 0),
    cardCents: paymentMap.cartao || 0,
    card: money(paymentMap.cartao || 0),
    cashCents: paymentMap.dinheiro || 0,
    cash: money(paymentMap.dinheiro || 0),
    pendingCents: Number(receivables.rows[0].open_cents || 0),
    pending: money(receivables.rows[0].open_cents || 0),
    refundsCents: Number(refunds.rows[0].total_cents || 0),
    refunds: money(refunds.rows[0].total_cents || 0),
    costCents,
    cost: money(costCents),
    expensesCents: expenseCents,
    expenses: money(expenseCents),
    missingCostCount,
    grossProfitCents,
    grossProfit: grossProfitCents === null ? null : money(grossProfitCents),
    estimatedResultCents,
    estimatedResult: estimatedResultCents === null ? null : money(estimatedResultCents),
    costCoveragePercent: calculateCostCoverage({ coveredRevenueCents, totalRevenueCents: expectedCents }),
    profitStatus: missingCostCount > 0 ? 'LUCRO_INDISPONIVEL' : 'CALCULAVEL',
  }
}

app.get('/api/management/refill-rule', auth('reports'), async (_req, res) => {
  const result = await query("SELECT value FROM commercial_settings WHERE key = 'refill_rule'")
  res.json(result.rows[0]?.value || { blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' })
})

app.patch('/api/management/refill-rule', auth('production.manage'), async (req, res) => {
  const value = {
    blockMl: Math.max(1, Number(req.body.blockMl || 100)),
    blockPriceCents: toCents(req.body.blockPriceCents ?? 100, 100),
    roundingMode: volumeRoundingModes.includes(req.body.roundingMode) ? req.body.roundingMode : 'somente_multiplos',
  }
  await query(
    `INSERT INTO commercial_settings (key, value, updated_by, updated_at)
     VALUES ('refill_rule', $1::jsonb, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [JSON.stringify(value), req.user.id],
  )
  await audit(req, 'update', 'commercial_settings', 'refill_rule', null, value)
  res.json(value)
})

app.get('/api/management/production', auth('production'), async (req, res) => {
  const period = periodFilter(req.query)
  if (period.error) return res.status(400).json({ error: period.error })
  const result = await query(
    `SELECT pe.*, COUNT(pei.id)::int AS items_count
     FROM production_entries pe
     LEFT JOIN production_entry_items pei ON pei.production_entry_id = pe.id
     WHERE pe.production_date BETWEEN $1 AND $2
     GROUP BY pe.id ORDER BY pe.production_date DESC, pe.created_at DESC LIMIT 100`,
    [period.startDate, period.endDate],
  )
  res.json(result.rows)
})

app.post('/api/management/production', auth('production.manage'), async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  if (!req.body.productionDate) return res.status(400).json({ error: 'Informe a data da producao.' })
  if (items.length === 0) return res.status(400).json({ error: 'Adicione pelo menos um produto.' })
  const client = await pool.connect()
  const entryId = randomUUID()
  try {
    await client.query('BEGIN')
    const entry = await client.query(
      `INSERT INTO production_entries (id, production_date, period, responsible, status, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [entryId, req.body.productionDate, req.body.period || '', req.body.responsible || req.user.name || '', req.body.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'RASCUNHO', req.body.notes || '', req.user.id],
    )
    const seen = new Set()
    for (const [index, rawItem] of items.entries()) {
      const product = rawItem.productId ? await client.query('SELECT * FROM products WHERE id = $1', [rawItem.productId]) : { rows: [] }
      const productRow = product.rows[0]
      const name = productRow?.name || rawItem.productNameSnapshot || rawItem.name || 'Produto manual'
      const unit = rawItem.unit || productRow?.unit || 'unidade'
      const produced = toQuantity(rawItem.quantityProduced)
      const lost = toQuantity(rawItem.quantityLost)
      const internalUse = toQuantity(rawItem.quantityInternalUse)
      if (produced <= 0) throw new Error(`Quantidade invalida em ${name}.`)
      if (produced < lost + internalUse) throw new Error(`Perda/uso interno maior que produzido em ${name}.`)
      const duplicateKey = `${rawItem.productId || name}-${unit}`
      if (seen.has(duplicateKey)) throw new Error(`Linha duplicada: ${name}.`)
      seen.add(duplicateKey)
      const volumeMl = rawItem.volumeMl ? Math.round(toQuantity(rawItem.volumeMl)) : unit === 'litro' ? Math.round(produced * 1000) : unit === 'ml' ? Math.round(produced) : null
      await client.query(
        `INSERT INTO production_entry_items (id, production_entry_id, product_id, product_name_snapshot, category, unit, quantity_produced, quantity_lost, quantity_internal_use, volume_ml, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [randomUUID(), entryId, productRow?.id || null, name, productRow?.category || rawItem.category || 'outros', unit, produced, lost, internalUse, volumeMl, rawItem.notes || '', index],
      )
    }
    await auditWithClient(client, req, 'create', 'production_entries', entryId, null, { items: items.length, status: entry.rows[0].status })
    await client.query('COMMIT')
    res.status(201).json(entry.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: error.message || 'Nao foi possivel salvar producao.' })
  } finally {
    client.release()
  }
})

app.post('/api/management/production/:id/cancel', auth('production.manage'), async (req, res) => {
  const reason = String(req.body.reason || '').trim()
  if (reason.length < 8) return res.status(400).json({ error: 'Informe uma justificativa de cancelamento com pelo menos 8 caracteres.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query('SELECT * FROM production_entries WHERE id = $1 FOR UPDATE', [req.params.id])
    const row = current.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Producao nao encontrada.' })
    }
    if (row.status === 'CANCELADO') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Producao ja cancelada.' })
    }
    const updated = await client.query(
      `UPDATE production_entries
       SET status = 'CANCELADO', cancel_reason = $1, cancelled_by = $2, cancelled_at = NOW(), updated_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason, req.user.id, row.id],
    )
    await auditWithClient(client, req, 'cancel', 'production_entries', row.id, row, updated.rows[0])
    await client.query('COMMIT')
    res.json(updated.rows[0])
  } catch {
    await client.query('ROLLBACK')
    res.status(400).json({ error: 'Nao foi possivel cancelar producao.' })
  } finally {
    client.release()
  }
})

app.get('/api/management/sales', auth('cash.view'), async (req, res) => {
  const period = periodFilter(req.query)
  if (period.error) return res.status(400).json({ error: period.error })
  const result = await query('SELECT * FROM management_sales WHERE sale_date::date BETWEEN $1 AND $2 ORDER BY sale_date DESC LIMIT 100', [
    period.startDate,
    period.endDate,
  ])
  res.json(result.rows.map(managementSaleDto))
})

app.post('/api/management/sales', auth('cash.adjust'), async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  if (items.length === 0) return res.status(400).json({ error: 'Adicione pelo menos um item a venda.' })
  const idempotencyKey = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim().slice(0, 120)
  if (idempotencyKey) {
    const existing = await query('SELECT * FROM management_sales WHERE idempotency_key = $1', [idempotencyKey])
    if (existing.rows[0]) return res.status(200).json(managementSaleDto(existing.rows[0]))
  }
  const client = await pool.connect()
  const saleId = randomUUID()
  try {
    await client.query('BEGIN')
    const refillRule = await client.query("SELECT value FROM commercial_settings WHERE key = 'refill_rule'")
    const rule = refillRule.rows[0]?.value || { blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' }
    let subtotalCents = 0
    const preparedItems = []
    for (const rawItem of items) {
      const product = await client.query('SELECT * FROM products WHERE id = $1', [rawItem.productId])
      const productRow = product.rows[0]
      if (!productRow) throw new Error('Produto nao encontrado.')
      const quantity = toQuantity(rawItem.quantity, 1)
      const volumeMl = rawItem.volumeMl ? Math.round(toQuantity(rawItem.volumeMl)) : null
      let unitPriceCents = toCents(rawItem.unitPriceCents ?? productRow.price_cents)
      if (productRow.category === 'refil' && volumeMl) {
        const refill = calculateRefillCents({ volumeMl, ...rule })
        if (!refill.ok) throw new Error(refill.error)
        unitPriceCents = refill.totalCents
      }
      const unitCostCents = rawItem.unitCostCents !== undefined && rawItem.unitCostCents !== null && rawItem.unitCostCents !== '' ? toCents(rawItem.unitCostCents) : await currentCostCents(productRow.id)
      const subtotal = Math.round(quantity * unitPriceCents)
      subtotalCents += subtotal
      preparedItems.push({ productRow, quantity, volumeMl, unitPriceCents, unitCostCents, subtotal })
    }
    const discountCents = toCents(req.body.discountCents)
    const surchargeCents = toCents(req.body.surchargeCents)
    const totalCents = Math.max(0, subtotalCents - discountCents + surchargeCents)
    const paymentTotals = calculatePaymentTotals(req.body.payments, totalCents)
    if (paymentTotals.declaredCents > totalCents && !paymentTotals.payments.some((payment) => payment.method === 'dinheiro')) {
      throw new Error('Pagamentos acima do total so sao aceitos com dinheiro para troco.')
    }
    if (paymentTotals.missingCents > 0) paymentTotals.payments.push({ method: 'divida', amountCents: paymentTotals.missingCents, notes: 'Diferenca classificada como divida.' })
    const sale = await client.query(
      `INSERT INTO management_sales (id, sale_code, sale_date, customer_name, subtotal_cents, discount_cents, surcharge_cents, total_cents, paid_cents, debt_cents, financial_status, notes, created_by, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [saleId, `VR-${Date.now()}`, req.body.saleDate || new Date().toISOString(), req.body.customerName || '', subtotalCents, discountCents, surchargeCents, totalCents, paymentTotals.paidCents, paymentTotals.debtCents, financialStatusFor({ totalCents, paidCents: paymentTotals.paidCents, debtCents: paymentTotals.debtCents }), req.body.notes || '', req.user.id, idempotencyKey || null],
    )
    for (const item of preparedItems) {
      await client.query(
        `INSERT INTO management_sale_items (id, sale_id, product_id, product_name_snapshot, category, quantity, unit, volume_ml, unit_price_cents, unit_cost_cents, subtotal_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), saleId, item.productRow.id, item.productRow.name, item.productRow.category, item.quantity, item.productRow.unit || 'unidade', item.volumeMl, item.unitPriceCents, item.unitCostCents, item.subtotal],
      )
    }
    for (const payment of paymentTotals.payments) {
      await client.query('INSERT INTO payment_entries (id, sale_id, method, amount_cents, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [
        randomUUID(),
        saleId,
        payment.method,
        payment.amountCents,
        payment.notes || '',
        req.user.id,
      ])
    }
    if (paymentTotals.debtCents > 0) {
      await client.query(
        `INSERT INTO receivables (id, sale_id, customer_name, original_amount_cents, outstanding_amount_cents, due_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$4,$5,'ABERTA',$6,$7)`,
        [randomUUID(), saleId, req.body.customerName || 'Cliente nao identificado', paymentTotals.debtCents, req.body.dueDate || null, req.body.notes || '', req.user.id],
      )
    }
    await auditWithClient(client, req, 'create', 'management_sales', saleId, null, { totalCents, payments: paymentTotals.payments.length, idempotencyKey: idempotencyKey || null })
    await client.query('COMMIT')
    res.status(201).json(managementSaleDto(sale.rows[0]))
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: error.message || 'Nao foi possivel registrar venda.' })
  } finally {
    client.release()
  }
})

app.post('/api/management/sales/:id/cancel', auth('cash.adjust'), async (req, res) => {
  const reason = String(req.body.reason || '').trim()
  if (reason.length < 8) return res.status(400).json({ error: 'Informe uma justificativa de cancelamento com pelo menos 8 caracteres.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query('SELECT * FROM management_sales WHERE id = $1 FOR UPDATE', [req.params.id])
    const sale = current.rows[0]
    if (!sale) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Venda nao encontrada.' })
    }
    if (!saleStatuses.includes(sale.status) || sale.status !== 'CONFIRMADO') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Venda ja foi cancelada ou estornada.' })
    }
    if (sale.paid_cents > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Venda possui recebimento. Realize estorno auditado em vez de cancelamento simples.' })
    }
    const updated = await client.query(
      `UPDATE management_sales
       SET status = 'CANCELADO', financial_status = 'CANCELADO', cancel_reason = $1, cancelled_by = $2, cancelled_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason, req.user.id, sale.id],
    )
    await client.query(
      `UPDATE receivables
       SET status = 'CANCELADA', outstanding_amount_cents = 0, updated_at = NOW()
       WHERE sale_id = $1 AND status <> 'PAGA'`,
      [sale.id],
    )
    await auditWithClient(client, req, 'cancel', 'management_sales', sale.id, sale, updated.rows[0])
    await client.query('COMMIT')
    res.json(managementSaleDto(updated.rows[0]))
  } catch {
    await client.query('ROLLBACK')
    res.status(400).json({ error: 'Nao foi possivel cancelar venda.' })
  } finally {
    client.release()
  }
})

app.post('/api/management/sales/:id/refund', auth('cash.adjust'), async (req, res) => {
  const reason = String(req.body.reason || '').trim()
  const method = String(req.body.method || 'dinheiro').toLowerCase()
  if (reason.length < 8) return res.status(400).json({ error: 'Informe uma justificativa de estorno com pelo menos 8 caracteres.' })
  if (!receivablePaymentMethods.includes(method)) return res.status(400).json({ error: 'Forma de estorno invalida.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query('SELECT * FROM management_sales WHERE id = $1 FOR UPDATE', [req.params.id])
    const sale = current.rows[0]
    if (!sale) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Venda nao encontrada.' })
    }
    if (sale.status !== 'CONFIRMADO') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Venda nao esta confirmada.' })
    }
    if (sale.paid_cents <= 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Venda sem recebimento deve ser cancelada, nao estornada.' })
    }
    const updated = await client.query(
      `UPDATE management_sales
       SET status = 'ESTORNADO', financial_status = 'ESTORNADO', cancel_reason = $1, cancelled_by = $2, cancelled_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason, req.user.id, sale.id],
    )
    await client.query(
      `INSERT INTO payment_entries (id, sale_id, method, amount_cents, notes, created_by)
       VALUES ($1,$2,'estorno',$3,$4,$5)`,
      [randomUUID(), sale.id, sale.paid_cents, `Estorno por ${method}: ${reason}`, req.user.id],
    )
    await client.query(
      `UPDATE receivables
       SET status = 'CANCELADA', outstanding_amount_cents = 0, updated_at = NOW()
       WHERE sale_id = $1 AND status <> 'PAGA'`,
      [sale.id],
    )
    await auditWithClient(client, req, 'refund', 'management_sales', sale.id, sale, updated.rows[0])
    await client.query('COMMIT')
    res.json(managementSaleDto(updated.rows[0]))
  } catch {
    await client.query('ROLLBACK')
    res.status(400).json({ error: 'Nao foi possivel estornar venda.' })
  } finally {
    client.release()
  }
})

app.get('/api/management/receivables', auth('cash.view'), async (req, res) => {
  const status = String(req.query.status || '')
  const result = status
    ? await query('SELECT * FROM receivables WHERE status = $1 ORDER BY created_at DESC LIMIT 100', [status])
    : await query('SELECT * FROM receivables ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows.map((row) => ({ ...row, originalAmount: money(row.original_amount_cents), paidAmount: money(row.paid_amount_cents), outstandingAmount: money(row.outstanding_amount_cents) })))
})

app.post('/api/management/receivables/:id/payments', auth('cash.adjust'), async (req, res) => {
  const method = String(req.body.paymentMethod || '').toLowerCase()
  const amountCents = toCents(req.body.amountCents)
  if (!receivablePaymentMethods.includes(method)) return res.status(400).json({ error: 'Forma de pagamento invalida.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query('SELECT * FROM receivables WHERE id = $1 FOR UPDATE', [req.params.id])
    const row = current.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Conta a receber nao encontrada.' })
    }
    if (row.status === 'CANCELADA' || row.status === 'PAGA') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Conta a receber nao aceita novo pagamento.' })
    }
    if (amountCents <= 0 || amountCents > row.outstanding_amount_cents) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Valor invalido para o saldo.' })
    }
    const paid = row.paid_amount_cents + amountCents
    const outstanding = row.outstanding_amount_cents - amountCents
    const status = deriveReceivableStatus({
      originalAmountCents: row.original_amount_cents,
      paidAmountCents: paid,
      outstandingAmountCents: outstanding,
      dueDate: row.due_date,
    })
    await client.query('INSERT INTO receivable_payments (id, receivable_id, amount_cents, payment_method, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [
      randomUUID(),
      row.id,
      amountCents,
      method,
      req.body.notes || '',
      req.user.id,
    ])
    const updated = await client.query('UPDATE receivables SET paid_amount_cents = $1, outstanding_amount_cents = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *', [
      paid,
      outstanding,
      status,
      row.id,
    ])
    await client.query('INSERT INTO payment_entries (id, receivable_id, method, amount_cents, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [
      randomUUID(),
      row.id,
      method,
      amountCents,
      'Recebimento posterior de divida.',
      req.user.id,
    ])
    await auditWithClient(client, req, 'receivable_payment', 'receivables', row.id, row, updated.rows[0])
    await client.query('COMMIT')
    res.json(updated.rows[0])
  } catch {
    await client.query('ROLLBACK')
    res.status(400).json({ error: 'Nao foi possivel registrar pagamento.' })
  } finally {
    client.release()
  }
})

app.get('/api/management/costs-prices/products', auth('products.view'), async (_req, res) => {
  const result = await query(
    `SELECT p.*, pch.cost_cents AS current_cost_cents
     FROM products p
     LEFT JOIN LATERAL (
       SELECT cost_cents FROM product_cost_history
       WHERE product_id = p.id AND valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY valid_from DESC, created_at DESC LIMIT 1
     ) pch ON TRUE
     ORDER BY p.category, p.name`,
  )
  res.json(result.rows.map((row) => ({ ...productDto(row), unit: row.unit || 'unidade', currentCostCents: row.current_cost_cents, currentCost: row.current_cost_cents == null ? null : money(row.current_cost_cents), grossMarginPercent: row.current_cost_cents ? ((row.price_cents - row.current_cost_cents) / row.price_cents) * 100 : null, profitStatus: grossProfitStatus(row.current_cost_cents) })))
})

app.patch('/api/management/costs-prices/products/:id', auth('products.update'), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const product = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [req.params.id])
    if (!product.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produto nao encontrado.' })
    }
    const validFrom = req.body.validFrom || new Date().toISOString().slice(0, 10)
    const priceCents = req.body.priceCents === undefined ? product.rows[0].price_cents : toCents(req.body.priceCents)
    const costCents = req.body.costCents === undefined || req.body.costCents === null || req.body.costCents === '' ? null : toCents(req.body.costCents)
    const unit = req.body.unit || product.rows[0].unit || 'unidade'
    const updated = await client.query('UPDATE products SET price_cents = $1, unit = $2, updated_at = NOW() WHERE id = $3 RETURNING *', [priceCents, unit, req.params.id])
    await client.query(
      `UPDATE product_price_history
       SET valid_until = ($2::date - INTERVAL '1 day')::date
       WHERE product_id = $1 AND valid_until IS NULL AND valid_from < $2::date`,
      [req.params.id, validFrom],
    )
    await client.query('INSERT INTO product_price_history (id, product_id, price_cents, valid_from, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [
      randomUUID(),
      req.params.id,
      priceCents,
      validFrom,
      req.body.notes || '',
      req.user.id,
    ])
    if (costCents !== null) {
      await client.query(
        `UPDATE product_cost_history
         SET valid_until = ($2::date - INTERVAL '1 day')::date
         WHERE product_id = $1 AND valid_until IS NULL AND valid_from < $2::date`,
        [req.params.id, validFrom],
      )
      await client.query('INSERT INTO product_cost_history (id, product_id, cost_cents, unit, source, valid_from, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
        randomUUID(),
        req.params.id,
        costCents,
        unit,
        req.body.source || 'manual',
        validFrom,
        req.body.notes || '',
        req.user.id,
      ])
    }
    await auditWithClient(client, req, 'update_cost_price', 'products', req.params.id, product.rows[0], { priceCents, costCents, unit })
    await client.query('COMMIT')
    res.json(productDto(updated.rows[0]))
  } catch {
    await client.query('ROLLBACK')
    res.status(400).json({ error: 'Nao foi possivel atualizar custo e preco.' })
  } finally {
    client.release()
  }
})

app.get('/api/management/reports/summary', auth('reports'), async (req, res) => {
  const period = periodFilter(req.query)
  if (period.error) return res.status(400).json({ error: period.error })
  res.json(await managementSummary({ ...period, category: req.query.category || '', productId: req.query.productId || '', paymentMethod: req.query.paymentMethod || '' }))
})

app.get('/api/management/reports/products', auth('reports'), async (req, res) => {
  const period = periodFilter(req.query)
  if (period.error) return res.status(400).json({ error: period.error })
  const result = await query(
    `SELECT msi.product_id, msi.product_name_snapshot, msi.category, COALESCE(SUM(msi.quantity), 0)::numeric AS quantity,
            COALESCE(SUM(msi.subtotal_cents), 0)::int AS revenue_cents,
            COALESCE(SUM(CASE WHEN msi.unit_cost_cents IS NULL THEN 0 ELSE ROUND(msi.quantity * msi.unit_cost_cents)::int END), 0)::int AS cost_cents,
            COUNT(*) FILTER (WHERE msi.unit_cost_cents IS NULL)::int AS missing_cost_count
     FROM management_sale_items msi JOIN management_sales ms ON ms.id = msi.sale_id
     WHERE ms.status = 'CONFIRMADO' AND ms.sale_date::date BETWEEN $1 AND $2
     GROUP BY msi.product_id, msi.product_name_snapshot, msi.category ORDER BY revenue_cents DESC`,
    [period.startDate, period.endDate],
  )
  res.json(result.rows.map((row) => ({ ...row, revenue: money(row.revenue_cents), cost: money(row.cost_cents), grossProfit: row.missing_cost_count > 0 ? null : money(row.revenue_cents - row.cost_cents), profitStatus: row.missing_cost_count > 0 ? 'LUCRO_INDISPONIVEL' : 'CALCULAVEL' })))
})

app.get('/api/management/reports.csv', auth('reports'), async (req, res) => {
  const period = periodFilter(req.query)
  if (period.error) return res.status(400).json({ error: period.error })
  const summary = await managementSummary(period)
  await audit(req, 'export_csv', 'report_exports', 'management-summary', null, { filters: period })
  const rows = [['Indicador', 'Valor'], ['Faturamento esperado', summary.expectedRevenueCents], ['Valor recebido', summary.receivedCents], ['PIX', summary.pixCents], ['Cartao', summary.cardCents], ['Dinheiro', summary.cashCents], ['Dividas abertas', summary.pendingCents], ['Estornos', summary.refundsCents], ['Custos', summary.costCents], ['Despesas', summary.expensesCents], ['Cobertura de custos (%)', summary.costCoveragePercent], ['Lucro bruto estimado', summary.grossProfitCents ?? 'LUCRO INDISPONIVEL']]
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="salgados-r-relatorio-${period.startDate}-${period.endDate}.csv"`)
  res.send(`\uFEFF${rows.map((row) => row.map((cell) => csvSafe(cell)).join(';')).join('\n')}`)
})

function pdfEscape(value) {
  return String(value ?? '').replace(/[^\x20-\x7EÀ-ÿ]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function reportPdf({ title, subtitle, userName, filters, lines }) {
  const issuedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })
  const allLines = [
    `PERIODO: ${filters.startDate} A ${filters.endDate}`,
    `EMISSAO: ${issuedAt}`,
    `RESPONSAVEL: ${userName}`,
    `FILTROS: ${JSON.stringify(filters)}`,
    '',
    ...lines,
  ]
  const pageSize = 31
  const pages = []
  for (let index = 0; index < allLines.length; index += pageSize) pages.push(allLines.slice(index, index + pageSize))
  if (pages.length === 0) pages.push(['SEM DADOS PARA O PERIODO.'])
  const objects = ['1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj']
  const pageRefs = []
  let nextObject = 3
  const fontObject = nextObject++
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObject = nextObject++
    const contentObject = nextObject++
    pageRefs.push(`${pageObject} 0 R`)
    const textOps = pages[pageIndex]
      .map((line, lineIndex) => `BT /F1 10 Tf 50 ${690 - lineIndex * 18} Td (${pdfEscape(line).slice(0, 96)}) Tj ET`)
      .join('\n')
    const stream = [
      '0.8627 0 0.0314 rg 0 742 595 100 re f',
      '1 0.7412 0.051 rg 0 736 595 6 re f',
      `BT /F1 22 Tf 50 800 Td (${pdfEscape('SALGADOS R')}) Tj ET`,
      `BT /F1 15 Tf 50 770 Td (${pdfEscape(title)}) Tj ET`,
      `BT /F1 9 Tf 50 752 Td (${pdfEscape(subtitle)}) Tj ET`,
      '0.8627 0 0.0314 rg',
      textOps,
      `BT /F1 8 Tf 50 28 Td (${pdfEscape(`PAGINA ${pageIndex + 1} DE ${pages.length} - SALGADOS R - ${issuedAt}`)}) Tj ET`,
    ].join('\n')
    objects.push(`${pageObject} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >> endobj`)
    objects.push(`${contentObject} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`)
  }
  objects.splice(1, 0, `2 0 obj << /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >> endobj`)
  objects.push(`${fontObject} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`)
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += `${object}\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index < offsets.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

app.post('/api/management/reports/pdf', auth('reports'), async (req, res) => {
  const period = periodFilter(req.body || {})
  if (period.error) return res.status(400).json({ error: period.error })
  const summary = await managementSummary(period)
  await query('INSERT INTO report_exports (id, type, filters, generated_by) VALUES ($1,$2,$3,$4)', [randomUUID(), 'pdf', JSON.stringify(period), req.user.id])
  await audit(req, 'export_pdf', 'report_exports', 'management-summary', null, { filters: period })
  const pdf = reportPdf({
    title: 'RELATORIO DE GESTAO',
    subtitle: 'PRODUCAO, VENDAS, PAGAMENTOS, DIVIDAS, CUSTOS E RESULTADO',
    userName: req.user.name,
    filters: period,
    lines: [
      `PRODUCAO: ${summary.producedQuantity}`,
      `QUANTIDADE VENDIDA: ${summary.soldQuantity}`,
      `FATURAMENTO ESPERADO: ${summary.expectedRevenueCents} CENTAVOS`,
      `VALOR RECEBIDO: ${summary.receivedCents} CENTAVOS`,
      `PIX: ${summary.pixCents} CENTAVOS`,
      `CARTAO: ${summary.cardCents} CENTAVOS`,
      `DINHEIRO: ${summary.cashCents} CENTAVOS`,
      `DIVIDA: ${summary.pendingCents} CENTAVOS`,
      `ESTORNOS: ${summary.refundsCents} CENTAVOS`,
      `CUSTOS: ${summary.costCents} CENTAVOS`,
      `DESPESAS: ${summary.expensesCents} CENTAVOS`,
      `COBERTURA DE CUSTOS: ${summary.costCoveragePercent}%`,
      `LUCRO BRUTO ESTIMADO: ${summary.grossProfitCents === null ? 'INDISPONIVEL POR FALTA DE CUSTO' : `${summary.grossProfitCents} CENTAVOS`}`,
      summary.grossProfitCents === null ? 'AVISO: LUCRO CALCULAVEL SOMENTE APOS CADASTRAR CUSTOS DOS PRODUTOS.' : 'RESULTADO CALCULADO COM CUSTOS CADASTRADOS.',
    ],
  })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="salgados-r-relatorio-${period.startDate}-${period.endDate}.pdf"`)
  res.send(pdf)
})

app.get('/api/reports/summary', auth('reports'), async (_req, res) => {
  const sales = await query(
    `SELECT COALESCE(SUM(total_cents), 0)::int AS revenue, COUNT(*)::int AS orders
     FROM orders
     WHERE status IN ('FINALIZADO', 'entregue') AND created_at::date = CURRENT_DATE`,
  )
  const monthSales = await query(
    `SELECT COALESCE(SUM(total_cents), 0)::int AS revenue
     FROM orders
     WHERE status IN ('FINALIZADO', 'entregue') AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
  )
  const todayOrders = await query("SELECT COUNT(*)::int AS total FROM orders WHERE created_at::date = CURRENT_DATE")
  const pending = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status IN ('novo', 'preparando', 'RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO')")
  const delivered = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status IN ('entregue', 'FINALIZADO') AND created_at::date = CURRENT_DATE")
  const canceled = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status IN ('cancelado', 'CANCELADO') AND created_at::date = CURRENT_DATE")
  const lowStock = await query('SELECT COUNT(*)::int AS total FROM stock_items WHERE quantity <= min_quantity')
  const customers = await query('SELECT COUNT(*)::int AS total FROM customers')
  const paymentMethods = await query(
    `SELECT payment_method, COUNT(*)::int AS quantity, COALESCE(SUM(total_cents), 0)::int AS total_cents
     FROM orders
     WHERE status IN ('FINALIZADO', 'entregue')
     GROUP BY payment_method
     ORDER BY total_cents DESC`,
  )
  const topProducts = await query(
    `SELECT oi.product_name, SUM(oi.quantity)::int AS quantity, SUM(oi.total_cents)::int AS total_cents
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status IN ('FINALIZADO', 'entregue')
     GROUP BY oi.product_name
     ORDER BY quantity DESC
     LIMIT 5`,
  )

  const revenue = sales.rows[0].revenue
  const orderCount = sales.rows[0].orders
  res.json({
    today: new Date().toISOString().slice(0, 10),
    revenueCents: revenue,
    revenue: money(revenue),
    monthRevenueCents: monthSales.rows[0].revenue,
    monthRevenue: money(monthSales.rows[0].revenue),
    orders: todayOrders.rows[0].total,
    finalizedOrders: orderCount,
    averageTicket: orderCount > 0 ? money(Math.round(revenue / orderCount)) : 0,
    pendingOrders: pending.rows[0].total,
    deliveredOrders: delivered.rows[0].total,
    canceledOrders: canceled.rows[0].total,
    lowStockItems: lowStock.rows[0].total,
    loyaltyCustomers: customers.rows[0].total,
    paymentMethods: paymentMethods.rows.map((item) => ({
      method: item.payment_method,
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
    })),
    topProducts: topProducts.rows.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
    })),
  })
})

app.get('/api/dashboard/today', auth('reports'), async (req, res) => {
  req.url = '/api/reports/summary'
  const sales = await query(
    `SELECT COALESCE(SUM(total_cents), 0)::int AS revenue, COUNT(*)::int AS finalized
     FROM orders WHERE status = 'FINALIZADO' AND created_at::date = CURRENT_DATE`,
  )
  const totalOrders = await query('SELECT COUNT(*)::int AS total FROM orders WHERE created_at::date = CURRENT_DATE')
  const pending = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status IN ('RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO')")
  res.json({
    revenue: money(sales.rows[0].revenue),
    finalizedOrders: sales.rows[0].finalized,
    orders: totalOrders.rows[0].total,
    pendingOrders: pending.rows[0].total,
    averageTicket: sales.rows[0].finalized ? money(Math.round(sales.rows[0].revenue / sales.rows[0].finalized)) : 0,
  })
})

app.get('/api/reports/sales', auth('reports'), async (req, res) => {
  const days = Number(req.query.days || 7)
  const result = await query(
    `SELECT created_at::date AS date, COUNT(*)::int AS orders, COALESCE(SUM(total_cents), 0)::int AS total_cents
     FROM orders
     WHERE status = 'FINALIZADO' AND created_at >= CURRENT_DATE - $1::int
     GROUP BY created_at::date
     ORDER BY date DESC`,
    [days],
  )
  res.json(result.rows.map((row) => ({ ...row, total: money(row.total_cents) })))
})

app.get('/api/reports/products', auth('reports'), async (_req, res) => {
  const result = await query(
    `SELECT oi.product_name, SUM(oi.quantity)::int AS quantity, SUM(oi.total_cents)::int AS total_cents
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status = 'FINALIZADO'
     GROUP BY oi.product_name
     ORDER BY quantity DESC
     LIMIT 20`,
  )
  res.json(result.rows.map((row) => ({ ...row, total: money(row.total_cents) })))
})

app.get('/api/reports/payments', auth('reports'), async (_req, res) => {
  const result = await query(
    `SELECT payment_method, COUNT(*)::int AS quantity, COALESCE(SUM(total_cents), 0)::int AS total_cents
     FROM orders
     WHERE status = 'FINALIZADO'
     GROUP BY payment_method
     ORDER BY total_cents DESC`,
  )
  res.json(result.rows.map((row) => ({ ...row, total: money(row.total_cents) })))
})

app.get('/api/reports/inventory-low', auth('reports'), async (_req, res) => {
  const result = await query('SELECT * FROM stock_items WHERE active = TRUE AND quantity <= min_quantity ORDER BY name')
  res.json(result.rows)
})

app.get('/api/customers', auth('customers.view'), async (_req, res) => {
  const result = await query('SELECT * FROM customers ORDER BY points DESC, name LIMIT 100')
  res.json(result.rows)
})

app.get('/api/audit', auth('audit.view'), async (_req, res) => {
  const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.get('/api/audit-logs', auth('audit'), async (_req, res) => {
  const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.get('/api/audit-logs/:id', auth('audit'), async (req, res) => {
  const result = await query('SELECT * FROM audit_logs WHERE id = $1', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Log nao encontrado.' })
  res.json(result.rows[0])
})

app.get('/api/finance/summary', auth('finance'), async (_req, res) => {
  const totals = await query(
    `SELECT method, SUM(CASE WHEN type = 'entrada' THEN amount_cents ELSE -amount_cents END)::int AS total_cents
     FROM cash_movements
     WHERE created_at::date = CURRENT_DATE
     GROUP BY method
     ORDER BY total_cents DESC`,
  )
  const expenses = await query(
    `SELECT COALESCE(SUM(amount_cents), 0)::int AS total_cents
     FROM expenses
     WHERE created_at::date = CURRENT_DATE`,
  )
  const openSession = await query("SELECT * FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
  const revenueCents = totals.rows.reduce((sum, item) => sum + Number(item.total_cents), 0)
  res.json({
    openSession: openSession.rows[0] || null,
    revenueCents,
    revenue: money(revenueCents),
    expensesCents: expenses.rows[0].total_cents,
    expenses: money(expenses.rows[0].total_cents),
    estimatedProfit: money(revenueCents - expenses.rows[0].total_cents),
    byMethod: totals.rows.map((item) => ({ method: item.method, totalCents: item.total_cents, total: money(item.total_cents) })),
  })
})

app.get('/api/cash/current', auth('finance'), async (_req, res) => {
  const openSession = await query("SELECT * FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
  const movements = await query(
    `SELECT * FROM cash_movements
     WHERE created_at::date = CURRENT_DATE
     ORDER BY created_at DESC
     LIMIT 100`,
  )
  res.json({ openSession: openSession.rows[0] || null, movements: movements.rows })
})

app.post(['/api/finance/cash/open', '/api/cash/open'], auth('cash.open'), async (req, res) => {
  const open = await query("SELECT id FROM cash_sessions WHERE status = 'OPEN' LIMIT 1")
  if (open.rows[0]) return res.status(409).json({ error: 'Ja existe um caixa aberto.' })
  const created = await query(
    `INSERT INTO cash_sessions (id, opened_by, opening_amount_cents)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [randomUUID(), req.user.id, Number(req.body.openingAmountCents || 0)],
  )
  await audit(req, 'cash_open', 'cash_sessions', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.post(['/api/finance/cash/close', '/api/cash/close'], auth('cash.close'), async (req, res) => {
  const open = await query("SELECT * FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
  if (!open.rows[0]) return res.status(404).json({ error: 'Nao ha caixa aberto.' })
  const updated = await query(
    `UPDATE cash_sessions SET status = 'CLOSED', closed_by = $1, closing_amount_cents = $2, closed_at = NOW()
     WHERE id = $3 RETURNING *`,
    [req.user.id, Number(req.body.closingAmountCents || 0), open.rows[0].id],
  )
  await audit(req, 'cash_close', 'cash_sessions', updated.rows[0].id, open.rows[0], updated.rows[0])
  res.json(updated.rows[0])
})

app.get('/api/cash/movements', auth('finance'), async (_req, res) => {
  const result = await query('SELECT * FROM cash_movements ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.post('/api/cash/movements', auth('cash.adjust'), async (req, res) => {
  const { type = 'entrada', amountCents, paymentMethod = 'dinheiro', description = 'Movimento manual' } = req.body
  if (!Number.isInteger(amountCents) || amountCents <= 0) return res.status(400).json({ error: 'Valor invalido.' })
  const openSession = await query("SELECT id FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
  const created = await query(
    `INSERT INTO cash_movements (id, cash_session_id, type, method, description, amount_cents, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [randomUUID(), openSession.rows[0]?.id || null, type, paymentMethod, description, amountCents, req.user.id],
  )
  await audit(req, 'cash_movement', 'cash_movements', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.post('/api/cash/expenses', auth('cash.adjust'), async (req, res) => {
  const { description, amountCents } = req.body
  if (!description || !Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: 'Informe descricao e valor da despesa.' })
  }
  const created = await query(
    `INSERT INTO expenses (id, description, amount_cents)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [randomUUID(), description, amountCents],
  )
  const openSession = await query("SELECT id FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1")
  await query(
    `INSERT INTO cash_movements (id, cash_session_id, type, method, description, amount_cents, created_by)
     VALUES ($1, $2, 'saida', 'dinheiro', $3, $4, $5)`,
    [randomUUID(), openSession.rows[0]?.id || null, `Despesa: ${description}`, amountCents, req.user.id],
  )
  await audit(req, 'expense', 'expenses', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.get('/api/printing/jobs', auth('printing'), async (_req, res) => {
  const result = await query("SELECT * FROM print_jobs WHERE status IN ('PENDING', 'FAILED', 'RETRYING') ORDER BY created_at ASC LIMIT 50")
  res.json(result.rows)
})

app.post('/api/printing/jobs/:id/printed', auth('printing.retry'), async (req, res) => {
  const updated = await query("UPDATE print_jobs SET status = 'PRINTED', updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id])
  if (!updated.rows[0]) return res.status(404).json({ error: 'Impressao nao encontrada.' })
  await audit(req, 'printed', 'print_jobs', req.params.id, null, updated.rows[0])
  res.json(updated.rows[0])
})

app.post('/api/printing/jobs/:id/failed', auth('printing.retry'), async (req, res) => {
  const updated = await query(
    "UPDATE print_jobs SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [req.body.error || 'Falha informada pelo agente de impressao.', req.params.id],
  )
  if (!updated.rows[0]) return res.status(404).json({ error: 'Impressao nao encontrada.' })
  res.json(updated.rows[0])
})

app.post('/api/printing/test', auth('printing'), async (req, res) => {
  const created = await query(
    `INSERT INTO print_jobs (id, status, content)
     VALUES ($1, 'PENDING', $2)
     RETURNING *`,
    [randomUUID(), 'SALGADOS R\nTeste de impressao\nAgente local ainda precisa ser configurado.'],
  )
  await audit(req, 'test', 'print_jobs', created.rows[0].id, null, created.rows[0])
  res.status(201).json(created.rows[0])
})

app.get('/api/printing/status', auth('printing'), async (_req, res) => {
  const pending = await query("SELECT COUNT(*)::int AS total FROM print_jobs WHERE status = 'PENDING'")
  const failed = await query("SELECT COUNT(*)::int AS total FROM print_jobs WHERE status = 'FAILED'")
  res.json({
    mode: process.env.PRINTING_MODE || 'mock',
    configured: false,
    message: 'Agente de impressao ainda nao configurado nesta maquina.',
    pending: pending.rows[0].total,
    failed: failed.rows[0].total,
  })
})

app.get('/api/notifications', auth('orders'), async (_req, res) => {
  const result = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50')
  res.json(result.rows)
})

app.patch('/api/notifications/:id/read', auth('orders'), async (req, res) => {
  const updated = await query('UPDATE notifications SET read_at = NOW() WHERE id = $1 RETURNING *', [req.params.id])
  if (!updated.rows[0]) return res.status(404).json({ error: 'Notificacao nao encontrada.' })
  res.json(updated.rows[0])
})

app.get('/api/settings', async (_req, res) => {
  const result = await query('SELECT key, value, updated_at FROM store_settings ORDER BY key')
  res.json(Object.fromEntries(result.rows.map((row) => [row.key, { ...row.value, updatedAt: row.updated_at }])))
})

app.patch('/api/settings', auth('settings.update'), async (req, res) => {
  const delivery = req.body.delivery
  if (delivery) {
    await query(
      `INSERT INTO store_settings (key, value, updated_at)
       VALUES ('delivery', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [
        JSON.stringify({
          delivery_enabled: Boolean(delivery.delivery_enabled),
          delivery_fee_default: Number(delivery.delivery_fee_default || 0),
          delivery_notes: delivery.delivery_notes || '',
        }),
      ],
    )
    await audit(req, 'update', 'store_settings', 'delivery', null, delivery)
  }
  const result = await query('SELECT key, value, updated_at FROM store_settings ORDER BY key')
  res.json(Object.fromEntries(result.rows.map((row) => [row.key, { ...row.value, updatedAt: row.updated_at }])))
})

app.get('/api/backups/status', auth('backups.view'), async (_req, res) => {
  const last = await query('SELECT * FROM backups_log ORDER BY created_at DESC LIMIT 1')
  res.json({
    provider: process.env.BACKUP_PROVIDER || 'local',
    directory: '/opt/salgados-r/backups',
    retentionDays: 7,
    lastBackup: last.rows[0] || null,
    nextExpected: 'diario via cron na VM',
    configured: false,
    message: 'Estrutura criada. Agendamento real depende do cron/servico da VM.',
  })
})

app.get('/api/security/status', auth('security'), async (_req, res) => {
  const failures = await query("SELECT * FROM audit_logs WHERE action = 'login_failed' ORDER BY created_at DESC LIMIT 10")
  res.json({
    api: 'online',
    database: 'postgresql',
    auth: 'jwt-bcrypt',
    cors: process.env.APP_ORIGIN || 'https://salgadosr.duckdns.org',
    loginRateLimit: 'ativo',
    recentLoginFailures: failures.rows,
  })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

initDb()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`SALGADOS R API running on :${port}`)
    })
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
