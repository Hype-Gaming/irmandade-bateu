# .github/workflows/

| Workflow | Gatilho | O que faz |
|---|---|---|
| `deploy.yml` | push na `main` ou `workflow_dispatch` | entra na VPS por SSH, atualiza, builda e recarrega o PM2 |

```
git fetch origin main && git reset --hard origin/main
npm ci
npm run build
pm2 reload ecosystem.bateu.config.cjs --update-env
pm2 save
```

## Pontos que já custaram deploy quebrado

- **`git reset --hard`, não `git pull`** — alteração manual na VPS não trava o
  deploy. O `.env` é untracked e gitignored, então sobrevive.
- **O bloco do `nvm`** carrega `nvm.sh` antes de tudo: SSH não-interativo não
  encontra `node`/`npm`/`pm2` sem ele.
- **`concurrency`** impede dois deploys simultâneos se pisarem.
- **Recarrega só o ecosystem da Bateu** (app `bateu`, porta 3110). A mesma VPS
  roda o Irmandade (porta 3099) — recarregar o ecosystem errado derruba o vizinho.

Secrets necessários: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (opcional),
`VPS_PATH`. Em **Settings → Secrets and variables → Actions** — não em "Deploy
keys", que está desabilitada pela org.

Detalhes: [docs/operacao/ci-cd.md](../../docs/operacao/ci-cd.md).
