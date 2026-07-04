# SALGADOS R

Site de vendas para a SALGADOS R, criado com React, TypeScript, Vite, Tailwind CSS e Docker.

Agora o projeto tambem inclui uma primeira versao full-stack:

- Backend Node/Express com banco SQLite.
- API de produtos, pedidos, cozinha, estoque, relatorios e fidelidade.
- Painel operacional no proprio site.
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

## Deploy atual

O deploy inicial usa Nginx como proxy reverso na VM Oracle Cloud:

```text
http://137.131.223.147 -> http://127.0.0.1:3000
```

HTTPS sera configurado depois, quando houver dominio apontado para o IP publico.

## Roadmap por fases

Fase 1:
- Dominio e HTTPS quando houver dominio.
- SEO basico, Open Graph, PWA e acabamento visual.

Fase 2:
- Backend com SQLite.
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
