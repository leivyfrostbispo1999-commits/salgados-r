import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  api,
  type ApiOrder,
  type ApiProduct,
  type AuthUser,
  type FinanceSummary,
  type PrintStatus,
  type ReportSummary,
  type SecurityStatus,
  type StockItem,
  formatCurrency,
} from '../utils/api'

type CartItem = {
  product: ApiProduct
  quantity: number
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'relatorios', label: 'Relatorios' },
  { id: 'impressao', label: 'Impressao' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'seguranca', label: 'Seguranca' },
] as const

type TabId = (typeof tabs)[number]['id']

const statusFlow: ApiOrder['status'][] = ['RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'FINALIZADO']

export function OperationsSuite() {
  const [activeTab, setActiveTab] = useState<TabId>(() => pathToTab(window.location.pathname))
  const [authChecked, setAuthChecked] = useState(false)
  const [hasUsers, setHasUsers] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [customers, setCustomers] = useState<unknown[]>([])
  const [auditLogs, setAuditLogs] = useState<unknown[]>([])
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [printStatus, setPrintStatus] = useState<PrintStatus | null>(null)
  const [security, setSecurity] = useState<SecurityStatus | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [nextProducts, nextOrders, nextStock, nextSummary, nextCustomers, nextAuditLogs, nextFinance, nextPrint, nextSecurity] = await Promise.all([
      api.products(),
      api.orders(),
      api.stock(),
      api.summary(),
      api.customers().catch(() => []),
      api.auditLogs().catch(() => []),
      api.financeSummary().catch(() => null),
      api.printStatus().catch(() => null),
      api.securityStatus().catch(() => null),
    ])
    setProducts(nextProducts)
    setOrders(nextOrders)
    setStock(nextStock)
    setSummary(nextSummary)
    setCustomers(nextCustomers)
    setAuditLogs(nextAuditLogs)
    setFinance(nextFinance)
    setPrintStatus(nextPrint)
    setSecurity(nextSecurity)
  }

  useEffect(() => {
    api
      .authStatus()
      .then((status) => {
        setHasUsers(status.hasUsers)
        setAuthChecked(true)
        if (!status.hasUsers || !api.token.get()) {
          setLoading(false)
          return
        }
        return refresh()
          .then(() => setUser({ id: 'session', name: 'Sessao ativa', email: '', role: 'ADMIN' }))
          .catch((error: Error) => {
            api.token.clear()
            setMessage(error.message)
          })
          .finally(() => setLoading(false))
      })
      .catch((error: Error) => {
        setMessage(error.message)
        setAuthChecked(true)
        setLoading(false)
      })
  }, [])

  async function afterAuth(nextUser: AuthUser) {
    setUser(nextUser)
    setLoading(true)
    await refresh()
    setLoading(false)
  }

  function logout() {
    api.token.clear()
    setUser(null)
    setOrders([])
    setStock([])
    setSummary(null)
  }

  return (
    <section id="sistema" className="min-h-screen bg-[#F5F5F5] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/" className="text-sm font-black text-[#DA291C]">← Voltar para o site</a>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#DA291C]">Sistema operacional</p>
            <h1 className="mt-2 text-3xl font-black text-[#1D1D1D]">Pedidos, cozinha, estoque, financeiro e gestao.</h1>
          </div>
          <span className="w-fit rounded-full bg-[#FFC72C] px-4 py-2 text-sm font-black text-[#1D1D1D]">PostgreSQL + API</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-zinc-600">
          Primeira versao operacional do Salgados R: backend com PostgreSQL, login por perfis, painel de cozinha,
          produtos, estoque, relatorios, financeiro, auditoria, impressao mock e base para PIX/PWA.
        </p>

        {user ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-950 p-4 text-white">
            <p className="text-sm font-bold">
              Logado como <span className="text-yellow-300">{user.name}</span> {user.role ? `(${user.role})` : null}
            </p>
            <button type="button" onClick={logout} className="rounded bg-yellow-300 px-3 py-2 text-sm font-black text-black">
              Sair
            </button>
          </div>
        ) : null}

        {user ? (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded px-4 py-3 text-sm font-black ${
              activeTab === tab.id ? 'bg-[#1D1D1D] text-[#FFC72C]' : 'bg-white text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {message ? <p className="mt-4 rounded bg-yellow-100 p-3 text-sm font-bold text-zinc-900">{message}</p> : null}

        <div className="mt-6">
          {loading || !authChecked ? <p className="font-bold">Carregando sistema...</p> : null}
          {!loading && authChecked && !user && !hasUsers ? (
            <BootstrapForm onReady={afterAuth} setMessage={setMessage} />
          ) : null}
          {!loading && authChecked && !user && hasUsers ? <LoginForm onReady={afterAuth} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'dashboard' ? <ReportsPanel summary={summary} orders={orders} /> : null}
          {!loading && user && activeTab === 'pedidos' ? (
            <OrderBuilder products={products} onCreated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'cozinha' ? (
            <KitchenPanel orders={orders} onUpdated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'produtos' ? (
            <AdminPanel products={products} onCreated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'estoque' ? (
            <StockPanel stock={stock} onUpdated={refresh} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'clientes' ? <SimpleListPanel title="Clientes" items={customers} empty="Ainda nao ha clientes cadastrados." /> : null}
          {!loading && user && activeTab === 'financeiro' ? <FinancePanel finance={finance} /> : null}
          {!loading && user && activeTab === 'relatorios' ? <ReportsPanel summary={summary} orders={orders} /> : null}
          {!loading && user && activeTab === 'impressao' ? (
            <PrintingPanel status={printStatus} onTest={async () => { await api.testPrint(); await refresh(); }} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'auditoria' ? <SimpleListPanel title="Auditoria" items={auditLogs} empty="Ainda nao ha eventos de auditoria." /> : null}
          {!loading && user && activeTab === 'seguranca' ? <SecurityPanel security={security} /> : null}
        </div>
      </div>
    </section>
  )
}

function pathToTab(path: string): TabId {
  if (path.includes('/cozinha')) return 'cozinha'
  if (path.includes('/pedidos')) return 'pedidos'
  if (path.includes('/produtos')) return 'produtos'
  if (path.includes('/estoque')) return 'estoque'
  if (path.includes('/clientes')) return 'clientes'
  if (path.includes('/financeiro')) return 'financeiro'
  if (path.includes('/relatorios')) return 'relatorios'
  if (path.includes('/auditoria')) return 'auditoria'
  if (path.includes('/seguranca')) return 'seguranca'
  return 'dashboard'
}

function BootstrapForm({
  onReady,
  setMessage,
}: {
  onReady: (user: AuthUser) => Promise<void>
  setMessage: (message: string) => void
}) {
  const [name, setName] = useState('Regina')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit() {
    try {
      const result = await api.bootstrap({ name, email, password })
      setMessage('SUPER_US criado. Guarde essa senha com cuidado.')
      await onReady(result.user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no bootstrap.')
    }
  }

  return (
    <AuthBox title="Criar primeiro SUPER_US" subtitle="Esse passo aparece apenas enquanto nao existe usuario no banco.">
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha inicial" type="password" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <button type="button" onClick={submit} className="rounded bg-black px-4 py-3 font-black text-yellow-300">
        Criar SUPER_US
      </button>
    </AuthBox>
  )
}

function LoginForm({
  onReady,
  setMessage,
}: {
  onReady: (user: AuthUser) => Promise<void>
  setMessage: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit() {
    try {
      const result = await api.login({ email, password })
      setMessage('Login realizado.')
      await onReady(result.user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no login.')
    }
  }

  return (
    <AuthBox title="Entrar no painel" subtitle="Acesso restrito a SUPER_US, ADMIN, GERENTE e ATENDENTE.">
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" type="password" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <button type="button" onClick={submit} className="rounded bg-black px-4 py-3 font-black text-yellow-300">
        Entrar
      </button>
    </AuthBox>
  )
}

function AuthBox({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-zinc-600">{subtitle}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
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
  const visibleOrders = orders.filter((order) => order.status !== 'FINALIZADO' && order.status !== 'CANCELADO')

  async function move(order: ApiOrder) {
    const currentIndex = statusFlow.indexOf(order.status)
    const nextStatus = statusFlow[Math.min(Math.max(currentIndex, 0) + 1, statusFlow.length - 1)]
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
        <Metric label="Vendas no mes" value={formatCurrency(summary.monthRevenue)} />
        <Metric label="Pedidos hoje" value={String(summary.orders)} />
        <Metric label="Ticket medio" value={formatCurrency(summary.averageTicket)} />
        <Metric label="Pendentes" value={String(summary.pendingOrders)} />
        <Metric label="Finalizados" value={String(summary.deliveredOrders)} />
        <Metric label="Cancelados" value={String(summary.canceledOrders)} />
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
          <h3 className="text-xl font-black">Formas de pagamento</h3>
          <div className="mt-4 space-y-3">
            {summary.paymentMethods.length === 0 ? <p className="text-sm font-semibold text-zinc-600">Ainda nao ha vendas registradas.</p> : null}
            {summary.paymentMethods.map((payment) => (
              <p key={payment.method} className="flex justify-between text-sm font-semibold">
                <span>{payment.method}</span>
                <span>{formatCurrency(payment.total)}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-5">
          <h3 className="text-xl font-black">Ultimos pedidos</h3>
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? <p className="text-sm font-semibold text-zinc-600">Ainda nao ha pedidos.</p> : null}
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

function FinancePanel({ finance }: { finance: FinanceSummary | null }) {
  if (!finance) {
    return <EmptyState text="Modulo financeiro aguardando permissao ou dados." />
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Faturamento hoje" value={formatCurrency(finance.revenue)} />
        <Metric label="Despesas hoje" value={formatCurrency(finance.expenses)} />
        <Metric label="Resultado estimado" value={formatCurrency(finance.estimatedProfit)} />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="text-xl font-black">Caixa</h3>
        <p className="mt-2 text-sm font-semibold text-zinc-600">
          {finance.openSession ? 'Ha um caixa aberto.' : 'Nenhum caixa aberto no momento.'}
        </p>
        <div className="mt-4 space-y-3">
          {finance.byMethod.length === 0 ? <p className="text-sm font-semibold text-zinc-600">Sem movimentos financeiros hoje.</p> : null}
          {finance.byMethod.map((item) => (
            <p key={item.method} className="flex justify-between text-sm font-bold">
              <span>{item.method}</span>
              <span>{formatCurrency(item.total)}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrintingPanel({
  status,
  onTest,
  setMessage,
}: {
  status: PrintStatus | null
  onTest: () => Promise<void>
  setMessage: (message: string) => void
}) {
  async function test() {
    await onTest()
    setMessage('Teste de impressao criado na fila mock.')
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-xl font-black">Impressao termica ESC/POS</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">
        {status?.message ?? 'Agente de impressao ainda nao configurado nesta maquina.'}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Metric label="Modo" value={status?.mode ?? 'mock'} />
        <Metric label="Pendentes" value={String(status?.pending ?? 0)} />
        <Metric label="Falhas" value={String(status?.failed ?? 0)} />
      </div>
      <button type="button" onClick={test} className="mt-5 rounded bg-black px-4 py-3 font-black text-yellow-300">
        Criar teste de impressao
      </button>
    </div>
  )
}

function SecurityPanel({ security }: { security: SecurityStatus | null }) {
  if (!security) return <EmptyState text="Area de seguranca disponivel para SUPER_US ou ADMIN." />

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="API" value={security.api} />
        <Metric label="Banco" value={security.database} />
        <Metric label="Auth" value={security.auth} />
        <Metric label="Rate limit" value={security.loginRateLimit} />
      </div>
      <SimpleListPanel
        title="Falhas recentes de login"
        items={security.recentLoginFailures}
        empty="Nao ha falhas recentes de login."
      />
    </div>
  )
}

function SimpleListPanel({ title, items, empty }: { title: string; items: unknown[]; empty: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-xl font-black">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? <EmptyState text={empty} /> : null}
        {items.slice(0, 20).map((item, index) => (
          <pre key={index} className="overflow-auto rounded bg-zinc-50 p-3 text-xs font-semibold text-zinc-700">
            {JSON.stringify(item, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-600">{text}</p>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black p-5 text-white">
      <p className="text-sm font-black uppercase tracking-wide text-yellow-300">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}
