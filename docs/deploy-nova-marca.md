# Playbook — Novo deploy de marca (mesmo código)

Como subir uma **3ª instância** do mesmo código (Irmandade → Bateu → **Rainha da Bet**),
trocando só parâmetros por env + 2 ajustes de código. Identidade visual continua a mesma
(textos "Irmandade Club" na tela); só os parâmetros internos mudam por marca.

> Exemplo usado aqui: **Rainha da Bet**. Substitua os valores `<...>` pelos da marca.

---

## 0. Decisões / valores a coletar ANTES

| Item | Exemplo (Rainha) | Onde conseguir |
|---|---|---|
| `slug` da casa | `rainha` | padrão interno (kebab-case) |
| Nome exibido | `Rainha da Bet` | nome da casa de apostas |
| `baseDomain` | `<bet.br>` | conta Cactus/grupoautoma da casa |
| `apiBaseUrl` | `https://routes-eb.grupoautoma.com` | normalmente o mesmo das outras |
| `userCollection` | `<users_rb>` | conta Cactus da casa |
| `affiliateUrl` | `<https://go.aff.rainha...>` | link de cadastro/afiliado da casa |
| Banco Mongo | `rainha-hyper` | criar com as collections (ver passo 3) |
| Porta livre na VPS | `<3111>` | `ss -ltnp` na VPS (não repetir 3099/3110/etc.) |
| Domínio | `<app.rainhadabet.com>` | seu provedor de DNS |
| Repo GitHub | `Hype-Gaming/rainha-bet` | criar novo repo |

⚠️ Os valores da casa (`baseDomain`, `userCollection`, `affiliateUrl`) vêm do backend Cactus —
**não invente**. Sem eles o login da marca não funciona.

---

## 1. Código — registrar a marca (2 arquivos)

### 1a. `shared/brands.ts` — adicionar a entrada
```ts
export const BRANDS: BrandConfig[] = [
  { slug: 'esportiva', name: 'Esportiva', /* ... */ },
  { slug: 'bateu',     name: 'Bateu Bet', /* ... */ },
  {
    slug: 'rainha',
    name: 'Rainha da Bet',
    baseDomain: '<bet.br>',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: '<users_rb>',
    affiliateUrl: '<https://go.aff.rainha...>'
  }
]
```

### 1b. `app/composables/useAuth.ts` — habilitar o slug no login
O login só tenta as casas listadas no filtro. **Adicione o novo slug**, senão a marca não autentica:
```ts
const loginBrands = BRANDS
  .filter((b) => b.slug === 'esportiva' || b.slug === 'bateu' || b.slug === 'rainha')
  .sort((a, b) => (a.slug === activeSlug ? -1 : b.slug === activeSlug ? 1 : 0))
```

> O resto (marca ativa, banco, branding) já é dirigido por env — não precisa mexer.
> A tela de login mostra só a casa do `NUXT_PUBLIC_APP_BRAND` no "Criar conta".

---

## 2. Repositório e arquivos do deploy

1. **Novo repo GitHub** (ex.: `Hype-Gaming/rainha-bet`). Pode partir deste código como template.
2. **Ecosystem do pm2** — copie `ecosystem.bateu.config.cjs` → `ecosystem.rainha.config.cjs` e troque:
   ```js
   NUXT_PUBLIC_APP_BRAND: 'rainha',   // marca ativa
   // ...
   name: 'rainha',                    // nome do processo pm2
   PORT: '<3111>'                     // porta livre na VPS
   ```
   ⚠️ **O nome do arquivo PRECISA terminar em `.config.cjs`** — senão o pm2 o roda como script
   cru (processo não sobe o servidor, porta fica morta).
3. **Workflow CI/CD** — copie `.github/workflows/deploy.yml` e troque a referência do ecosystem:
   ```yaml
   pm2 reload ecosystem.rainha.config.cjs --update-env
   ```

---

## 3. Banco de dados (Mongo)

O banco `rainha-hyper` precisa existir com as collections que o app usa:
`subscriptions`, `app_users`, `deposits`, `user_contact_status` (criadas no 1º uso).

O **usuário Mongo `admin` vive no banco `admin`** → a URI precisa de `?authSource=admin`,
senão dá `Authentication failed (code 18)`.

---

## 4. `.env` da VPS (não vai pro git — é gitignored)

```env
PORT=<3111>
NODE_ENV=production
NUXT_PUBLIC_APP_BRAND=rainha
MONGODB_URI=mongodb://admin:<senha>@<host>:27017/?authSource=admin
MONGODB_DB=rainha-hyper

ADMIN_ALLOWED_EMAILS=devhypegaming@gmail.com
ADMIN_PASSWORD=<senha-admin>
ADMIN_SESSION_SECRET=<gere: openssl rand -hex 32>

VAPID_PUBLIC_KEY=<chave-publica>
VAPID_PRIVATE_KEY=<chave-privada>
VAPID_SUBJECT=mailto:devhypegaming@gmail.com

LASTLINK_WEBHOOK_SECRET=<token>
LASTLINK_WEBHOOK_SECRET_SEM_GALE=<token>
```

Notas:
- **`MONGODB_DB` é obrigatória** — sem ela o app falha de propósito (não cai mais no `irmandade-hyper`).
- **VAPID:** se só tiver a privada, deriva a pública:
  ```bash
  node -e "const c=require('crypto');const e=c.createECDH('prime256v1');e.setPrivateKey(Buffer.from(process.env.VAPID_PRIVATE_KEY,'base64url'));console.log(e.getPublicKey().toString('base64url'))"
  ```
- **Lastlink:** se a casa usa a mesma conta, são os mesmos tokens; cada deploy recebe o webhook
  pela sua própria URL (separação é por domínio + `MONGODB_DB`).

---

## 5. Subir na VPS (1ª vez)

```bash
cd /var/www/rainha-bet
git clone git@github.com:Hype-Gaming/rainha-bet.git .   # repo privado: usar Deploy Key SSH (ver passo 7)
# criar o .env acima
npm ci && npm run build
pm2 start ecosystem.rainha.config.cjs    # 1ª vez é "start"; deploys depois usam "reload"
pm2 save
pm2 startup systemd -u root --hp /root   # se ainda não configurado nesta VPS

# validar
pm2 logs rainha --lines 10               # "Listening on http://[::]:<3111>", sem erro de Mongo/VAPID
curl -i "http://localhost:<3111>/api/subscription/check?email=teste@teste.com"   # HTTP/1.1 200
```

> Se mexer no `.env` depois: `pm2 reload ecosystem.rainha.config.cjs --update-env` (pelo **arquivo**,
> não `pm2 restart rainha` pelo nome — só pelo arquivo o `.env` é relido).

---

## 6. nginx + Cloudflare (HTTPS)

Se o domínio está na **Cloudflare** (proxy laranja), **não use certbot** — a Cloudflare entrega o
HTTPS na borda. Use cert self-signed no origin + modo **Full**:

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/rainha.key -out /etc/nginx/ssl/rainha.crt \
  -subj "/CN=<app.rainhadabet.com>"

cat > /etc/nginx/sites-available/rainha <<'EOF'
server {
    listen 80;
    server_name <app.rainhadabet.com>;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name <app.rainhadabet.com>;
    ssl_certificate     /etc/nginx/ssl/rainha.crt;
    ssl_certificate_key /etc/nginx/ssl/rainha.key;
    location / {
        proxy_pass http://localhost:<3111>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
ln -sf /etc/nginx/sites-available/rainha /etc/nginx/sites-enabled/rainha
nginx -t && systemctl reload nginx
```
Na Cloudflare: **SSL/TLS → Overview → Full**. Conferir DNS: `dig +short <app.rainhadabet.com>`
deve retornar IPs da Cloudflare (proxy ligado). Testar: `curl -I https://<app.rainhadabet.com>` → 200.

---

## 7. CI/CD (deploy automático)

**Duas chaves SSH diferentes** (não confunda):
- **Actions → VPS:** privada no Secret `VPS_SSH_KEY`, pública no `~/.ssh/authorized_keys` da VPS.
- **VPS → GitHub** (repo privado): gerar chave NA VPS, pública como **Deploy Key** (read-only) no repo,
  e usar remote SSH (`git@github.com:...`).

Secrets no repo (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP da VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | conteúdo da chave privada de deploy |
| `VPS_PORT` | `22` |
| `VPS_PATH` | `/var/www/rainha-bet` |

Testar: **Actions → Deploy → Run workflow**. Depois, todo push na `main` reimplanta.

---

## Checklist

- [ ] Marca em `shared/brands.ts` + slug no filtro de `useAuth.ts`
- [ ] `ecosystem.rainha.config.cjs` (nome termina em `.config.cjs`, porta livre, brand `rainha`)
- [ ] Workflow apontando pro ecosystem certo
- [ ] Banco `rainha-hyper` existe; URI com `?authSource=admin`
- [ ] `.env` na VPS completo (com `MONGODB_DB` e VAPID)
- [ ] `pm2 start` → `Listening` + `curl` 200 no banco certo
- [ ] nginx + Cloudflare Full → `https://...` 200
- [ ] Secrets + `Run workflow` OK

---

## Armadilhas que já nos pegaram (não repetir)

1. **`require is not defined` no build de produção** — o driver `mongodb` v7 quebra no bundle ESM
   do Nitro. **Já corrigido** em `nuxt.config.ts` (banner `createRequire`); mantenha esse trecho.
2. **`Authentication failed (code 18)`** — falta `?authSource=admin` na `MONGODB_URI`.
3. **Porta morta / processo `ecosystem.xxx`** — o arquivo do pm2 não terminava em `.config.cjs`.
4. **`.env` novo não aplica** — usou `pm2 restart <nome>`; tem que ser `pm2 reload <arquivo>.config.cjs`.
5. **certbot falha** — domínio atrás da Cloudflare; não usar certbot, usar self-signed + Full.
6. **Dados no banco errado** — `MONGODB_DB` ausente caía no `irmandade-hyper`; agora o app exige a var.
