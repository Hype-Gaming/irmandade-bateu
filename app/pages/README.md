# app/pages/

Roteamento por arquivo. Todas as rotas do app estão aqui.

| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `index.vue` | home: destaques, jogos e atalhos |
| `/aulas` | `aulas.vue` | minicurso, alimentado por [constants/aulas.ts](../constants/) — **público** |
| `/gestao` | `gestao.vue` | gestão de banca |
| `/assinar` | `assinar.vue` | oferta e checkout Lastlink |
| `/jogo/:id` | [`jogo/[id].vue`](jogo/) | abre o jogo e o histórico do catalogador |
| `/auth/login` | [`auth/login.vue`](auth/) | login multi-marca (e-mail ou CPF) |
| `/admin/**` | [`admin/`](admin/) | painel administrativo |

## Convenções

- Páginas não chamam a Cactus direto: usam os [composables](../composables/).
- Acesso negado vira **modal** (assinatura, bloqueio, KYC), não redirecionamento.
- Estilo mora no `<style scoped>` de cada página; o painel importa o
  [admin-theme.css](../assets/css/).
- `/aulas` é público de propósito — é a isca de conteúdo antes do login.

As páginas são grandes (`jogo/[id].vue` passa de 2.9k linhas) porque concentram
UI, animação e estados de erro do fluxo inteiro.
