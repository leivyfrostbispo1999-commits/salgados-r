import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  formatCurrency,
  type ApiProduct,
  type ManagementCostProduct,
  type ManagementReceivable,
  type ManagementSale,
  type ManagementSummary,
} from '../utils/api'
import { GroupedProductCombobox } from './GroupedProductCombobox'

type Mode = 'producao' | 'vendas' | 'contas' | 'custos' | 'relatorios'

type Props = {
  mode: Mode
  products: ApiProduct[]
  setMessage: (message: string) => void
}

const today = new Date().toISOString().slice(0, 10)

export function ManagementModule({ mode, products, setMessage }: Props) {
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [category, setCategory] = useState('')
  const [productId, setProductId] = useState('')
  const [summary, setSummary] = useState<ManagementSummary | null>(null)
  const [sales, setSales] = useState<ManagementSale[]>([])
  const [receivables, setReceivables] = useState<ManagementReceivable[]>([])
  const [costProducts, setCostProducts] = useState<ManagementCostProduct[]>([])
  const [loading, setLoading] = useState(false)

  const params = useMemo(() => {
    const search = new URLSearchParams({ startDate, endDate })
    if (category) search.set('category', category)
    if (productId) search.set('productId', productId)
    return search
  }, [category, endDate, productId, startDate])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextSummary, nextSales, nextReceivables, nextCostProducts] = await Promise.all([
        api.managementSummary(params),
        api.managementSales(params).catch(() => []),
        api.managementReceivables().catch(() => []),
        api.managementCostProducts().catch(() => []),
      ])
      setSummary(nextSummary)
      setSales(nextSales)
      setReceivables(nextReceivables)
      setCostProducts(nextCostProducts)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    refresh().catch((error: Error) => setMessage(error.message))
  }, [refresh, setMessage])

  return (
    <div className="grid gap-5">
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-[var(--sr-red)]">GESTÃO OPERACIONAL</p>
        <h2 className="mt-2 text-3xl font-black text-[var(--sr-red)]">{titleFor(mode)}</h2>
        <p className="mt-2 text-sm font-bold text-[var(--sr-red)]">
          PRODUÇÃO, VENDAS, PAGAMENTOS, DÍVIDAS, CUSTOS E RELATÓRIOS COM DADOS REAIS.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-black">
            DATA INICIAL
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded border px-3 py-3" />
          </label>
          <label className="grid gap-1 text-sm font-black">
            DATA FINAL
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded border px-3 py-3" />
          </label>
          <label className="grid gap-1 text-sm font-black">
            CATEGORIA
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded border px-3 py-3">
              <option value="">TODAS</option>
              {[...new Set(products.map((product) => product.category))].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black">
            PRODUTO
            <GroupedProductCombobox products={products} value={productId} onChange={setProductId} includeInactive placeholder="TODOS" label="" />
          </label>
        </div>
      </section>

      {summary ? <ManagementIndicators summary={summary} /> : <p className="sr-admin-empty">{loading ? 'CARREGANDO DADOS.' : 'SEM DADOS.'}</p>}

      {mode === 'producao' ? <ProductionEntryForm products={products} setMessage={setMessage} onSaved={refresh} /> : null}
      {mode === 'vendas' ? <SalesEntryForm products={products} sales={sales} setMessage={setMessage} onSaved={refresh} /> : null}
      {mode === 'contas' ? <ReceivablesPanel receivables={receivables} setMessage={setMessage} onSaved={refresh} /> : null}
      {mode === 'custos' ? <CostsPanel products={costProducts} setMessage={setMessage} onSaved={refresh} /> : null}
      {mode === 'relatorios' ? <ReportsManagement params={params} summary={summary} setMessage={setMessage} /> : null}
    </div>
  )
}

function ManagementIndicators({ summary }: { summary: ManagementSummary }) {
  const profit = summary.grossProfit === null ? 'LUCRO INDISPONÍVEL' : formatCurrency(summary.grossProfit)
  const profitHint = summary.grossProfit === null ? 'CADASTRE O CUSTO DO PRODUTO PARA CALCULAR.' : 'LUCRO BRUTO ESTIMADO.'
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MiniCard label="FATURAMENTO ESPERADO" value={formatCurrency(summary.expectedRevenue)} />
      <MiniCard label="VALOR RECEBIDO" value={formatCurrency(summary.received)} />
      <MiniCard label="PIX" value={formatCurrency(summary.pix)} />
      <MiniCard label="CARTÃO" value={formatCurrency(summary.card)} />
      <MiniCard label="DINHEIRO" value={formatCurrency(summary.cash)} />
      <MiniCard label="DÍVIDAS ABERTAS" value={formatCurrency(summary.pending)} />
      <MiniCard label="ESTORNOS" value={formatCurrency(summary.refunds)} />
      <MiniCard label="CUSTOS ESTIMADOS" value={formatCurrency(summary.cost)} />
      <MiniCard label="COBERTURA DE CUSTOS" value={`${summary.costCoveragePercent}%`} />
      <MiniCard label="LUCRO BRUTO ESTIMADO" value={profit} hint={profitHint} />
    </section>
  )
}

function ProductionEntryForm({ products, setMessage, onSaved }: { products: ApiProduct[]; setMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [quantity, setQuantity] = useState('1')
  const [lost, setLost] = useState('0')
  const [status, setStatus] = useState('CONFIRMADO')
  async function save() {
    const product = products.find((item) => item.id === productId)
    if (!product) return setMessage('SELECIONE UM PRODUTO.')
    await api.createManagementProduction({
      productionDate: today,
      responsible: 'EQUIPE',
      status,
      items: [{ productId, quantityProduced: toNumber(quantity), quantityLost: toNumber(lost), unit: product.category === 'sucos' ? 'ml' : 'unidade' }],
    })
    setMessage('PRODUÇÃO DIÁRIA REGISTRADA.')
    await onSaved()
  }
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">REGISTRO DIÁRIO DE PRODUÇÃO</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_140px_160px_auto]">
        <GroupedProductCombobox products={products} value={productId} onChange={setProductId} />
        <input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="PRODUZIDO" className="rounded border px-3 py-3 font-bold" />
        <input value={lost} onChange={(event) => setLost(event.target.value)} placeholder="PERDA" className="rounded border px-3 py-3 font-bold" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border px-3 py-3 font-bold">
          <option value="RASCUNHO">RASCUNHO</option>
          <option value="CONFIRMADO">CONFIRMADO</option>
        </select>
        <button type="button" onClick={save} className="rounded bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-red)]">SALVAR</button>
      </div>
    </section>
  )
}

function SalesEntryForm({ products, sales, setMessage, onSaved }: { products: ApiProduct[]; sales: ManagementSale[]; setMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [quantity, setQuantity] = useState('1')
  const [pix, setPix] = useState('')
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [debt, setDebt] = useState('')
  const [busy, setBusy] = useState(false)
  const [reasonBySale, setReasonBySale] = useState<Record<string, string>>({})
  async function save() {
    setBusy(true)
    try {
      await api.createManagementSale({
        idempotencyKey: crypto.randomUUID(),
        saleDate: new Date().toISOString(),
        items: [{ productId, quantity: toNumber(quantity) }],
        payments: [
          { method: 'pix', amountCents: toCents(pix) },
          { method: 'dinheiro', amountCents: toCents(cash) },
          { method: 'cartao', amountCents: toCents(card) },
          { method: 'divida', amountCents: toCents(debt) },
        ].filter((payment) => payment.amountCents > 0),
      })
      setMessage('VENDA REGISTRADA COM PAGAMENTOS.')
      await onSaved()
    } finally {
      setBusy(false)
    }
  }
  async function cancelOrRefund(sale: ManagementSale, refund = false) {
    const reason = reasonBySale[sale.id] || ''
    if (reason.trim().length < 8) return setMessage('INFORME UMA JUSTIFICATIVA COM PELO MENOS 8 CARACTERES.')
    setBusy(true)
    try {
      if (refund) await api.refundManagementSale(sale.id, { reason, method: 'dinheiro' })
      else await api.cancelManagementSale(sale.id, { reason })
      setMessage(refund ? 'VENDA ESTORNADA COM AUDITORIA.' : 'VENDA CANCELADA COM AUDITORIA.')
      await onSaved()
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">REGISTRAR VENDA</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_100px_repeat(4,120px)_auto]">
        <GroupedProductCombobox products={products} value={productId} onChange={setProductId} />
        <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="rounded border px-3 py-3 font-bold" />
        <input value={pix} onChange={(event) => setPix(event.target.value)} placeholder="PIX" className="rounded border px-3 py-3 font-bold" />
        <input value={cash} onChange={(event) => setCash(event.target.value)} placeholder="DINHEIRO" className="rounded border px-3 py-3 font-bold" />
        <input value={card} onChange={(event) => setCard(event.target.value)} placeholder="CARTÃO" className="rounded border px-3 py-3 font-bold" />
        <input value={debt} onChange={(event) => setDebt(event.target.value)} placeholder="DÍVIDA" className="rounded border px-3 py-3 font-bold" />
        <button type="button" disabled={busy} onClick={save} className="rounded bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-red)] disabled:opacity-60">SALVAR</button>
      </div>
      <div className="mt-5 grid gap-3">
        {sales.slice(0, 8).map((sale) => (
          <article key={sale.id} className="rounded border border-[var(--sr-red)] p-3">
            <MiniLine left={`${sale.saleCode} ${sale.financialStatus}`} right={formatCurrency(sale.total)} />
            {sale.status === 'CONFIRMADO' ? (
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={reasonBySale[sale.id] || ''}
                  onChange={(event) => setReasonBySale((state) => ({ ...state, [sale.id]: event.target.value }))}
                  placeholder="JUSTIFICATIVA OBRIGATÓRIA"
                  className="rounded border px-3 py-3 font-bold"
                />
                <button type="button" disabled={busy} onClick={() => cancelOrRefund(sale, false)} className="rounded bg-[var(--sr-red)] px-4 py-3 font-black text-white disabled:opacity-60">
                  CANCELAR
                </button>
                <button type="button" disabled={busy} onClick={() => cancelOrRefund(sale, true)} className="rounded bg-[var(--sr-yellow)] px-4 py-3 font-black text-[var(--sr-red)] disabled:opacity-60">
                  ESTORNAR
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function ReceivablesPanel({ receivables, setMessage, onSaved }: { receivables: ManagementReceivable[]; setMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [amountById, setAmountById] = useState<Record<string, string>>({})
  async function pay(id: string) {
    await api.payManagementReceivable(id, { amountCents: toCents(amountById[id] || ''), paymentMethod: 'pix' })
    setMessage('PAGAMENTO DE DÍVIDA REGISTRADO.')
    await onSaved()
  }
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">CONTAS A RECEBER</h3>
      <div className="mt-4 grid gap-3">
        {receivables.length === 0 ? <p className="sr-admin-empty">NÃO HÁ DÍVIDAS REGISTRADAS.</p> : null}
        {receivables.map((item) => (
          <article key={item.id} className="rounded border border-[var(--sr-red)] p-4">
            <MiniLine left={`${item.customer_name || 'CLIENTE'} - ${item.status}`} right={formatCurrency(item.outstandingAmount)} />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={amountById[item.id] || ''} onChange={(event) => setAmountById((state) => ({ ...state, [item.id]: event.target.value }))} placeholder="VALOR RECEBIDO" className="rounded border px-3 py-3 font-bold" />
              <button type="button" onClick={() => pay(item.id)} className="rounded bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-red)]">DAR BAIXA PIX</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CostsPanel({ products, setMessage, onSaved }: { products: ManagementCostProduct[]; setMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [costs, setCosts] = useState<Record<string, string>>({})
  async function save(product: ManagementCostProduct) {
    await api.updateManagementCostProduct(product.id, { costCents: toCents(costs[product.id] || '') })
    setMessage('CUSTO ATUALIZADO COM HISTÓRICO.')
    await onSaved()
  }
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">CUSTOS E PREÇOS</h3>
      <div className="mt-4 grid gap-3">
        {products.map((product) => (
          <article key={product.id} className="grid gap-3 rounded border border-[var(--sr-red)] p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <strong>{product.name}</strong>
              <p className="text-sm font-bold">PREÇO: {formatCurrency(product.price)} · CUSTO: {product.currentCost === null ? 'CUSTO NÃO INFORMADO' : formatCurrency(product.currentCost)}</p>
            </div>
            <input value={costs[product.id] || ''} onChange={(event) => setCosts((state) => ({ ...state, [product.id]: event.target.value }))} placeholder="CUSTO R$" className="rounded border px-3 py-3 font-bold" />
            <button type="button" onClick={() => save(product)} className="rounded bg-[var(--sr-yellow)] px-5 py-3 font-black text-[var(--sr-red)]">SALVAR CUSTO</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function ReportsManagement({ params, summary, setMessage }: { params: URLSearchParams; summary: ManagementSummary | null; setMessage: (message: string) => void }) {
  async function pdf() {
    const response = await fetch(api.managementPdfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.token.get()}` },
      body: JSON.stringify(Object.fromEntries(params)),
    })
    if (!response.ok) return setMessage('NÃO FOI POSSÍVEL GERAR PDF.')
    const blob = await response.blob()
    window.open(URL.createObjectURL(blob), '_blank')
  }
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">RELATÓRIOS</h3>
      <p className="mt-2 text-sm font-bold">ANALISE PRODUÇÃO, VENDAS, PAGAMENTOS E RESULTADOS DO SALGADOS R.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a href={api.managementCsvUrl(params)} className="rounded bg-[var(--sr-yellow)] px-5 py-3 text-center font-black text-[var(--sr-red)]">EXPORTAR CSV</a>
        <button type="button" onClick={pdf} className="rounded bg-[var(--sr-red)] px-5 py-3 font-black text-white">GERAR PDF</button>
      </div>
      {summary?.profitStatus === 'LUCRO_INDISPONIVEL' ? (
        <p className="mt-4 rounded border border-[var(--sr-yellow)] p-4 text-sm font-black">LUCRO INDISPONÍVEL. CADASTRE O CUSTO DOS PRODUTOS PARA CALCULAR O LUCRO BRUTO ESTIMADO.</p>
      ) : null}
    </section>
  )
}

function MiniCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="sr-admin-metric">
      <span aria-hidden="true" />
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  )
}

function MiniLine({ left, right }: { left: string; right: string }) {
  return (
    <p className="flex justify-between gap-3 rounded border border-[var(--sr-red)] p-3 text-sm font-black">
      <span>{left}</span>
      <span>{right}</span>
    </p>
  )
}

function titleFor(mode: Mode) {
  if (mode === 'producao') return 'PRODUÇÃO DIÁRIA'
  if (mode === 'vendas') return 'VENDAS'
  if (mode === 'contas') return 'CONTAS A RECEBER'
  if (mode === 'custos') return 'CUSTOS E PREÇOS'
  return 'RELATÓRIOS'
}

function toNumber(value: string) {
  return Number(value.replace(',', '.')) || 0
}

function toCents(value: string) {
  return Math.round((Number(value.replace(',', '.')) || 0) * 100)
}
