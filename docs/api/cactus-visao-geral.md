# API Cactus — visão geral

A Cactus é o provedor externo das casas de aposta. **Este app não a hospeda**: o
cliente fala direto com `https://routes-eb.grupoautoma.com` a partir dos
composables ([app/composables/](../../app/composables/)).

Base URL e demais parâmetros de cada casa vivem em
[shared/brands.ts](../../shared/brands.ts) — nunca escreva a URL na mão.

## Convenções de todas as rotas

| Item | Como vai |
|---|---|
| Token | `Authorization: Bearer <access_token>` |
| Marca | `X-Brand-Slug: <slug>` (ou `brand_slug` no body) |
| Domínio | `X-Base-Domain: <baseDomain>` (ou `base_domain` no body) |
| Sessão | `X-Cactus-Cookie-Key: <cookie_key>` |

O `access_token` é JWT e expira em **7 dias** (`604800s`). O `cookie_key` vem do
login e identifica o arquivo de cookies do lado da Cactus.

## Marcas

A Cactus atende várias casas (`apostatudo`, `geralbet`, `bullsbet`, `sortenabet`,
`esportiva`, `bateu`, …). As duas usadas aqui estão em
[shared/brands.ts](../../shared/brands.ts) — ver
[integracoes/cactus-multimarca.md](../integracoes/cactus-multimarca.md).

## Índice de rotas

| Documento | Rotas |
|---|---|
| [cactus-autenticacao.md](cactus-autenticacao.md) | login, logout, perfil |
| [cactus-usuarios.md](cactus-usuarios.md) | registro, listagem/busca no cache Mongo |
| [cactus-depositos.md](cactus-depositos.md) | depósito PIX, status |
| [cactus-jogos.md](cactus-jogos.md) | iniciar jogo |
| [cactus-erros.md](cactus-erros.md) | formato de erro e casos comuns |

> Todos os exemplos usam placeholders (`SEU_TOKEN`, `usuario@example.com`).
> Nunca cole credencial real em documentação.
