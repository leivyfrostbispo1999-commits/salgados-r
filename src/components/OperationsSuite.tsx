import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  api,
  type ApiOrder,
  type ApiProduct,
  type AuthUser,
  type FinanceSummary,
  type ReportSummary,
  type StockItem,
  formatCurrency,
} from '../utils/api'
import { buildOrderWhatsAppUrl } from '../utils/whatsapp'
import { ProductionCalculator } from './ProductionCalculator'

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'calculos', label: 'Calculadora', roles: ['SUPER_US', 'ADMIN', 'GERENTE'] },
  { id: 'clientes', label: 'Clientes' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'relatorios', label: 'Relatorios' },
  { id: 'auditoria', label: 'Auditoria' },
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
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [nextProducts, nextOrders, nextStock, nextSummary, nextCustomers, nextAuditLogs, nextFinance] = await Promise.all([
      api.products(),
      api.orders(),
      api.stock(),
      api.summary(),
      api.customers().catch(() => []),
      api.auditLogs().catch(() => []),
      api.financeSummary().catch(() => null),
    ])
    setProducts(nextProducts)
    setOrders(nextOrders)
    setStock(nextStock)
    setSummary(nextSummary)
    setCustomers(nextCustomers)
    setAuditLogs(nextAuditLogs)
    setFinance(nextFinance)
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
          .then(async () => {
            const sessionUser = await api.me()
            setUser(sessionUser)
          })
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

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [user])

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
          produtos, estoque, relatorios, caixa simples, auditoria e base para PIX manual/PWA.
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
            {tabs.filter((tab) => !('roles' in tab) || (tab.roles as readonly string[]).includes(user.role)).map((tab) => (
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
            <OrdersPanel orders={orders} onUpdated={refresh} setMessage={setMessage} />
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
          {!loading && user && activeTab === 'calculos' ? (
            <ProductionCalculator products={products} user={user} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'clientes' ? <SimpleListPanel title="Clientes" items={customers} empty="Ainda nao ha clientes cadastrados." /> : null}
          {!loading && user && activeTab === 'caixa' ? <FinancePanel finance={finance} onUpdated={refresh} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'relatorios' ? <ReportsPanel summary={summary} orders={orders} /> : null}
          {!loading && user && activeTab === 'auditoria' ? <SimpleListPanel title="Auditoria" items={auditLogs} empty="Ainda nao ha eventos de auditoria." /> : null}
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
  if (path.includes('/calculos') || path.includes('/producao')) return 'calculos'
  if (path.includes('/clientes')) return 'clientes'
  if (path.includes('/financeiro') || path.includes('/caixa')) return 'caixa'
  if (path.includes('/relatorios')) return 'relatorios'
  if (path.includes('/auditoria')) return 'auditoria'
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

function OrdersPanel({
  orders,
  onUpdated,
  setMessage,
}: {
  orders: ApiOrder[]
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const filtered = orders.filter((order) => {
    const haystack = `${order.orderNumber || ''} ${order.id} ${order.customerName} ${order.phone}`.toLowerCase()
    return order.createdAt.startsWith(today) && haystack.includes(search.toLowerCase())
  })
  const received = filtered.filter((order) => order.status === 'RECEBIDO').length

  async function setStatus(order: ApiOrder, status: ApiOrder['status']) {
    await api.updateOrderStatus(order.id, status)
    setMessage(`Pedido #${order.orderNumber || order.id.slice(0, 8)} atualizado para ${status}.`)
    await onUpdated()
  }

  async function copy(order: ApiOrder) {
    const summary = [
      `Pedido #${order.orderNumber || order.id.slice(0, 8)}`,
      `Cliente: ${order.customerName}`,
      `WhatsApp: ${order.phone}`,
      `Tipo: ${labelChannel(order.channel)}`,
      `Pagamento: ${labelPayment(order.paymentMethod)}`,
      ...order.items.map((item) => `${item.quantity}x ${item.productName}`),
      `Total: ${formatCurrency(order.total)}`,
      order.notes ? `Obs: ${order.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    await navigator.clipboard.writeText(summary)
    setMessage('Resumo do pedido copiado.')
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, telefone ou numero"
          className="rounded border border-zinc-300 px-3 py-3 font-semibold"
        />
        <span className="rounded-full bg-[#FFC72C] px-4 py-2 text-sm font-black">Novos: {received}</span>
        <button type="button" onClick={onUpdated} className="rounded-full bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
          Atualizar agora
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? <EmptyState text="Ainda nao ha pedidos hoje." /> : null}
        {filtered.map((order) => (
          <article key={order.id} className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#DA291C]">
                  Pedido #{order.orderNumber || order.id.slice(0, 8)}
                </p>
                <h3 className="text-xl font-black text-[#1D1D1D]">{order.customerName}</h3>
                <p className="text-sm font-semibold text-zinc-600">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 grid gap-1 text-sm font-semibold text-zinc-700">
              <p>WhatsApp: {order.phone}</p>
              <p>Tipo: {labelChannel(order.channel)}</p>
              <p>Pagamento: {labelPayment(order.paymentMethod)}</p>
            </div>
            <ul className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3 text-sm font-semibold">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}x {item.productName}
                  {item.notes ? <span className="block text-xs text-[#DA291C]">Obs: {item.notes}</span> : null}
                </li>
              ))}
            </ul>
            {order.notes ? <p className="mt-3 rounded bg-yellow-50 p-3 text-sm font-bold">Obs geral: {order.notes}</p> : null}
            <p className="mt-4 flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </p>
            <div className="mt-4 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                {nextActions(order.status).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => setStatus(order, action.status)}
                    className="rounded bg-[#1D1D1D] px-3 py-3 text-xs font-black text-white"
                  >
                    {action.label}
                  </button>
                ))}
                {order.status !== 'CANCELADO' && order.status !== 'FINALIZADO' ? (
                  <button type="button" onClick={() => setStatus(order, 'CANCELADO')} className="rounded bg-[#DA291C] px-3 py-3 text-xs font-black text-white">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={buildOrderWhatsAppUrl(order)} target="_blank" rel="noreferrer" className="rounded bg-[#FFC72C] px-3 py-3 text-center text-xs font-black text-[#1D1D1D]">
                  WhatsApp
                </a>
                <button type="button" onClick={() => copy(order)} className="rounded bg-zinc-100 px-3 py-3 text-xs font-black text-zinc-800">
                  Copiar resumo
                </button>
              </div>
            </div>
          </article>
        ))}
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

  async function toggleProduct(product: ApiProduct) {
    await api.updateProduct(product.id, { active: !product.active })
    setMessage(product.active ? 'Produto desativado.' : 'Produto ativado.')
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
          <div key={product.id} className="grid gap-2 border-b border-zinc-100 p-4 text-sm font-semibold sm:grid-cols-[1fr_auto_auto_auto]">
            <span>{product.name}</span>
            <span>{product.active ? 'ativo' : 'inativo'}</span>
            <span className="font-black">{formatCurrency(product.price)}</span>
            <button type="button" onClick={() => toggleProduct(product)} className="rounded bg-zinc-100 px-3 py-2 text-xs font-black">
              {product.active ? 'Desativar' : 'Ativar'}
            </button>
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
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('unidade')
  const [quantity, setQuantity] = useState('')
  const [minQuantity, setMinQuantity] = useState('')
  const [movementQuantity, setMovementQuantity] = useState('')

  async function update(item: StockItem, quantity: number) {
    await api.updateStock(item.id, { quantity, minQuantity: item.minQuantity })
    setMessage(`${item.name} atualizado.`)
    await onUpdated()
  }

  async function createItem() {
    await api.createStockItem({
      name,
      unit,
      quantity: Number(quantity.replace(',', '.')),
      minQuantity: Number(minQuantity.replace(',', '.')),
    })
    setMessage('Item de estoque criado.')
    setName('')
    setQuantity('')
    setMinQuantity('')
    await onUpdated()
  }

  async function move(item: StockItem, type: 'entrada' | 'saida') {
    await api.moveStock(item.id, { type, quantity: Number(movementQuantity.replace(',', '.')), reason: 'Movimento manual' })
    setMessage(`${item.name} movimentado.`)
    setMovementQuantity('')
    await onUpdated()
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black">Novo item de estoque</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="rounded border border-zinc-300 px-3 py-3 font-semibold sm:col-span-2" />
          <select value={unit} onChange={(event) => setUnit(event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
            <option value="unidade">unidade</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="litro">litro</option>
            <option value="ml">ml</option>
            <option value="pacote">pacote</option>
          </select>
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qtd atual" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={minQuantity} onChange={(event) => setMinQuantity(event.target.value)} placeholder="Qtd minima" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
        </div>
        <button type="button" onClick={createItem} className="mt-3 rounded bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
          Cadastrar item
        </button>
      </div>

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
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} placeholder="Qtd movimento" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              <button type="button" onClick={() => move(item, 'entrada')} className="rounded bg-green-100 px-3 py-3 text-xs font-black text-green-900">Entrada</button>
              <button type="button" onClick={() => move(item, 'saida')} className="rounded bg-red-100 px-3 py-3 text-xs font-black text-red-900">Saida</button>
            </div>
          </article>
        ))}
      </div>
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

function FinancePanel({
  finance,
  onUpdated,
  setMessage,
}: {
  finance: FinanceSummary | null
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  if (!finance) {
    return <EmptyState text="Modulo financeiro aguardando permissao ou dados." />
  }

  async function openCash() {
    await api.cashOpen({ openingAmountCents: toCents(amount) })
    setMessage('Caixa aberto.')
    setAmount('')
    await onUpdated()
  }

  async function closeCash() {
    await api.cashClose({ closingAmountCents: toCents(amount) })
    setMessage('Caixa fechado.')
    setAmount('')
    await onUpdated()
  }

  async function movement(type: 'entrada' | 'saida') {
    await api.cashMovement({
      type,
      amountCents: toCents(amount),
      paymentMethod: 'dinheiro',
      description: description || (type === 'entrada' ? 'Entrada manual' : 'Saida manual'),
    })
    setMessage('Movimento registrado.')
    setAmount('')
    setDescription('')
    await onUpdated()
  }

  async function expense() {
    await api.cashExpense({ description: description || 'Despesa', amountCents: toCents(amount) })
    setMessage('Despesa registrada.')
    setAmount('')
    setDescription('')
    await onUpdated()
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
          {finance.openSession ? 'Caixa aberto. Pedidos finalizados entram no controle.' : 'Caixa fechado. Abra o caixa para controle financeiro correto.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor, ex: 50,00" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descricao" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <button type="button" onClick={finance.openSession ? closeCash : openCash} className="rounded bg-[#1D1D1D] px-4 py-3 text-sm font-black text-white">
            {finance.openSession ? 'Fechar caixa' : 'Abrir caixa'}
          </button>
          <button type="button" onClick={expense} className="rounded bg-[#DA291C] px-4 py-3 text-sm font-black text-white">
            Despesa
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => movement('entrada')} className="rounded bg-green-100 px-4 py-3 text-sm font-black text-green-900">
            Entrada manual
          </button>
          <button type="button" onClick={() => movement('saida')} className="rounded bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-900">
            Saida manual
          </button>
        </div>
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

function StatusBadge({ status }: { status: ApiOrder['status'] }) {
  const color =
    status === 'RECEBIDO'
      ? 'bg-yellow-100 text-yellow-900'
      : status === 'PREPARANDO'
        ? 'bg-red-100 text-red-900'
        : status === 'PRONTO'
          ? 'bg-green-100 text-green-900'
          : status === 'FINALIZADO'
            ? 'bg-zinc-900 text-white'
            : status === 'CANCELADO'
              ? 'bg-zinc-200 text-zinc-700'
              : 'bg-blue-100 text-blue-900'

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{status}</span>
}

function nextActions(status: ApiOrder['status']) {
  if (status === 'RECEBIDO') return [{ label: 'Aceitar', status: 'ACEITO' as const }]
  if (status === 'ACEITO') return [{ label: 'Preparar', status: 'PREPARANDO' as const }]
  if (status === 'PREPARANDO') return [{ label: 'Pronto', status: 'PRONTO' as const }]
  if (status === 'PRONTO') return [{ label: 'Finalizar', status: 'FINALIZADO' as const }]
  return []
}

function labelChannel(channel: string) {
  if (channel === 'delivery') return 'Entrega'
  if (channel === 'local' || channel === 'presencial') return 'Consumo no local'
  return 'Retirada'
}

function labelPayment(payment: string) {
  if (payment === 'pix') return 'PIX'
  if (payment === 'dinheiro') return 'Dinheiro'
  if (payment === 'cartao') return 'Cartao'
  return payment
}

function toCents(value: string) {
  return Math.round(Number(value.replace(',', '.')) * 100) || 0
}
