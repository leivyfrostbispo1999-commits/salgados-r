const WHATSAPP_NUMBER = '5500000000000'

export function buildWhatsAppUrl(productName: string) {
  const message = `Ola! Quero pedir um ${productName}.`

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
