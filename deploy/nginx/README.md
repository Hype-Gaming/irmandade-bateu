# deploy/nginx/

| Arquivo | Domínio |
|---|---|
| `app.clubdabb2.online.conf` | produção do Clube da BB |

Proxy reverso para o Nuxt/Nitro que o PM2 mantém em `127.0.0.1:3110`. O Nginx é
o **único** serviço exposto em 80/443; a porta da aplicação não deve ser aberta
no firewall.

Repassa `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` e os headers
de `Upgrade` (para WebSocket). `client_max_body_size` em 20 MB.

## Instalar

```bash
sudo cp app.clubdabb2.online.conf /etc/nginx/sites-available/app.clubdabb2.online
sudo ln -s /etc/nginx/sites-available/app.clubdabb2.online \
           /etc/nginx/sites-enabled/app.clubdabb2.online
sudo nginx -t && sudo systemctl reload nginx
```

O arquivo contém **só o bloco HTTP**. Instale-o assim, depois rode
`sudo certbot --nginx -d app.clubdabb2.online`: o Certbot acrescenta o bloco
HTTPS e o redirecionamento sozinho. Editar o `:443` na mão costuma brigar com a
renovação automática.

`502 Bad Gateway` quase sempre é o processo `bateu` fora do ar — confira com
`pm2 status` e `curl -I http://127.0.0.1:3110`.
