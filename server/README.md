# server/

Backend Nitro. Roteamento por arquivo em [api/](api/), utilitários em
[utils/](utils/) (auto-importados) e tarefas de background em
[plugins/](plugins/).

| Diretório | Conteúdo |
|---|---|
| [api/](api/) | rotas HTTP; o nome do arquivo define método e caminho |
| [plugins/](plugins/) | código que roda no boot do servidor |
| [utils/](utils/) | Mongo, sessão de admin, web-push, agregações compartilhadas |

## O que o servidor existe para fazer

Só há rota aqui quando o browser não daria conta sozinho:

| Necessidade | Por quê |
|---|---|
| ler/gravar no Mongo | o browser não acessa o banco |
| receber o webhook da Lastlink | precisa de endpoint público |
| enviar push | a chave VAPID privada não pode ir ao client |
| painel admin | sessão assinada pelo servidor |
| `/api/casino-results` | o catalogador bloqueia domínios fora da allowlist |

Login, perfil, depósito e abertura de jogo **não** passam por aqui: o client fala
direto com a Cactus.

## Regras

- **Segredo sem fallback.** `MONGODB_URI`/`MONGODB_DB` ausentes derrubam a query;
  tokens da Lastlink ausentes recusam o webhook. Falhar alto é melhor que gravar
  no banco errado ou aceitar webhook não autenticado.
- **Upsert por e-mail em minúsculas.**
- **Campo ausente no payload nunca sobrescreve dado gravado** — endpoints
  públicos (heartbeat, webhook) não podem apagar perfil.
- **Erro de integração não vira 5xx à toa.** Evento desconhecido da Lastlink
  responde `200 { ignored: true }` para não gerar retry infinito.

Referência das rotas: [docs/api/interna.md](../docs/api/interna.md).
