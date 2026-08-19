# app/pages/admin/

Painel administrativo, sob `/admin`. Protegido em duas camadas: o middleware
[admin.ts](../../middleware/) (navegação) e o `401` de cada rota
`/api/admin/*` (a que vale).

| Rota | Arquivo | O que faz |
|---|---|---|
| `/admin/login` | `login.vue` | e-mail + senha; cria o cookie de sessão de 8h |
| `/admin` | `index.vue` | métricas, lista de usuários, bloqueio, tags, export CSV |
| `/admin/push` | `push.vue` | envio manual e agendamentos de notificação |
| `/admin/webhook` | `webhook.vue` | inspeção do webhook da Lastlink e liberação manual |

Todas importam o tema:

```css
@import "~/assets/css/admin-theme.css";
```

`/admin/login` é a única rota do painel sem guarda — ela **é** a porta.

Rotas consumidas: ver [docs/api/interna.md](../../../docs/api/interna.md).
Agendamento de push: [docs/integracoes/web-push.md](../../../docs/integracoes/web-push.md).
