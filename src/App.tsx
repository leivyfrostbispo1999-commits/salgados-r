import { OfficialMenuPage } from './components/OfficialMenuPage'
import { OperationsSuite } from './components/OperationsSuite'
import { PublicHome } from './components/PublicHome'
import { PublicOrderFlow } from './components/PublicOrderFlow'

function App() {
  const path = window.location.pathname

  if (path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/sistema')) {
    return <OperationsSuite />
  }

  if (path.startsWith('/cardapio-oficial')) {
    return <OfficialMenuPage />
  }

  if (path.startsWith('/cardapio') || path.startsWith('/carrinho') || path.startsWith('/checkout') || path.startsWith('/pedido')) {
    return <PublicOrderFlow />
  }

  return <PublicHome />
}

export default App
