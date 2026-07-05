import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
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

const permissions = {
  SUPER_US: ['*'],
  ADMIN: ['products', 'orders', 'stock', 'reports', 'users', 'finance', 'audit', 'printing', 'settings', 'security'],
  GERENTE: ['products', 'orders', 'stock', 'reports', 'finance', 'printing', 'settings'],
  ATENDENTE: ['orders'],
}

const orderStatuses = ['RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'FINALIZADO', 'CANCELADO']

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

function userDto(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
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

function hasPermission(user, permission) {
  if (!user) return false
  const userPermissions = permissions[user.role] || []
  return userPermissions.includes('*') || userPermissions.includes(permission)
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

    if (!hasPermission(req.user, permission)) return res.status(403).json({ error: 'Permissao insuficiente.' })
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
  `)

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
         SET description = CASE WHEN description = '' THEN $6 ELSE description END,
             featured = featured OR $7
         WHERE id = $1`,
        product,
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
  res.json({ hasUsers: count.rows[0].total > 0, roles: Object.keys(permissions) })
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

app.post('/api/users', auth('users'), async (req, res) => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password || !permissions[role]) return res.status(400).json({ error: 'Usuario invalido.' })

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

app.get('/api/products', async (_req, res) => {
  const result = await query('SELECT * FROM products ORDER BY category, sort_order, price_cents, name')
  res.json(result.rows.map(productDto))
})

app.post('/api/products', auth('products'), async (req, res) => {
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

app.patch('/api/products/:id', auth('products'), async (req, res) => {
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

app.patch('/api/products/:id/availability', auth('products'), async (req, res) => {
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

app.get('/api/categories', async (_req, res) => {
  const result = await query('SELECT * FROM categories WHERE active = TRUE ORDER BY sort_order, name')
  res.json(result.rows)
})

app.post('/api/categories', auth('products'), async (req, res) => {
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

app.patch('/api/categories/:id', auth('products'), async (req, res) => {
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

app.patch('/api/orders/:id/status', auth('orders'), async (req, res) => {
  const legacyMap = {
    novo: 'RECEBIDO',
    preparando: 'PREPARANDO',
    pronto: 'PRONTO',
    entregue: 'FINALIZADO',
    cancelado: 'CANCELADO',
  }
  const nextStatus = legacyMap[req.body.status] || req.body.status
  if (!orderStatuses.includes(nextStatus)) return res.status(400).json({ error: 'Status invalido.' })

  const current = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Pedido nao encontrado.' })

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

app.patch('/api/orders/:id/cancel', auth('orders'), async (req, res) => {
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

app.post('/api/inventory', auth('stock'), async (req, res) => {
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

app.patch('/api/inventory/:id', auth('stock'), async (req, res) => {
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

app.post('/api/inventory/:id/movement', auth('stock'), async (req, res) => {
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

app.patch('/api/stock/:id', auth('stock'), async (req, res) => {
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

app.get('/api/customers', auth('reports'), async (_req, res) => {
  const result = await query('SELECT * FROM customers ORDER BY points DESC, name LIMIT 100')
  res.json(result.rows)
})

app.get('/api/audit', auth('users'), async (_req, res) => {
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

app.post(['/api/finance/cash/open', '/api/cash/open'], auth('finance'), async (req, res) => {
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

app.post(['/api/finance/cash/close', '/api/cash/close'], auth('finance'), async (req, res) => {
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

app.post('/api/cash/movements', auth('finance'), async (req, res) => {
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

app.post('/api/cash/expenses', auth('finance'), async (req, res) => {
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

app.post('/api/printing/jobs/:id/printed', auth('printing'), async (req, res) => {
  const updated = await query("UPDATE print_jobs SET status = 'PRINTED', updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id])
  if (!updated.rows[0]) return res.status(404).json({ error: 'Impressao nao encontrada.' })
  await audit(req, 'printed', 'print_jobs', req.params.id, null, updated.rows[0])
  res.json(updated.rows[0])
})

app.post('/api/printing/jobs/:id/failed', auth('printing'), async (req, res) => {
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

app.patch('/api/settings', auth('settings'), async (req, res) => {
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

app.get('/api/backups/status', auth('security'), async (_req, res) => {
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
