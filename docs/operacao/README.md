# Operação

| Documento | Quando usar |
|---|---|
| [deploy-vps.md](deploy-vps.md) | primeira instalação na VPS (Nginx, PM2, HTTPS, firewall) |
| [ci-cd.md](ci-cd.md) | deploy automático por push na `main`, secrets, rollback |
| [troubleshooting.md](troubleshooting.md) | problemas conhecidos e suas causas |

**Produção:** `https://app.clubdabb2.online` · processo PM2 `bateu` · porta local `3110`.

Diagnóstico rápido na VPS:

```bash
pm2 status
pm2 logs bateu --lines 50
curl -I http://127.0.0.1:3110
sudo nginx -t
```
