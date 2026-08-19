# server/api/

Roteamento por arquivo do Nitro: o nome define caminho e método.
`admin/users/block.post.ts` → `POST /api/admin/users/block`.

| Caminho | Autenticação | Assunto |
|---|---|---|
| `subscription/` | pública | `check.get` — assinatura por e-mail |
| `track/` | pública | `session.post` (heartbeat + bloqueio), `deposit.post` |
| `push/` | pública | inscrição do browser e chave VAPID pública |
| `webhook/` | token | `lastlink.post` — libera acesso ao app |
| `casino-results.get.ts` | pública | proxy do catalogador |
| [`admin/`](admin/) | cookie de sessão | painel inteiro |

## Camadas de autenticação

1. **Pública** — sem sessão, mas com validação de payload. `track/*` limita
   tamanho de string e teto de valor; campo ausente nunca apaga dado existente.
2. **Token** — só `webhook/lastlink`, comparando com os tokens do `.env`. Sem
   token configurado, todo webhook é recusado com `401`.
3. **Sessão** — todas as rotas `admin/**` (exceto `login`) exigem o cookie HMAC
   de [utils/adminAuth.ts](../utils/adminAuth.ts).

## Ao criar uma rota

- Use `getDb()` de [utils/mongodb.ts](../utils/mongodb.ts) — nunca abra um client novo.
- Rota administrativa: valide a sessão **na rota**, não confie no middleware do
  client.
- Rota pública que escreve: normalize o e-mail para minúsculas e monte o `$set`
  só com o que chegou preenchido.
- Documente em [docs/api/interna.md](../../docs/api/interna.md).
