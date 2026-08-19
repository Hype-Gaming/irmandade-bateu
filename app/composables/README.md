# app/composables/

Auto-importados pelo Nuxt. É aqui que mora o estado global (via `useState`) e
toda a conversa com as APIs — **nenhuma página fala direto com a Cactus**.

| Composable | Responsabilidade |
|---|---|
| `useAuth.ts` | login multi-marca, perfil, logout, headers autenticados. Guarda token, usuário, `cookie_key` e a marca da sessão no localStorage |
| `useSubscription.ts` | consulta `/api/subscription/check`, com cache de 5 min em sessionStorage |
| `useBlocked.ts` | flag de bloqueio setada pelo heartbeat de sessão |
| `useDeposit.ts` | depósito PIX na Cactus (QR + copia e cola) |
| `useGame.ts` | inicia o jogo e resolve a configuração de sinais a partir de [constants/gameRoutes.ts](../constants/) |
| `usePush.ts` | permissão, inscrição no Push e sincronia com o servidor |
| `useCountUp.ts` | anima um número via `requestAnimationFrame`; respeita `prefers-reduced-motion` |

## Regras

**`useAuth` é a fonte da marca.** `useGame` e `useDeposit` pegam dele
`apiBaseUrl`, `brandSlug`, `baseDomain` e `cookieKey`. Nunca escreva URL de API
ou `brand_slug` fixo nestes arquivos — o app perde o suporte multi-marca. Ver
[docs/integracoes/cactus-multimarca.md](../../docs/integracoes/cactus-multimarca.md).

**As chaves de storage usam o prefixo `irmandade_`** (`irmandade_subscription`,
`irmandade_modal_dismissed`). É herança do nome antigo e é mantida de propósito:
renomear invalida o cache de todo mundo que já usa o app, jogando os usuários de
volta no modal de assinatura.

**O login tenta as marcas em ordem.** Um `422` significa "credencial não é desta
casa" e faz o loop seguir para a próxima — não é erro fatal.
