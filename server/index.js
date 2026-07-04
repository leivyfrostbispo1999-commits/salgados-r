import express from 'express'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data')
const dbPath = process.env.DB_PATH || join(dataDir, 'salgados-r.sqlite')
const port = Number(process.env.PORT || 3001)

mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')

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

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      availability TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT,
      channel TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_cents INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      min_quantity REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loyalty_customers (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `)

  const productCount = db.prepare('SELECT COUNT(*) AS total FROM products').get().total
  if (productCount === 0) {
    const insert = db.prepare(`
      INSERT INTO products (id, name, category, availability, price_cents)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const product of productsSeed) insert.run(...product)
  }

  const stockCount = db.prepare('SELECT COUNT(*) AS total FROM stock_items').get().total
  if (stockCount === 0) {
    const insert = db.prepare(`
      INSERT INTO stock_items (id, name, unit, quantity, min_quantity, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const item of stockSeed) insert.run(randomUUID(), ...item, new Date().toISOString())
  }
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
    active: Boolean(row.active),
  }
}

function orderDto(row) {
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid')
    .all(row.id)
    .map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPriceCents: item.unit_price_cents,
      unitPrice: money(item.unit_price_cents),
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
    }))

  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    channel: row.channel,
    notes: row.notes,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    subtotal: money(row.subtotal_cents),
    totalCents: row.total_cents,
    total: money(row.total_cents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  }
}

function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(id)
}

initDb()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'salgados-r-api', timestamp: new Date().toISOString() })
})

app.get('/api/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY category, price_cents, name').all()
  res.json(rows.map(productDto))
})

app.post('/api/products', (req, res) => {
  const { name, category, availability, priceCents } = req.body
  if (!name || !category || !availability || !Number.isInteger(priceCents)) {
    return res.status(400).json({ error: 'Produto invalido.' })
  }

  const id = randomUUID()
  db.prepare(
    'INSERT INTO products (id, name, category, availability, price_cents) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name, category, availability, priceCents)

  res.status(201).json(productDto(db.prepare('SELECT * FROM products WHERE id = ?').get(id)))
})

app.patch('/api/products/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Produto nao encontrado.' })

  const next = {
    name: req.body.name ?? current.name,
    category: req.body.category ?? current.category,
    availability: req.body.availability ?? current.availability,
    priceCents: Number.isInteger(req.body.priceCents) ? req.body.priceCents : current.price_cents,
    active: typeof req.body.active === 'boolean' ? Number(req.body.active) : current.active,
  }

  db.prepare(
    'UPDATE products SET name = ?, category = ?, availability = ?, price_cents = ?, active = ? WHERE id = ?',
  ).run(next.name, next.category, next.availability, next.priceCents, next.active, req.params.id)

  res.json(productDto(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)))
})

app.get('/api/orders', (req, res) => {
  const status = req.query.status
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all()

  res.json(rows.map(orderDto))
})

app.post('/api/orders', (req, res) => {
  const { customerName, phone = '', channel = 'delivery', notes = '', items = [] } = req.body
  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pedido precisa de cliente e ao menos um item.' })
  }

  const orderItems = []
  for (const item of items) {
    const product = getProduct(item.productId)
    const quantity = Number(item.quantity || 1)

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Item invalido no pedido.' })
    }

    if (channel === 'delivery' && product.availability === 'presencial') {
      return res.status(400).json({ error: `${product.name} e somente para consumo no estabelecimento.` })
    }

    orderItems.push({
      id: randomUUID(),
      product,
      quantity,
      totalCents: product.price_cents * quantity,
    })
  }

  const now = new Date().toISOString()
  const id = randomUUID()
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalCents, 0)

  db.exec('BEGIN')
  try {
    db.prepare(`
      INSERT INTO orders (
        id, customer_name, phone, channel, notes, status, subtotal_cents, total_cents, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, customerName, phone, channel, notes, 'novo', subtotal, subtotal, now, now)

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, product_name, unit_price_cents, quantity, total_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const item of orderItems) {
      insertItem.run(
        item.id,
        id,
        item.product.id,
        item.product.name,
        item.product.price_cents,
        item.quantity,
        item.totalCents,
      )
    }

    db.prepare(
      'INSERT INTO cash_movements (id, type, description, amount_cents, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(randomUUID(), 'entrada', `Pedido ${id.slice(0, 8)}`, subtotal, now)

    if (phone) {
      const current = db.prepare('SELECT * FROM loyalty_customers WHERE phone = ?').get(phone)
      const points = Math.floor(subtotal / 100)
      if (current) {
        db.prepare(
          'UPDATE loyalty_customers SET points = points + ?, customer_name = ?, updated_at = ? WHERE phone = ?',
        ).run(points, customerName, now, phone)
      } else {
        db.prepare(
          'INSERT INTO loyalty_customers (id, customer_name, phone, points, updated_at) VALUES (?, ?, ?, ?, ?)',
        ).run(randomUUID(), customerName, phone, points, now)
      }
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  res.status(201).json(orderDto(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)))
})

app.patch('/api/orders/:id/status', (req, res) => {
  const allowed = new Set(['novo', 'preparando', 'pronto', 'entregue', 'cancelado'])
  if (!allowed.has(req.body.status)) return res.status(400).json({ error: 'Status invalido.' })

  const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(
    req.body.status,
    new Date().toISOString(),
    req.params.id,
  )

  if (req.body.status === 'cancelado' && current.status !== 'cancelado' && current.phone) {
    const points = Math.floor(current.total_cents / 100)
    db.prepare(
      `UPDATE loyalty_customers
       SET points = CASE WHEN points - ? < 0 THEN 0 ELSE points - ? END,
           updated_at = ?
       WHERE phone = ?`,
    ).run(points, points, new Date().toISOString(), current.phone)
  }

  res.json(orderDto(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)))
})

app.get('/api/stock', (_req, res) => {
  const rows = db.prepare('SELECT * FROM stock_items ORDER BY name').all()
  res.json(
    rows.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.min_quantity,
      low: item.quantity <= item.min_quantity,
      updatedAt: item.updated_at,
    })),
  )
})

app.patch('/api/stock/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Item de estoque nao encontrado.' })

  const quantity = Number(req.body.quantity ?? current.quantity)
  const minQuantity = Number(req.body.minQuantity ?? current.min_quantity)
  if (Number.isNaN(quantity) || Number.isNaN(minQuantity)) {
    return res.status(400).json({ error: 'Quantidade invalida.' })
  }

  db.prepare('UPDATE stock_items SET quantity = ?, min_quantity = ?, updated_at = ? WHERE id = ?').run(
    quantity,
    minQuantity,
    new Date().toISOString(),
    req.params.id,
  )

  res.json(db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id))
})

app.get('/api/reports/summary', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const sales = db
    .prepare(
      `SELECT
        COALESCE(SUM(total_cents), 0) AS revenue,
        COUNT(*) AS orders
       FROM orders
       WHERE status != 'cancelado' AND substr(created_at, 1, 10) = ?`,
    )
    .get(today)
  const pending = db.prepare("SELECT COUNT(*) AS total FROM orders WHERE status IN ('novo', 'preparando')").get()
  const lowStock = db.prepare('SELECT COUNT(*) AS total FROM stock_items WHERE quantity <= min_quantity').get()
  const loyalty = db.prepare('SELECT COUNT(*) AS total FROM loyalty_customers').get()

  const topProducts = db
    .prepare(
      `SELECT oi.product_name, SUM(oi.quantity) AS quantity, SUM(oi.total_cents) AS total_cents
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelado'
       GROUP BY oi.product_name
       ORDER BY quantity DESC
       LIMIT 5`,
    )
    .all()

  res.json({
    today,
    revenueCents: sales.revenue,
    revenue: money(sales.revenue),
    orders: sales.orders,
    pendingOrders: pending.total,
    lowStockItems: lowStock.total,
    loyaltyCustomers: loyalty.total,
    topProducts: topProducts.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      totalCents: item.total_cents,
      total: money(item.total_cents),
    })),
  })
})

app.get('/api/loyalty', (_req, res) => {
  res.json(db.prepare('SELECT * FROM loyalty_customers ORDER BY points DESC, customer_name LIMIT 50').all())
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`SALGADOS R API running on :${port}`)
})
