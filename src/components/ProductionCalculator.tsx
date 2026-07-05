import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  type ApiProduct,
  type AuthUser,
  type ProductionForecast,
  type ProductionForecastItem,
  type ProductionItemTemplate,
  type ProductionRoundingMode,
  type ProductionUnit,
  formatCurrency,
} from '../utils/api'

const weekdays = [
  { id: 'segunda', label: 'Segunda' },
  { id: 'terca', label: 'Terca' },
  { id: 'quarta', label: 'Quarta' },
  { id: 'quinta', label: 'Quinta' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'sabado', label: 'Sabado' },
  { id: 'domingo', label: 'Domingo' },
]

const scenarios = ['Segunda normal', 'Sabado movimentado', 'Dia fraco', 'Evento', 'Personalizado']
const units: ProductionUnit[] = ['unidade', 'litro', 'ml', 'cento', 'pacote', 'kg', 'g']
const categories = ['pasteis', 'salgados', 'sucos', 'refil', 'outros']

type DraftForecast = {
  id?: string
  name: string
  weekday: string
  dateReference: string
  scenario: string
  notes: string
  roundingMode: ProductionRoundingMode
  items: ProductionForecastItem[]
}

export function ProductionCalculator({
  products,
  user,
  setMessage,
}: {
  products: ApiProduct[]
  user: AuthUser
  setMessage: (message: string) => void
}) {
  const [forecasts, setForecasts] = useState<ProductionForecast[]>([])
  const [templates, setTemplates] = useState<ProductionItemTemplate[]>([])
  const [draft, setDraft] = useState<DraftForecast>(() => emptyForecast())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const allowed = user.role === 'SUPER_US' || user.role === 'ADMIN' || user.role === 'GERENTE'
  const summary = useMemo(() => calculateLocalSummary(draft.items, draft.roundingMode), [draft.items, draft.roundingMode])
  const selectedForecast = forecasts.find((forecast) => forecast.id === draft.id)

  const refresh = useCallback(async () => {
    const [nextForecasts, nextTemplates] = await Promise.all([api.productionForecasts(), api.productionTemplates()])
    setForecasts(nextForecasts)
    setTemplates(nextTemplates)
    if (!draft.id) {
      const initial = nextForecasts.find((forecast) => forecast.name === 'Exemplo Segunda-feira') || nextForecasts[0]
      if (initial) setDraft(fromForecast(initial))
    }
  }, [draft.id])

  useEffect(() => {
    if (!allowed) return
    refresh().catch((nextError: Error) => setError(nextError.message)).finally(() => setLoading(false))
  }, [allowed, refresh])

  function setField<K extends keyof DraftForecast>(key: K, value: DraftForecast[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateItem(index: number, patch: Partial<ProductionForecastItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function addManualItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, createItem({ customName: 'Novo item', category: 'outros', salePriceCents: 0 })],
    }))
  }

  function addProduct(productId: string) {
    const product = products.find((item) => item.id === productId)
    if (!product) return
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        createItem({
          productId: product.id,
          customName: product.name,
          category: product.category,
          unit: product.category === 'sucos' || product.category === 'refil' ? 'litro' : 'unidade',
          quantity: product.category === 'sucos' ? 1 : 1,
          salePriceCents: product.category === 'sucos' ? Math.round(product.priceCents / 0.3) : product.priceCents,
          notes: product.category === 'sucos' ? 'Preco por litro estimado pela garrafinha de 300 ml.' : '',
        }),
      ],
    }))
  }

  function addTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        createItem({
          productId: template.productId,
          customName: template.name,
          category: template.category,
          unit: template.unit,
          salePriceCents: template.defaultSalePriceCents,
          estimatedUnitCostCents: template.defaultEstimatedUnitCostCents,
        }),
      ],
    }))
  }

  function duplicateItem(index: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.flatMap((item, itemIndex) =>
        itemIndex === index ? [item, { ...item, id: undefined, customName: `${item.customName} copia` }] : [item],
      ),
    }))
  }

  function removeItem(index: number) {
    setDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))
  }

  async function save() {
    try {
      if (!draft.name.trim()) return setError('Informe o nome da previsao.')
      const payload = {
        name: draft.name,
        weekday: draft.weekday,
        dateReference: draft.dateReference || null,
        scenario: draft.scenario,
        notes: draft.notes,
        roundingMode: draft.roundingMode,
        items: draft.items.map((item, index) => ({ ...item, sortOrder: index })),
      }
      const saved = draft.id
        ? await api.updateProductionForecast(draft.id, payload)
        : await api.createProductionForecast(payload)
      setDraft(fromForecast(saved))
      await refresh()
      setError('')
      setMessage('Previsao salva com sucesso.')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Erro ao salvar previsao. Tente novamente.')
    }
  }

  async function duplicateForecast() {
    if (!draft.id) return setError('Salve a previsao antes de duplicar.')
    const nextWeekday = nextWeekdayId(draft.weekday)
    const duplicated = await api.duplicateProductionForecast(draft.id, {
      name: `${draft.name} - copia`,
      weekday: nextWeekday,
      dateReference: null,
    })
    setDraft(fromForecast(duplicated))
    await refresh()
    setMessage('Previsao duplicada.')
  }

  async function deleteForecast() {
    if (!draft.id) {
      setDraft(emptyForecast())
      return
    }
    if (!window.confirm('Excluir esta previsao? Essa acao nao pode ser desfeita.')) return
    await api.deleteProductionForecast(draft.id)
    setDraft(emptyForecast())
    await refresh()
    setMessage('Previsao excluida.')
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-2xl font-black text-red-900">Acesso negado</h2>
        <p className="mt-2 text-sm font-bold text-red-800">Voce nao tem permissao para acessar esta area.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Gestao administrativa</p>
            <h2 className="mt-2 text-3xl font-black text-[#1D1D1D]">Calculadora de Producao</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-600">
              Monte uma previsao de producao e veja faturamento, custo e lucro esperado antes de comprar ou produzir.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <button type="button" onClick={() => setDraft(emptyForecast())} className="rounded bg-zinc-100 px-4 py-3 text-sm font-black">
              Nova previsao
            </button>
            <button type="button" onClick={save} className="rounded bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
              Salvar
            </button>
            <button type="button" onClick={duplicateForecast} className="rounded bg-[#FFC72C] px-4 py-3 text-sm font-black text-[#1D1D1D]">
              Duplicar
            </button>
            <button type="button" onClick={() => window.print()} className="rounded bg-zinc-100 px-4 py-3 text-sm font-black">
              Imprimir
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="rounded bg-yellow-100 p-3 text-sm font-black text-zinc-900">{error}</p> : null}
      {loading ? <p className="font-bold">Carregando previsoes...</p> : null}

      <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="grid h-fit gap-4 rounded-lg bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-lg font-black">Previsoes salvas</h3>
            <p className="mt-1 text-sm font-semibold text-zinc-600">Escolha uma previsao para editar.</p>
          </div>
          {forecasts.length === 0 ? (
            <p className="rounded bg-zinc-50 p-4 text-sm font-bold text-zinc-600">
              Voce ainda nao criou nenhuma previsao. Comece com um modelo de segunda-feira.
            </p>
          ) : null}
          <div className="grid gap-2">
            {forecasts.map((forecast) => (
              <button
                key={forecast.id}
                type="button"
                onClick={() => setDraft(fromForecast(forecast))}
                className={`rounded border p-3 text-left text-sm font-bold ${
                  draft.id === forecast.id ? 'border-[#1D1D1D] bg-[#FFC72C]' : 'border-zinc-200 bg-white'
                }`}
              >
                <span className="block font-black">{forecast.name}</span>
                <span className="block text-xs uppercase tracking-wide">{labelWeekday(forecast.weekday)} - {forecast.scenario}</span>
                <span className="block text-xs text-zinc-700">{formatCurrency(forecast.summary.revenueTotal)}</span>
              </button>
            ))}
          </div>
          <WeeklyComparison forecasts={forecasts} />
        </aside>

        <div className="grid gap-5">
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1 text-sm font-black">
                Nome
                <input value={draft.name} onChange={(event) => setField('name', event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              </label>
              <label className="grid gap-1 text-sm font-black">
                Dia da semana
                <select value={draft.weekday} onChange={(event) => setField('weekday', event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                  {weekdays.map((weekday) => <option key={weekday.id} value={weekday.id}>{weekday.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-black">
                Cenario
                <select value={draft.scenario} onChange={(event) => setField('scenario', event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                  {scenarios.map((scenario) => <option key={scenario} value={scenario}>{scenario}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-black">
                Data opcional
                <input type="date" value={draft.dateReference || ''} onChange={(event) => setField('dateReference', event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              </label>
              <label className="grid gap-1 text-sm font-black md:col-span-2">
                Arredondamento dos sucos
                <select value={draft.roundingMode} onChange={(event) => setField('roundingMode', event.target.value as ProductionRoundingMode)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                  <option value="proporcional">Proporcional</option>
                  <option value="cima">Arredondar para cima</option>
                  <option value="baixo">Arredondar para baixo</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-black md:col-span-2">
                Observacao
                <input value={draft.notes} onChange={(event) => setField('notes', event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              </label>
            </div>
          </section>

          <SummaryCards summary={summary} />

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="grid gap-1 text-sm font-black">
                Adicionar produto existente
                <select defaultValue="" onChange={(event) => { addProduct(event.target.value); event.currentTarget.value = '' }} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                  <option value="">Selecionar produto</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {formatCurrency(product.price)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-black">
                Adicionar template
                <select defaultValue="" onChange={(event) => { addTemplate(event.target.value); event.currentTarget.value = '' }} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                  <option value="">Selecionar template</option>
                  {templates.filter((template) => template.active).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
              <button type="button" onClick={addManualItem} className="rounded bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
                Adicionar item manual
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            {draft.items.length === 0 ? <p className="rounded-lg bg-white p-5 text-sm font-bold text-zinc-600 shadow-sm">Nenhum item na previsao.</p> : null}
            {draft.items.map((item, index) => {
              const calculated = summary.items[index]
              return (
                <article key={`${item.id || 'novo'}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr_0.7fr]">
                    <input value={item.customName} onChange={(event) => updateItem(index, { customName: event.target.value })} className="rounded border border-zinc-300 px-3 py-3 font-semibold" placeholder="Produto" />
                    <select value={item.category} onChange={(event) => updateItem(index, { category: event.target.value })} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <select value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value as ProductionUnit })} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                      {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    <input inputMode="decimal" value={String(item.quantity)} onChange={(event) => updateItem(index, { quantity: toNumber(event.target.value) })} className="rounded border border-zinc-300 px-3 py-3 font-semibold" placeholder="Qtd" />
                    <MoneyInput valueCents={item.salePriceCents} onChange={(value) => updateItem(index, { salePriceCents: value || 0 })} placeholder="Preco" />
                    <MoneyInput valueCents={item.estimatedUnitCostCents} onChange={(value) => updateItem(index, { estimatedUnitCostCents: value })} placeholder="Custo" allowEmpty />
                  </div>
                  <input value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} className="mt-3 w-full rounded border border-zinc-300 px-3 py-3 font-semibold" placeholder="Observacao" />
                  <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-5">
                    <MiniMetric label="Receita" value={formatCurrency(calculated?.revenue || 0)} />
                    <MiniMetric label="Custo" value={calculated?.cost === null ? 'Sem custo' : formatCurrency(calculated?.cost || 0)} muted={calculated?.cost === null} />
                    <MiniMetric label="Lucro" value={calculated?.profit === null ? 'Parcial' : formatCurrency(calculated?.profit || 0)} positive={(calculated?.profit || 0) > 0} />
                    <MiniMetric label="Margem" value={calculated?.marginPercent === null ? '-' : `${(calculated?.marginPercent || 0).toFixed(1)}%`} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => duplicateItem(index)} className="flex-1 rounded bg-zinc-100 px-3 py-2 text-xs font-black">Duplicar</button>
                      <button type="button" onClick={() => removeItem(index)} className="flex-1 rounded bg-red-100 px-3 py-2 text-xs font-black text-red-900">Remover</button>
                    </div>
                  </div>
                  {calculated?.bottleNote ? <p className="mt-3 rounded bg-yellow-50 p-3 text-xs font-black text-yellow-900">{calculated.bottleNote}</p> : null}
                </article>
              )
            })}
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={deleteForecast} className="rounded bg-red-100 px-4 py-3 text-sm font-black text-red-900">
              Excluir previsao
            </button>
            <button type="button" onClick={save} className="rounded bg-[#1D1D1D] px-6 py-3 text-sm font-black text-white">
              Salvar previsao
            </button>
          </div>

          {selectedForecast ? (
            <p className="text-xs font-semibold text-zinc-500">
              Ultima versao salva: {selectedForecast.updatedAt ? new Date(selectedForecast.updatedAt).toLocaleString('pt-BR') : 'sem data'}.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function SummaryCards({ summary }: { summary: ReturnType<typeof calculateLocalSummary> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <AdminMetric label="Faturamento" value={formatCurrency(summary.revenueTotal)} />
      <AdminMetric label="Custo estimado" value={summary.missingCostCount ? `${formatCurrency(summary.costTotal)} parcial` : formatCurrency(summary.costTotal)} muted={summary.missingCostCount > 0} />
      <AdminMetric label="Lucro esperado" value={summary.missingCostCount ? 'Parcial' : formatCurrency(summary.profitTotal)} positive={!summary.missingCostCount && summary.profitTotal > 0} />
      <AdminMetric label="Margem" value={summary.marginPercent === null ? '-' : `${summary.marginPercent.toFixed(1)}%`} />
      <AdminMetric label="Total de itens" value={String(summary.totalUnits)} />
      <AdminMetric label="Litros de suco" value={`${summary.totalLiters.toFixed(2).replace('.', ',')} L`} />
    </section>
  )
}

function WeeklyComparison({ forecasts }: { forecasts: ProductionForecast[] }) {
  const bestRevenue = [...forecasts].sort((a, b) => b.summary.revenueTotal - a.summary.revenueTotal)[0]
  const bestProfit = [...forecasts].filter((forecast) => forecast.summary.missingCostCount === 0).sort((a, b) => b.summary.profitTotal - a.summary.profitTotal)[0]

  return (
    <div className="rounded bg-zinc-50 p-4 text-sm font-bold">
      <h4 className="font-black">Comparativo rapido</h4>
      <p className="mt-2">Maior faturamento: {bestRevenue ? `${labelWeekday(bestRevenue.weekday)} (${formatCurrency(bestRevenue.summary.revenueTotal)})` : '-'}</p>
      <p className="mt-1">Maior lucro: {bestProfit ? `${labelWeekday(bestProfit.weekday)} (${formatCurrency(bestProfit.summary.profitTotal)})` : 'custo pendente'}</p>
    </div>
  )
}

function MoneyInput({
  valueCents,
  onChange,
  placeholder,
  allowEmpty = false,
}: {
  valueCents: number | null
  onChange: (value: number | null) => void
  placeholder: string
  allowEmpty?: boolean
}) {
  const value = valueCents === null ? '' : (valueCents / 100).toFixed(2).replace('.', ',')
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        if (allowEmpty && !event.target.value.trim()) return onChange(null)
        onChange(toCents(event.target.value))
      }}
      className="rounded border border-zinc-300 px-3 py-3 font-semibold"
      placeholder={placeholder}
    />
  )
}

function AdminMetric({ label, value, muted = false, positive = false }: { label: string; value: string; muted?: boolean; positive?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${positive ? 'bg-green-900 text-white' : muted ? 'bg-zinc-200 text-zinc-900' : 'bg-[#1D1D1D] text-white'}`}>
      <p className="text-xs font-black uppercase tracking-wide text-[#FFC72C]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function MiniMetric({ label, value, muted = false, positive = false }: { label: string; value: string; muted?: boolean; positive?: boolean }) {
  return (
    <div className={`rounded p-3 ${positive ? 'bg-green-50 text-green-900' : muted ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-50 text-zinc-900'}`}>
      <span className="block text-xs uppercase tracking-wide">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function emptyForecast(): DraftForecast {
  return {
    name: 'Nova previsao',
    weekday: 'segunda',
    dateReference: '',
    scenario: 'Personalizado',
    notes: '',
    roundingMode: 'proporcional',
    items: [],
  }
}

function fromForecast(forecast: ProductionForecast): DraftForecast {
  return {
    id: forecast.id,
    name: forecast.name,
    weekday: forecast.weekday,
    dateReference: forecast.dateReference || '',
    scenario: forecast.scenario,
    notes: forecast.notes,
    roundingMode: forecast.roundingMode,
    items: forecast.items.map((item, index) => ({ ...item, sortOrder: index })),
  }
}

function createItem(patch: Partial<ProductionForecastItem>): ProductionForecastItem {
  return {
    productId: null,
    customName: 'Novo item',
    category: 'outros',
    unit: 'unidade',
    quantity: 1,
    salePriceCents: 0,
    estimatedUnitCostCents: null,
    notes: '',
    sortOrder: 0,
    ...patch,
  }
}

function calculateLocalSummary(items: ProductionForecastItem[], roundingMode: ProductionRoundingMode) {
  let revenueTotal = 0
  let costTotal = 0
  let profitTotal = 0
  let totalUnits = 0
  let totalMl = 0
  let missingCostCount = 0

  const calculatedItems = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0)
    const revenue = quantity * (item.salePriceCents || 0) / 100
    const hasCost = item.estimatedUnitCostCents !== null && item.estimatedUnitCostCents !== undefined
    const cost = hasCost ? quantity * (item.estimatedUnitCostCents || 0) / 100 : null
    const profit = cost === null ? null : revenue - cost
    const marginPercent = revenue > 0 && profit !== null ? (profit / revenue) * 100 : null
    const ml = item.unit === 'litro' ? quantity * 1000 : item.unit === 'ml' ? quantity : 0
    const bottleRaw = ml > 0 ? ml / 300 : null
    const bottleEquivalent = bottleRaw === null ? null : roundingMode === 'cima' ? Math.ceil(bottleRaw) : roundingMode === 'baixo' ? Math.floor(bottleRaw) : bottleRaw

    revenueTotal += revenue
    if (cost === null) missingCostCount += 1
    else {
      costTotal += cost
      profitTotal += profit || 0
    }
    if (item.unit === 'unidade' || item.unit === 'cento' || item.unit === 'pacote') totalUnits += quantity
    totalMl += ml

    return {
      ...item,
      revenue,
      cost,
      profit,
      marginPercent,
      bottleEquivalent,
      bottleNote: bottleRaw === null ? '' : `${quantity} ${item.unit} equivalem aproximadamente a ${bottleRaw.toFixed(2).replace('.', ',')} garrafinhas de 300 ml.`,
    }
  })

  return {
    revenueTotal,
    costTotal,
    profitTotal,
    marginPercent: revenueTotal > 0 && missingCostCount < items.length ? (profitTotal / revenueTotal) * 100 : null,
    totalUnits,
    totalLiters: totalMl / 1000,
    missingCostCount,
    items: calculatedItems,
  }
}

function toCents(value: string) {
  return Math.max(0, Math.round((Number(value.replace(',', '.')) || 0) * 100))
}

function toNumber(value: string) {
  return Math.max(0, Number(value.replace(',', '.')) || 0)
}

function labelWeekday(value: string) {
  return weekdays.find((weekday) => weekday.id === value)?.label || value
}

function nextWeekdayId(value: string) {
  const index = weekdays.findIndex((weekday) => weekday.id === value)
  return weekdays[(index + 1 + weekdays.length) % weekdays.length].id
}
