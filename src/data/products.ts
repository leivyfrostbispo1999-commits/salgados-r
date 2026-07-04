export type ProductCategory = 'pasteis' | 'salgados' | 'sucos'
export type ProductAvailability = 'delivery' | 'presencial' | 'ambos'

export type Product = {
  id: string
  name: string
  description: string
  price: string
  category: ProductCategory
  availability: ProductAvailability
  highlight?: string
}

export const products: Product[] = [
  {
    id: 'pastel-carne',
    name: 'Pastel de Carne',
    description: 'Pastel crocante com recheio de carne bem temperada.',
    price: 'R$ 5,00',
    category: 'pasteis',
    availability: 'ambos',
  },
  {
    id: 'pastel-frango',
    name: 'Pastel de Frango',
    description: 'Frango suculento em massa sequinha e dourada.',
    price: 'R$ 5,00',
    category: 'pasteis',
    availability: 'ambos',
  },
  {
    id: 'pastel-misto',
    name: 'Pastel Misto',
    description: 'Queijo com presunto em uma combinacao classica.',
    price: 'R$ 5,00',
    category: 'pasteis',
    availability: 'ambos',
  },
  {
    id: 'pastel-calabresa-queijo',
    name: 'Pastel de Calabresa com Queijo',
    description: 'Calabresa marcante com queijo derretido.',
    price: 'R$ 6,00',
    category: 'pasteis',
    availability: 'ambos',
    highlight: 'Mais pedido',
  },
  {
    id: 'pastel-frango-queijo',
    name: 'Pastel de Frango com Queijo',
    description: 'Frango temperado com queijo cremoso.',
    price: 'R$ 7,00',
    category: 'pasteis',
    availability: 'ambos',
  },
  {
    id: 'coxinha',
    name: 'Coxinha',
    description: 'Massa macia, casquinha crocante e recheio caprichado.',
    price: 'R$ 4,00',
    category: 'salgados',
    availability: 'ambos',
  },
  {
    id: 'enroladinho',
    name: 'Enroladinho',
    description: 'Salgado pratico, dourado e perfeito para qualquer hora.',
    price: 'R$ 4,00',
    category: 'salgados',
    availability: 'ambos',
  },
  {
    id: 'suco-goiaba-pequeno',
    name: 'Suco de Goiaba pequeno - copo',
    description: 'Vendido apenas para consumo no estabelecimento.',
    price: 'R$ 2,00',
    category: 'sucos',
    availability: 'presencial',
  },
  {
    id: 'suco-goiaba-grande',
    name: 'Suco de Goiaba grande - copo',
    description: 'Vendido apenas para consumo no estabelecimento.',
    price: 'R$ 4,00',
    category: 'sucos',
    availability: 'presencial',
  },
  {
    id: 'suco-maracuja-pequeno',
    name: 'Suco de Maracuja pequeno - copo',
    description: 'Vendido apenas para consumo no estabelecimento.',
    price: 'R$ 2,00',
    category: 'sucos',
    availability: 'presencial',
  },
  {
    id: 'suco-maracuja-grande',
    name: 'Suco de Maracuja grande - copo',
    description: 'Vendido apenas para consumo no estabelecimento.',
    price: 'R$ 4,00',
    category: 'sucos',
    availability: 'presencial',
  },
  {
    id: 'suco-natural-garrafinha-300ml',
    name: 'Suco Natural na Garrafinha 300 ml',
    description: 'Unica opcao de suco para delivery. Sabores: goiaba e maracuja.',
    price: 'R$ 4,00',
    category: 'sucos',
    availability: 'delivery',
    highlight: 'Delivery',
  },
]
