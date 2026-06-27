# Roteiro — CI/CD por SSH para qualquer projeto na VPS

Como ligar deploy automático (push na `main` → atualiza na VPS) em **qualquer** projeto,
reaproveitando a mesma infra. Pensado pra org **Hype-Gaming**, onde **Deploy keys está bloqueada**.

## As 2 chaves/credenciais (não confundir)

| Finalidade | O quê | Onde fica |
|---|---|---|
| **Actions → VPS** | chave SSH (o runner entra na VPS) | privada no Secret `VPS_SSH_KEY`; pública no `~/.ssh/authorized_keys` da VPS |
| **VPS → GitHub** | **PAT** (a VPS puxa o repo privado) | salvo na VPS (`~/.git-credentials`) |

> "Deploy keys" (a página em Settings do repo) está **desabilitada pela org** → não é usada aqui.
> Por isso o VPS→GitHub usa **PAT**, não deploy key.

---

## Parte 1 — Chave Actions→VPS (faz UMA vez, reutiliza em todos)

Como é tudo a mesma VPS/usuário (`root`), **uma chave só** serve pra todos os projetos.

No seu PC (Git Bash ou PowerShell com OpenSSH):
```bash
ssh-keygen -t ed25519 -C "github-actions-vps" -f gha_vps -N ""
```
- **Pública** (`gha_vps.pub`) → adicionar **uma vez** no `~/.ssh/authorized_keys` da VPS:
  ```bash
  # na VPS:
  echo "<conteudo de gha_vps.pub>" >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  ```
- **Privada** (`gha_vps`) → vai no Secret `VPS_SSH_KEY` de **cada** repo (mesma chave em todos).
  - Copiar pro clipboard: PowerShell `Get-Content gha_vps -Raw | Set-Clipboard` · Git Bash `cat gha_vps | clip`

> Mais isolamento (opcional): gerar uma chave por projeto. Como todas dão acesso ao mesmo `root`,
> na prática uma compartilhada é o suficiente e bem mais simples de manter.

---

## Parte 2 — PAT pra VPS puxar repos privados (faz UMA vez)

1. GitHub → (sua conta) **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate**.
   - **Resource owner:** Hype-Gaming
   - **Repository access:** All repositories (ou só os que vão ter deploy)
   - **Permissions → Repository → Contents: Read-only**
   - Gere e **copie o token** (`github_pat_...`).
   - ⚠️ A org pode exigir aprovação de um owner pra fine-grained token. Se bloquear, use um
     **classic token** com escopo `repo` (read).
2. Na VPS, salva o token pra TODOS os `git fetch` HTTPS do github.com:
   ```bash
   git config --global credential.helper store
   echo "https://x-access-token:<PAT>@github.com" > ~/.git-credentials
   chmod 600 ~/.git-credentials
   ```
   A partir daí qualquer `git clone/fetch https://github.com/Hype-Gaming/...` autentica sozinho.

---

## Parte 3 — Por projeto (repete pra cada repo)

### 3.1 Workflow
Crie `.github/workflows/deploy.yml` no repo (ajuste os comandos de build/reload pro stack do projeto):
```yaml
name: Deploy (VPS)
on:
  push:
    branches: [main]
  workflow_dispatch:
concurrency:
  group: deploy-${{ github.repository }}
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || '22' }}
          script: |
            set -e
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
            cd "${{ secrets.VPS_PATH }}"
            git fetch origin main
            git reset --hard origin/main
            npm ci
            npm run build
            pm2 reload <NOME_OU_ECOSYSTEM> --update-env   # ajuste por projeto
            pm2 save
```
- Apps Nuxt/Node com ecosystem: `pm2 reload ecosystem.<marca>.config.cjs --update-env`
  (nome do arquivo **precisa** terminar em `.config.cjs`).
- Apps sem build (ex.: front estático): troque/remova `npm run build` conforme o caso.
- Se o app não tem ecosystem e roda por nome: `pm2 reload <nome-do-app>`.

### 3.2 Secrets (Settings → Secrets and variables → **Actions**)

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP da VPS (igual pra todos) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | privada `gha_vps` (a MESMA em todos) |
| `VPS_PORT` | `22` |
| `VPS_PATH` | caminho do projeto na VPS (ex.: `/var/www/<projeto>`) |

> ⚠️ É **Secrets**, não "Deploy keys". Páginas diferentes.

### 3.3 Preparar a VPS (1ª vez do projeto)
```bash
cd /var/www/<projeto>
git clone https://github.com/Hype-Gaming/<repo>.git .   # autentica via PAT da Parte 2
# ... configurar .env, build, pm2 start ...
```

### 3.4 Testar
**Actions → Deploy (VPS) → Run workflow**. Se conectar e atualizar, está pronto: todo push na `main` reimplanta.

---

## Checklist (por projeto)

- [ ] Workflow `deploy.yml` com o comando de reload certo do projeto
- [ ] 5 secrets cadastrados (SSH key = a compartilhada)
- [ ] VPS tem o repo em `VPS_PATH` com remote HTTPS (PAT autenticando)
- [ ] `Run workflow` manual OK
- [ ] Push na `main` dispara e o app continua online

## Erros comuns

- **`Permission denied (publickey)` no SSH do Actions** → a pública `gha_vps.pub` não está no
  `authorized_keys` da VPS, ou o Secret `VPS_SSH_KEY` está com a chave errada/incompleta.
- **`Authentication failed` / pede usuário no `git fetch`** → PAT da Parte 2 não configurado (ou expirou).
- **`pm2 reload` cria processo duplicado** → o nome no comando não bate com o app existente, ou o
  arquivo ecosystem não termina em `.config.cjs`.
- **Deploy keys bloqueada** → normal nesta org; não use deploy key, use o PAT.
