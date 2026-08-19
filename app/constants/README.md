# app/constants/

Conteúdo e catálogo editáveis. A intenção é que publicar uma aula nova ou ligar
um jogo **não** exija mexer em `.vue`.

| Arquivo | O que define |
|---|---|
| `aulas.ts` | as aulas do minicurso renderizadas em `/aulas` |
| `gameRoutes.ts` | catálogo de jogos, coleções do catalogador e sinais |

## `aulas.ts`

Cada aula toca de uma destas formas, nesta ordem:

1. `videoKey` — chave **completa** do objeto no bucket (ex.: `minicurso/aula-1.mp4`),
   tocada no player nativo. Depende de `VIDEO_BASE_URL`
   ([shared/videos.ts](../../shared/videos.ts)).
2. `embedUrl` — embed do YouTube, em iframe.

Sem nenhuma das duas, o modal mostra "Em breve" em vez de um player quebrado —
dá para publicar a grade antes dos vídeos.

`cover` é opcional (sem capa, o card cai num bloco com número e título) e
`orientation` precisa refletir a proporção **real** do arquivo.

## `gameRoutes.ts`

Liga o `id` da rota `/jogo/[id]` a: nome exibido, configuração do catalogador
(`collection`, `game`, `fallbackGames`) e a referência de sinal consumida por
[useGame](../composables/). Jogo cujo sinal não existe é degradado sem quebrar a
página.
