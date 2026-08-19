# CI/CD — deploy automático por push na `main`

Workflow: [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml).

Todo push na `main` (ou disparo manual em **Actions → Run workflow**) faz o runner
entrar na VPS por SSH, atualizar o código, buildar e dar `pm2 reload` — sem downtime.

```
cd $VPS_PATH
git fetch origin main && git reset --hard origin/main
npm ci
npm run build
pm2 reload ecosystem.bateu.config.cjs --update-env
pm2 save
```

`git reset --hard` em vez de `git pull`: qualquer alteração manual feita na VPS
não trava o deploy. O `.env` é untracked e gitignored, então **não é tocado**.

Um `concurrency group` impede dois deploys simultâneos.

## As duas credenciais (não confundir)

| Direção | O quê | Onde fica |
|---|---|---|
| **Actions → VPS** | chave SSH | privada no secret `VPS_SSH_KEY`; pública no `~/.ssh/authorized_keys` da VPS |
| **VPS → GitHub** | **PAT** | salvo na VPS em `~/.git-credentials` |

> "Deploy keys" (página em Settings do repo) está **desabilitada pela org
> Hype-Gaming**. É por isso que o VPS→GitHub usa PAT, e não deploy key.

## Parte 1 — chave Actions→VPS (uma vez para todos os projetos)

```bash
ssh-keygen -t ed25519 -C "github-actions-vps" -f gha_vps -N ""
```

- Pública (`gha_vps.pub`) → no `~/.ssh/authorized_keys` da VPS, **do mesmo usuário
  que roda o PM2** (confirme com `pm2 list`):
  ```bash
  echo "<conteudo de gha_vps.pub>" >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  ```
- Privada (`gha_vps`) → secret `VPS_SSH_KEY` de cada repo (a mesma em todos).
  Copiar: PowerShell `Get-Content gha_vps -Raw | Set-Clipboard` · Git Bash `cat gha_vps | clip`.

## Parte 2 — PAT para a VPS puxar repos privados (uma vez)

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained**:

- Resource owner: `Hype-Gaming`
- Repository access: os repos com deploy
- Permissions → Repository → **Contents: Read-only**

Se a org exigir aprovação e travar, use um **classic token** com escopo `repo` (read).

Na VPS:

```bash
git config --global credential.helper store
echo "https://x-access-token:<PAT>@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
```

A partir daí qualquer `git fetch https://github.com/Hype-Gaming/...` autentica sozinho.

## Parte 3 — secrets do repositório

Settings → Secrets and variables → **Actions** (é "Secrets", não "Deploy keys"):

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP/domínio da VPS |
| `VPS_USER` | usuário SSH que roda o PM2 (ex.: `root`) |
| `VPS_SSH_KEY` | conteúdo **inteiro** da chave privada `gha_vps` |
| `VPS_PORT` | porta SSH (opcional, default `22`) |
| `VPS_PATH` | caminho do clone na VPS (ex.: `/var/www/clube-da-bb`) |

`VPS_PATH` sai de `pm2 info bateu`, campo `cwd`.

## Replicar em outro projeto

Copie o `deploy.yml`, ajustando só a linha do reload:

- Nuxt/Node com ecosystem: `pm2 reload ecosystem.<marca>.config.cjs --update-env`
  (o arquivo **precisa** terminar em `.config.cjs`).
- App sem build: remova o `npm run build`.
- App que roda por nome: `pm2 reload <nome-do-app>`.

Se o Node está sob `nvm`, mantenha o bloco que carrega o `nvm.sh` — SSH
não-interativo não acha o `node` sem ele.

## Rollback

```bash
cd $VPS_PATH
git log --oneline -5
git reset --hard <hash-anterior>
npm ci && npm run build
pm2 reload ecosystem.bateu.config.cjs --update-env
```

## Checklist

- [ ] `deploy.yml` com o comando de reload correto
- [ ] 5 secrets cadastrados
- [ ] pública no `authorized_keys` do usuário do PM2
- [ ] VPS com o repo em `VPS_PATH` e remote HTTPS autenticando pelo PAT
- [ ] primeiro deploy via **Run workflow** manual
- [ ] push na `main` dispara e o app continua online

## Erros comuns

| Erro | Causa |
|---|---|
| `Permission denied (publickey)` | pública fora do `authorized_keys`, ou `VPS_SSH_KEY` incompleta |
| `Authentication failed` no `git fetch` | PAT não configurado ou expirado na VPS |
| `pm2 reload` cria processo duplicado | nome errado, ou ecosystem sem sufixo `.config.cjs` |
| Deploy keys bloqueada | esperado nesta org — use o PAT |
| `502 Bad Gateway` | veja se `bateu` está `online` e se `curl -I http://127.0.0.1:3110` responde |
