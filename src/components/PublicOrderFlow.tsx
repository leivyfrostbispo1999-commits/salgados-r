import { useEffect, useMemo, useState } from 'react'
import { api, type ApiOrder, type ApiProduct, type DeliverySettings, formatCurrency } from '../utils/api'
import { buildOrderWhatsAppUrl, buildWhatsAppUrl } from '../utils/whatsapp'
import { Footer } from './Footer'
import { PublicHeader } from './PublicHeader'

type CartItem = {
  product: ApiProduct
  quantity: number
  notes: string
}

type CheckoutForm = {
  customerName: string
  phone: string
  channel: 'retirada' | 'local' | 'delivery'
  neighborhood: string
  address: string
  number: string
  complement: string
  reference: string
  paymentMethod: 'pix' | 'dinheiro' | 'cartao'
  needsChange: boolean
  changeFor: string
  notes: string
}

const cartKey = 'salgados-r-cart'

const productVisuals: Record<string, { imageUrl: string; imageAlt: string; badge: string }> = {
  'pastel-carne': {
    imageUrl: '/produtos/pastel-carne.png',
    imageAlt: 'Pastel crocante recheado com carne',
    badge: 'Delivery e presencial',
  },
  'pastel-frango': {
    imageUrl: '/produtos/pastel-frango.png',
    imageAlt: 'Pastel crocante recheado com frango',
    badge: 'Delivery e presencial',
  },
  'pastel-misto': {
    imageUrl: '/produtos/pastel-misto.png',
    imageAlt: 'Pastel misto com queijo e presunto',
    badge: 'Delivery e presencial',
  },
  'pastel-calabresa-queijo': {
    imageUrl: '/produtos/pastel-calabresa-queijo.png',
    imageAlt: 'Pastel de calabresa com queijo derretido',
    badge: 'Delivery e presencial',
  },
  'pastel-frango-queijo': {
    imageUrl: '/produtos/pastel-frango-queijo.png',
    imageAlt: 'Pastel de frango com queijo',
    badge: 'Delivery e presencial',
  },
  coxinha: {
    imageUrl: '/produtos/coxinha.png',
    imageAlt: 'Coxinha dourada e crocante',
    badge: 'Delivery e presencial',
  },
  enroladinho: {
    imageUrl: '/produtos/enroladinho.png',
    imageAlt: 'Enroladinho dourado',
    badge: 'Delivery e presencial',
  },
  'suco-goiaba-pequeno': {
    imageUrl: '/produtos/suco-goiaba-pequeno.png',
    imageAlt: 'Suco de goiaba no copo pequeno',
    badge: 'Somente presencial',
  },
  'suco-goiaba-grande': {
    imageUrl: '/produtos/suco-goiaba-grande.png',
    imageAlt: 'Suco de goiaba no copo grande',
    badge: 'Somente presencial',
  },
  'suco-maracuja-pequeno': {
    imageUrl: '/produtos/suco-maracuja-pequeno.png',
    imageAlt: 'Suco de maracuja no copo pequeno',
    badge: 'Somente presencial',
  },
  'suco-maracuja-grande': {
    imageUrl: '/produtos/suco-maracuja-grande.png',
    imageAlt: 'Suco de maracuja no copo grande',
    badge: 'Somente presencial',
  },
  'suco-natural-garrafinha-300ml': {
    imageUrl: '/produtos/garrafinha-refil.png',
    imageAlt: 'Garrafinha de suco natural 300 ml',
    badge: 'Unico suco para delivery',
  },
  'refil-suco-100ml': {
    imageUrl: '/produtos/garrafinha-refil.png',
    imageAlt: 'Refil de sucos naturais por volume',
    badge: 'Somente presencial',
  },
}

export function PublicOrderFlow() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [settings, setSettings] = useState<DeliverySettings>({ delivery_enabled: false, delivery_fee_default: 0, delivery_notes: '' })
  const [cart, setCart] = useState<CartItem[]>(() => readCart())
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const path = window.location.pathname

  useEffect(() => {
    Promise.all([api.publicProducts(), api.settings()])
      .then(([nextProducts, nextSettings]) => {
        setProducts(nextProducts)
        if (nextSettings.delivery) setSettings(nextSettings.delivery)
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart))
    window.dispatchEvent(new Event('salgados-r-cart'))
  }, [cart])

  function add(product: ApiProduct) {
    if (product.dineInOnly || product.availability === 'presencial') {
      setMessage(`${product.name} e somente para consumo no estabelecimento.`)
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { product, quantity: 1, notes: '' }]
    })
    setMessage(`${product.name} adicionado ao carrinho.`)
  }

  function update(productId: string, patch: Partial<CartItem>) {
    setCart((current) =>
      current
        .map((item) => (item.product.id === productId ? { ...item, ...patch } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  function remove(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }

  function clearCart() {
    setCart([])
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <div className="min-h-screen bg-[#FFF8E8] text-[#1D1D1D]">
      <PublicHeader />
      <main className="bg-[radial-gradient(circle_at_top_left,#FFE047_0,#FFF8E8_26%,#FFFDF7_58%)] py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7]/95 p-5 shadow-[0_18px_50px_rgba(139,0,8,0.10)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <a href="/" className="text-sm font-black text-[#99000D] transition hover:text-[#D90416]">← Voltar para a home</a>
              <h1 className="mt-2 text-4xl font-black leading-none tracking-tight text-[#050505] sm:text-5xl">
                {path.startsWith('/checkout') ? 'Checkout' : path.startsWith('/carrinho') ? 'Carrinho' : 'Cardapio'}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-[#4A3329]">
                Pastel crocante, salgado quentinho e suco do jeito certo: copo no balcao, garrafinha no delivery.
              </p>
            </div>
            <a href="/carrinho" className="rounded-full bg-[#FFD51E] px-5 py-3 text-center text-sm font-black text-[#050505] shadow-[0_10px_24px_rgba(255,213,30,0.35)] transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
              Carrinho: {cart.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
            </a>
          </div>

          {message ? <p className="mb-5 rounded-2xl border border-[#FFD51E] bg-[#FFF3B0] p-4 text-sm font-black text-[#050505]">{message}</p> : null}
          {loading ? <p className="rounded-2xl border border-[#EFE0C8] bg-white p-5 font-black">Carregando cardapio...</p> : null}

          {!loading && path.startsWith('/checkout') ? (
            <CheckoutView
              cart={cart}
              settings={settings}
              total={total}
              onCreated={(created) => {
                setOrder(created)
                clearCart()
                window.history.pushState(null, '', `/pedido/sucesso/${created.id}`)
              }}
              setMessage={setMessage}
            />
          ) : null}

          {!loading && path.startsWith('/pedido/sucesso') ? <SuccessView order={order} /> : null}

          {!loading && path.startsWith('/carrinho') ? (
            <CartView cart={cart} total={total} update={update} remove={remove} />
          ) : null}

          {!loading && !path.startsWith('/checkout') && !path.startsWith('/carrinho') && !path.startsWith('/pedido/sucesso') ? (
            <MenuView products={products} cartTotal={total} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} add={add} />
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function MenuView({
  products,
  cartTotal,
  cartCount,
  add,
}: {
  products: ApiProduct[]
  cartTotal: number
  cartCount: number
  add: (product: ApiProduct) => void
}) {
  const params = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(params.get('categoria') || 'todos')
  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pasteis', label: 'Pasteis' },
    { id: 'salgados', label: 'Salgados' },
    { id: 'sucos', label: 'Sucos' },
    { id: 'oficial', label: 'Cardapio oficial' },
    { id: 'refil', label: 'Refil' },
  ]
  const grouped = useMemo(
    () =>
      ['pasteis', 'salgados', 'sucos', 'refil']
        .map((group) => ({
          category: group,
          products: products.filter((product) => {
            const matchesCategory =
              category === 'todos' || category === group || (category === 'mais-pedidos' && product.featured)
            const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
            return product.category === group && product.active && matchesCategory && matchesSearch
          }),
        }))
        .filter((group) => group.products.length > 0),
    [category, products, search],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-8">
        <section className="rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-4 shadow-[0_14px_40px_rgba(139,0,8,0.08)] sm:p-5">
          <div className="mb-4 grid gap-3 rounded-[1.25rem] bg-[linear-gradient(135deg,#8B0008,#D90416)] p-5 text-white sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD51E]">Escolha entre balcao e delivery</p>
              <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Cardapio digital da Salgados R</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/85">
                Sucos de copo sao presenciais. Para entrega, escolha somente a garrafinha de 300 ml.
              </p>
            </div>
            <a href="/cardapio-oficial" className="rounded-full border border-white/35 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white hover:text-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
              Ver imagem oficial
            </a>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar pastel, coxinha, suco..."
              className="min-h-12 rounded-full border border-[#EFE0C8] bg-white px-5 py-4 text-sm font-bold text-[#050505] outline-none transition placeholder:text-zinc-400 focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40"
            />
            <a href="/cardapio-oficial" className="rounded-full bg-[#050505] px-5 py-4 text-center text-sm font-black text-white transition hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
              Cardapio oficial
            </a>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              item.id === 'oficial' ? (
                <a
                  key={item.id}
                  href="/cardapio-oficial"
                  className="whitespace-nowrap rounded-full bg-[#050505] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50 ${
                    category === item.id ? 'bg-[#FFD51E] text-[#050505] shadow-sm' : 'bg-[#050505] text-white hover:bg-[#99000D]'
                  }`}
                >
                  {item.label}
                </button>
              )
            ))}
          </div>
        </section>

        {grouped.map((group) => (
          <section key={group.category} className="scroll-mt-24">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#99000D]">{eyebrowCategory(group.category)}</p>
                <h2 className="text-3xl font-black capitalize leading-tight text-[#050505]">{labelCategory(group.category)}</h2>
              </div>
              {group.category === 'sucos' ? (
                <span className="rounded-full bg-[#FFD51E] px-4 py-2 text-xs font-black text-[#050505]">
                  Copo presencial. Delivery so garrafinha.
                </span>
              ) : null}
            </div>
            {group.category === 'sucos' ? <JuiceRules /> : null}
            {group.category === 'refil' ? <RefillRules /> : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.products.map((product) => {
                const canCart = !product.dineInOnly && product.availability !== 'presencial' && product.deliveryEnabled
                const visual = productVisual(product)
                return (
                  <article key={product.id} className="group overflow-hidden rounded-[1.35rem] border border-[#EFE0C8] bg-[#FFFDF7] p-3 shadow-[0_14px_38px_rgba(39,20,8,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(139,0,8,0.16)]">
                    <div className="relative overflow-hidden rounded-[1.1rem] bg-[linear-gradient(135deg,#FFF8E8,#FFE7A3)]">
                      <img
                        src={visual.imageUrl}
                        alt={visual.imageAlt}
                        width="900"
                        height="640"
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:scale-[1.025]"
                      />
                      <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-sm ${
                        canCart ? 'bg-[#FFD51E] text-[#050505]' : 'bg-[#FFFDF7] text-[#99000D]'
                      }`}>
                        {visual.badge}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-xl font-black leading-tight text-[#050505]">{product.name}</h3>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#4A3329]">{product.description}</p>
                        </div>
                        <span className="shrink-0 rounded-2xl bg-[#FFD51E] px-3 py-2 text-base font-black text-[#050505] shadow-sm">{formatCurrency(product.price)}</span>
                      </div>
                      <p className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                        canCart ? 'bg-[#FFEFB0] text-[#99000D]' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {canCart ? 'Pede online e confirma no WhatsApp' : 'Somente consumo no estabelecimento'}
                      </p>
                      <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        disabled={!canCart}
                        onClick={() => add(product)}
                        className="min-h-12 rounded-xl bg-[#FFD51E] px-4 py-3 text-sm font-black text-[#050505] transition hover:bg-[#FFE047] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                      >
                        Adicionar
                      </button>
                      <a
                        href={canCart ? buildWhatsAppUrl({ name: product.name, price: formatCurrency(product.price), quantity: 1 }) : '#'}
                        target={canCart ? '_blank' : undefined}
                        rel="noreferrer"
                        className={`min-h-12 rounded-xl px-4 py-3 text-center text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50 ${
                          canCart ? 'bg-[#050505] text-white hover:bg-[#99000D]' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        Pedir no WhatsApp
                      </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <aside className="hidden h-fit rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-5 shadow-[0_14px_40px_rgba(139,0,8,0.08)] lg:sticky lg:top-24 lg:block">
        <p className="text-sm font-black uppercase tracking-wide text-[#99000D]">Resumo</p>
        <p className="mt-2 text-4xl font-black text-[#050505]">{formatCurrency(cartTotal)}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#4A3329]">
          Sucos de copo e refil presencial nao entram no delivery.
        </p>
        <a href="/carrinho" className="mt-5 block rounded-xl bg-[#050505] px-5 py-4 text-center font-black text-white transition hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
          Ver carrinho
        </a>
      </aside>
      {cartCount > 0 ? <FloatingCart count={cartCount} total={cartTotal} /> : null}
    </div>
  )
}

function CartView({
  cart,
  total,
  update,
  remove,
}: {
  cart: CartItem[]
  total: number
  update: (id: string, patch: Partial<CartItem>) => void
  remove: (id: string) => void
}) {
  return (
    <div className="grid gap-5 pb-24 lg:grid-cols-[1fr_320px] lg:pb-0">
      <section className="rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-5 shadow-[0_14px_40px_rgba(139,0,8,0.08)]">
        <h2 className="text-3xl font-black text-[#050505]">Carrinho</h2>
        <div className="mt-4 grid gap-4">
          {cart.length === 0 ? <p className="rounded-2xl bg-[#FFF3B0] p-4 text-sm font-black text-[#050505]">Seu carrinho esta vazio.</p> : null}
          {cart.map((item) => (
            <article key={item.product.id} className="rounded-2xl border border-[#EFE0C8] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-[#050505]">{item.product.name}</h3>
                  <p className="text-sm font-semibold text-[#4A3329]">{formatCurrency(item.product.price)} cada</p>
                </div>
                <button type="button" onClick={() => remove(item.product.id)} className="text-sm font-black text-[#99000D] transition hover:text-[#D90416] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
                  Remover
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                <div className="flex items-center justify-between rounded-full bg-[#FFF8E8] p-1">
                  <button
                    type="button"
                    onClick={() => update(item.product.id, { quantity: Math.max(1, item.quantity - 1) })}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white font-black shadow-sm transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                    aria-label={`Diminuir ${item.product.name}`}
                  >
                    -
                  </button>
                  <span className="font-black">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => update(item.product.id, { quantity: item.quantity + 1 })}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#FFD51E] font-black transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
                    aria-label={`Aumentar ${item.product.name}`}
                  >
                    +
                  </button>
                </div>
                <input
                  value={item.notes}
                  onChange={(event) => update(item.product.id, { notes: event.target.value })}
                  placeholder="Observacao do item, ex: sem cebola"
                  className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="hidden h-fit rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-5 shadow-[0_14px_40px_rgba(139,0,8,0.08)] lg:block">
        <p className="text-sm font-black uppercase tracking-wide text-[#99000D]">Total</p>
        <p className="mt-2 text-4xl font-black text-[#050505]">{formatCurrency(total)}</p>
        <a
          href={cart.length ? '/checkout' : '/cardapio'}
          className="mt-5 block rounded-xl bg-[#050505] px-5 py-4 text-center font-black text-white transition hover:bg-[#99000D] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
        >
          {cart.length ? 'Ir para checkout' : 'Escolher produtos'}
        </a>
      </aside>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#EFE0C8] bg-[#FFFDF7] p-4 shadow-2xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#99000D]">Total</p>
            <p className="text-xl font-black text-[#050505]">{formatCurrency(total)}</p>
          </div>
          <a
            href={cart.length ? '/checkout' : '/cardapio'}
            className="rounded-xl bg-[#FFD51E] px-5 py-3 text-sm font-black text-[#050505] transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50"
          >
            {cart.length ? 'Finalizar' : 'Cardapio'}
          </a>
        </div>
      </div>
    </div>
  )
}

function CheckoutView({
  cart,
  settings,
  total,
  onCreated,
  setMessage,
}: {
  cart: CartItem[]
  settings: DeliverySettings
  total: number
  onCreated: (order: ApiOrder) => void
  setMessage: (message: string) => void
}) {
  const [form, setForm] = useState<CheckoutForm>({
    customerName: '',
    phone: '',
    channel: 'retirada',
    neighborhood: '',
    address: '',
    number: '',
    complement: '',
    reference: '',
    paymentMethod: 'pix',
    needsChange: false,
    changeFor: '',
    notes: '',
  })
  const deliveryFee = form.channel === 'delivery' ? (settings.delivery_fee_default || 0) / 100 : 0
  const grandTotal = total + deliveryFee

  async function submit() {
    if (!cart.length) return setMessage('Seu carrinho esta vazio.')
    if (!form.customerName || !form.phone) return setMessage('Informe nome e WhatsApp.')
    if (form.channel === 'delivery' && (!form.neighborhood || !form.address || !form.number)) {
      return setMessage('Para entrega, informe bairro, endereco e numero.')
    }
    if (form.paymentMethod === 'dinheiro' && form.needsChange && !form.changeFor) {
      return setMessage('Informe troco para quanto.')
    }

    try {
      const created = await api.createOrder({
        customerName: form.customerName,
        phone: form.phone,
        channel: form.channel,
        neighborhood: form.neighborhood,
        address: form.address,
        number: form.number,
        complement: form.complement,
        reference: form.reference,
        paymentMethod: form.paymentMethod,
        changeFor: form.needsChange ? form.changeFor : '',
        notes: form.notes,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, notes: item.notes })),
      })
      onCreated(created)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao criar pedido.')
    }
  }

  function setField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-5 shadow-[0_14px_40px_rgba(139,0,8,0.08)]">
        <div className="flex flex-wrap gap-2">
          {['Seus dados', 'Tipo de pedido', 'Pagamento', 'Revisao'].map((step, index) => (
            <span key={step} className="rounded-full bg-[#FFF3B0] px-3 py-2 text-xs font-black text-[#050505]">
              {index + 1}. {step}
            </span>
          ))}
        </div>
        <h2 className="mt-5 text-3xl font-black text-[#050505]">Checkout</h2>
        <div className="mt-4 rounded-2xl border border-[#EFE0C8] bg-white p-4">
          <p className="text-sm font-black uppercase tracking-wide text-[#99000D]">1. Seus dados</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder="Nome do cliente" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
          <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="WhatsApp do cliente" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#EFE0C8] bg-white p-4">
          <p className="text-sm font-black uppercase tracking-wide text-[#99000D]">2. Tipo e pagamento</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select value={form.channel} onChange={(event) => setField('channel', event.target.value as CheckoutForm['channel'])} className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40">
            <option value="retirada">Retirada</option>
            <option value="local">Consumo no local</option>
            {settings.delivery_enabled ? <option value="delivery">Entrega</option> : null}
          </select>
          <select value={form.paymentMethod} onChange={(event) => setField('paymentMethod', event.target.value as CheckoutForm['paymentMethod'])} className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartao</option>
          </select>
          </div>
        </div>

        {form.channel === 'delivery' ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-[#EFE0C8] bg-white p-4 sm:grid-cols-2">
            <p className="text-sm font-black uppercase tracking-wide text-[#99000D] sm:col-span-2">Endereco da entrega</p>
            <input value={form.neighborhood} onChange={(event) => setField('neighborhood', event.target.value)} placeholder="Bairro" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
            <input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Endereco" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
            <input value={form.number} onChange={(event) => setField('number', event.target.value)} placeholder="Numero" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
            <input value={form.complement} onChange={(event) => setField('complement', event.target.value)} placeholder="Complemento" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
            <input value={form.reference} onChange={(event) => setField('reference', event.target.value)} placeholder="Referencia" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40 sm:col-span-2" />
          </div>
        ) : null}

        {form.paymentMethod === 'dinheiro' ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-[#EFE0C8] bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.needsChange} onChange={(event) => setField('needsChange', event.target.checked)} />
              Precisa de troco
            </label>
            <input value={form.changeFor} onChange={(event) => setField('changeFor', event.target.value)} placeholder="Troco para quanto? Ex: 50,00" className="rounded-xl border border-[#EFE0C8] bg-[#FFFDF7] px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
          </div>
        ) : null}

        <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Observacao geral do pedido" className="mt-4 min-h-28 w-full rounded-xl border border-[#EFE0C8] bg-white px-3 py-3 font-semibold outline-none focus:border-[#D90416] focus:ring-4 focus:ring-[#FFD51E]/40" />
      </section>

      <aside className="h-fit rounded-[1.5rem] border border-[#EFE0C8] bg-[#FFFDF7] p-5 shadow-[0_14px_40px_rgba(139,0,8,0.08)] lg:sticky lg:top-24">
        <h3 className="text-xl font-black text-[#050505]">Revisao</h3>
        <div className="mt-4 space-y-3">
          {cart.map((item) => (
            <p key={item.product.id} className="flex justify-between gap-3 text-sm font-semibold">
              <span>{item.quantity}x {item.product.name}</span>
              <span>{formatCurrency(item.product.price * item.quantity)}</span>
            </p>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-sm font-bold">
          <p className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total)}</span></p>
          <p className="flex justify-between"><span>Entrega</span><span>{formatCurrency(deliveryFee)}</span></p>
          <p className="flex justify-between text-xl text-[#99000D]"><span>Total</span><span>{formatCurrency(grandTotal)}</span></p>
        </div>
        <button type="button" onClick={submit} className="mt-5 w-full rounded-xl bg-[#FFD51E] px-5 py-4 font-black text-[#050505] transition hover:bg-[#FFE047] focus:outline-none focus:ring-4 focus:ring-[#FFD51E]/50">
          Confirmar pedido
        </button>
      </aside>
    </div>
  )
}

function SuccessView({ order }: { order: ApiOrder | null }) {
  if (!order) {
    return (
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Pedido criado</h2>
        <p className="mt-2 text-sm font-semibold text-zinc-600">Se voce acabou de criar um pedido, ele ja foi enviado para a loja.</p>
        <a href="/cardapio" className="mt-5 inline-flex rounded-full bg-[#FFC72C] px-5 py-3 font-black">Voltar ao cardapio</a>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl rounded-lg bg-white p-6 text-center shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-[#DA291C]">Pedido recebido</p>
      <h2 className="mt-2 text-4xl font-black">Pedido #{order.orderNumber || order.id.slice(0, 8)}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">
        Seu pedido foi gravado no sistema da Salgados R. Voce tambem pode enviar a confirmacao pelo WhatsApp.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={buildOrderWhatsAppUrl(order)} target="_blank" rel="noreferrer" className="rounded-full bg-[#1D1D1D] px-5 py-4 font-black text-white">
          Enviar pedido pelo WhatsApp
        </a>
        <a href="/cardapio" className="rounded-full bg-[#FFC72C] px-5 py-4 font-black text-[#1D1D1D]">
          Fazer outro pedido
        </a>
      </div>
    </section>
  )
}

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(cartKey) || '[]') as CartItem[]
  } catch {
    return []
  }
}

function FloatingCart({ count, total }: { count: number; total: number }) {
  return (
    <a
      href="/carrinho"
      className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between rounded-full bg-[#1D1D1D] px-5 py-4 font-black text-white shadow-2xl lg:hidden"
    >
      <span>{count} item(ns)</span>
      <span>{formatCurrency(total)}</span>
      <span className="rounded-full bg-[#FFC72C] px-3 py-1 text-[#1D1D1D]">Ver</span>
    </a>
  )
}

function labelCategory(category: string) {
  if (category === 'pasteis') return 'Pasteis'
  if (category === 'salgados') return 'Salgados'
  if (category === 'sucos') return 'Sucos'
  if (category === 'refil') return 'Refil'
  return category
}

function eyebrowCategory(category: string) {
  if (category === 'pasteis') return 'Massa crocante'
  if (category === 'salgados') return 'Quentinhos de balcao'
  if (category === 'sucos') return 'Presencial x delivery'
  if (category === 'refil') return 'Sucao por volume'
  return 'Salgados R'
}

function productVisual(product: ApiProduct) {
  return productVisuals[product.id] || {
    imageUrl: '/cardapio/cardapio-principal.jpeg',
    imageAlt: product.name,
    badge: product.availability === 'presencial' ? 'Somente presencial' : 'Delivery e presencial',
  }
}

function JuiceRules() {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-[1.25rem] border border-[#EFE0C8] bg-[#FFFDF7] p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#99000D]">Consumo no estabelecimento</p>
        <h3 className="mt-2 text-xl font-black text-[#050505]">Sucos de copo</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-[#4A3329]">
          Copos pequenos e grandes de goiaba ou maracuja sao vendidos somente no balcao.
        </p>
      </div>
      <div className="rounded-[1.25rem] border border-[#FFD51E] bg-[#FFD51E] p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#99000D]">Delivery</p>
        <h3 className="mt-2 text-xl font-black text-[#050505]">Somente garrafinha 300 ml</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-[#4A3329]">
          Para entrega, trabalhamos apenas com suco natural na garrafinha de 300 ml por R$ 4,00.
        </p>
      </div>
    </div>
  )
}

function RefillRules() {
  const rules = [
    'Devolvendo a garrafinha com tampa, voce paga apenas o suco.',
    'Trouxe sua propria garrafa? Paga conforme o volume.',
    'R$ 1,00 a cada 100 ml.',
  ]

  return (
    <div className="mb-4 rounded-[1.35rem] border border-[#EFE0C8] bg-[#050505] p-5 text-white shadow-[0_18px_45px_rgba(5,5,5,0.22)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD51E]">Como funciona o refil</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rules.map((rule, index) => (
          <div key={rule} className="rounded-2xl bg-white/10 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFD51E] text-sm font-black text-[#050505]">
              {index + 1}
            </span>
            <p className="mt-3 text-sm font-bold leading-6 text-white/90">{rule}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
