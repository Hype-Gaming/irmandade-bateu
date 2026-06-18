# CI/CD — Deploy automático na VPS (GitHub Actions)

Tutorial para deploy automático do Irmandade na VPS **sem quebrar o projeto que já está rodando**.
Estratégia: a cada `push` na `main`, o GitHub Actions entra na VPS por SSH, atualiza o código,
faz build e dá `pm2 reload` (zero-downtime).

> Pré-requisito: o projeto **já está na VPS** rodando com PM2 (`ecosystem.config.cjs`, app `irmandade`,
> porta `3099`) e com o `.env` configurado lá. O `.env` está no `.gitignore`, então o deploy **não** o apaga.

---

## 1. Subir o projeto para o GitHub (ainda não há remote)

No seu PC, na pasta do projeto:

```bash
# crie o repo no github.com (privado) e copie a URL, depois:
git remote add origin git@github.com:SEU_USUARIO/irmandade.git
git push -u origin feat/painel-admin      # ou a branch que você usa
# quando for promover pra produção:
git checkout -b main && git push -u origin main
```

O deploy só dispara em push na **main**. Trabalhe em branches e só suba pra `main` o que vai pra produção.

---

## 2. Gerar uma chave SSH só pro deploy

No seu PC (ou em qualquer máquina):

```bash
ssh-keygen -t ed25519 -C "github-deploy-irmandade" -f deploy_key -N ""
# gera 2 arquivos: deploy_key (privada) e deploy_key.pub (pública)
```

Na **VPS**, autorize a chave pública:

```bash
# logado na VPS, com o MESMO usuário que roda o PM2:
cat deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

> ⚠️ Use o mesmo usuário que já roda o `pm2` (rode `pm2 list` com ele). Se o PM2 está no `root`,
> a chave vai no `/root/.ssh/authorized_keys` e `VPS_USER=root`.

---

## 3. Cadastrar os Secrets no GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor | Exemplo |
|---|---|---|
| `VPS_HOST` | IP/domínio da VPS | `123.45.67.89` |
| `VPS_USER` | usuário SSH (o que roda o PM2) | `root` |
| `VPS_SSH_KEY` | **conteúdo** do arquivo `deploy_key` (a chave **privada**, inteira) | `-----BEGIN OPENSSH...` |
| `VPS_PORT` | porta SSH (opcional, default 22) | `22` |
| `VPS_PATH` | caminho do projeto na VPS | `/var/www/irmandade` |

Para descobrir o `VPS_PATH`, na VPS rode `pm2 info irmandade` e veja o campo `cwd` (ou `exec cwd`).

---

## 4. O workflow

Já está criado em [.github/workflows/deploy.yml](../.github/workflows/deploy.yml). Resumo do que ele faz na VPS:

```
cd $VPS_PATH
git fetch origin main && git reset --hard origin/main   # estado limpo, sem conflito
npm ci                                                   # install reproduzível (usa package-lock)
npm run build                                            # update-version.js + nuxt build
pm2 reload ecosystem.config.cjs --update-env             # reload sem downtime, relê o .env
pm2 save
```

Por que `git reset --hard` e não `git pull`: evita o deploy quebrar se houver qualquer alteração
manual não commitada na VPS. O `.env` é untracked e gitignored → **não é afetado**.

---

## 5. Primeiro deploy (com cuidado, projeto está no ar)

1. Garanta que o repositório clonado **na VPS** é o mesmo do GitHub e está no `$VPS_PATH`:
   ```bash
   cd /var/www/irmandade
   git remote -v          # deve apontar pro mesmo repo do GitHub
   git remote add origin git@github.com:SEU_USUARIO/irmandade.git   # se faltar
   git fetch origin
   ```
   Se a VPS ainda não tem o repo git (só os arquivos), inicialize: `git init && git remote add origin ... && git fetch && git reset --hard origin/main`.
2. **Teste manual primeiro:** aba **Actions → Deploy (VPS) → Run workflow** (o `workflow_dispatch`).
   Acompanhe os logs. Só depois confie no gatilho automático por push.
3. Confirme que subiu: `pm2 list` (status `online`), `pm2 logs irmandade --lines 50`, e abra o site.

---

## 6. Se o node/npm/pm2 for via nvm

Se na VPS o node está sob `nvm`, o PATH do SSH não-interativo pode não achar o `node`. Troque o
bloco de PATH no workflow por:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

---

## 7. Rollback rápido

Se um deploy quebrar:

```bash
cd $VPS_PATH
git reset --hard <hash-do-commit-anterior>
npm ci && npm run build
pm2 reload ecosystem.config.cjs --update-env
```

Para achar o hash anterior: `git log --oneline -5`.

---

## Checklist

- [ ] Repo no GitHub + `main` criada
- [ ] Chave SSH gerada e pública no `authorized_keys` da VPS (usuário do PM2)
- [ ] 5 secrets cadastrados (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_PATH`)
- [ ] Repo da VPS aponta pro mesmo GitHub e está em `$VPS_PATH`
- [ ] Primeiro deploy via **Run workflow** (manual) OK
- [ ] Push na `main` dispara e o site continua no ar
