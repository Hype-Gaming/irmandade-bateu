# Clube da BB

App Nuxt 4 (SPA + PWA) que junta, num só lugar: minicurso e conteúdo de gestão de
banca, acesso pago por assinatura e abertura de jogos ao vivo da casa de apostas —
com painel administrativo próprio.

**Produção:** https://app.clubdabb2.online

## Stack

| Camada | O quê |
|---|---|
| Front | Nuxt 4.2 (`ssr: false`), Vue 3.5, `@nuxt/icon`, FontAwesome, maska |
| Server | Nitro (rotas em `server/api`), MongoDB 7, `web-push` |
| Infra | PM2 (`bateu`, porta 3110) atrás do Nginx, deploy por GitHub Actions |
| Externos | API Cactus (casas), Lastlink (pagamento), catalogador de resultados |

## Rodar localmente

```bash
npm install
cp .env.example .env     # se não existir, veja docs/configuracao.md
npm run dev              # http://localhost:3000
```

`MONGODB_URI` e `MONGODB_DB` são obrigatórias: sem elas qualquer rota que toque o
banco falha na hora, de propósito.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | grava `public/version.json` (`update-version.js`) e builda o Nuxt |
| `npm start` | sobe o build em `PORT=3110` |
| `npm run preview` | preview do build |
| `npm run version` | só regrava `public/version.json` |

## Estrutura

Cada diretório tem um `README.md` explicando o que vive ali.

| Diretório | Conteúdo |
|---|---|
| [app/](app/) | tudo que roda no browser: páginas, componentes, composables, middleware |
| [server/](server/) | rotas Nitro, utilitários de servidor e o agendador de push |
| [shared/](shared/) | constantes importáveis pelo client **e** pelo server |
| [public/](public/) | estáticos servidos na raiz: PWA, service worker, imagens |
| [scripts/](scripts/) | scripts avulsos de operação e migração (fora do build) |
| [deploy/](deploy/) | configuração do Nginx |
| [.github/](.github/) | workflow de deploy |
| [docs/](docs/) | documentação do projeto |

Arquivos de configuração na raiz: `nuxt.config.ts`, `ecosystem.config.cjs`
(app `irmandade`, porta 3099), `ecosystem.bateu.config.cjs` (app `bateu`,
porta 3110), `update-version.js`.

## Documentação

Índice completo em [docs/README.md](docs/README.md). Atalhos:

- **Entender o sistema** → [docs/arquitetura.md](docs/arquitetura.md)
- **Configurar o `.env`** → [docs/configuracao.md](docs/configuracao.md)
- **Ver as collections** → [docs/banco-de-dados.md](docs/banco-de-dados.md)
- **Consultar a API** → [docs/api/README.md](docs/api/README.md)
- **Publicar** → [docs/operacao/deploy-vps.md](docs/operacao/deploy-vps.md) · [docs/operacao/ci-cd.md](docs/operacao/ci-cd.md)
- **Algo quebrou** → [docs/operacao/troubleshooting.md](docs/operacao/troubleshooting.md)

## Deploy

Push na `main` dispara o [workflow](.github/workflows/deploy.yml): SSH na VPS,
`git reset --hard`, `npm ci`, `npm run build`, `pm2 reload` — sem downtime.
Detalhes e secrets em [docs/operacao/ci-cd.md](docs/operacao/ci-cd.md).

## Convenções

- **Nada de segredo no repositório.** `.env`, chaves de deploy e `*.pem` são
  gitignored. `runtimeConfig.public` só carrega o que pode chegar ao browser.
- **E-mail em minúsculas é a chave** de tudo no banco.
- **`shared/` para o que muda entre marcas**, `app/constants/` para conteúdo
  editável (aulas, jogos).
- **Comentários explicam o porquê.** Vários registram armadilhas reais já
  pagas (Nuxt 4 ignora `app.html`, `require` no bundle do Mongo, `ignore` no
  Windows). Preserve-os ao refatorar.
