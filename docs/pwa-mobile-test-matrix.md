# MATRIZ DE COMPATIBILIDADE PWA E MOBILE - SALGADOS R

Esta matriz documenta compatibilidade prática. Ela não promete suporte absoluto a todo navegador ou dispositivo existente.

## Escopo validado localmente

| Dispositivo ou emulação | Sistema operacional | Navegador | Versão | Instalação direta | Instalação manual | Standalone | Resultado | Limitação encontrada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 320 x 568 | Emulação mobile | Chromium | Via Playwright/Chrome local | Detectada quando `beforeinstallprompt` existir | Modal de fallback | Simulado por CSS/media query | OK, sem overflow horizontal | Não substitui aparelho real |
| 360 x 640 | Emulação mobile | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, sem overflow horizontal | Não valida teclado nativo real |
| 375 x 667 | Emulação iPhone pequeno | Chromium | Via Playwright/Chrome local | Não aplicável para iOS real | Instruções iOS | Simulado | OK, sem overflow horizontal | Safari real precisa validação em aparelho |
| 375 x 812 | Emulação iPhone | Chromium | Via Playwright/Chrome local | Não aplicável para iOS real | Instruções iOS | Simulado | OK, screenshots de home/PWA/offline gerados | Notch/Dynamic Island só parcialmente simulado |
| 390 x 844 | Emulação iPhone | Chromium | Via Playwright/Chrome local | Não aplicável para iOS real | Instruções iOS | Simulado | OK, fallback de navegador interno validado | Safari real precisa validação |
| 393 x 873 | Emulação Android médio | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, sem overflow horizontal | Não valida Samsung Internet real |
| 412 x 915 | Emulação Android grande | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, sem overflow horizontal | Não valida WebView de fabricante |
| 430 x 932 | Emulação mobile grande | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, fallback sem prompt validado | Não valida barras inferiores reais |
| 768 x 1024 | Emulação tablet | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, estado de update PWA validado | iPad Safari real precisa validação |
| 800 x 1280 | Emulação tablet Android | Chromium | Via Playwright/Chrome local | Detectada quando elegível | Modal de fallback | Simulado | OK, sem overflow horizontal | Não valida Samsung/Lenovo real |
| 1024 x 1366 | Emulação iPad | Chromium | Via Playwright/Chrome local | Não aplicável para iOS real | Instruções iOS | Simulado | OK, sem overflow horizontal | Safari iPad real precisa validação |

## Matriz de navegadores-alvo

| Plataforma | Navegador | Instalação direta | Instalação manual | Standalone | Resultado esperado | Limitação |
| --- | --- | --- | --- | --- | --- | --- |
| Android | Google Chrome atualizado | Sim, quando elegível | Sim | Sim | Prompt nativo via `beforeinstallprompt` | Depende do navegador considerar a PWA instalável |
| Android | Microsoft Edge atualizado | Sim, quando elegível | Sim | Sim | Prompt nativo via `beforeinstallprompt` | Texto da barra do navegador não é controlado pelo site |
| Android | Samsung Internet atualizado | Variável | Sim | Sim | Fallback com instruções quando prompt não existir | Precisa validação em aparelho Samsung real |
| Android | WebViews, Instagram, Facebook, Gmail, apps de mensagem | Geralmente não | Abrir no Chrome/Edge/Safari | Variável | Mostra orientação para abrir em navegador compatível | WebViews podem bloquear instalação |
| iPhone | Safari | Não usa `beforeinstallprompt` | Compartilhar > Adicionar à Tela de Início | Sim | Modal com instruções iOS | Precisa validação em iPhone real |
| iPad | Safari | Não usa `beforeinstallprompt` | Compartilhar > Adicionar à Tela de Início | Sim | Modal com instruções iPad/iOS | Precisa validação em iPad real |
| Desktop | Chrome | Sim, quando elegível | Sim | Sim | Prompt nativo | Requer HTTPS ou localhost |
| Desktop | Edge | Sim, quando elegível | Sim | Sim | Prompt nativo | Requer HTTPS ou localhost |

## Casos de fallback

| Cenário | Resultado esperado |
| --- | --- |
| Service Worker indisponível | Site público continua utilizável online |
| PWA não suportada | Rodapé exibe instruções, sem bloquear uso |
| Usuário recusou prompt | Mensagem discreta na sessão, sem insistência automática |
| Aplicativo já instalado | Card mostra estado instalado e não força botão de instalar |
| Modo standalone | Card mostra aplicativo instalado ou pode ser ocultado futuramente |
| Offline | Página offline informa que pedido precisa de internet |
| Retorno da internet | Navegação volta a buscar rede normalmente |
| APIs privadas | Não entram em Cache Storage |
| Admin/login | Rotas excluídas da estratégia de cache de navegação pública |

## Evidências locais geradas

- Lighthouse 11 PWA: 100/100 em `screenshots/pwa-lighthouse/lighthouse-11-pwa-final.report.json`.
- Lighthouse 13 geral: Performance 85, Acessibilidade 95, Best Practices 100 e SEO 100 em `screenshots/pwa-lighthouse/lighthouse-13-general-final.report.json`.
- Responsividade: 64 combinações de viewport/zoom verificadas, com `overflow_failures=0`, em `screenshots/home-scale-final/overflow-results.json`.
- Screenshots locais de home, estados de instalação, iOS, navegador interno, fallback sem suporte, atualização PWA e offline foram gerados em `screenshots/`.

Os arquivos de evidência ficam fora do commit por serem artefatos de validação local.

## Pendências para homologação em aparelho real

- Chrome Android em Samsung, Motorola e Xiaomi/Redmi.
- Microsoft Edge Android atualizado.
- Samsung Internet atualizado.
- Safari iPhone com Adicionar à Tela de Início.
- Safari iPad em retrato e paisagem.
- Modo standalone real no iOS.
- Navegadores internos de Instagram, Facebook, Gmail e apps de mensagem.
- Teclado virtual real aberto em carrinho e checkout.
- Rotação física de tela.
- Perda e retorno real de internet móvel.
