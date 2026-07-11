# SALGADOS R

Site de vendas para a SALGADOS R, criado com React, TypeScript, Vite, Tailwind CSS e Docker.

Agora o projeto tambem inclui uma primeira versao full-stack:

- Backend Node/Express com banco PostgreSQL.
- Login com perfis `SUPER_US`, `ADMIN`, `GERENTE` e `ATENDENTE`.
- API de produtos, pedidos, cozinha, estoque, relatorios, financeiro, impressao mock, auditoria, seguranca e fidelidade.
- Aba de maturidade operacional inspirada no projeto Acai Olimpo, com status real dos modulos e proximos passos.
- Home publica separada do painel administrativo.
- PWA com manifest e service worker.
- Docker Compose com servicos separados para `web` e `api`.

## Regras do cardapio

- Pasteis e salgados podem ser vendidos no estabelecimento e por delivery.
- Sucos de copo de R$ 2,00 e R$ 4,00 sao somente para consumo no estabelecimento.
- Para delivery de sucos, a opcao disponivel e Suco Natural na Garrafinha 300 ml por R$ 4,00.
- Refil de sucos: R$ 1,00 a cada 100 ml, valido para qualquer garrafa.
- O cliente pode devolver a garrafinha da casa ou levar sua propria garrafa.

## Desenvolvimento local

```bash
npm install
npm run dev
```

A aplicacao abre em:

```text
http://localhost:3000
```

Em outro terminal, suba a API:

```bash
npm run dev:api
```

API local:

```text
http://localhost:3001/api/health
```

Para desenvolvimento local da API, configure um PostgreSQL e defina `PGHOST`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`.

## Build

```bash
npm run build
```

## Docker

```bash
docker compose up -d --build
```

O container publica a aplicacao na porta:

```text
http://localhost:3000
```

A API roda no servico `salgados-r-api` e fica disponivel pelo proxy:

```text
http://localhost:3000/api/health
```

No primeiro acesso ao painel, a tela de bootstrap cria o primeiro usuario `SUPER_US`. Depois disso, o painel exige login.

## Rotas principais

Publico:

```text
/
/pedido
/checkout
```

Administrativo:

```text
/admin
/admin/dashboard
/admin/pedidos
/admin/produtos
/admin/estoque
/admin/clientes
/admin/financeiro
/admin/relatorios
/admin/cozinha
/admin/auditoria
/admin/seguranca
```

API:

```text
/api/auth
/api/products
/api/orders
/api/customers
/api/inventory
/api/finance
/api/reports
/api/printing
/api/audit-logs
/api/notifications
/api/backups
/api/security
```

## Backup

Base local para backup PostgreSQL:

```bash
BACKUP_DIR=/opt/salgados-r/backups ./scripts/backup-postgres.sh
```

Retencao padrao: 7 dias. Restauracao:

```bash
gunzip -c /opt/salgados-r/backups/arquivo.sql.gz | psql -h HOST -U USUARIO BANCO
```

Integracoes futuras com Google Drive ou Oracle Object Storage dependem de credenciais:

```text
BACKUP_PROVIDER=local|oracle|google_drive
ORACLE_BUCKET_NAME=
GOOGLE_DRIVE_FOLDER_ID=
```

## Integracoes pendentes

- Impressora termica: a API possui fila e modo mock, mas o agente local/Windows ainda precisa ser configurado.
- PIX automatico: base manual criada; Mercado Pago, Asaas, PagSeguro ou Efi dependem de credenciais reais.
- Google Maps/entrega: modulo preparado, mas depende do endereco real da loja e bairros atendidos.
- Dominio `.com.br`: depende de compra/apontamento DNS externo.

## Comparativo com o padrao Acai Olimpo

O PDF do Acai Olimpo foi usado como referencia de maturidade, nao como guia visual. As cores, a marca e a tipografia da SALGADOS R permanecem as atuais.

Ja esta implementado:

- Site publico com cardapio, carrinho, checkout, WhatsApp e PWA.
- Backend Node/Express com PostgreSQL.
- Login com perfis `SUPER_US`, `ADMIN`, `GERENTE` e `ATENDENTE`.
- Pedidos gravados no banco, numero de pedido, cliente, itens, pagamento e status.
- Painel de pedidos e cozinha.
- Produtos, categorias, disponibilidade, destaque e regra presencial/delivery.
- Clientes por telefone, historico, gasto total e pontos.
- Estoque com minimo, alerta e movimentacao.
- Financeiro com caixa, entradas, saidas, despesas e resumo por forma de pagamento.
- Auditoria, rate limit de login, headers de seguranca e status de seguranca.
- Fila de impressao em modo mock.
- Script de backup PostgreSQL.

Ainda falta para chegar ao mesmo nivel operacional completo:

- Agente local de impressao instalado na maquina da loja e conectado a impressora termica.
- Backup agendado via cron na VM e opcionalmente copia externa.
- Tela completa de usuarios, troca de senha e administracao de permissoes.
- Upload de imagens pelo painel.
- Ficha tecnica para baixa automatica de estoque por produto vendido.
- Painel de entregador, zonas de entrega e taxas por bairro.
- PIX automatico com provedor real.
- Notificacoes push reais no PWA.
- Testes automatizados de API, painel e fluxo de pedido.
- Dominio proprio `.com.br` quando for comprado.

## Deploy atual

O deploy inicial usa Nginx como proxy reverso na VM Oracle Cloud:

```text
https://salgadosr.duckdns.org -> http://127.0.0.1:3000
```

HTTPS esta ativo com Let's Encrypt no dominio DuckDNS.

## Roadmap por fases

Fase 1:
- Dominio e HTTPS quando houver dominio.
- SEO basico, Open Graph, PWA e acabamento visual.

Fase 2:
- Backend com PostgreSQL.
- Login por perfil.
- Painel administrativo de produtos.

Fase 3:
- Pedidos pelo site.
- Painel da cozinha.
- Base para impressao automatica.

Fase 4:
- Estoque.
- Relatorios.
- Movimentos financeiros por pedido.

Fase 5:
- PWA.
- Pontos de fidelidade por telefone.
- Base de dados para recomendacoes e automacoes futuras.

## WhatsApp

O numero usado em `src/utils/whatsapp.ts` e o WhatsApp oficial da SALGADOS R:

```text
5571997021801
```

Formato base dos links:

```text
https://wa.me/5571997021801
```

As mensagens de pedido incluem produto, preco e quantidade.
