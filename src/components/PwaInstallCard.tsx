import { useEffect, useRef } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'

const dialogText = {
  ios: {
    title: 'INSTALAR NO IPHONE OU IPAD',
    body: [
      'ABRA O SITE NO SAFARI.',
      'TOQUE EM COMPARTILHAR.',
      'ESCOLHA ADICIONAR À TELA DE INÍCIO.',
      'CONFIRME EM ADICIONAR.',
    ],
  },
  unsupported: {
    title: 'INSTALAÇÃO MANUAL',
    body: [
      'USE O MENU DO NAVEGADOR.',
      'ESCOLHA INSTALAR APLICATIVO OU ADICIONAR À TELA INICIAL.',
      'O SITE CONTINUA FUNCIONANDO MESMO SEM INSTALAÇÃO.',
    ],
  },
  'internal-browser': {
    title: 'ABRA NO NAVEGADOR',
    body: [
      'PARA INSTALAR O SALGADOS R, ABRA ESTE SITE NO CHROME, SAFARI OU EDGE.',
      'NAVEGADORES INTERNOS DE APPS PODEM BLOQUEAR A INSTALAÇÃO.',
    ],
  },
} as const

export function PwaInstallCard() {
  const {
    activateUpdate,
    canInstall,
    dialog,
    install,
    isInstalled,
    isInInternalBrowser,
    isIos,
    isOnline,
    isStandalone,
    message,
    openInstructions,
    setDialog,
    updateAvailable,
  } = usePwaInstall()

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!dialog) return

    closeButtonRef.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setDialog(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [dialog, setDialog])

  const installed = isInstalled || isStandalone
  const buttonLabel = canInstall ? 'INSTALAR APLICATIVO' : isIos ? 'VER COMO INSTALAR' : 'INSTRUÇÕES DE INSTALAÇÃO'
  const body =
    installed
      ? 'APLICATIVO INSTALADO E PRONTO PARA USAR.'
      : isInInternalBrowser
        ? 'ABRA NO CHROME, SAFARI OU EDGE PARA INSTALAR.'
        : 'TENHA O CARDÁPIO E OS PEDIDOS SEMPRE À MÃO.'

  return (
    <section className="sr-pwa-card" aria-label="Instalar aplicativo SALGADOS R">
      <div className="sr-pwa-card-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M10 6h4" />
          <path d="M11 18h2" />
        </svg>
      </div>
      <div className="sr-pwa-card-copy">
        <p>SALGADOS R NO SEU CELULAR</p>
        <strong>{installed ? 'APLICATIVO INSTALADO' : 'INSTALE O SALGADOS R'}</strong>
        <span>{body}</span>
        {!isOnline ? <small>VOCÊ ESTÁ SEM INTERNET. CONECTE-SE PARA FINALIZAR PEDIDOS.</small> : null}
        {message ? <small>{message}</small> : null}
      </div>

      {!installed ? (
        <button
          type="button"
          className="sr-pwa-install-button"
          onClick={canInstall ? install : openInstructions}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
      ) : null}

      {updateAvailable ? (
        <button
          type="button"
          className="sr-pwa-update-button"
          onClick={activateUpdate}
          aria-label="Atualizar aplicativo SALGADOS R"
        >
          ATUALIZAR AGORA
        </button>
      ) : null}

      {dialog ? (
        <div className="sr-pwa-dialog-backdrop" role="presentation" onClick={() => setDialog(null)}>
          <div
            className="sr-pwa-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sr-pwa-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              ref={closeButtonRef}
              className="sr-pwa-dialog-close"
              onClick={() => setDialog(null)}
              aria-label="Fechar instruções de instalação"
            >
              X
            </button>
            <p id="sr-pwa-dialog-title">{dialogText[dialog].title}</p>
            <ol>
              {dialogText[dialog].body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  )
}
