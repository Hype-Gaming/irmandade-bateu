# Deploy do Clube da BB na VPS

Este roteiro considera uma VPS Ubuntu/Debian, Nginx, PM2 e o Nuxt/Nitro na
porta local `3110`. O Nginx é o único serviço exposto nas portas 80 e 443.

## 1. Aponte o domínio

No provedor DNS de `clubedabb.online`, crie um registro:

- Tipo: `A`
- Nome: `app`
- Conteúdo: IP público da VPS

Espere a propagação e confira do seu computador:

```bash
nslookup app.clubedabb.online
```

O IP retornado precisa ser o IP da VPS antes de emitir o certificado HTTPS.

## 2. Entre na VPS e instale a base

```bash
ssh USUARIO@IP_DA_VPS
sudo apt update
sudo apt install -y nginx git
sudo npm install -g pm2
```

Use Node.js 22 ou uma versão compatível já instalada. Confirme com:

```bash
node --version
npm --version
pm2 --version
```

## 3. Baixe e prepare o projeto

Em uma instalação nova:

```bash
sudo mkdir -p /var/www/clube-da-bb
sudo chown "$USER":"$USER" /var/www/clube-da-bb
git clone URL_DO_REPOSITORIO /var/www/clube-da-bb
cd /var/www/clube-da-bb
npm ci
```

Crie o `.env` de produção dentro de `/var/www/clube-da-bb`. Não envie esse
arquivo ao Git. Ele deve conter as credenciais reais do MongoDB, Lastlink e Web
Push. Para este deploy, mantenha pelo menos:

```dotenv
NODE_ENV=production
NUXT_PUBLIC_APP_BRAND=bateu
VAPID_SUBJECT=mailto:admin@app.clubedabb.online
```

Preserve também `MONGODB_URI`, `MONGODB_DB`, `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` e os demais segredos já usados pelo projeto.

## 4. Faça o build e inicie com PM2

```bash
cd /var/www/clube-da-bb
npm run build
pm2 start ecosystem.bateu.config.cjs --update-env
pm2 save
pm2 startup
```

O último comando imprime outro comando com `sudo`; copie e execute exatamente o
que o PM2 mostrar, depois rode `pm2 save` novamente.

Confirme o processo e a porta local:

```bash
pm2 status
pm2 logs bateu --lines 50
curl -I http://127.0.0.1:3110
```

O `curl` deve retornar uma resposta HTTP do Nuxt.

## 5. Instale a configuração do Nginx

```bash
sudo cp /var/www/clube-da-bb/deploy/nginx/app.clubedabb.online.conf /etc/nginx/sites-available/app.clubedabb.online
sudo ln -s /etc/nginx/sites-available/app.clubedabb.online /etc/nginx/sites-enabled/app.clubedabb.online
sudo nginx -t
sudo systemctl reload nginx
```

Se o link já existir, não repita o `ln -s`. Teste primeiro em HTTP:

```bash
curl -I http://app.clubedabb.online
```

## 6. Ative HTTPS com Certbot

Com o DNS já apontado e as portas 80/443 liberadas:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d app.clubedabb.online
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

No assistente do Certbot, aceite o redirecionamento automático para HTTPS.

## 7. Libere o firewall

Se a VPS usa UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```

Não exponha a porta `3110`; ela deve continuar acessível apenas por
`127.0.0.1`, através do Nginx.

## 8. Atualizações futuras

Depois de enviar um novo commit ao GitHub:

```bash
cd /var/www/clube-da-bb
git pull --ff-only
npm ci
npm run build
pm2 reload ecosystem.bateu.config.cjs --update-env
pm2 save
```

Verificação final:

```bash
pm2 status
pm2 logs bateu --lines 50
sudo nginx -t
curl -I https://app.clubedabb.online
```

Em caso de erro `502 Bad Gateway`, confirme primeiro se o processo `bateu` está
`online` e se `curl -I http://127.0.0.1:3110` responde dentro da VPS.
