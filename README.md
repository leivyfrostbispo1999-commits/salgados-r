# SALGADOS R

Site de vendas para a SALGADOS R, criado com React, TypeScript, Vite, Tailwind CSS e Docker.

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

O numero usado em `src/utils/whatsapp.ts` e temporario:

```text
5500000000000
```

Troque pelo numero oficial antes de divulgar o site.
