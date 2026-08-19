# Deploy na VPS (primeira instalação)

VPS Ubuntu/Debian com Nginx + PM2. O Nuxt/Nitro escuta em `127.0.0.1:3110` e
**só** o Nginx fica exposto em 80/443.

Para os deploys seguintes, use o [CI/CD](ci-cd.md) — este roteiro é a instalação inicial.

## 1. Apontar o domínio

No DNS de `clubdabb2.online`, registro `A` com nome `app` → IP público da VPS.
Confirme antes de emitir o certificado:

```bash
nslookup app.clubdabb2.online
```

## 2. Base do servidor

```bash
ssh USUARIO@IP_DA_VPS
sudo apt update
sudo apt install -y nginx git
sudo npm install -g pm2
node --version && npm --version && pm2 --version   # Node 22 ou compatível
```

## 3. Clonar e configurar

```bash
sudo mkdir -p /var/www/clube-da-bb
sudo chown "$USER":"$USER" /var/www/clube-da-bb
git clone URL_DO_REPOSITORIO /var/www/clube-da-bb
cd /var/www/clube-da-bb
npm ci
```

Crie o `.env` **na VPS** (nunca versionado). Variáveis obrigatórias e opcionais em
[../configuracao.md](../configuracao.md). No mínimo:

```dotenv
NODE_ENV=production
NUXT_PUBLIC_APP_BRAND=bateu
VAPID_SUBJECT=mailto:admin@app.clubdabb2.online
```

Mais `MONGODB_URI`, `MONGODB_DB`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`ADMIN_ALLOWED_EMAILS`, `ADMIN_PASSWORD` e os tokens da Lastlink.

## 4. Build e PM2

```bash
npm run build
pm2 start ecosystem.bateu.config.cjs --update-env
pm2 save
pm2 startup    # execute o comando com sudo que ele imprimir, depois `pm2 save` de novo
```

Confira:

```bash
pm2 status
pm2 logs bateu --lines 50
curl -I http://127.0.0.1:3110
```

> `ecosystem.bateu.config.cjs` lê o `.env` do diretório e injeta tudo no processo,
> forçando `PORT=3110` depois da leitura. Mantenha `instances: 1` e
> `exec_mode: 'fork'`: o agendador de push roda dentro do processo e em cluster
> dispararia duplicado.

## 5. Nginx

```bash
sudo cp /var/www/clube-da-bb/deploy/nginx/app.clubdabb2.online.conf \
        /etc/nginx/sites-available/app.clubdabb2.online
sudo ln -s /etc/nginx/sites-available/app.clubdabb2.online \
           /etc/nginx/sites-enabled/app.clubdabb2.online
sudo nginx -t && sudo systemctl reload nginx
curl -I http://app.clubdabb2.online
```

Se o symlink já existir, não repita o `ln -s`.

## 6. HTTPS

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d app.clubdabb2.online
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Aceite o redirecionamento automático para HTTPS no assistente.

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```

Não abra a `3110` — ela deve continuar só em `127.0.0.1`.

## Atualização manual

```bash
cd /var/www/clube-da-bb
git pull --ff-only
npm ci
npm run build
pm2 reload ecosystem.bateu.config.cjs --update-env
pm2 save
```

## Convivência com outros apps

A mesma VPS roda mais de um app. Cada um tem processo e porta próprios:

| App | Ecosystem | Porta |
|---|---|---|
| Irmandade | `ecosystem.config.cjs` | 3099 |
| Bateu / Clube da BB | `ecosystem.bateu.config.cjs` | 3110 |

Sempre dê `pm2 reload` no ecosystem certo — recarregar o errado derruba o app do vizinho.
