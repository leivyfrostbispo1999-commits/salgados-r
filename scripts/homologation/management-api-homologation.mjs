import assert from 'node:assert/strict'
import pg from 'pg'

const apiBase = process.env.API_BASE || 'http://localhost:3999/api'
const databaseUrl = process.env.DATABASE_URL
const pool = new pg.Pool(
  databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'salgados_r_homolog',
        user: process.env.PGUSER || 'homolog_user',
        password: process.env.PGPASSWORD || 'homolog_password',
      },
)

const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`

async function request(path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.arrayBuffer()
  if (!response.ok) {
    const error = payload?.error || `${response.status} ${response.statusText}`
    throw new Error(`${method} ${path}: ${error}`)
  }
  return { response, payload }
}

async function expectDbFailure(label, statement, values, code) {
  try {
    await pool.query(statement, values)
  } catch (error) {
    assert.equal(error.code, code, `${label} should fail with ${code}`)
    return
  }
  throw new Error(`${label} was accepted unexpectedly`)
}

async function main() {
  const version = await pool.query('SELECT version() AS version')
  console.log(`POSTGRES_VERSION=${version.rows[0].version}`)

  const tables = await pool.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename = ANY($1::text[])
     ORDER BY tablename`,
    [[
      'product_price_history',
      'product_cost_history',
      'commercial_settings',
      'production_entries',
      'production_entry_items',
      'management_sales',
      'management_sale_items',
      'payment_entries',
      'receivables',
      'receivable_payments',
      'expense_categories',
      'report_exports',
    ]],
  )
  assert.equal(tables.rowCount, 12, 'all management tables should exist')
  console.log(`TABLES_OK=${tables.rows.map((row) => row.tablename).join(',')}`)

  const constraints = await pool.query("SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%' ORDER BY conname")
  assert.ok(constraints.rowCount >= 14, 'management check constraints should exist')
  console.log(`CHECK_CONSTRAINTS_OK=${constraints.rowCount}`)

  await expectDbFailure('negative price', 'INSERT INTO product_price_history (id, product_id, price_cents) VALUES ($1,$2,$3)', [`hml-negative-price-${unique}`, 'pastel-carne', -1], '23514')
  await expectDbFailure('negative cost', 'INSERT INTO product_cost_history (id, product_id, cost_cents) VALUES ($1,$2,$3)', [`hml-negative-cost-${unique}`, 'pastel-carne', -1], '23514')
  await expectDbFailure('invalid production status', 'INSERT INTO production_entries (id, production_date, status) VALUES ($1,CURRENT_DATE,$2)', [`hml-bad-production-status-${unique}`, 'INVALIDO'], '23514')
  await expectDbFailure(
    'negative production quantity',
    'INSERT INTO production_entry_items (id, production_entry_id, product_name_snapshot, category, quantity_produced) VALUES ($1,$2,$3,$4,$5)',
    [`hml-negative-production-item-${unique}`, 'missing-entry', 'Pastel', 'pasteis', -1],
    '23514',
  )
  await expectDbFailure(
    'negative sale money',
    'INSERT INTO management_sales (id, sale_code, total_cents, paid_cents, debt_cents, financial_status, status) VALUES ($1,$2,$3,0,0,$4,$5)',
    [`hml-bad-sale-money-${unique}`, `BAD-MONEY-${unique}`, -1, 'PAGO', 'CONFIRMADO'],
    '23514',
  )
  await expectDbFailure(
    'invalid sale status',
    'INSERT INTO management_sales (id, sale_code, total_cents, paid_cents, debt_cents, financial_status, status) VALUES ($1,$2,0,0,0,$3,$4)',
    [`hml-bad-sale-status-${unique}`, `BAD-STATUS-${unique}`, 'PAGO', 'INVALIDO'],
    '23514',
  )
  await expectDbFailure('zero payment', 'INSERT INTO payment_entries (id, method, amount_cents) VALUES ($1,$2,$3)', [`hml-zero-payment-${unique}`, 'pix', 0], '23514')
  await expectDbFailure('bad payment method', 'INSERT INTO payment_entries (id, method, amount_cents) VALUES ($1,$2,$3)', [`hml-bad-payment-method-${unique}`, 'cheque', 100], '23514')
  await expectDbFailure(
    'negative receivable',
    'INSERT INTO receivables (id, original_amount_cents, paid_amount_cents, outstanding_amount_cents, status) VALUES ($1,100,0,$2,$3)',
    [`hml-negative-receivable-${unique}`, -1, 'ABERTA'],
    '23514',
  )
  await expectDbFailure(
    'missing product reference',
    'INSERT INTO management_sale_items (id, sale_id, product_id, product_name_snapshot, category, quantity, unit_price_cents, subtotal_cents) VALUES ($1,$2,$3,$4,$5,1,100,100)',
    [`hml-missing-product-${unique}`, 'missing-sale', 'produto-inexistente', 'Produto', 'pasteis'],
    '23503',
  )
  console.log('CONSTRAINT_FAILURES_OK=10')

  const bootstrap = await request('/auth/bootstrap', {
    method: 'POST',
    body: {
      name: 'Usuario Homologacao',
      email: `hml-${unique}@example.test`,
      password: 'Homologacao123!',
    },
  })
  const token = bootstrap.payload.token
  assert.ok(token, 'bootstrap should return auth token')
  console.log('AUTH_BOOTSTRAP_OK=SUPER_US')

  const products = (await request('/products', { token })).payload
  const byId = Object.fromEntries(products.map((product) => [product.id, product]))
  assert.ok(byId['pastel-carne'] && byId.coxinha && byId.enroladinho && byId['refil-suco-100ml'], 'seed products should exist')
  console.log(`PRODUCTS_OK=${products.length}`)

  await request('/management/refill-rule', {
    token,
    method: 'PATCH',
    body: { blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' },
  })

  for (const [productId, costCents] of [
    ['pastel-carne', 220],
    ['coxinha', 180],
    ['refil-suco-100ml', 40],
  ]) {
    await request(`/management/costs-prices/products/${productId}`, {
      token,
      method: 'PATCH',
      body: { costCents, validFrom: new Date().toISOString().slice(0, 10), notes: `HML ${unique}` },
    })
  }
  console.log('COST_HISTORY_OK=3')

  const production = await request('/management/production', {
    token,
    method: 'POST',
    body: {
      productionDate: new Date().toISOString().slice(0, 10),
      responsible: 'Equipe HML',
      status: 'CONFIRMADO',
      items: [
        { productId: 'pastel-carne', quantityProduced: 10, quantityLost: 1, unit: 'unidade' },
        { productId: 'refil-suco-100ml', quantityProduced: 4000, quantityLost: 200, unit: 'ml', volumeMl: 4000 },
      ],
    },
  })
  assert.ok(production.payload.id, 'production should be created')
  console.log('PRODUCTION_CREATE_OK=PASTEL_10_LOSS_1;SUCO_4000ML_LOSS_200ML')

  const saleBody = {
    idempotencyKey: `sale-${unique}`,
    saleDate: new Date().toISOString(),
    customerName: 'Cliente Homologacao',
    items: [
      { productId: 'pastel-carne', quantity: 10 },
      { productId: 'coxinha', quantity: 4 },
      { productId: 'refil-suco-100ml', quantity: 1, volumeMl: 300 },
    ],
    payments: [
      { method: 'pix', amountCents: 2000 },
      { method: 'dinheiro', amountCents: 1000 },
      { method: 'divida', amountCents: 3900 },
    ],
  }
  const saleA = await request('/management/sales', { token, method: 'POST', body: saleBody, headers: { 'Idempotency-Key': saleBody.idempotencyKey } })
  const saleB = await request('/management/sales', { token, method: 'POST', body: saleBody, headers: { 'Idempotency-Key': saleBody.idempotencyKey } })
  assert.equal(saleA.payload.id, saleB.payload.id, 'idempotent sale should return same id')
  assert.equal(saleA.payload.totalCents, 6900, 'manual sale total should include refill rule')
  assert.equal(saleA.payload.paidCents, 3000, 'manual sale paid cents')
  assert.equal(saleA.payload.debtCents, 3900, 'manual sale debt cents')
  const duplicated = await pool.query('SELECT COUNT(*)::int AS total FROM management_sales WHERE idempotency_key = $1', [saleBody.idempotencyKey])
  assert.equal(duplicated.rows[0].total, 1, 'idempotent sale should persist once')
  console.log(`SALE_IDEMPOTENCY_OK=${saleA.payload.id}`)

  const receivables = await request('/management/receivables', { token })
  const receivable = receivables.payload.find((item) => item.status === 'ABERTA' && item.outstandingAmount === 39)
  assert.ok(receivable, 'open receivable should exist for manual sale')
  const [payA, payB] = await Promise.allSettled([
    request(`/management/receivables/${receivable.id}/payments`, { token, method: 'POST', body: { amountCents: 2500, paymentMethod: 'pix' } }),
    request(`/management/receivables/${receivable.id}/payments`, { token, method: 'POST', body: { amountCents: 2500, paymentMethod: 'dinheiro' } }),
  ])
  const concurrentSuccesses = [payA, payB].filter((result) => result.status === 'fulfilled').length
  assert.equal(concurrentSuccesses, 1, 'only one concurrent overpayment should pass')
  const receivableAfter = await pool.query('SELECT outstanding_amount_cents FROM receivables WHERE id = $1', [receivable.id])
  assert.equal(receivableAfter.rows[0].outstanding_amount_cents, 1400, 'concurrent payment should not make balance negative')
  console.log('RECEIVABLE_CONCURRENCY_OK=ONE_PAYMENT_ACCEPTED_BALANCE_1400')

  const saleDebtOnly = await request('/management/sales', {
    token,
    method: 'POST',
    body: {
      idempotencyKey: `cancel-${unique}`,
      items: [{ productId: 'enroladinho', quantity: 1 }],
      payments: [{ method: 'divida', amountCents: 400 }],
    },
  })
  await request(`/management/sales/${saleDebtOnly.payload.id}/cancel`, { token, method: 'POST', body: { reason: 'Cancelamento HML sem pagamento' } })
  console.log('SALE_CANCEL_OK=NO_PAID_AMOUNT')

  const salePaid = await request('/management/sales', {
    token,
    method: 'POST',
    body: {
      idempotencyKey: `refund-${unique}`,
      items: [{ productId: 'coxinha', quantity: 1 }],
      payments: [{ method: 'pix', amountCents: 400 }],
    },
  })
  await request(`/management/sales/${salePaid.payload.id}/refund`, { token, method: 'POST', body: { reason: 'Estorno HML pagamento pix', method: 'pix' } })
  console.log('SALE_REFUND_OK=PAID_AMOUNT')

  const summary = (await request('/management/reports/summary', { token })).payload
  assert.ok(summary.expectedRevenueCents >= 6900, 'summary should include confirmed sale')
  assert.ok(summary.refundsCents >= 400, 'summary should include refund')
  console.log(`SUMMARY_OK=EXPECTED_${summary.expectedRevenueCents}_REFUNDS_${summary.refundsCents}`)

  const csv = await request('/management/reports.csv', { token })
  const csvText = Buffer.from(csv.payload).toString('utf8')
  assert.ok(csvText.startsWith('\uFEFF'), 'CSV should include UTF-8 BOM')
  assert.ok(csvText.includes('"Faturamento esperado"'), 'CSV should include expected columns')
  console.log(`CSV_OK=${csvText.length}_BYTES`)

  const pdf = await request('/management/reports/pdf', {
    token,
    method: 'POST',
    body: { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) },
  })
  const pdfBuffer = Buffer.from(pdf.payload)
  assert.equal(pdf.response.headers.get('content-type'), 'application/pdf')
  assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-')
  console.log(`PDF_OK=${pdfBuffer.length}_BYTES`)

  const audit = await pool.query("SELECT COUNT(*)::int AS total FROM audit_logs WHERE entity IN ('management_sales','production_entries','receivables','report_exports')")
  assert.ok(audit.rows[0].total >= 5, 'management actions should be audited')
  console.log(`AUDIT_OK=${audit.rows[0].total}`)
}

main()
  .then(async () => {
    await pool.end()
    console.log('HOMOLOGATION_OK')
  })
  .catch(async (error) => {
    await pool.end().catch(() => {})
    console.error(error)
    process.exitCode = 1
  })
