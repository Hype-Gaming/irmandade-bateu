# API

Duas superfícies distintas:

| | Onde roda | Documentação |
|---|---|---|
| **API interna** | Nitro deste app ([server/api/](../../server/api/)) | [interna.md](interna.md) |
| **API Cactus** | Provedor externo (`routes-eb.grupoautoma.com`) | abaixo |

A Cactus é chamada **direto do browser** pelos composables, não passa por proxy —
com uma exceção: `/api/casino-results`, que é proxy porque o catalogador bloqueia
domínios fora da allowlist dele.

## API Cactus

1. [Visão geral](cactus-visao-geral.md) — base URL, headers, marcas
2. [Autenticação](cactus-autenticacao.md) — login, logout, perfil
3. [Usuários](cactus-usuarios.md) — registro e cache
4. [Depósitos](cactus-depositos.md) — PIX e status
5. [Jogos](cactus-jogos.md) — iniciar jogo
6. [Erros](cactus-erros.md) — formato e casos comuns
