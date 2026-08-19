# app/pages/auth/

Telas de autenticação do **usuário do app** (o admin tem a sua própria, em
[../admin/](../admin/)).

| Rota | Arquivo |
|---|---|
| `/auth/login` | `login.vue` |

O mesmo campo aceita **e-mail ou CPF**: a API Cactus usa `email` como login único
e recebe o CPF só com dígitos nesse mesmo campo. A tela não escolhe a casa de
apostas — [useAuth](../../composables/) tenta cada marca de
[shared/brands.ts](../../../shared/brands.ts) até uma autenticar, e a que
responder vira a marca da sessão.

`/auth/register` e `/auth/forgot-password` estão na lista de rotas públicas do
middleware, mas **não existem como página**: o cadastro acontece no site da casa,
pelo `affiliateUrl` da marca.

Detalhes em [docs/integracoes/cactus-multimarca.md](../../../docs/integracoes/cactus-multimarca.md).
