# Documentação — Clube da BB

## Comece por aqui

| Documento | Sobre |
|---|---|
| [arquitetura.md](arquitetura.md) | como as peças se encaixam e por quê |
| [configuracao.md](configuracao.md) | variáveis de ambiente, `runtimeConfig`, PM2 |
| [banco-de-dados.md](banco-de-dados.md) | collections do MongoDB e seus campos |

## API

| Documento | Sobre |
|---|---|
| [api/README.md](api/README.md) | índice das duas superfícies de API |
| [api/interna.md](api/interna.md) | rotas Nitro deste app |
| [api/cactus-visao-geral.md](api/cactus-visao-geral.md) | provedor externo: headers e marcas |
| [api/cactus-autenticacao.md](api/cactus-autenticacao.md) | login, logout, perfil |
| [api/cactus-usuarios.md](api/cactus-usuarios.md) | registro e cache de usuários |
| [api/cactus-depositos.md](api/cactus-depositos.md) | depósito PIX e status |
| [api/cactus-jogos.md](api/cactus-jogos.md) | iniciar jogo |
| [api/cactus-erros.md](api/cactus-erros.md) | formato de erro e casos comuns |

## Integrações

| Documento | Sobre |
|---|---|
| [integracoes/README.md](integracoes/README.md) | mapa das integrações |
| [integracoes/cactus-multimarca.md](integracoes/cactus-multimarca.md) | login multi-marca com e-mail ou CPF |
| [integracoes/lastlink.md](integracoes/lastlink.md) | webhook de assinaturas |
| [integracoes/web-push.md](integracoes/web-push.md) | notificações e agendador |

## Operação

| Documento | Sobre |
|---|---|
| [operacao/README.md](operacao/README.md) | visão geral de produção |
| [operacao/deploy-vps.md](operacao/deploy-vps.md) | instalação na VPS |
| [operacao/ci-cd.md](operacao/ci-cd.md) | deploy automático e rollback |
| [operacao/troubleshooting.md](operacao/troubleshooting.md) | problemas conhecidos |

---

Cada diretório do código tem um `README.md` próprio descrevendo o que vive ali.
Comece pelo [README da raiz](../README.md).
