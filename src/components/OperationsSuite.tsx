import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  api,
  type ApiOrder,
  type ApiProduct,
  type AuthUser,
  type CatalogPayload,
  type FinanceSummary,
  type PrintStatus,
  type ReportSummary,
  type SecurityStatus,
  type StockItem,
  formatCurrency,
} from '../utils/api'
import { allowedTabs, displayRole, hasPermission } from '../utils/accessControl'
import { buildOrderWhatsAppUrl } from '../utils/whatsapp'
import { ManagementModule } from './ManagementModule'
import { ProductionCalculator } from './ProductionCalculator'

const tabs = [
  { id: 'dashboard', label: 'Painel geral', path: '/admin' },
  { id: 'maturidade', label: 'Maturidade', path: '/admin/roadmap' },
  { id: 'pedidos', label: 'Pedidos', path: '/admin/pedidos' },
  { id: 'cozinha', label: 'Cozinha', path: '/admin/cozinha' },
  { id: 'produtos', label: 'Produtos', path: '/admin/produtos' },
  { id: 'estoque', label: 'Estoque', path: '/admin/estoque' },
  { id: 'calculos', label: 'Produção', path: '/admin/producao' },
  { id: 'producaoDiaria', label: 'Produção diária', path: '/admin/producao-diaria' },
  { id: 'vendas', label: 'Vendas', path: '/admin/vendas' },
  { id: 'clientes', label: 'Clientes', path: '/admin/clientes' },
  { id: 'caixa', label: 'Caixa', path: '/admin/caixa' },
  { id: 'contasReceber', label: 'Contas a receber', path: '/admin/contas-receber' },
  { id: 'relatorios', label: 'Relatórios', path: '/admin/relatorios' },
  { id: 'custosPrecos', label: 'Custos e preços', path: '/admin/custos-precos' },
  { id: 'usuarios', label: 'Equipe', path: '/admin/equipe' },
  { id: 'impressao', label: 'Impressão', path: '/admin/impressao' },
  { id: 'auditoria', label: 'Auditoria', path: '/admin/auditoria' },
  { id: 'seguranca', label: 'Configurações', path: '/admin/configuracoes' },
] as const

type TabId = (typeof tabs)[number]['id']
type Tab = (typeof tabs)[number]

const adminNavGroups: Array<{ title: string; items: TabId[] }> = [
  { title: 'Visão geral', items: ['dashboard', 'maturidade'] },
  { title: 'Operação', items: ['pedidos', 'cozinha', 'produtos', 'estoque', 'calculos'] },
  { title: 'Gestão', items: ['producaoDiaria', 'vendas', 'caixa', 'contasReceber', 'relatorios', 'custosPrecos', 'clientes'] },
  { title: 'Administração', items: ['usuarios', 'impressao', 'auditoria', 'seguranca'] },
]

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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
          if (window.location.pathname !== '/admin/login') window.history.replaceState({}, '', '/admin/login')
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
            window.history.replaceState({}, '', '/admin/login')
            setMessage(error.message || 'Sessao expirada. Entre novamente.')
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
    setMessage('')
    if (window.location.pathname === '/admin/login' || window.location.pathname === '/login') {
      window.history.replaceState({}, '', tabToPath(activeTab))
    }
    setLoading(true)
    await refresh(nextUser)
    setLoading(false)
  }

  function logout() {
    api.token.clear()
    window.history.replaceState({}, '', '/admin/login')
    setUser(null)
    setOrders([])
    setStock([])
    setSummary(null)
    setMessage('')
  }

  function selectTab(tabId: TabId) {
    setActiveTab(tabId)
    setMobileNavOpen(false)
    window.history.pushState({}, '', tabToPath(tabId))
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

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    if (!mobileNavOpen) return undefined
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileNavOpen])

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Painel geral'

  if (loading || !authChecked) {
    return <AdminLoadingScreen />
  }

  if (!user) {
    return (
      <AdminAuthScreen message={message}>
        {!hasUsers ? (
          <BootstrapForm onReady={afterAuth} setMessage={setMessage} />
        ) : (
          <LoginForm onReady={afterAuth} setMessage={setMessage} />
        )}
      </AdminAuthScreen>
    )
  }

  return (
    <section id="sistema" className="sr-admin-root">
      <div className="sr-admin-layout">
        <AdminSidebar
          activeTab={activeTab}
          isOnline={isOnline}
          lastUpdatedAt={lastUpdatedAt}
          logout={logout}
          mobileOpen={mobileNavOpen}
          selectTab={selectTab}
          setMobileOpen={setMobileNavOpen}
          user={user}
          visibleTabs={visibleTabs}
        />

        <div className="sr-admin-main">
          <AdminHeader
            activeOrders={activeOrders.length}
            activeTabLabel={activeTabLabel}
            isOnline={isOnline}
            lastUpdatedAt={lastUpdatedAt}
            setMobileOpen={setMobileNavOpen}
            user={user}
          />

          {operationalAlerts.length > 0 ? (
            <div className="sr-admin-alert-stack">
              {operationalAlerts.map((alert) => (
                <p key={alert} className="sr-admin-alert">
                  {alert}
                </p>
              ))}
            </div>
          ) : null}

          {message ? <p className="sr-admin-message">{message}</p> : null}

          <main className="sr-admin-content">
          {activeTab === 'dashboard' ? <AdminDashboard summary={summary} orders={orders} stock={stock} finance={finance} customers={customers} /> : null}
          {activeTab === 'maturidade' ? (
            <MaturityPanel products={products} orders={orders} stock={stock} summary={summary} finance={finance} />
          ) : null}
          {activeTab === 'pedidos' ? (
            <OrdersPanel orders={orders} user={user} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {activeTab === 'cozinha' ? (
            <KitchenPanel orders={orders} isOnline={isOnline} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {activeTab === 'produtos' ? (
            <AdminPanel products={products} user={user} onCreated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {activeTab === 'estoque' ? (
            <StockPanel stock={stock} user={user} onUpdated={() => refresh(user)} setMessage={setMessage} />
          ) : null}
          {activeTab === 'calculos' ? (
            <ProductionCalculator products={products} user={user} setMessage={setMessage} />
          ) : null}
          {activeTab === 'producaoDiaria' ? <ManagementModule mode="producao" products={products} setMessage={setMessage} /> : null}
          {activeTab === 'vendas' ? <ManagementModule mode="vendas" products={products} setMessage={setMessage} /> : null}
          {activeTab === 'clientes' ? <SimpleListPanel title="Clientes" items={customers} empty="Ainda nao ha clientes cadastrados." /> : null}
          {activeTab === 'caixa' ? <FinancePanel finance={finance} onUpdated={() => refresh(user)} setMessage={setMessage} /> : null}
          {activeTab === 'contasReceber' ? <ManagementModule mode="contas" products={products} setMessage={setMessage} /> : null}
          {activeTab === 'relatorios' ? <ManagementModule mode="relatorios" products={products} setMessage={setMessage} /> : null}
          {activeTab === 'custosPrecos' ? <ManagementModule mode="custos" products={products} setMessage={setMessage} /> : null}
          {activeTab === 'usuarios' ? <UsersPanel users={users} onUpdated={() => refresh(user)} setMessage={setMessage} /> : null}
          {activeTab === 'impressao' ? <PrintingPanel printing={printing} setMessage={setMessage} /> : null}
          {activeTab === 'auditoria' ? <SimpleListPanel title="Auditoria" items={auditLogs} empty="Ainda nao ha eventos de auditoria." /> : null}
          {activeTab === 'seguranca' ? <SecurityPanel security={security} /> : null}
          </main>
        </div>
      </div>
    </section>
  )
}

function AdminLoadingScreen() {
  return (
    <section className="sr-admin-loading">
      <div>
        <p>SALGADOS R</p>
        <h1>CARREGANDO SESSÃO</h1>
        <span />
      </div>
    </section>
  )
}

function AdminAuthScreen({ children, message }: { children: ReactNode; message: string }) {
  return (
    <section className="sr-admin-auth">
      <a href="/" className="sr-admin-auth-back">← Voltar ao site</a>
      <div className="sr-admin-auth-card">
        <div className="sr-admin-auth-brand">
          <img src="/assets-reais/logomarca-oficial-header.png" alt="SALGADOS R" />
          <span>Acesso restrito</span>
        </div>
        {message ? <p className="sr-admin-auth-message">{message}</p> : null}
        {children}
      </div>
    </section>
  )
}

function AdminSidebar({
  activeTab,
  isOnline,
  lastUpdatedAt,
  logout,
  mobileOpen,
  selectTab,
  setMobileOpen,
  user,
  visibleTabs,
}: {
  activeTab: TabId
  isOnline: boolean
  lastUpdatedAt: string | null
  logout: () => void
  mobileOpen: boolean
  selectTab: (tab: TabId) => void
  setMobileOpen: (open: boolean) => void
  user: AuthUser
  visibleTabs: readonly Tab[]
}) {
  const visibleIds = new Set(visibleTabs.map((tab) => tab.id))
  const sidebar = (
    <aside className="sr-admin-sidebar" aria-label="Navegação administrativa">
      <div className="sr-admin-sidebar-top">
        <a href="/" className="sr-admin-logo" aria-label="Voltar para o site Salgados R">
          <img src="/assets-reais/logomarca-oficial-header.png" alt="SALGADOS R" />
        </a>
        <button type="button" className="sr-admin-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
          ×
        </button>
      </div>

      <div className="sr-admin-user-card">
        <strong>{user.name}</strong>
        <span>{displayRole(user.role)}</span>
        <small>
          {isOnline ? 'API online' : 'Sem conexão'}
          {lastUpdatedAt ? ` · ${new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </small>
      </div>

      <nav className="sr-admin-nav">
        {adminNavGroups.map((group) => {
          const items = group.items.filter((id) => visibleIds.has(id))
          if (items.length === 0) return null
          return (
            <div key={group.title} className="sr-admin-nav-group">
              <p>{group.title}</p>
              {items.map((id) => {
                const tab = tabs.find((item) => item.id === id)
                if (!tab) return null
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={activeTab === tab.id ? 'is-active' : ''}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <span>{tab.label.slice(0, 1)}</span>
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sr-admin-sidebar-footer">
        <a href="/" className="sr-admin-site-link">Ver site</a>
        <button type="button" onClick={logout}>Encerrar sessão</button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="sr-admin-desktop-sidebar">{sidebar}</div>
      {mobileOpen ? (
        <div className="sr-admin-drawer">
          <button type="button" className="sr-admin-drawer-overlay" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />
          {sidebar}
        </div>
      ) : null}
    </>
  )
}

function AdminHeader({
  activeOrders,
  activeTabLabel,
  isOnline,
  lastUpdatedAt,
  setMobileOpen,
  user,
}: {
  activeOrders: number
  activeTabLabel: string
  isOnline: boolean
  lastUpdatedAt: string | null
  setMobileOpen: (open: boolean) => void
  user: AuthUser
}) {
  return (
    <header className="sr-admin-header">
      <button type="button" className="sr-admin-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Abrir menu administrativo">
        ☰
      </button>
      <div>
        <p>Centro de comando</p>
        <h1>{activeTabLabel}</h1>
        <span>Visão operacional da SALGADOS R com dados reais da API.</span>
      </div>
      <div className="sr-admin-header-actions">
        <span>{activeOrders} na fila</span>
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        <small>{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : user.email}</small>
      </div>
    </header>
  )
}

function AdminDashboard({
  customers,
  finance,
  orders,
  stock,
  summary,
}: {
  customers: unknown[]
  finance: FinanceSummary | null
  orders: ApiOrder[]
  stock: StockItem[]
  summary: ReportSummary | null
}) {
  const activeOrders = orders.filter(isActiveOrder)
  const recent = orders.slice(0, 6)
  const lowStock = stock.filter((item) => item.low)

  return (
    <div className="sr-admin-dashboard">
      <section className="sr-admin-hero-panel">
        <div>
          <p>Centro de comando</p>
          <h2>Visão geral da operação do Salgados R</h2>
          <span>Pedidos, cozinha, estoque, caixa e equipe em uma área única.</span>
        </div>
        <strong>{activeOrders.length} pedido(s) ativos</strong>
      </section>

      <div className="sr-admin-metric-grid">
        <Metric label="Pedidos hoje" value={String(summary?.orders ?? orders.length)} hint="Registrados pela API" />
        <Metric label="Pendentes" value={String(summary?.pendingOrders ?? activeOrders.length)} hint="Aguardando andamento" />
        <Metric label="Em preparo" value={String(orders.filter((order) => order.status === 'PREPARANDO').length)} hint="Fila da cozinha" />
        <Metric label="Prontos" value={String(orders.filter((order) => order.status === 'PRONTO').length)} hint="Aguardando saída" />
        <Metric label="Faturamento" value={formatCurrency(summary?.revenue ?? finance?.revenue ?? 0)} hint="Hoje" />
        <Metric label="Ticket médio" value={formatCurrency(summary?.averageTicket ?? 0)} hint="Sem dados fictícios" />
        <Metric label="Estoque baixo" value={String(summary?.lowStockItems ?? lowStock.length)} hint="Itens em alerta" />
        <Metric label="Clientes" value={String(summary?.loyaltyCustomers ?? customers.length)} hint="Base consolidada" />
      </div>

      <div className="sr-admin-dashboard-grid">
        <section className="sr-admin-panel">
          <div className="sr-admin-panel-head">
            <h3>Pedidos recentes</h3>
            <a href="/admin/pedidos">Abrir pedidos</a>
          </div>
          <div className="sr-admin-list">
            {recent.length === 0 ? <EmptyState text="Ainda não há pedidos registrados." /> : null}
            {recent.map((order) => (
              <article key={order.id}>
                <strong>#{order.orderNumber || order.id.slice(0, 8)} · {order.customerName}</strong>
                <span>{labelChannel(order.channel)} · {formatCurrency(order.total)} · {order.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="sr-admin-panel">
          <div className="sr-admin-panel-head">
            <h3>Fila da cozinha</h3>
            <a href="/admin/cozinha">Abrir cozinha</a>
          </div>
          <div className="sr-admin-list">
            {kitchenColumns.map((column) => {
              const count = activeOrders.filter((order) => column.statuses.includes(order.status)).length
              return (
                <article key={column.id}>
                  <strong>{column.title}</strong>
                  <span>{count} pedido(s)</span>
                </article>
              )
            })}
          </div>
        </section>

        <section className="sr-admin-panel">
          <div className="sr-admin-panel-head">
            <h3>Alertas operacionais</h3>
            <a href="/admin/estoque">Ver estoque</a>
          </div>
          <div className="sr-admin-list">
            {lowStock.length === 0 ? <EmptyState text="Nenhum alerta crítico no momento." /> : null}
            {lowStock.slice(0, 6).map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.quantity} {item.unit} · mínimo {item.minQuantity}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function pathToTab(path: string): TabId {
  if (path.includes('/maturidade') || path.includes('/roadmap')) return 'maturidade'
  if (path.includes('/cozinha')) return 'cozinha'
  if (path.includes('/pedidos')) return 'pedidos'
  if (path.includes('/produtos')) return 'produtos'
  if (path.includes('/estoque')) return 'estoque'
  if (path.includes('/producao-diaria')) return 'producaoDiaria'
  if (path.includes('/vendas')) return 'vendas'
  if (path.includes('/contas-receber')) return 'contasReceber'
  if (path.includes('/custos-precos')) return 'custosPrecos'
  if (path.includes('/calculos') || path.includes('/producao')) return 'calculos'
  if (path.includes('/clientes')) return 'clientes'
  if (path.includes('/financeiro') || path.includes('/caixa')) return 'caixa'
  if (path.includes('/relatorios')) return 'relatorios'
  if (path.includes('/auditoria')) return 'auditoria'
  return 'dashboard'
}

function tabToPath(tabId: TabId) {
  return tabs.find((tab) => tab.id === tabId)?.path || '/admin'
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
      <div className="rounded-lg bg-[var(--sr-red)] p-5 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Mapa operacional Salgados R</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <h2 className="text-3xl font-black">Mapa de maturidade operacional da Salgados R</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--sr-white)]">
              O objetivo e evoluir de catalogo online para sistema operacional completo, mantendo a identidade vermelha,
              amarela e a tipografia atual da marca.
            </p>
          </div>
          <div className="rounded-lg bg-[var(--sr-yellow)] p-4 text-[var(--sr-white)]">
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
              <h3 className="text-xl font-black text-[var(--sr-white)]">{item.area}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${maturityStatusClass(item.status)}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sr-white)]">{item.detail}</p>
            <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm font-bold text-[var(--sr-white)]">
              Proximo passo: {item.next}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

function maturityStatusClass(status: string) {
  if (status === 'Pronto') return 'bg-[var(--sr-yellow)] text-[var(--sr-white)]'
  if (status === 'Base pronta') return 'bg-yellow-100 text-yellow-900'
  if (status === 'Pendente externo') return 'bg-red-100 text-red-900'
  return 'bg-zinc-200 text-[var(--sr-white)]'
}

function BootstrapForm({
  onReady,
  setMessage,
}: {
  onReady: (user: AuthUser) => Promise<void>
  setMessage: (message: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    try {
      setBusy(true)
      const result = await api.bootstrap({ name, email, password })
      setMessage('SUPER_US criado. Guarde essa senha com cuidado.')
      await onReady(result.user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no bootstrap.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthBox title="Criar primeiro SUPER_US" subtitle="Esse passo aparece apenas enquanto não existe usuário no banco.">
      <label>
        Nome
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do responsável" />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" />
      </label>
      <label>
        Senha inicial
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha inicial" type="password" />
      </label>
      <button type="button" onClick={submit} disabled={busy || !name || !email || !password}>
        {busy ? 'Criando...' : 'Criar SUPER_US'}
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
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    try {
      setBusy(true)
      const result = await api.login({ email, password })
      setMessage('Login realizado.')
      await onReady(result.user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no login.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthBox title="Login" subtitle="Acesso restrito à operação do Salgados R.">
      <label>
        Email
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@exemplo.com"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
        />
      </label>
      <label>
        Senha
        <span className="sr-admin-password-field">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            type={showPassword ? 'text' : 'password'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
      </label>
      <button type="button" onClick={submit} disabled={busy || !email || !password}>
        {busy ? 'Entrando...' : 'Entrar'}
      </button>
    </AuthBox>
  )
}

function AuthBox({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="sr-admin-auth-form">
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <div>{children}</div>
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
        <button type="button" onClick={onUpdated} className="rounded-full bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
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
                <h3 className="text-xl font-black text-[var(--sr-white)]">{order.customerName}</h3>
                <p className="text-sm font-semibold text-[var(--sr-white)]">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 grid gap-1 text-sm font-semibold text-[var(--sr-white)]">
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
                    className="rounded bg-[var(--sr-red)] px-3 py-3 text-xs font-black text-white"
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
                <a href={buildOrderWhatsAppUrl(order)} target="_blank" rel="noreferrer" className="rounded bg-[var(--sr-yellow)] px-3 py-3 text-center text-xs font-black text-[var(--sr-white)]">
                  WhatsApp
                </a>
                <button type="button" onClick={() => copy(order)} className="rounded bg-zinc-100 px-3 py-3 text-xs font-black text-[var(--sr-white)]">
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
      <div className="flex flex-col gap-3 rounded-2xl bg-[var(--sr-red)] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sr-yellow)]">Painel da cozinha</p>
          <h2 className="text-3xl font-black">Fila ativa em tempo quase real</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--sr-white)]">
            {isOnline ? 'ONLINE' : 'SEM CONEXAO'} · pedidos mais antigos primeiro · tempos atualizados na tela
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onUpdated} className="rounded-full bg-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-[var(--sr-white)]">
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
                <h3 className="text-2xl font-black text-[var(--sr-white)]">{column.title}</h3>
                <span className="rounded-full bg-[var(--sr-yellow)] px-3 py-1 text-sm font-black text-[var(--sr-white)]">{columnOrders.length}</span>
              </div>
              <div className="mt-4 grid gap-3">
                {columnOrders.length === 0 ? <p className="rounded-xl bg-zinc-50 p-4 text-sm font-bold text-[var(--sr-white)]">Sem pedidos neste estagio.</p> : null}
                {columnOrders.map((order) => {
                  const action = nextActions(order.status)[0]
                  return (
                    <article key={order.id} className="rounded-2xl border-2 border-zinc-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[var(--sr-red)]">
                            Pedido #{order.orderNumber || order.id.slice(0, 8)} · {elapsedLabel(order.createdAt, now)}
                          </p>
                          <h4 className="text-2xl font-black text-[var(--sr-white)]">{labelChannel(order.channel)}</h4>
                          <p className="text-sm font-semibold text-[var(--sr-white)]">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <ul className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-3 text-base font-black text-[var(--sr-white)]">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.productName}
                            {item.notes ? <span className="block text-xs font-bold text-[var(--sr-red)]">Obs: {item.notes}</span> : null}
                          </li>
                        ))}
                      </ul>
                      {order.notes ? <p className="mt-3 rounded-xl border border-[var(--sr-yellow)] bg-[var(--sr-yellow)] p-3 text-sm font-black text-[var(--sr-white)]">Obs: {order.notes}</p> : null}
                      {order.channel === 'delivery' ? (
                        <p className="mt-3 rounded-xl bg-[var(--sr-red)] p-3 text-sm font-bold text-white">
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
                        <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-black text-[var(--sr-white)]">Aguardando regra operacional.</p>
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
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [tab, setTab] = useState<'produtos' | 'categorias' | 'subcategorias' | 'sabores' | 'variacoes'>('produtos')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativos')
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    flavorId: '',
    variantId: '',
    availability: 'ambos',
    unit: 'unidade',
    volumeMl: '',
    price: '',
    sortOrder: '0',
    showPublic: true,
    deliveryEnabled: true,
    pickupEnabled: true,
    dineInOnly: false,
    active: true,
  })
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '', sortOrder: '0', showPublic: true, active: true })
  const [subcategoryForm, setSubcategoryForm] = useState({ id: '', categoryId: '', name: '', description: '', sortOrder: '0', showPublic: true, active: true })
  const [flavorForm, setFlavorForm] = useState({ id: '', name: '', description: '', sortOrder: '0', active: true })
  const [variantForm, setVariantForm] = useState({ id: '', name: '', unit: 'unidade', volumeMl: '', sortOrder: '0', active: true })
  const [productImageFile, setProductImageFile] = useState<File | null>(null)

  const refreshCatalog = useCallback(async () => {
    const next = await api.catalog()
    setCatalog(next)
    if (!productForm.categoryId && next.categories[0]) setProductForm((state) => ({ ...state, categoryId: next.categories[0].id }))
    if (!subcategoryForm.categoryId && next.categories[0]) setSubcategoryForm((state) => ({ ...state, categoryId: next.categories[0].id }))
  }, [productForm.categoryId, subcategoryForm.categoryId])

  useEffect(() => {
    refreshCatalog().catch((error: Error) => setMessage(error.message))
  }, [refreshCatalog, setMessage])

  const catalogProducts = catalog?.products.length ? catalog.products : products
  const normalizedSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const filteredProducts = catalogProducts.filter((product) => {
    const statusOk = statusFilter === 'todos' || (statusFilter === 'ativos' ? product.active : !product.active)
    const text = [product.name, product.categoryName, product.subcategoryName, product.flavorName, product.variantName]
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    return statusOk && (!normalizedSearch || text.includes(normalizedSearch))
  })
  const selectedCategorySubcategories = (catalog?.subcategories || []).filter((item) => item.categoryId === productForm.categoryId)

  function editProduct(product: ApiProduct) {
    setTab('produtos')
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      flavorId: product.flavorId || '',
      variantId: product.variantId || '',
      availability: product.availability,
      unit: product.unit || 'unidade',
      volumeMl: product.volumeMl ? String(product.volumeMl) : '',
      price: String(product.price).replace('.', ','),
      sortOrder: String(product.sortOrder || 0),
      showPublic: product.showPublic,
      deliveryEnabled: product.deliveryEnabled,
      pickupEnabled: product.pickupEnabled,
      dineInOnly: product.dineInOnly,
      active: product.active,
    })
    setProductImageFile(null)
  }

  async function saveProduct() {
    if (!productForm.name.trim()) return setMessage('INFORME O NOME DO PRODUTO.')
    if (!productForm.categoryId) return setMessage('SELECIONE UMA CATEGORIA.')
    const payload = {
      name: productForm.name,
      description: productForm.description,
      categoryId: productForm.categoryId,
      subcategoryId: productForm.subcategoryId || null,
      flavorId: productForm.flavorId || null,
      variantId: productForm.variantId || null,
      availability: productForm.availability as ApiProduct['availability'],
      unit: productForm.unit,
      volumeMl: productForm.volumeMl ? Number(productForm.volumeMl) : null,
      priceCents: toCents(productForm.price),
      sortOrder: Number(productForm.sortOrder || 0),
      showPublic: productForm.showPublic,
      deliveryEnabled: productForm.deliveryEnabled,
      pickupEnabled: productForm.pickupEnabled,
      dineInOnly: productForm.dineInOnly,
      establishmentOnly: productForm.dineInOnly,
      active: productForm.active,
    }
    const saved = productForm.id ? await api.updateCatalogProduct(productForm.id, payload) : await api.createCatalogProduct(payload)
    if (productImageFile) await api.uploadCatalogProductImage(saved.id, productImageFile)
    setMessage(productForm.id ? 'PRODUTO ATUALIZADO.' : 'PRODUTO CRIADO.')
    setProductForm((state) => ({ ...state, id: '', name: '', description: '', price: '', volumeMl: '', sortOrder: '0', active: true }))
    setProductImageFile(null)
    await refreshCatalog()
    await onCreated()
  }

  async function toggleProduct(product: ApiProduct) {
    if (product.active) await api.archiveCatalogProduct(product.id)
    else await api.restoreCatalogProduct(product.id)
    setMessage(product.active ? 'PRODUTO ARQUIVADO. HISTÓRICO PRESERVADO.' : 'PRODUTO REATIVADO.')
    await refreshCatalog()
    await onCreated()
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) return setMessage('INFORME A CATEGORIA.')
    const payload = { name: categoryForm.name, description: categoryForm.description, sortOrder: Number(categoryForm.sortOrder || 0), showPublic: categoryForm.showPublic, active: categoryForm.active }
    if (categoryForm.id) await api.updateCatalogCategory(categoryForm.id, payload)
    else await api.createCatalogCategory(payload)
    setCategoryForm({ id: '', name: '', description: '', sortOrder: '0', showPublic: true, active: true })
    setMessage('CATEGORIA SALVA.')
    await refreshCatalog()
  }

  async function saveSubcategory() {
    if (!subcategoryForm.categoryId || !subcategoryForm.name.trim()) return setMessage('INFORME CATEGORIA E SUBCATEGORIA.')
    const payload = { categoryId: subcategoryForm.categoryId, name: subcategoryForm.name, description: subcategoryForm.description, sortOrder: Number(subcategoryForm.sortOrder || 0), showPublic: subcategoryForm.showPublic, active: subcategoryForm.active }
    if (subcategoryForm.id) await api.updateCatalogSubcategory(subcategoryForm.id, payload)
    else await api.createCatalogSubcategory(payload)
    setSubcategoryForm((state) => ({ ...state, id: '', name: '', description: '', sortOrder: '0', active: true }))
    setMessage('SUBCATEGORIA SALVA.')
    await refreshCatalog()
  }

  async function saveFlavor() {
    if (!flavorForm.name.trim()) return setMessage('INFORME O SABOR.')
    const payload = { name: flavorForm.name, description: flavorForm.description, sortOrder: Number(flavorForm.sortOrder || 0), active: flavorForm.active }
    if (flavorForm.id) await api.updateCatalogFlavor(flavorForm.id, payload)
    else await api.createCatalogFlavor(payload)
    setFlavorForm({ id: '', name: '', description: '', sortOrder: '0', active: true })
    setMessage('SABOR SALVO.')
    await refreshCatalog()
  }

  async function saveVariant() {
    if (!variantForm.name.trim()) return setMessage('INFORME A VARIAÇÃO.')
    const payload = { name: variantForm.name, unit: variantForm.unit, volumeMl: variantForm.volumeMl ? Number(variantForm.volumeMl) : null, sortOrder: Number(variantForm.sortOrder || 0), active: variantForm.active }
    if (variantForm.id) await api.updateCatalogVariant(variantForm.id, payload)
    else await api.createCatalogVariant(payload)
    setVariantForm({ id: '', name: '', unit: 'unidade', volumeMl: '', sortOrder: '0', active: true })
    setMessage('VARIAÇÃO SALVA.')
    await refreshCatalog()
  }

  if (!catalog) return <EmptyState text="CARREGANDO CATÁLOGO DINÂMICO." />

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--sr-yellow)] bg-[var(--sr-red)] p-5 text-[var(--sr-white)]">
        <p className="text-sm font-black text-[var(--sr-yellow)]">CATÁLOGO DINÂMICO</p>
        <h3 className="mt-2 text-3xl font-black">PRODUTOS, CATEGORIAS, SABORES E VARIAÇÕES</h3>
        <p className="mt-2 text-sm font-bold">CADASTRE NOVOS ITENS PELO PAINEL. PRODUTOS ARQUIVADOS SAEM DAS NOVAS OPERAÇÕES E FICAM NOS HISTÓRICOS.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['produtos', 'categorias', 'subcategorias', 'sabores', 'variacoes'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full border border-[var(--sr-yellow)] px-4 py-2 font-black ${tab === item ? 'bg-[var(--sr-yellow)] text-[var(--sr-red)]' : 'text-[var(--sr-white)]'}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === 'produtos' ? (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          {hasPermission(user, 'products.create') ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <h3 className="text-xl font-black text-[var(--sr-red)]">{productForm.id ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</h3>
              <div className="mt-4 grid gap-3">
                <input value={productForm.name} onChange={(event) => setProductForm((state) => ({ ...state, name: event.target.value }))} placeholder="NOME" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
                <textarea value={productForm.description} onChange={(event) => setProductForm((state) => ({ ...state, description: event.target.value }))} placeholder="DESCRIÇÃO" className="min-h-20 rounded border border-zinc-300 px-3 py-3 font-semibold" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={productForm.categoryId} onChange={(event) => setProductForm((state) => ({ ...state, categoryId: event.target.value, subcategoryId: '' }))} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                    {catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <select value={productForm.subcategoryId} onChange={(event) => setProductForm((state) => ({ ...state, subcategoryId: event.target.value }))} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                    <option value="">SEM SUBCATEGORIA</option>
                    {selectedCategorySubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={productForm.flavorId} onChange={(event) => setProductForm((state) => ({ ...state, flavorId: event.target.value }))} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                    <option value="">SEM SABOR</option>
                    {catalog.flavors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <select value={productForm.variantId} onChange={(event) => setProductForm((state) => ({ ...state, variantId: event.target.value }))} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                    <option value="">SEM VARIAÇÃO</option>
                    {catalog.variants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input value={productForm.price} onChange={(event) => setProductForm((state) => ({ ...state, price: event.target.value }))} placeholder="PREÇO, EX: 5,00" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
                  <input value={productForm.unit} onChange={(event) => setProductForm((state) => ({ ...state, unit: event.target.value }))} placeholder="UNIDADE" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
                  <input value={productForm.volumeMl} onChange={(event) => setProductForm((state) => ({ ...state, volumeMl: event.target.value }))} placeholder="VOLUME ML" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
                </div>
                <label className="grid gap-1 text-sm font-black text-[var(--sr-red)]">
                  IMAGEM DO PRODUTO
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setProductImageFile(event.target.files?.[0] || null)}
                    className="rounded border border-zinc-300 px-3 py-3 font-semibold"
                  />
                  <small>PNG, JPEG OU WEBP ATÉ 2 MB.</small>
                </label>
                <div className="grid gap-2 text-sm font-black text-[var(--sr-red)] sm:grid-cols-2">
                  <label><input type="checkbox" checked={productForm.showPublic} onChange={(event) => setProductForm((state) => ({ ...state, showPublic: event.target.checked }))} /> VISÍVEL NO SITE</label>
                  <label><input type="checkbox" checked={productForm.deliveryEnabled} onChange={(event) => setProductForm((state) => ({ ...state, deliveryEnabled: event.target.checked }))} /> DELIVERY</label>
                  <label><input type="checkbox" checked={productForm.dineInOnly} onChange={(event) => setProductForm((state) => ({ ...state, dineInOnly: event.target.checked }))} /> SOMENTE ESTABELECIMENTO</label>
                  <label><input type="checkbox" checked={productForm.active} onChange={(event) => setProductForm((state) => ({ ...state, active: event.target.checked }))} /> ATIVO</label>
                </div>
                <button type="button" onClick={saveProduct} className="rounded bg-[var(--sr-yellow)] px-4 py-3 font-black text-[var(--sr-red)]">SALVAR PRODUTO</button>
              </div>
            </section>
          ) : <EmptyState text="SEU PERFIL PODE CONSULTAR PRODUTOS, MAS NÃO CADASTRAR." />}

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR NO CATÁLOGO" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
                <option value="ativos">ATIVOS</option>
                <option value="inativos">INATIVOS</option>
                <option value="todos">TODOS</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3">
              {filteredProducts.map((product) => (
                <article key={product.id} className="grid gap-3 rounded border border-[var(--sr-red)] p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="grid gap-3 sm:grid-cols-[72px_1fr] sm:items-center">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-16 w-16 rounded border border-[var(--sr-yellow)] object-cover" /> : <span className="hidden h-16 w-16 rounded border border-[var(--sr-yellow)] sm:block" aria-hidden="true" />}
                    <div>
                    <strong className="text-[var(--sr-red)]">{product.name}</strong>
                    <p className="text-sm font-bold text-[var(--sr-red)]">{[product.categoryName, product.subcategoryName, product.flavorName, product.variantName].filter(Boolean).join(' > ') || product.category}</p>
                    <small className="font-black text-[var(--sr-red)]">{product.active ? 'ATIVO' : 'INATIVO'} · {product.showPublic ? 'SITE' : 'OCULTO'} · {product.deliveryEnabled ? 'DELIVERY' : 'SEM DELIVERY'}</small>
                    </div>
                  </div>
                  <span className="font-black text-[var(--sr-red)]">{formatCurrency(product.price)}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => editProduct(product)} className="rounded bg-[var(--sr-yellow)] px-3 py-2 text-xs font-black text-[var(--sr-red)]">EDITAR</button>
                    {hasPermission(user, 'products.update') ? <button type="button" onClick={() => toggleProduct(product)} className="rounded bg-[var(--sr-red)] px-3 py-2 text-xs font-black text-[var(--sr-white)]">{product.active ? 'ARQUIVAR' : 'REATIVAR'}</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'categorias' ? (
        <CatalogSimpleManager title="CATEGORIAS" form={categoryForm} setForm={setCategoryForm} onSave={saveCategory} items={catalog.categories} onEdit={(item) => setCategoryForm({ id: item.id, name: item.name, description: item.description || '', sortOrder: String(item.sortOrder), showPublic: item.showPublic !== false, active: item.active })} />
      ) : null}
      {tab === 'subcategorias' ? (
        <CatalogSubcategoryManager categories={catalog.categories} form={subcategoryForm} setForm={setSubcategoryForm} onSave={saveSubcategory} items={catalog.subcategories} onEdit={(item) => setSubcategoryForm({ id: item.id, categoryId: item.categoryId, name: item.name, description: item.description, sortOrder: String(item.sortOrder), showPublic: item.showPublic, active: item.active })} />
      ) : null}
      {tab === 'sabores' ? (
        <CatalogSimpleManager title="SABORES" form={flavorForm} setForm={setFlavorForm} onSave={saveFlavor} items={catalog.flavors} onEdit={(item) => setFlavorForm({ id: item.id, name: item.name, description: item.description || '', sortOrder: String(item.sortOrder), active: item.active })} />
      ) : null}
      {tab === 'variacoes' ? (
        <CatalogVariantManager form={variantForm} setForm={setVariantForm} onSave={saveVariant} items={catalog.variants} onEdit={(item) => setVariantForm({ id: item.id, name: item.name, unit: item.unit, volumeMl: item.volumeMl ? String(item.volumeMl) : '', sortOrder: String(item.sortOrder), active: item.active })} />
      ) : null}
    </div>
  )
}

function CatalogSimpleManager({
  title,
  form,
  setForm,
  onSave,
  items,
  onEdit,
}: {
  title: string
  form: { id: string; name: string; description: string; sortOrder: string; showPublic?: boolean; active: boolean }
  setForm: (value: any) => void
  onSave: () => Promise<void>
  items: Array<{ id: string; name: string; description?: string; sortOrder: number; active: boolean; showPublic?: boolean; productsCount?: number; activeProductsCount?: number }>
  onEdit: (item: { id: string; name: string; description?: string; sortOrder: number; active: boolean; showPublic?: boolean }) => void
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="text-xl font-black text-[var(--sr-red)]">{form.id ? `EDITAR ${title}` : `NOVO ${title}`}</h3>
        <div className="mt-4 grid gap-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="NOME" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="DESCRIÇÃO" className="min-h-20 rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} placeholder="ORDEM" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          {'showPublic' in form ? <label className="font-black text-[var(--sr-red)]"><input type="checkbox" checked={Boolean(form.showPublic)} onChange={(event) => setForm({ ...form, showPublic: event.target.checked })} /> VISÍVEL NO SITE</label> : null}
          <label className="font-black text-[var(--sr-red)]"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> ATIVO</label>
          <button type="button" onClick={onSave} className="rounded bg-[var(--sr-yellow)] px-4 py-3 font-black text-[var(--sr-red)]">SALVAR</button>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="grid gap-2 rounded border border-[var(--sr-red)] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <strong className="text-[var(--sr-red)]">{item.name}</strong>
              <p className="text-sm font-bold text-[var(--sr-red)]">{item.description || 'SEM DESCRIÇÃO'} · ORDEM {item.sortOrder} · {item.active ? 'ATIVO' : 'INATIVO'}</p>
              {'productsCount' in item ? <small className="font-black text-[var(--sr-red)]">{item.productsCount} PRODUTO(S), {item.activeProductsCount} ATIVO(S)</small> : null}
            </div>
            <button type="button" onClick={() => onEdit(item)} className="rounded bg-[var(--sr-yellow)] px-3 py-2 text-xs font-black text-[var(--sr-red)]">EDITAR</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function CatalogSubcategoryManager({
  categories,
  form,
  setForm,
  onSave,
  items,
  onEdit,
}: {
  categories: CatalogPayload['categories']
  form: { id: string; categoryId: string; name: string; description: string; sortOrder: string; showPublic: boolean; active: boolean }
  setForm: (value: { id: string; categoryId: string; name: string; description: string; sortOrder: string; showPublic: boolean; active: boolean }) => void
  onSave: () => Promise<void>
  items: CatalogPayload['subcategories']
  onEdit: (item: CatalogPayload['subcategories'][number]) => void
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="text-xl font-black text-[var(--sr-red)]">{form.id ? 'EDITAR SUBCATEGORIA' : 'NOVA SUBCATEGORIA'}</h3>
        <div className="mt-4 grid gap-3">
          <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="NOME" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="DESCRIÇÃO" className="min-h-20 rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} placeholder="ORDEM" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <label className="font-black text-[var(--sr-red)]"><input type="checkbox" checked={form.showPublic} onChange={(event) => setForm({ ...form, showPublic: event.target.checked })} /> VISÍVEL NO SITE</label>
          <label className="font-black text-[var(--sr-red)]"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> ATIVA</label>
          <button type="button" onClick={onSave} className="rounded bg-[var(--sr-yellow)] px-4 py-3 font-black text-[var(--sr-red)]">SALVAR</button>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="grid gap-2 rounded border border-[var(--sr-red)] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <strong className="text-[var(--sr-red)]">{item.categoryName} &gt; {item.name}</strong>
              <p className="text-sm font-bold text-[var(--sr-red)]">{item.description || 'SEM DESCRIÇÃO'} · {item.active ? 'ATIVA' : 'INATIVA'}</p>
            </div>
            <button type="button" onClick={() => onEdit(item)} className="rounded bg-[var(--sr-yellow)] px-3 py-2 text-xs font-black text-[var(--sr-red)]">EDITAR</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function CatalogVariantManager({
  form,
  setForm,
  onSave,
  items,
  onEdit,
}: {
  form: { id: string; name: string; unit: string; volumeMl: string; sortOrder: string; active: boolean }
  setForm: (value: { id: string; name: string; unit: string; volumeMl: string; sortOrder: string; active: boolean }) => void
  onSave: () => Promise<void>
  items: CatalogPayload['variants']
  onEdit: (item: CatalogPayload['variants'][number]) => void
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="text-xl font-black text-[var(--sr-red)]">{form.id ? 'EDITAR VARIAÇÃO' : 'NOVA VARIAÇÃO'}</h3>
        <div className="mt-4 grid gap-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="NOME" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="UNIDADE" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.volumeMl} onChange={(event) => setForm({ ...form, volumeMl: event.target.value })} placeholder="VOLUME ML" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} placeholder="ORDEM" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <label className="font-black text-[var(--sr-red)]"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> ATIVA</label>
          <button type="button" onClick={onSave} className="rounded bg-[var(--sr-yellow)] px-4 py-3 font-black text-[var(--sr-red)]">SALVAR</button>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="grid gap-2 rounded border border-[var(--sr-red)] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <strong className="text-[var(--sr-red)]">{item.name}</strong>
              <p className="text-sm font-bold text-[var(--sr-red)]">{item.unit} · {item.volumeMl ? `${item.volumeMl} ML` : 'SEM VOLUME'} · {item.active ? 'ATIVA' : 'INATIVA'}</p>
            </div>
            <button type="button" onClick={() => onEdit(item)} className="rounded bg-[var(--sr-yellow)] px-3 py-2 text-xs font-black text-[var(--sr-red)]">EDITAR</button>
          </article>
        ))}
      </div>
    </section>
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
        <button type="button" onClick={createItem} className="mt-3 rounded bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
          Cadastrar item
        </button>
      </div> : <EmptyState text="Seu perfil pode acompanhar o estoque, mas nao ajustar livremente." />}

      <div className="grid gap-4 md:grid-cols-2">
        {stock.map((item) => (
          <article key={item.id} className={`rounded-lg border p-5 ${item.low ? 'border-red-500 bg-red-50' : 'border-zinc-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{item.name}</h3>
                <p className="text-sm font-semibold text-[var(--sr-white)]">
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
              <button type="button" onClick={() => move(item, 'entrada')} className="rounded bg-[var(--sr-yellow)] px-3 py-3 text-xs font-black text-[var(--sr-white)]">Entrada</button>
              <button type="button" onClick={() => move(item, 'saida')} className="rounded bg-red-100 px-3 py-3 text-xs font-black text-red-900">Saida</button>
            </div> : null}
          </article>
        ))}
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
          <button type="button" onClick={createUser} className="rounded bg-[var(--sr-red)] px-4 py-3 font-black text-[var(--sr-yellow)]">
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
            <span className={item.active === false ? 'text-[var(--sr-red)]' : 'text-[var(--sr-white)]'}>{item.active === false ? 'Inativo' : 'Ativo'}</span>
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
        <p className="mt-2 text-sm font-semibold text-[var(--sr-white)]">
          {printing?.message || 'Status de impressao ainda nao disponivel para este perfil.'}
        </p>
        <button type="button" onClick={testPrint} className="mt-4 rounded bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
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
        <p className="mt-2 text-sm font-semibold text-[var(--sr-white)]">
          {finance.openSession ? 'Caixa aberto. Pedidos finalizados entram no controle.' : 'Caixa fechado. Abra o caixa para controle financeiro correto.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor, ex: 50,00" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descricao" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <button type="button" onClick={finance.openSession ? closeCash : openCash} className="rounded bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
            {finance.openSession ? 'Fechar caixa' : 'Abrir caixa'}
          </button>
          <button type="button" onClick={expense} className="rounded bg-[var(--sr-red)] px-4 py-3 text-sm font-black text-white">
            Despesa
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => movement('entrada')} className="rounded bg-[var(--sr-yellow)] px-4 py-3 text-sm font-black text-[var(--sr-white)]">
            Entrada manual
          </button>
          <button type="button" onClick={() => movement('saida')} className="rounded bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-900">
            Saida manual
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {finance.byMethod.length === 0 ? <p className="text-sm font-semibold text-[var(--sr-white)]">Sem movimentos financeiros hoje.</p> : null}
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
          <pre key={index} className="overflow-auto rounded bg-zinc-50 p-3 text-xs font-semibold text-[var(--sr-white)]">
            {JSON.stringify(item, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="sr-admin-empty">{text}</p>
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="sr-admin-metric">
      <span aria-hidden="true" />
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
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
          ? 'bg-[var(--sr-yellow)] text-[var(--sr-white)]'
          : status === 'FINALIZADO'
            ? 'bg-zinc-900 text-white'
            : status === 'CANCELADO'
              ? 'bg-zinc-200 text-[var(--sr-white)]'
              : 'bg-zinc-100 text-[var(--sr-white)]'

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
