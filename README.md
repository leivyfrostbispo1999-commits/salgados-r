# SALGADOS R

Site de vendas para a SALGADOS R, criado com React, TypeScript, Vite, Tailwind CSS e Docker.

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

## Deploy atual

O deploy inicial usa Nginx como proxy reverso na VM Oracle Cloud:

```text
http://137.131.223.147 -> http://127.0.0.1:3000
```

HTTPS sera configurado depois, quando houver dominio apontado para o IP publico.

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
