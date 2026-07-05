const WHATSAPP_NUMBER = '5571997021801'

type WhatsAppItem = {
  name: string
  price: string
  quantity?: number
}

type WhatsAppOrder = {
  orderNumber?: number | null
  customerName: string
  phone: string
  channel: string
  address?: string
  number?: string
  neighborhood?: string
  complement?: string
  reference?: string
  paymentMethod: string
  changeFor?: number | null
  notes?: string
  subtotal: number
  deliveryFee: number
  total: number
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    total: number
    notes?: string
  }>
}

export function buildWhatsAppUrl(item: WhatsAppItem) {
  const quantity = item.quantity ?? 1
  const message = `Ola! Gostaria de pedir:\n• ${item.name} – ${item.price}\nQuantidade: ${quantity}`

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function buildOrderWhatsAppUrl(order: WhatsAppOrder) {
  const address =
    order.channel === 'delivery'
      ? `\nEndereco: ${order.address || ''}, ${order.number || ''} - ${order.neighborhood || ''}${
          order.complement ? `\nComplemento: ${order.complement}` : ''
        }${order.reference ? `\nReferencia: ${order.reference}` : ''}`
      : ''

  const itemLines = order.items
    .map((item) => {
      const note = item.notes ? `\n  Obs: ${item.notes}` : ''
      return `- ${item.quantity}x ${item.productName} — ${formatMoney(item.unitPrice)} cada = ${formatMoney(item.total)}${note}`
    })
    .join('\n')

  const notes = [order.notes, order.changeFor ? `Troco para ${formatMoney(order.changeFor)}` : '']
    .filter(Boolean)
    .map((note) => `- ${note}`)
    .join('\n')

  const message = `Ola! Quero confirmar meu pedido na SALGADOS R.

Pedido #${order.orderNumber || 'novo'}

Cliente: ${order.customerName}
WhatsApp: ${order.phone}

Tipo: ${labelChannel(order.channel)}${address}

Itens:
${itemLines}

Observacoes:
${notes || '- Sem observacoes'}

Pagamento: ${labelPayment(order.paymentMethod)}
Subtotal: ${formatMoney(order.subtotal)}
Entrega: ${formatMoney(order.deliveryFee)}
Total: ${formatMoney(order.total)}`

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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
