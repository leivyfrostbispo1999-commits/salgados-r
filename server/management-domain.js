export const moneyMethods = ['pix', 'cartao', 'dinheiro', 'divida']
export const receivablePaymentMethods = ['pix', 'cartao', 'dinheiro']
export const volumeRoundingModes = ['somente_multiplos', 'proporcional', 'cima']
export const saleStatuses = ['CONFIRMADO', 'CANCELADO', 'ESTORNADO']
export const productionStatuses = ['RASCUNHO', 'CONFIRMADO', 'CANCELADO']
export const receivableStatuses = ['ABERTA', 'PARCIALMENTE_PAGA', 'PAGA', 'CANCELADA', 'VENCIDA']

export function toCents(value, fallback = 0) {
  if (Number.isInteger(value)) return Math.max(0, value)
  const normalized = String(value ?? '').replace(/[^\d,.-]/g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed * 100))
}

export function toQuantity(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, parsed)
}

export function normalizePaymentMethod(method) {
  const normalized = String(method || '').toLowerCase()
  return moneyMethods.includes(normalized) ? normalized : ''
}

export function calculateRefillCents({ volumeMl, blockMl = 100, blockPriceCents = 100, roundingMode = 'somente_multiplos' }) {
  const ml = toQuantity(volumeMl)
  const block = Math.max(1, toQuantity(blockMl, 100))
  const price = toCents(blockPriceCents, 100)
  if (ml <= 0) return { ok: false, error: 'Informe o volume em ml.', blocks: 0, totalCents: 0 }
  if (roundingMode === 'somente_multiplos' && ml % block !== 0) {
    return { ok: false, error: `Volume deve ser multiplo de ${block} ml.`, blocks: 0, totalCents: 0 }
  }
  const rawBlocks = ml / block
  const blocks = roundingMode === 'cima' ? Math.ceil(rawBlocks) : rawBlocks
  return { ok: true, blocks, totalCents: Math.round(blocks * price) }
}

export function calculatePaymentTotals(payments = [], totalCents = 0) {
  const normalized = payments
    .map((payment) => ({
      method: normalizePaymentMethod(payment.method),
      amountCents: toCents(payment.amountCents ?? payment.amount_cents),
      notes: payment.notes || '',
    }))
    .filter((payment) => payment.method && payment.amountCents > 0)
  const paidCents = normalized.filter((payment) => payment.method !== 'divida').reduce((sum, payment) => sum + payment.amountCents, 0)
  const debtCents = normalized.filter((payment) => payment.method === 'divida').reduce((sum, payment) => sum + payment.amountCents, 0)
  const declaredCents = paidCents + debtCents
  const missingCents = Math.max(0, totalCents - declaredCents)
  const changeCents = Math.max(0, declaredCents - totalCents)
  return { payments: normalized, paidCents, debtCents: debtCents + missingCents, declaredCents, missingCents, changeCents }
}

export function financialStatusFor({ totalCents, paidCents, debtCents }) {
  if (debtCents <= 0 && paidCents >= totalCents) return 'PAGO'
  if (paidCents > 0 && debtCents > 0) return 'PARCIAL'
  return 'EM_DIVIDA'
}

export function grossProfitStatus(costCents) {
  return costCents === null || costCents === undefined ? 'LUCRO_INDISPONIVEL' : 'CALCULAVEL'
}

export function deriveReceivableStatus({ originalAmountCents, paidAmountCents, outstandingAmountCents, dueDate, now = new Date() }) {
  if (outstandingAmountCents <= 0) return 'PAGA'
  if (dueDate && new Date(`${dueDate}T23:59:59`).getTime() < now.getTime()) return 'VENCIDA'
  if (paidAmountCents > 0 && paidAmountCents < originalAmountCents) return 'PARCIALMENTE_PAGA'
  return 'ABERTA'
}

export function calculateCostCoverage({ coveredRevenueCents = 0, totalRevenueCents = 0 }) {
  if (totalRevenueCents <= 0) return 0
  return Math.round((coveredRevenueCents / totalRevenueCents) * 10000) / 100
}

export function csvSafe(value) {
  const text = String(value ?? '')
  const escaped = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${escaped.replace(/"/g, '""')}"`
}
