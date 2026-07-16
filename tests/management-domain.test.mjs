import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculatePaymentTotals,
  calculateCostCoverage,
  calculateRefillCents,
  csvSafe,
  deriveReceivableStatus,
  financialStatusFor,
  grossProfitStatus,
  toCents,
} from '../server/management-domain.js'

describe('management financial domain', () => {
  it('calcula refil de R$ 1,00 a cada 100 ml para 4 litros', () => {
    const result = calculateRefillCents({ volumeMl: 4000, blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' })
    assert.equal(result.ok, true)
    assert.equal(result.blocks, 40)
    assert.equal(result.totalCents, 4000)
  })

  it('bloqueia volume incompleto quando a regra exige multiplos de 100 ml', () => {
    const result = calculateRefillCents({ volumeMl: 150, blockMl: 100, blockPriceCents: 100, roundingMode: 'somente_multiplos' })
    assert.equal(result.ok, false)
    assert.match(result.error, /multiplo/)
  })

  it('fecha pagamento dividido entre pix dinheiro e divida', () => {
    const result = calculatePaymentTotals(
      [
        { method: 'pix', amountCents: 2000 },
        { method: 'dinheiro', amountCents: 1000 },
        { method: 'divida', amountCents: 2000 },
      ],
      5000,
    )
    assert.equal(result.paidCents, 3000)
    assert.equal(result.debtCents, 2000)
    assert.equal(result.missingCents, 0)
    assert.equal(financialStatusFor({ totalCents: 5000, paidCents: result.paidCents, debtCents: result.debtCents }), 'PARCIAL')
  })

  it('classifica diferenca menor como divida em vez de sumir silenciosamente', () => {
    const result = calculatePaymentTotals([{ method: 'pix', amountCents: 1200 }], 2000)
    assert.equal(result.paidCents, 1200)
    assert.equal(result.debtCents, 800)
    assert.equal(result.missingCents, 800)
  })

  it('mantem lucro indisponivel quando custo nao existe', () => {
    assert.equal(grossProfitStatus(null), 'LUCRO_INDISPONIVEL')
    assert.equal(grossProfitStatus(250), 'CALCULAVEL')
  })

  it('calcula cobertura parcial de custos sem inventar lucro total', () => {
    assert.equal(calculateCostCoverage({ coveredRevenueCents: 7200, totalRevenueCents: 10000 }), 72)
    assert.equal(calculateCostCoverage({ coveredRevenueCents: 0, totalRevenueCents: 0 }), 0)
  })

  it('deriva status de conta a receber por valores e vencimento', () => {
    assert.equal(deriveReceivableStatus({ originalAmountCents: 3000, paidAmountCents: 0, outstandingAmountCents: 3000 }), 'ABERTA')
    assert.equal(deriveReceivableStatus({ originalAmountCents: 3000, paidAmountCents: 1000, outstandingAmountCents: 2000 }), 'PARCIALMENTE_PAGA')
    assert.equal(deriveReceivableStatus({ originalAmountCents: 3000, paidAmountCents: 3000, outstandingAmountCents: 0 }), 'PAGA')
    assert.equal(
      deriveReceivableStatus({ originalAmountCents: 3000, paidAmountCents: 0, outstandingAmountCents: 3000, dueDate: '2020-01-01', now: new Date('2020-01-02T12:00:00') }),
      'VENCIDA',
    )
  })

  it('previne CSV injection em campos textuais', () => {
    assert.equal(csvSafe('=IMPORTXML("x")'), '"\'=IMPORTXML(""x"")"')
    assert.equal(csvSafe('texto'), '"texto"')
  })

  it('permite arredondar refil para cima quando configurado', () => {
    const result = calculateRefillCents({ volumeMl: 150, blockMl: 100, blockPriceCents: 100, roundingMode: 'cima' })
    assert.equal(result.ok, true)
    assert.equal(result.blocks, 2)
    assert.equal(result.totalCents, 200)
  })

  it('converte moeda para centavos sem ponto flutuante no dominio', () => {
    assert.equal(toCents('5,00'), 500)
    assert.equal(toCents('4.50'), 450)
  })
})
