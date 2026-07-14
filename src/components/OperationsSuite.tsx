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
import { allowedTabs, displayRole, hasPermission } from '../utils/accessControl'
import { buildOrderWhatsAppUrl } from '../utils/whatsapp'
import { ProductionCalculator } from './ProductionCalculator'

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'maturidade', label: 'Maturidade' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'calculos', label: 'Calculadora' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'relatorios', label: 'Relatorios' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'impressao', label: 'Impressao' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'seguranca', label: 'Seguranca' },
] as const

type TabId = (typeof tabs)[number]['id']

const statusFlow: ApiOrder['status'][] = ['RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'FINALIZADO']
const activeOrderStatuses: ApiOrder['status'][] = ['RECEBIDO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA']
const kitchenColumns = [
  { id: 'RECEBIDO', title: 'Novos', statuses: ['RECEBIDO', 'ACEITO'] as ApiOrder['status'][] },
  { id: 'PREPARANDO', title: 'Em preparo', statuses: ['PREPARANDO'] as ApiOrder['status'][] },
  { id: 'PRONTO', title: 'Prontos', statuses: ['PRONTO', 'SAIU_PARA_ENTREGA'] as ApiOrder['status'][] },
] as const

function isActiveOrder(order: ApiOrder) {
  return activeOrderStatuses.includes(order.status)
}

function elapsedLabel(date: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000))
  if (minutes < 1) return 'AGORA'
  if (minutes < 60) return `HA ${minutes} MIN`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `HA ${hours}H ${rest}MIN` : `HA ${hours}H`
}

const maturityModules = [
  {
    area: 'Site publico',
    status: 'Pronto',
    detail: 'Home, cardapio digital, carrinho, checkout, WhatsApp e PWA publicados.',
    next: 'Adicionar dominio .com.br e acompanhar indexacao no Google.',
  },
  {
    area: 'Pedidos pelo site',
    status: 'Pronto',
    detail: 'Pedido grava no PostgreSQL, gera numero, itens, cliente, entrega, pagamento e notificacao.',
    next: 'Criar alerta sonoro persistente para pedidos novos no painel da loja.',
  },
  {
    area: 'Painel da cozinha',
    status: 'Pronto',
    detail: 'Fluxo RECEBIDO, ACEITO, PREPARANDO, PRONTO, SAIU PARA ENTREGA e FINALIZADO.',
    next: 'Adicionar modo TV/cozinha com cards maiores e timer por pedido.',
  },
  {
    area: 'Usuarios e permissoes',
    status: 'Pronto',
    detail: 'SUPER_US, GERENTE e FUNCIONARIO na experiencia interna, mantendo compatibilidade tecnica com ADMIN e ATENDENTE.',
    next: 'Criar tela completa de gestao de usuarios e troca de senha.',
  },
  {
    area: 'Produtos e cardapio',
    status: 'Pronto',
    detail: 'Cadastro por API, categorias, disponibilidade, destaque, preco e regra presencial/delivery.',
    next: 'Adicionar upload de imagem pelo painel.',
  },
  {
    area: 'Clientes e fidelidade',
    status: 'Base pronta',
    detail: 'Clientes sao consolidados por telefone, com historico, gasto total e pontos.',
    next: 'Criar tela visual de fidelidade, cupons e campanhas.',
  },
  {
    area: 'Estoque',
    status: 'Base pronta',
    detail: 'Itens, quantidade, minimo, alerta de baixo estoque e movimentacao de entrada/saida.',
    next: 'Ligar baixa automatica ao pedido por ficha tecnica.',
  },
  {
    area: 'Financeiro',
    status: 'Base pronta',
    detail: 'Caixa, entradas, saidas, despesas e resumo por forma de pagamento.',
    next: 'Fechamento de caixa com conferencia e relatorio imprimivel.',
  },
  {
    area: 'Impressao automatica',
    status: 'Pendente externo',
    detail: 'API tem fila de impressao e teste; falta agente local Windows conectado a impressora termica.',
    next: 'Instalar agente na maquina da loja e configurar impressora real.',
  },
  {
    area: 'Backup',
    status: 'Base pronta',
    detail: 'Script PostgreSQL e endpoint de status preparados.',
    next: 'Ativar cron na VM e opcionalmente enviar para Oracle Object Storage ou Google Drive.',
  },
  {
    area: 'Entrega',
    status: 'Base pronta',
    detail: 'Checkout possui retirada, consumo local e delivery com taxa configuravel.',
    next: 'Cadastrar bairros, taxas por zona e painel do entregador.',
  },
  {
    area: 'Inteligencia',
    status: 'Planejado',
    detail: 'Dados de pedidos, clientes, produtos e vendas ja ficam estruturados para automacoes futuras.',
    next: 'Criar recomendacoes, combos, reativacao de clientes e dashboard preditivo.',
  },
] as const

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
  const [users, setUsers] = useState<AuthUser[]>([])
  const [auditLogs, setAuditLogs] = useState<unknown[]>([])
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [security, setSecurity] = useState<SecurityStatus | null>(null)
  const [printing, setPrinting] = useState<PrintStatus | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState('')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  async function refresh(actor = user) {
    const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(actor, permission)
    const [nextProducts, nextOrders, nextStock, nextSummary, nextCustomers, nextUsers, nextAuditLogs, nextFinance, nextSecurity, nextPrinting] = await Promise.all([
      can('products.view') ? api.products() : Promise.resolve([]),
      can('orders.view') ? api.orders() : Promise.resolve([]),
      can('inventory.view') ? api.stock() : Promise.resolve([]),
      can('reports.view_basic') ? api.summary() : Promise.resolve(null),
      can('customers.view') ? api.customers().catch(() => []) : Promise.resolve([]),
      can('users.view') ? api.users().catch(() => []) : Promise.resolve([]),
      can('audit.view') ? api.auditLogs().catch(() => []) : Promise.resolve([]),
      can('cash.view') ? api.financeSummary().catch(() => null) : Promise.resolve(null),
      can('security.view') ? api.securityStatus().catch(() => null) : Promise.resolve(null),
      can('printing.view') ? api.printStatus().catch(() => null) : Promise.resolve(null),
    ])
    setProducts(nextProducts)
    setOrders(nextOrders)
    setStock(nextStock)
    setSummary(nextSummary)
    setCustomers(nextCustomers)
    setUsers(nextUsers)
    setAuditLogs(nextAuditLogs)
    setFinance(nextFinance)
    setSecurity(nextSecurity)
    setPrinting(nextPrinting)
    setRefreshError('')
    setLastUpdatedAt(new Date().toISOString())
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
        return api.me()
          .then(async (sessionUser) => {
            setUser(sessionUser)
            await refresh(sessionUser)
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
    await refresh(nextUser)
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
      if (document.visibilityState === 'hidden' || !navigator.onLine) return
      refresh(user).catch((error: Error) => setRefreshError(error.message || 'Nao foi possivel atualizar.'))
    }, 15000)
    return () => window.clearInterval(timer)
  }, [user])

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine)
    }
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const tabAccess = allowedTabs(user)
  const visibleTabs = useMemo(() => tabs.filter((tab) => tabAccess[tab.id]), [tabAccess])
  const activeOrders = orders.filter(isActiveOrder)
  const operationalAlerts = [
    !isOnline ? 'SEM CONEXAO. ALTERACOES DE STATUS DEVEM AGUARDAR A REDE VOLTAR.' : '',
    refreshError ? `NAO FOI POSSIVEL ATUALIZAR: ${refreshError}` : '',
    printing?.failed ? `${printing.failed} IMPRESSAO COM FALHA.` : '',
    stock.some((item) => item.low) ? `${stock.filter((item) => item.low).length} ITEM(NS) COM ESTOQUE BAIXO.` : '',
  ].filter(Boolean)

  useEffect(() => {
    if (!user || visibleTabs.some((tab) => tab.id === activeTab)) return
    setActiveTab(visibleTabs[0]?.id || 'dashboard')
  }, [activeTab, user, visibleTabs])

  return (
    <section id="sistema" className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="mx-auto grid max-w-[1560px] gap-0 lg:grid-cols-[280px_1fr]">
        {user ? (
          <aside className="hidden min-h-screen border-r border-zinc-200 bg-zinc-950 p-5 text-white lg:block">
            <a href="/" className="text-sm font-black text-[var(--sr-yellow)]">← Voltar para o site</a>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Central interna</p>
            <h1 className="mt-2 text-3xl font-black leading-none">Salgados R Operacao</h1>
            <div className="mt-5 rounded-2xl border border-[var(--sr-yellow)] p-4">
              <p className="text-sm font-black">{user.name}</p>
              <p className="mt-1 text-xs font-bold text-zinc-300">{displayRole(user.role)}</p>
              <p className="mt-3 text-xs font-bold text-zinc-300">
                {isOnline ? 'ONLINE' : 'SEM CONEXAO'}
                {lastUpdatedAt ? ` · ${new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
            <nav className="mt-5 grid gap-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-black transition ${
                    activeTab === tab.id ? 'bg-[var(--sr-yellow)] text-zinc-950' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={logout} className="mt-5 w-full rounded-xl border border-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-white">
              Sair
            </button>
          </aside>
        ) : null}

        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--sr-red)] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <a href="/" className="text-sm font-black text-[var(--sr-yellow)]">← Voltar para o site</a>
              <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Sistema operacional</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Pedidos, cozinha e comando da loja.</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white">
                Central unica da equipe com RBAC, PostgreSQL, API, operacao de pedidos, cozinha, estoque, caixa simples e auditoria.
              </p>
            </div>
            <div className="grid gap-2 text-sm font-black sm:text-right">
              <span className="w-fit rounded-full bg-[var(--sr-yellow)] px-4 py-2 text-zinc-950 sm:ml-auto">PostgreSQL + API</span>
              {user ? <span>{activeOrders.length} pedido(s) na fila</span> : null}
            </div>
          </div>

          {user ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold">
                  Logado como <span className="text-[var(--sr-red)]">{user.name}</span> {user.role ? `(${displayRole(user.role)})` : null}
                </p>
                <button type="button" onClick={logout} className="rounded-full bg-[var(--sr-yellow)] px-4 py-2 text-sm font-black text-zinc-950">
                  Sair
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-3 text-sm font-black ${
                      activeTab === tab.id ? 'bg-zinc-950 text-[var(--sr-yellow)]' : 'bg-zinc-100 text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {user ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Novos" value={String(orders.filter((order) => order.status === 'RECEBIDO').length)} />
              <Metric label="Em preparo" value={String(orders.filter((order) => order.status === 'PREPARANDO').length)} />
              <Metric label="Prontos" value={String(orders.filter((order) => order.status === 'PRONTO').length)} />
              <Metric label="Fila ativa" value={String(activeOrders.length)} />
            </div>
          ) : null}

          {operationalAlerts.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {operationalAlerts.map((alert) => (
                <p key={alert} className="rounded-xl border border-[var(--sr-yellow)] bg-[var(--sr-yellow)] p-3 text-sm font-black text-zinc-950">
                  {alert}
                </p>
              ))}
            </div>
          ) : null}

          {message ? <p className="mt-4 rounded-xl bg-[var(--sr-yellow)] p-3 text-sm font-black text-zinc-950">{message}</p> : null}

          <div className="mt-6">
          {loading || !authChecked ? <p className="font-bold">Carregando sistema...</p> : null}
          {!loading && authChecked && !user && !hasUsers ? (
            <BootstrapForm onReady={afterAuth} setMessage={setMessage} />
          ) : null}
          {!loading && authChecked && !user && hasUsers ? <LoginForm onReady={afterAuth} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'dashboard' ? <ReportsPanel summary={summary} orders={orders} /> : null}
          {!loading && user && activeTab === 'maturidade' ? (
            <MaturityPanel products={products} orders={orders} stock={stock} summary={summary} finance={finance} />
          ) : null}
          {!loading && user && activeTab === 'pedidos' ? (
            <OrdersPanel orders={orders} user={user} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'cozinha' ? (
            <KitchenPanel orders={orders} isOnline={isOnline} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'produtos' ? (
            <AdminPanel products={products} user={user} onCreated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'estoque' ? (
            <StockPanel stock={stock} user={user} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'calculos' ? (
            <ProductionCalculator products={products} user={user} setMessage={setMessage} />
          ) : null}
          {!loading && user && activeTab === 'clientes' ? <SimpleListPanel title="Clientes" items={customers} empty="Ainda nao ha clientes cadastrados." /> : null}
          {!loading && user && activeTab === 'caixa' ? <FinancePanel finance={finance} onUpdated={() => refresh(user)} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'relatorios' ? <ReportsPanel summary={summary} orders={orders} /> : null}
          {!loading && user && activeTab === 'usuarios' ? <UsersPanel users={users} onUpdated={() => refresh(user)} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'impressao' ? <PrintingPanel printing={printing} setMessage={setMessage} /> : null}
          {!loading && user && activeTab === 'auditoria' ? <SimpleListPanel title="Auditoria" items={auditLogs} empty="Ainda nao ha eventos de auditoria." /> : null}
          {!loading && user && activeTab === 'seguranca' ? <SecurityPanel security={security} /> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function pathToTab(path: string): TabId {
  if (path.includes('/maturidade') || path.includes('/roadmap')) return 'maturidade'
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

function MaturityPanel({
  products,
  orders,
  stock,
  summary,
  finance,
}: {
  products: ApiProduct[]
  orders: ApiOrder[]
  stock: StockItem[]
  summary: ReportSummary | null
  finance: FinanceSummary | null
}) {
  const ready = maturityModules.filter((item) => item.status === 'Pronto').length
  const base = maturityModules.filter((item) => item.status === 'Base pronta').length
  const score = Math.round(((ready + base * 0.65) / maturityModules.length) * 100)
  const pending = maturityModules.length - ready - base

  return (
    <div className="grid gap-5">
      <div className="rounded-lg bg-[var(--sr-black)] p-5 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Inspirado no padrao Acai Olimpo</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <h2 className="text-3xl font-black">Mapa de maturidade operacional da Salgados R</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-200">
              O objetivo e evoluir de catalogo online para sistema operacional completo, mantendo a identidade vermelha,
              amarela e a tipografia atual da marca. O PDF foi usado apenas como referencia de arquitetura e modulos.
            </p>
          </div>
          <div className="rounded-lg bg-[var(--sr-yellow)] p-4 text-[var(--sr-black)]">
            <p className="text-sm font-black">Maturidade estimada</p>
            <p className="mt-1 text-5xl font-black">{score}%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Modulos prontos" value={String(ready)} />
        <Metric label="Bases prontas" value={String(base)} />
        <Metric label="Pendencias" value={String(pending)} />
        <Metric label="Produtos ativos" value={String(products.filter((product) => product.active).length)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-black text-[var(--sr-red)]">Pedidos no banco</p>
          <p className="mt-1 text-3xl font-black">{orders.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-black text-[var(--sr-red)]">Estoque baixo</p>
          <p className="mt-1 text-3xl font-black">{stock.filter((item) => item.low).length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-black text-[var(--sr-red)]">Clientes fidelidade</p>
          <p className="mt-1 text-3xl font-black">{summary?.loyaltyCustomers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-black text-[var(--sr-red)]">Caixa</p>
          <p className="mt-1 text-3xl font-black">{finance?.openSession ? 'Aberto' : 'Fechado'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {maturityModules.map((item) => (
          <article key={item.area} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-xl font-black text-[var(--sr-black)]">{item.area}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${maturityStatusClass(item.status)}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-zinc-700">{item.detail}</p>
            <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm font-bold text-zinc-800">
              Proximo passo: {item.next}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

function maturityStatusClass(status: string) {
  if (status === 'Pronto') return 'bg-[var(--sr-yellow)] text-zinc-950'
  if (status === 'Base pronta') return 'bg-yellow-100 text-yellow-900'
  if (status === 'Pendente externo') return 'bg-red-100 text-red-900'
  return 'bg-zinc-200 text-zinc-800'
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
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha inicial" type="password" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <button type="button" onClick={submit} className="rounded bg-black px-4 py-3 font-black text-[var(--sr-yellow)]">
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
    <AuthBox title="Entrar no painel" subtitle="Acesso restrito a SUPER_US, GERENTE e FUNCIONARIO.">
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" type="password" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
      <button type="button" onClick={submit} className="rounded bg-black px-4 py-3 font-black text-[var(--sr-yellow)]">
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
  user,
  onUpdated,
  setMessage,
}: {
  orders: ApiOrder[]
  user: AuthUser
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [search, setSearch] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const filtered = orders.filter((order) => {
    const haystack = `${order.orderNumber || ''} ${order.id} ${order.customerName} ${order.phone}`.toLowerCase()
    return order.createdAt.startsWith(today) && haystack.includes(search.toLowerCase())
  })
  const received = filtered.filter((order) => order.status === 'RECEBIDO').length

  async function setStatus(order: ApiOrder, status: ApiOrder['status']) {
    try {
      setBusyOrderId(order.id)
      await api.updateOrderStatus(order.id, status, order.updatedAt)
      setMessage(`Pedido #${order.orderNumber || order.id.slice(0, 8)} atualizado para ${status}.`)
      await onUpdated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel atualizar o pedido.')
      await onUpdated()
    } finally {
      setBusyOrderId('')
    }
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
        <span className="rounded-full bg-[var(--sr-yellow)] px-4 py-2 text-sm font-black">Novos: {received}</span>
        <button type="button" onClick={onUpdated} className="rounded-full bg-[var(--sr-black)] px-4 py-3 text-sm font-black text-white">
          Atualizar agora
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? <EmptyState text="Ainda nao ha pedidos hoje." /> : null}
        {filtered.map((order) => (
          <article key={order.id} className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--sr-red)]">
                  Pedido #{order.orderNumber || order.id.slice(0, 8)}
                </p>
                <h3 className="text-xl font-black text-[var(--sr-black)]">{order.customerName}</h3>
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
                  {item.notes ? <span className="block text-xs text-[var(--sr-red)]">Obs: {item.notes}</span> : null}
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
                    disabled={busyOrderId === order.id}
                    className="rounded bg-[var(--sr-black)] px-3 py-3 text-xs font-black text-white"
                  >
                    {action.label}
                  </button>
                ))}
                {hasPermission(user, 'orders.cancel') && order.status !== 'CANCELADO' && order.status !== 'FINALIZADO' ? (
                  <button type="button" onClick={() => setStatus(order, 'CANCELADO')} disabled={busyOrderId === order.id} className="rounded bg-[var(--sr-red)] px-3 py-3 text-xs font-black text-white disabled:opacity-60">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={buildOrderWhatsAppUrl(order)} target="_blank" rel="noreferrer" className="rounded bg-[var(--sr-yellow)] px-3 py-3 text-center text-xs font-black text-[var(--sr-black)]">
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
  isOnline,
  onUpdated,
  setMessage,
}: {
  orders: ApiOrder[]
  isOnline: boolean
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [now, setNow] = useState(Date.now())
  const [busyOrderId, setBusyOrderId] = useState('')
  const [kitchenMode, setKitchenMode] = useState(false)
  const visibleOrders = orders.filter(isActiveOrder).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  async function move(order: ApiOrder) {
    const currentIndex = statusFlow.indexOf(order.status)
    const nextStatus = statusFlow[Math.min(Math.max(currentIndex, 0) + 1, statusFlow.length - 1)]
    if (!nextActions(order.status).some((action) => action.status === nextStatus)) return
    try {
      setBusyOrderId(order.id)
      await api.updateOrderStatus(order.id, nextStatus, order.updatedAt)
      setMessage(`Pedido #${order.orderNumber || order.id.slice(0, 8)} atualizado para ${nextStatus}.`)
      await onUpdated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel atualizar o pedido.')
      await onUpdated()
    } finally {
      setBusyOrderId('')
    }
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.()
      setKitchenMode(true)
      return
    }
    await document.exitFullscreen?.()
    setKitchenMode(false)
  }

  return (
    <div className={`grid gap-5 ${kitchenMode ? 'fixed inset-0 z-50 overflow-auto bg-zinc-100 p-5' : ''}`}>
      <div className="flex flex-col gap-3 rounded-2xl bg-zinc-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Painel da cozinha</p>
          <h2 className="text-3xl font-black">Fila ativa em tempo quase real</h2>
          <p className="mt-1 text-sm font-semibold text-zinc-300">
            {isOnline ? 'ONLINE' : 'SEM CONEXAO'} · pedidos mais antigos primeiro · tempos atualizados na tela
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onUpdated} className="rounded-full bg-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-zinc-950">
            Atualizar
          </button>
          <button type="button" onClick={toggleFullscreen} className="rounded-full border border-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-white">
            {kitchenMode ? 'Sair do modo' : 'Tela cheia'}
          </button>
        </div>
      </div>

      {visibleOrders.length === 0 ? <EmptyState text="Nenhum pedido pendente na cozinha." /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {kitchenColumns.map((column) => {
          const columnOrders = visibleOrders.filter((order) => column.statuses.includes(order.status))
          return (
            <section key={column.id} className="min-h-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <h3 className="text-2xl font-black text-zinc-950">{column.title}</h3>
                <span className="rounded-full bg-[var(--sr-yellow)] px-3 py-1 text-sm font-black text-zinc-950">{columnOrders.length}</span>
              </div>
              <div className="mt-4 grid gap-3">
                {columnOrders.length === 0 ? <p className="rounded-xl bg-zinc-50 p-4 text-sm font-bold text-zinc-600">Sem pedidos neste estagio.</p> : null}
                {columnOrders.map((order) => {
                  const action = nextActions(order.status)[0]
                  return (
                    <article key={order.id} className="rounded-2xl border-2 border-zinc-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[var(--sr-red)]">
                            Pedido #{order.orderNumber || order.id.slice(0, 8)} · {elapsedLabel(order.createdAt, now)}
                          </p>
                          <h4 className="text-2xl font-black text-zinc-950">{labelChannel(order.channel)}</h4>
                          <p className="text-sm font-semibold text-zinc-600">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <ul className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-3 text-base font-black text-zinc-900">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.productName}
                            {item.notes ? <span className="block text-xs font-bold text-[var(--sr-red)]">Obs: {item.notes}</span> : null}
                          </li>
                        ))}
                      </ul>
                      {order.notes ? <p className="mt-3 rounded-xl border border-[var(--sr-yellow)] bg-[var(--sr-yellow)] p-3 text-sm font-black text-zinc-950">Obs: {order.notes}</p> : null}
                      {order.channel === 'delivery' ? (
                        <p className="mt-3 rounded-xl bg-zinc-950 p-3 text-sm font-bold text-white">
                          Entrega: {order.neighborhood || 'bairro nao informado'} · {order.address || 'endereco no pedido'}
                        </p>
                      ) : null}
                      {action ? (
                        <button
                          type="button"
                          onClick={() => move(order)}
                          disabled={!isOnline || busyOrderId === order.id}
                          className="mt-4 w-full rounded-xl bg-[var(--sr-red)] px-4 py-4 text-sm font-black text-white transition hover:brightness-95 disabled:opacity-60"
                        >
                          {busyOrderId === order.id ? 'Atualizando...' : action.label}
                        </button>
                      ) : (
                        <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-black text-zinc-700">Aguardando regra operacional.</p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function AdminPanel({
  products,
  user,
  onCreated,
  setMessage,
}: {
  products: ApiProduct[]
  user: AuthUser
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
      {hasPermission(user, 'products.create') ? <div className="rounded-lg border border-zinc-200 p-5">
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
          <button type="button" onClick={createProduct} className="rounded bg-black px-4 py-3 font-black text-[var(--sr-yellow)]">
            Salvar produto
          </button>
        </div>
      </div> : <EmptyState text="Seu perfil pode consultar produtos, mas nao cadastrar novos itens." />}
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {products.map((product) => (
          <div key={product.id} className="grid gap-2 border-b border-zinc-100 p-4 text-sm font-semibold sm:grid-cols-[1fr_auto_auto_auto]">
            <span>{product.name}</span>
            <span>{product.active ? 'ativo' : 'inativo'}</span>
            <span className="font-black">{formatCurrency(product.price)}</span>
            {hasPermission(user, 'products.update') ? <button type="button" onClick={() => toggleProduct(product)} className="rounded bg-zinc-100 px-3 py-2 text-xs font-black">
              {product.active ? 'Desativar' : 'Ativar'}
            </button> : <span className="text-xs font-black text-zinc-500">Consulta</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function StockPanel({
  stock,
  user,
  onUpdated,
  setMessage,
}: {
  stock: StockItem[]
  user: AuthUser
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
      {hasPermission(user, 'inventory.adjust') ? <div className="rounded-lg bg-white p-5 shadow-sm">
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
        <button type="button" onClick={createItem} className="mt-3 rounded bg-[var(--sr-black)] px-4 py-3 text-sm font-black text-white">
          Cadastrar item
        </button>
      </div> : <EmptyState text="Seu perfil pode acompanhar o estoque, mas nao ajustar livremente." />}

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
              {item.low ? <span className="rounded bg-[var(--sr-red)] px-2 py-1 text-xs font-black text-white">Baixo</span> : null}
            </div>
            {hasPermission(user, 'inventory.update') ? <div className="mt-4 flex gap-3">
              <input
                type="number"
                defaultValue={item.quantity}
                onBlur={(event) => update(item, Number(event.target.value))}
                className="w-full rounded border border-zinc-300 px-3 py-3 font-semibold"
              />
              <span className="grid place-items-center rounded bg-zinc-100 px-3 text-sm font-black">{item.unit}</span>
            </div> : <p className="mt-4 text-2xl font-black">{item.quantity} {item.unit}</p>}
            {hasPermission(user, 'inventory.adjust') ? <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} placeholder="Qtd movimento" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              <button type="button" onClick={() => move(item, 'entrada')} className="rounded bg-[var(--sr-yellow)] px-3 py-3 text-xs font-black text-zinc-950">Entrada</button>
              <button type="button" onClick={() => move(item, 'saida')} className="rounded bg-red-100 px-3 py-3 text-xs font-black text-red-900">Saida</button>
            </div> : null}
          </article>
        ))}
      </div>
    </div>
  )
}

function ReportsPanel({ summary, orders }: { summary: ReportSummary | null; orders: ApiOrder[] }) {
  if (!summary) {
    const activeOrders = orders.filter((order) => order.status !== 'FINALIZADO' && order.status !== 'CANCELADO')
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Pedidos ativos" value={String(activeOrders.length)} />
          <Metric label="Novos" value={String(orders.filter((order) => order.status === 'RECEBIDO').length)} />
          <Metric label="Prontos" value={String(orders.filter((order) => order.status === 'PRONTO').length)} />
        </div>
        <EmptyState text="Indicadores financeiros e relatorios completos nao estao disponiveis para este perfil." />
      </div>
    )
  }

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
        <h3 className="text-xl font-black text-[var(--sr-yellow)]">Fidelidade e recursos inteligentes</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-200">
          A API ja pontua clientes por telefone a cada pedido. A proxima evolucao e usar esses dados para
          cupons, recomendacoes e campanhas automaticas.
        </p>
      </div>
    </div>
  )
}

function UsersPanel({
  users,
  onUpdated,
  setMessage,
}: {
  users: AuthUser[]
  onUpdated: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AuthUser['role']>('FUNCIONARIO')

  async function createUser() {
    await api.createUser({ name, email, password, role })
    setMessage('Usuario criado com permissao controlada.')
    setName('')
    setEmail('')
    setPassword('')
    await onUpdated()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black">Novo usuario da equipe</h3>
        <div className="mt-4 grid gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha inicial" type="password" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <select value={role} onChange={(event) => setRole(event.target.value as AuthUser['role'])} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
            <option value="FUNCIONARIO">Funcionario</option>
            <option value="GERENTE">Gerente</option>
          </select>
          <button type="button" onClick={createUser} className="rounded bg-[var(--sr-black)] px-4 py-3 font-black text-[var(--sr-yellow)]">
            Criar usuario
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {users.length === 0 ? <EmptyState text="Ainda nao ha usuarios para listar." /> : null}
        {users.map((item) => (
          <div key={item.id} className="grid gap-2 border-b border-zinc-100 p-4 text-sm font-semibold sm:grid-cols-[1fr_1fr_auto_auto]">
            <span>{item.name}</span>
            <span>{item.email}</span>
            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-black text-yellow-900">{item.displayRole || displayRole(item.role)}</span>
            <span className={item.active === false ? 'text-[var(--sr-red)]' : 'text-zinc-900'}>{item.active === false ? 'Inativo' : 'Ativo'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrintingPanel({ printing, setMessage }: { printing: PrintStatus | null; setMessage: (message: string) => void }) {
  async function testPrint() {
    await api.testPrint()
    setMessage('Teste de impressao enviado para a fila.')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Metric label="Fila pendente" value={String(printing?.pending ?? 0)} />
      <Metric label="Falhas" value={String(printing?.failed ?? 0)} />
      <Metric label="Modo" value={printing?.mode || 'Indisponivel'} />
      <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-3">
        <h3 className="text-xl font-black">Impressao termica</h3>
        <p className="mt-2 text-sm font-semibold text-zinc-600">
          {printing?.message || 'Status de impressao ainda nao disponivel para este perfil.'}
        </p>
        <button type="button" onClick={testPrint} className="mt-4 rounded bg-[var(--sr-black)] px-4 py-3 text-sm font-black text-white">
          Testar impressao
        </button>
      </div>
    </div>
  )
}

function SecurityPanel({ security }: { security: SecurityStatus | null }) {
  if (!security) return <EmptyState text="Dados de seguranca ainda nao disponiveis." />

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="API" value={security.api} />
        <Metric label="Banco" value={security.database} />
        <Metric label="Autenticacao" value={security.auth} />
        <Metric label="Rate limit" value={security.loginRateLimit} />
      </div>
      <SimpleListPanel title="Falhas recentes de login" items={security.recentLoginFailures} empty="Sem falhas recentes de login." />
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
          <button type="button" onClick={finance.openSession ? closeCash : openCash} className="rounded bg-[var(--sr-black)] px-4 py-3 text-sm font-black text-white">
            {finance.openSession ? 'Fechar caixa' : 'Abrir caixa'}
          </button>
          <button type="button" onClick={expense} className="rounded bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
            Despesa
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => movement('entrada')} className="rounded bg-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-zinc-950">
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
      <p className="text-sm font-black uppercase tracking-wide text-[var(--sr-yellow)]">{label}</p>
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
          ? 'bg-[var(--sr-yellow)] text-zinc-950'
          : status === 'FINALIZADO'
            ? 'bg-zinc-900 text-white'
            : status === 'CANCELADO'
              ? 'bg-zinc-200 text-zinc-700'
              : 'bg-zinc-100 text-zinc-900'

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
