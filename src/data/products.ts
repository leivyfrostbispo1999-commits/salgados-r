export type ProductCategory = 'pasteis' | 'salgados' | 'sucos'

export type Product = {
  id: string
  name: string
  description: string
  price: string
  category: ProductCategory
  highlight?: string
}

export const products: Product[] = [
  {
    id: 'pastel-carne',
    name: 'Pastel de Carne',
    description: 'Pastel crocante com recheio de carne bem temperada.',
    price: 'R$ 5,00',
    category: 'pasteis',
  },
  {
    id: 'pastel-frango',
    name: 'Pastel de Frango',
    description: 'Frango suculento em massa sequinha e dourada.',
    price: 'R$ 5,00',
    category: 'pasteis',
  },
  {
    id: 'pastel-misto',
    name: 'Pastel Misto',
    description: 'Queijo com presunto em uma combinacao classica.',
    price: 'R$ 5,00',
    category: 'pasteis',
  },
  {
    id: 'pastel-calabresa-queijo',
    name: 'Pastel de Calabresa com Queijo',
    description: 'Calabresa marcante com queijo derretido.',
    price: 'R$ 6,00',
    category: 'pasteis',
    highlight: 'Mais pedido',
  },
  {
    id: 'pastel-frango-queijo',
    name: 'Pastel de Frango com Queijo',
    description: 'Frango temperado com queijo cremoso.',
    price: 'R$ 7,00',
    category: 'pasteis',
  },
  {
    id: 'coxinha',
    name: 'Coxinha',
    description: 'Massa macia, casquinha crocante e recheio caprichado.',
    price: 'R$ 4,00',
    category: 'salgados',
  },
  {
    id: 'enroladinho',
    name: 'Enroladinho',
    description: 'Salgado pratico, dourado e perfeito para qualquer hora.',
    price: 'R$ 4,00',
    category: 'salgados',
  },
  {
    id: 'suco-maracuja-pequeno',
    name: 'Suco de Maracuja - Copo pequeno',
    description: 'Suco gelado, refrescante e no ponto certo.',
    price: 'R$ 2,00',
    category: 'sucos',
  },
  {
    id: 'suco-maracuja-grande',
    name: 'Suco de Maracuja - Copo grande',
    description: 'Mais refresco para acompanhar seu pedido.',
    price: 'R$ 4,00',
    category: 'sucos',
  },
  {
    id: 'suco-goiaba-pequeno',
    name: 'Suco de Goiaba - Copo pequeno',
    description: 'Sabor de fruta, gelado e leve.',
    price: 'R$ 2,00',
    category: 'sucos',
  },
  {
    id: 'suco-goiaba-grande',
    name: 'Suco de Goiaba - Copo grande',
    description: 'Copo grande para completar o lanche.',
    price: 'R$ 4,00',
    category: 'sucos',
  },
]
