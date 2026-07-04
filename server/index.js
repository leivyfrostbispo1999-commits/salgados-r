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

const productsSeed = [
  ['pastel-carne', 'Pastel de Carne', 'pasteis', 'ambos', 500],
  ['pastel-frango', 'Pastel de Frango', 'pasteis', 'ambos', 500],
  ['pastel-misto', 'Pastel Misto', 'pasteis', 'ambos', 500],
  ['pastel-calabresa-queijo', 'Pastel de Calabresa com Queijo', 'pasteis', 'ambos', 600],
  ['pastel-frango-queijo', 'Pastel de Frango com Queijo', 'pasteis', 'ambos', 700],
  ['coxinha', 'Coxinha', 'salgados', 'ambos', 400],
  ['enroladinho', 'Enroladinho', 'salgados', 'ambos', 400],
  ['suco-goiaba-pequeno', 'Suco de Goiaba pequeno - copo', 'sucos', 'presencial', 200],
  ['suco-goiaba-grande', 'Suco de Goiaba grande - copo', 'sucos', 'presencial', 400],
  ['suco-maracuja-pequeno', 'Suco de Maracuja pequeno - copo', 'sucos', 'presencial', 200],
  ['suco-maracuja-grande', 'Suco de Maracuja grande - copo', 'sucos', 'presencial', 400],
  ['suco-natural-garrafinha-300ml', 'Suco Natural na Garrafinha 300 ml', 'sucos', 'delivery', 400],
  ['refil-suco-100ml', 'Refil de Suco - 100 ml', 'refil', 'ambos', 100],
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
  ADMIN: ['products', 'orders', 'stock', 'reports', 'users'],
  GERENTE: ['products', 'orders', 'stock', 'reports'],
  ATENDENTE: ['orders'],
}

function money(cents) {
  return Number(cents || 0) / 100
}

function productDto(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    availability: row.availability,
    priceCents: row.price_cents,
    price: money(row.price_cents),
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
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    neighborhood: row.neighborhood,
    channel: row.channel,
    paymentMethod: row.payment_method,
    couponCode: row.coupon_code,
    notes: row.notes,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    subtotal: money(row.subtotal_cents),
    discountCents: row.discount_cents,
    discount: money(row.discount_cents),
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
    `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, before_data, after_data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      randomUUID(),
      req.user?.id || null,
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
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      before_data JSONB,
      after_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const productCount = await query('SELECT COUNT(*)::int AS total FROM products')
  if (productCount.rows[0].total === 0) {
    for (const product of productsSeed) {
      await query(
        `INSERT INTO products (id, name, category, availability, price_cents)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
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
}

async function getProduct(id) {
  const result = await query('SELECT * FROM products WHERE id = $1 AND active = TRUE', [id])
  return result.rows[0]
}

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ ok: true, service: 'salgados-r-api', database: 'postgresql', timestamp: new Date().toISOString() })
})

app.get('/api/auth/status', async (_req, res) => {
  const count = await query('SELECT COUNT(*)::int AS total FROM users')
  res.json({ hasUsers: count.rows[0].total > 0, roles: Object.keys(permissions) })
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

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const result = await query('SELECT * FROM users WHERE email = $1 AND active = TRUE', [String(email || '').toLowerCase()])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'Email ou senha invalidos.' })
  }

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

app.get('/api/products', async (_req, res) => {
  const result = await query('SELECT * FROM products WHERE active = TRUE ORDER BY category, price_cents, name')
  res.json(result.rows.map(productDto))
})

app.post('/api/products', auth('products'), async (req, res) => {
  const { name, category, availability, priceCents, imageUrl = '', promotionPriceCents = null, promotionLabel = '' } = req.body
  if (!name || !category || !availability || !Number.isInteger(priceCents)) {
    return res.status(400).json({ error: 'Produto invalido.' })
  }

  const created = await query(
    `INSERT INTO products (
      id, name, category, availability, price_cents, image_url, promotion_price_cents, promotion_label
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [randomUUID(), name, category, availability, priceCents, imageUrl, promotionPriceCents, promotionLabel],
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
     SET name = $1, category = $2, availability = $3, price_cents = $4, active = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      req.body.name ?? row.name,
      req.body.category ?? row.category,
      req.body.availability ?? row.availability,
      Number.isInteger(req.body.priceCents) ? req.body.priceCents : row.price_cents,
      typeof req.body.active === 'boolean' ? req.body.active : row.active,
      req.params.id,
    ],
  )
  await audit(req, 'update', 'products', req.params.id, productDto(row), productDto(updated.rows[0]))
  res.json(productDto(updated.rows[0]))
})

app.get('/api/orders', auth('orders'), async (req, res) => {
  const status = req.query.status
  const result = status
    ? await query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status])
    : await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100')

  res.json(await Promise.all(result.rows.map(orderDto)))
})

app.post('/api/orders', async (req, res) => {
  const {
    customerName,
    phone = '',
    address = '',
    neighborhood = '',
    channel = 'delivery',
    paymentMethod = 'pix',
    couponCode = '',
    notes = '',
    items = [],
  } = req.body
  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pedido precisa de cliente e ao menos um item.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const orderItems = []
    for (const item of items) {
      const product = await getProduct(item.productId)
      const quantity = Number(item.quantity || 1)
      if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error('Item invalido no pedido.')
      if (channel === 'delivery' && product.availability === 'presencial') {
        throw new Error(`${product.name} e somente para consumo no estabelecimento.`)
      }
      orderItems.push({ id: randomUUID(), product, quantity, totalCents: product.price_cents * quantity })
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalCents, 0)
    let discountCents = 0
    if (couponCode) {
      const coupon = await client.query('SELECT * FROM coupons WHERE code = $1 AND active = TRUE', [couponCode.toUpperCase()])
      if (coupon.rows[0]) discountCents = Math.floor((subtotal * coupon.rows[0].discount_percent) / 100)
    }
    const total = Math.max(subtotal - discountCents, 0)

    let customerId = null
    if (phone) {
      const existing = await client.query('SELECT * FROM customers WHERE phone = $1', [phone])
      customerId = existing.rows[0]?.id || randomUUID()
      if (existing.rows[0]) {
        await client.query(
          `UPDATE customers SET name = $1, address = $2, neighborhood = $3, points = points + $4, updated_at = NOW()
           WHERE phone = $5`,
          [customerName, address, neighborhood, Math.floor(total / 100), phone],
        )
      } else {
        await client.query(
          `INSERT INTO customers (id, name, phone, address, neighborhood, points)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [customerId, customerName, phone, address, neighborhood, Math.floor(total / 100)],
        )
      }
    }

    const orderId = randomUUID()
    await client.query(
      `INSERT INTO orders (
        id, customer_id, customer_name, phone, address, neighborhood, channel, payment_method,
        coupon_code, notes, status, subtotal_cents, discount_cents, total_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'novo', $11, $12, $13)`,
      [
        orderId,
        customerId,
        customerName,
        phone,
        address,
        neighborhood,
        channel,
        paymentMethod,
        couponCode.toUpperCase(),
        notes,
        subtotal,
        discountCents,
        total,
      ],
    )

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, unit_price_cents, quantity, total_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [item.id, orderId, item.product.id, item.product.name, item.product.price_cents, item.quantity, item.totalCents],
      )
    }

    await client.query(
      `INSERT INTO cash_movements (id, order_id, type, method, description, amount_cents)
       VALUES ($1, $2, 'entrada', $3, $4, $5)`,
      [randomUUID(), orderId, paymentMethod, `Pedido ${orderId.slice(0, 8)}`, total],
    )

    await client.query('COMMIT')
    const order = await query('SELECT * FROM orders WHERE id = $1', [orderId])
    res.status(201).json(await orderDto(order.rows[0]))
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: error.message || 'Erro ao criar pedido.' })
  } finally {
    client.release()
  }
})

app.patch('/api/orders/:id/status', auth('orders'), async (req, res) => {
  const allowed = new Set(['novo', 'preparando', 'pronto', 'entregue', 'cancelado'])
  if (!allowed.has(req.body.status)) return res.status(400).json({ error: 'Status invalido.' })

  const current = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
  if (!current.rows[0]) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  const updated = await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [
    req.body.status,
    req.params.id,
  ])

  if (req.body.status === 'cancelado' && current.rows[0].status !== 'cancelado' && current.rows[0].phone) {
    await query(
      `UPDATE customers
       SET points = GREATEST(points - $1, 0), updated_at = NOW()
       WHERE phone = $2`,
      [Math.floor(current.rows[0].total_cents / 100), current.rows[0].phone],
    )
  }

  await audit(req, 'status', 'orders', req.params.id, current.rows[0], updated.rows[0])
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
     WHERE status != 'cancelado' AND created_at::date = CURRENT_DATE`,
  )
  const pending = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status IN ('novo', 'preparando')")
  const delivered = await query("SELECT COUNT(*)::int AS total FROM orders WHERE status = 'entregue' AND created_at::date = CURRENT_DATE")
  const lowStock = await query('SELECT COUNT(*)::int AS total FROM stock_items WHERE quantity <= min_quantity')
  const customers = await query('SELECT COUNT(*)::int AS total FROM customers')
  const topProducts = await query(
    `SELECT oi.product_name, SUM(oi.quantity)::int AS quantity, SUM(oi.total_cents)::int AS total_cents
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelado'
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
    orders: orderCount,
    averageTicket: orderCount > 0 ? money(Math.round(revenue / orderCount)) : 0,
    pendingOrders: pending.rows[0].total,
    deliveredOrders: delivered.rows[0].total,
    lowStockItems: lowStock.rows[0].total,
    loyaltyCustomers: customers.rows[0].total,
    topProducts: topProducts.rows.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
    })),
  })
})

app.get('/api/customers', auth('reports'), async (_req, res) => {
  const result = await query('SELECT * FROM customers ORDER BY points DESC, name LIMIT 100')
  res.json(result.rows)
})

app.get('/api/audit', auth('users'), async (_req, res) => {
  const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
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
