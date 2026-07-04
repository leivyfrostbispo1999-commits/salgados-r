import { useEffect, useMemo, useState } from 'react'
import { api, type ApiOrder, type ApiProduct, type ReportSummary, type StockItem, formatCurrency } from '../utils/api'

type CartItem = {
  product: ApiProduct
  quantity: number
}

const tabs = [
  { id: 'pedido', label: 'Pedido pelo site' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'admin', label: 'Admin' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'relatorios', label: 'Relatorios' },
] as const

type TabId = (typeof tabs)[number]['id']

const statusFlow: ApiOrder['status'][] = ['novo', 'preparando', 'pronto', 'entregue']

export function OperationsSuite() {
  const [activeTab, setActiveTab] = useState<TabId>('pedido')
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [nextProducts, nextOrders, nextStock, nextSummary] = await Promise.all([
      api.products(),
      api.orders(),
      api.stock(),
      api.summary(),
    ])
    setProducts(nextProducts)
    setOrders(nextOrders)
    setStock(nextStock)
    setSummary(nextSummary)
  }

  useEffect(() => {
    refresh()
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="sistema" className="scroll-mt-24 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Sistema operacional</p>
        <h2 className="mt-2 text-3xl font-black text-zinc-950">Pedidos, cozinha, estoque e gestao em um so lugar.</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-zinc-600">
          Primeira versao operacional do Salgados R: backend com banco SQLite, painel de cozinha, produtos,
          estoque, relatorios e base para fidelidade/PWA.
        </p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded px-4 py-3 text-sm font-black ${
                activeTab === tab.id ? 'bg-black text-yellow-300' : 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message ? <p className="mt-4 rounded bg-yellow-100 p-3 text-sm font-bold text-zinc-900">{message}</p> : null}

        <div className="mt-6">
          {loading ? <p className="font-bold">Carregando sistema...</p> : null}
          {!loading && activeTab === 'pedido' ? (
            <OrderBuilder products={products} onCreated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && activeTab === 'cozinha' ? (
            <KitchenPanel orders={orders} onUpdated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && activeTab === 'admin' ? (
            <AdminPanel products={products} onCreated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && activeTab === 'estoque' ? (
            <StockPanel stock={stock} onUpdated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && activeTab === 'relatorios' ? <ReportsPanel summary={summary} orders={orders} /> : null}
        </div>
      </div>
    </section>
  )
}

function OrderBuilder({
  products,
  onCreated,
  setMessage,
}: {
  products: ApiProduct[]
  onCreated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState('delivery')
  const [notes, setNotes] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])

  const orderableProducts = useMemo(
    () => products.filter((product) => channel !== 'delivery' || product.availability !== 'presencial'),
    [channel, products],
  )
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  function addItem() {
    const product = products.find((item) => item.id === selectedProduct)
    if (!product) return
    setCart((current) => [...current, { product, quantity }])
    setSelectedProduct('')
    setQuantity(1)
  }

  async function submitOrder() {
    try {
      const order = await api.createOrder({
        customerName,
        phone,
        channel,
        notes,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      })
      setMessage(`Pedido ${order.id.slice(0, 8)} criado com sucesso.`)
      setCustomerName('')
      setPhone('')
      setNotes('')
      setCart([])
      await onCreated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao criar pedido.')
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-lg border border-zinc-200 p-5">
        <h3 className="text-xl font-black">Novo pedido</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nome do cliente"
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Telefone"
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          />
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          >
            <option value="delivery">Delivery</option>
            <option value="presencial">Balcao / estabelecimento</option>
          </select>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observacoes"
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <select
            value={selectedProduct}
            onChange={(event) => setSelectedProduct(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          >
            <option value="">Escolha um produto</option>
            {orderableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {formatCurrency(product.price)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="rounded border border-zinc-300 px-3 py-3 font-semibold"
          />
          <button type="button" onClick={addItem} className="rounded bg-black px-4 py-3 font-black text-yellow-300">
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-950 p-5 text-white">
        <h3 className="text-xl font-black text-yellow-300">Resumo</h3>
        <div className="mt-4 space-y-3">
          {cart.length === 0 ? <p className="text-sm font-semibold text-zinc-300">Nenhum item ainda.</p> : null}
          {cart.map((item, index) => (
            <div key={`${item.product.id}-${index}`} className="flex justify-between gap-3 text-sm font-semibold">
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>{formatCurrency(item.product.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 flex justify-between text-lg font-black">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </p>
        <button
          type="button"
          disabled={!customerName || cart.length === 0}
          onClick={submitOrder}
          className="mt-5 w-full rounded bg-yellow-300 px-4 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar para cozinha
        </button>
      </div>
    </div>
  )
}

function KitchenPanel({
  orders,
  onUpdated,
  setMessage,
}: {
  orders: ApiOrder[]
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const visibleOrders = orders.filter((order) => order.status !== 'entregue' && order.status !== 'cancelado')

  async function move(order: ApiOrder) {
    const currentIndex = statusFlow.indexOf(order.status)
    const nextStatus = statusFlow[Math.min(currentIndex + 1, statusFlow.length - 1)]
    await api.updateOrderStatus(order.id, nextStatus)
    setMessage(`Pedido ${order.id.slice(0, 8)} atualizado para ${nextStatus}.`)
    await onUpdated()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleOrders.map((order) => (
        <article key={order.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">{order.status}</p>
              <h3 className="text-xl font-black">{order.customerName}</h3>
            </div>
            <span className="rounded bg-yellow-300 px-3 py-2 text-sm font-black">{formatCurrency(order.total)}</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm font-semibold text-zinc-700">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.quantity}x {item.productName}
              </li>
            ))}
          </ul>
          {order.notes ? <p className="mt-3 rounded bg-red-50 p-3 text-sm font-bold">{order.notes}</p> : null}
          <button type="button" onClick={() => move(order)} className="mt-4 w-full rounded bg-black px-4 py-3 font-black text-white">
            Avancar status
          </button>
        </article>
      ))}
      {visibleOrders.length === 0 ? <p className="font-bold">Nenhum pedido pendente.</p> : null}
    </div>
  )
}

function AdminPanel({
  products,
  onCreated,
  setMessage,
}: {
  products: ApiProduct[]
  onCreated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('pasteis')
  const [availability, setAvailability] = useState('ambos')
  const [price, setPrice] = useState('')

  async function createProduct() {
    await api.createProduct({
      name,
      category,
      availability,
      priceCents: Math.round(Number(price.replace(',', '.')) * 100),
    })
    setMessage('Produto criado no banco.')
    setName('')
    setPrice('')
    await onCreated()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-zinc-200 p-5">
        <h3 className="text-xl font-black">Novo produto</h3>
        <div className="mt-4 grid gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
              <option value="pasteis">Pasteis</option>
              <option value="salgados">Salgados</option>
              <option value="sucos">Sucos</option>
              <option value="refil">Refil</option>
            </select>
            <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
              <option value="ambos">Delivery e balcao</option>
              <option value="delivery">Delivery</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Preco, ex: 5,00" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <button type="button" onClick={createProduct} className="rounded bg-black px-4 py-3 font-black text-yellow-300">
            Salvar produto
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {products.map((product) => (
          <div key={product.id} className="grid gap-2 border-b border-zinc-100 p-4 text-sm font-semibold sm:grid-cols-[1fr_auto_auto]">
            <span>{product.name}</span>
            <span>{product.availability}</span>
            <span className="font-black">{formatCurrency(product.price)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StockPanel({
  stock,
  onUpdated,
  setMessage,
}: {
  stock: StockItem[]
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  async function update(item: StockItem, quantity: number) {
    await api.updateStock(item.id, { quantity, minQuantity: item.minQuantity })
    setMessage(`${item.name} atualizado.`)
    await onUpdated()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stock.map((item) => (
        <article key={item.id} className={`rounded-lg border p-5 ${item.low ? 'border-red-500 bg-red-50' : 'border-zinc-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">{item.name}</h3>
              <p className="text-sm font-semibold text-zinc-600">
                Minimo: {item.minQuantity} {item.unit}
              </p>
            </div>
            {item.low ? <span className="rounded bg-red-700 px-2 py-1 text-xs font-black text-white">Baixo</span> : null}
          </div>
          <div className="mt-4 flex gap-3">
            <input
              type="number"
              defaultValue={item.quantity}
              onBlur={(event) => update(item, Number(event.target.value))}
              className="w-full rounded border border-zinc-300 px-3 py-3 font-semibold"
            />
            <span className="grid place-items-center rounded bg-zinc-100 px-3 text-sm font-black">{item.unit}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ReportsPanel({ summary, orders }: { summary: ReportSummary | null; orders: ApiOrder[] }) {
  if (!summary) return null

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vendas hoje" value={formatCurrency(summary.revenue)} />
        <Metric label="Pedidos hoje" value={String(summary.orders)} />
        <Metric label="Pendentes" value={String(summary.pendingOrders)} />
        <Metric label="Estoque baixo" value={String(summary.lowStockItems)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-5">
          <h3 className="text-xl font-black">Produtos mais vendidos</h3>
          <div className="mt-4 space-y-3">
            {summary.topProducts.map((product) => (
              <p key={product.productName} className="flex justify-between text-sm font-semibold">
                <span>{product.productName}</span>
                <span>{product.quantity} un</span>
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-5">
          <h3 className="text-xl font-black">Ultimos pedidos</h3>
          <div className="mt-4 space-y-3">
            {orders.slice(0, 6).map((order) => (
              <p key={order.id} className="flex justify-between text-sm font-semibold">
                <span>{order.customerName}</span>
                <span>{formatCurrency(order.total)}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-black p-5 text-white">
        <h3 className="text-xl font-black text-yellow-300">Fidelidade e recursos inteligentes</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-200">
          A API ja pontua clientes por telefone a cada pedido. A proxima evolucao e usar esses dados para
          cupons, recomendacoes e campanhas automaticas.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black p-5 text-white">
      <p className="text-sm font-black uppercase tracking-wide text-yellow-300">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}
