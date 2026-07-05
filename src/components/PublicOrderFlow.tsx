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
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="bg-[#F6F6F6] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <a href="/" className="text-sm font-black text-[#DA291C]">← Voltar para a home</a>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-[#1D1D1D]">
                {path.startsWith('/checkout') ? 'Checkout' : path.startsWith('/carrinho') ? 'Carrinho' : 'Cardapio'}
              </h1>
              <p className="mt-1 text-sm font-semibold text-zinc-600">
                Escolha, finalize e confirme pelo WhatsApp se quiser.
              </p>
            </div>
            <a href="/carrinho" className="rounded-full bg-[#FFC72C] px-5 py-3 text-center text-sm font-black text-[#1D1D1D] shadow-sm">
              Carrinho: {cart.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
            </a>
          </div>

          {message ? <p className="mb-5 rounded-lg bg-yellow-100 p-3 text-sm font-bold text-zinc-900">{message}</p> : null}
          {loading ? <p className="rounded-lg bg-white p-5 font-bold">Carregando cardapio...</p> : null}

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
    { id: 'refil', label: 'Refil' },
    { id: 'mais-pedidos', label: 'Mais pedidos' },
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
        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar pastel, coxinha, suco..."
              className="rounded-full border border-zinc-200 bg-[#F6F6F6] px-5 py-4 text-sm font-bold outline-none transition focus:border-[#FFC72C] focus:ring-4 focus:ring-[#FFC72C]/30"
            />
            <a href="/cardapio-oficial" className="rounded-full bg-zinc-100 px-5 py-4 text-center text-sm font-black text-[#DA291C]">
              Cardapio oficial em imagem
            </a>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                  category === item.id ? 'bg-[#FFC72C] text-[#1D1D1D]' : 'bg-[#F6F6F6] text-zinc-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {grouped.map((group) => (
          <section key={group.category} className="rounded-[1.5rem] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black capitalize text-[#1D1D1D]">{labelCategory(group.category)}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.products.map((product) => {
                const canCart = !product.dineInOnly && product.availability !== 'presencial' && product.deliveryEnabled
                return (
                  <article key={product.id} className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className={`grid aspect-[5/3] place-items-center text-5xl font-black text-white ${visualFor(product.category)}`}>
                      {product.name.slice(0, 1)}
                    </div>
                    <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-[#1D1D1D]">{product.name}</h3>
                        <p className="mt-1 text-sm font-semibold leading-6 text-zinc-600">{product.description}</p>
                      </div>
                      <span className="rounded-full bg-[#FFC72C] px-3 py-2 text-sm font-black">{formatCurrency(product.price)}</span>
                    </div>
                    <p className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                      canCart ? 'bg-yellow-100 text-[#DA291C]' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {canCart ? 'Delivery e retirada' : 'Somente no balcao'}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={!canCart}
                        onClick={() => add(product)}
                        className="rounded-full bg-[#FFC72C] px-4 py-3 text-sm font-black text-[#1D1D1D] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
                      >
                        Adicionar
                      </button>
                      <a
                        href={canCart ? buildWhatsAppUrl({ name: product.name, price: formatCurrency(product.price), quantity: 1 }) : '#'}
                        target={canCart ? '_blank' : undefined}
                        rel="noreferrer"
                        className={`rounded-full px-4 py-3 text-center text-sm font-black ${
                          canCart ? 'bg-[#25D366] text-[#0B2B16]' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        WhatsApp
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
      <aside className="hidden h-fit rounded-[1.5rem] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:block">
        <p className="text-sm font-black uppercase tracking-wide text-[#DA291C]">Resumo</p>
        <p className="mt-2 text-3xl font-black">{formatCurrency(cartTotal)}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-600">
          Sucos de copo e refil presencial nao entram no delivery.
        </p>
        <a href="/carrinho" className="mt-5 block rounded-full bg-[#FFC72C] px-5 py-3 text-center font-black text-[#1D1D1D]">
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
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">Carrinho</h2>
        <div className="mt-4 grid gap-4">
          {cart.length === 0 ? <p className="rounded-lg bg-zinc-50 p-4 text-sm font-bold">Seu carrinho esta vazio.</p> : null}
          {cart.map((item) => (
            <article key={item.product.id} className="rounded-2xl border border-zinc-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black">{item.product.name}</h3>
                  <p className="text-sm font-semibold text-zinc-600">{formatCurrency(item.product.price)} cada</p>
                </div>
                <button type="button" onClick={() => remove(item.product.id)} className="text-sm font-black text-[#DA291C]">
                  Remover
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                <div className="flex items-center justify-between rounded-full bg-[#F6F6F6] p-1">
                  <button
                    type="button"
                    onClick={() => update(item.product.id, { quantity: Math.max(1, item.quantity - 1) })}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white font-black"
                    aria-label={`Diminuir ${item.product.name}`}
                  >
                    -
                  </button>
                  <span className="font-black">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => update(item.product.id, { quantity: item.quantity + 1 })}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#FFC72C] font-black"
                    aria-label={`Aumentar ${item.product.name}`}
                  >
                    +
                  </button>
                </div>
                <input
                  value={item.notes}
                  onChange={(event) => update(item.product.id, { notes: event.target.value })}
                  placeholder="Observacao do item, ex: sem cebola"
                  className="rounded border border-zinc-300 px-3 py-3 font-semibold"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="hidden h-fit rounded-[1.5rem] bg-white p-5 shadow-sm lg:block">
        <p className="text-sm font-black uppercase tracking-wide text-[#DA291C]">Total</p>
        <p className="mt-2 text-3xl font-black">{formatCurrency(total)}</p>
        <a
          href={cart.length ? '/checkout' : '/cardapio'}
          className="mt-5 block rounded-full bg-[#1D1D1D] px-5 py-3 text-center font-black text-white"
        >
          {cart.length ? 'Ir para checkout' : 'Escolher produtos'}
        </a>
      </aside>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white p-4 shadow-2xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#DA291C]">Total</p>
            <p className="text-xl font-black">{formatCurrency(total)}</p>
          </div>
          <a
            href={cart.length ? '/checkout' : '/cardapio'}
            className="rounded-full bg-[#FFC72C] px-5 py-3 text-sm font-black text-[#1D1D1D]"
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
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['Seus dados', 'Tipo de pedido', 'Pagamento', 'Revisao'].map((step, index) => (
            <span key={step} className="rounded-full bg-[#F6F6F6] px-3 py-2 text-xs font-black text-zinc-700">
              {index + 1}. {step}
            </span>
          ))}
        </div>
        <h2 className="mt-5 text-2xl font-black">Checkout</h2>
        <div className="mt-4 rounded-2xl bg-[#F6F6F6] p-4">
          <p className="text-sm font-black uppercase tracking-wide text-[#DA291C]">1. Seus dados</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder="Nome do cliente" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="WhatsApp do cliente" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#F6F6F6] p-4">
          <p className="text-sm font-black uppercase tracking-wide text-[#DA291C]">2. Tipo e pagamento</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select value={form.channel} onChange={(event) => setField('channel', event.target.value as CheckoutForm['channel'])} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
            <option value="retirada">Retirada</option>
            <option value="local">Consumo no local</option>
            {settings.delivery_enabled ? <option value="delivery">Entrega</option> : null}
          </select>
          <select value={form.paymentMethod} onChange={(event) => setField('paymentMethod', event.target.value as CheckoutForm['paymentMethod'])} className="rounded border border-zinc-300 px-3 py-3 font-semibold">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartao</option>
          </select>
          </div>
        </div>

        {form.channel === 'delivery' ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-[#F6F6F6] p-4 sm:grid-cols-2">
            <p className="text-sm font-black uppercase tracking-wide text-[#DA291C] sm:col-span-2">Endereco da entrega</p>
            <input value={form.neighborhood} onChange={(event) => setField('neighborhood', event.target.value)} placeholder="Bairro" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
            <input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Endereco" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
            <input value={form.number} onChange={(event) => setField('number', event.target.value)} placeholder="Numero" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
            <input value={form.complement} onChange={(event) => setField('complement', event.target.value)} placeholder="Complemento" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
            <input value={form.reference} onChange={(event) => setField('reference', event.target.value)} placeholder="Referencia" className="rounded border border-zinc-300 px-3 py-3 font-semibold sm:col-span-2" />
          </div>
        ) : null}

        {form.paymentMethod === 'dinheiro' ? (
          <div className="mt-4 grid gap-3 rounded-lg bg-zinc-50 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.needsChange} onChange={(event) => setField('needsChange', event.target.checked)} />
              Precisa de troco
            </label>
            <input value={form.changeFor} onChange={(event) => setField('changeFor', event.target.value)} placeholder="Troco para quanto? Ex: 50,00" className="rounded border border-zinc-300 px-3 py-3 font-semibold" />
          </div>
        ) : null}

        <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Observacao geral do pedido" className="mt-4 min-h-28 w-full rounded border border-zinc-300 px-3 py-3 font-semibold" />
      </section>

      <aside className="h-fit rounded-[1.5rem] bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h3 className="text-xl font-black">Revisao</h3>
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
          <p className="flex justify-between text-lg"><span>Total</span><span>{formatCurrency(grandTotal)}</span></p>
        </div>
        <button type="button" onClick={submit} className="mt-5 w-full rounded-full bg-[#FFC72C] px-5 py-4 font-black text-[#1D1D1D]">
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

function visualFor(category: string) {
  if (category === 'sucos') return 'bg-[linear-gradient(135deg,#FFB000,#DA291C)]'
  if (category === 'refil') return 'bg-[linear-gradient(135deg,#DA291C,#FFC72C)]'
  if (category === 'salgados') return 'bg-[linear-gradient(135deg,#FFC72C,#D71920)]'
  return 'bg-[linear-gradient(135deg,#FFD21F,#DA291C)]'
}
