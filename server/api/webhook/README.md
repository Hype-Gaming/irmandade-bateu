# server/api/webhook/

| Rota | Origem |
|---|---|
| `lastlink.post` | Lastlink — compra aprovada, cancelada, reembolsada etc. |

É o que libera acesso pago: cada evento faz upsert em `subscriptions`, chaveado
pelo e-mail em minúsculas.

**Autenticação por token**, em `?token=` ou no header `X-Lastlink-Token`,
comparado com `LASTLINK_WEBHOOK_SECRET` e `LASTLINK_WEBHOOK_SECRET_SEM_GALE`.
Sem token no `.env`, todo webhook é recusado com `401` — não há fallback.

O payload da Lastlink vem em **PascalCase aninhado em `Data`**, com variações
entre eventos. Por isso os helpers `pickEmail` / `pickEvent` / `pickProductName` /
`pickPhone` / `pickName` / `pickOrderId` varrem todos os caminhos conhecidos.
Ao encontrar uma variação nova, acrescente o caminho ao helper — o payload
completo é logado em toda chamada, então ele está no log.

Evento desconhecido responde **`200 { ignored: true }`** de propósito: um `4xx`
faria a Lastlink retentar indefinidamente.

Documentação completa, incluindo eventos e teste por curl:
[docs/integracoes/lastlink.md](../../../docs/integracoes/lastlink.md).
