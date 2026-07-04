const WHATSAPP_NUMBER = '5571997021801'

type WhatsAppItem = {
  name: string
  price: string
  quantity?: number
}

export function buildWhatsAppUrl(item: WhatsAppItem) {
  const quantity = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''
  const message = `Ola! Gostaria de pedir:\n• ${quantity}${item.name} – ${item.price}`

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
