# API Cactus — jogos

Convenções de header em [cactus-visao-geral.md](cactus-visao-geral.md).
No app, quem consome é [app/composables/useGame.ts](../../app/composables/useGame.ts);
o catálogo de jogos e sinais vive em
[app/constants/gameRoutes.ts](../../app/constants/gameRoutes.ts).

## GET `/api/start-game/:gameId` (ou `/api/start-game?slug=`)

**Headers obrigatórios:** `Authorization`, `X-Brand-Slug`, `X-Cactus-Cookie-Key`.

| Query | Nota |
|---|---|
| `slug` | obrigatório se não vier na URL |
| `platform` | `WEB` (padrão), `MOBILE`, `ANDROID`, `IOS` |
| `use_demo` / `useDemo` | `1` para modo demo (padrão `0`) |

Parâmetros extras são repassados à casa.

```bash
curl "https://routes-eb.grupoautoma.com/api/start-game?slug=evolution/bac-bo&platform=WEB" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Brand-Slug: bateu" -H "X-Cactus-Cookie-Key: SEU_COOKIE_KEY"
```

```json
{
  "success": true,
  "slug": "evolution/bac-bo",
  "platform": "WEB",
  "game_url": "https://.../index.html?options=...",
  "payload": { "error": false, "description": "OK", "gameURL": "https://..." }
}
```

`game_url` é o que a página [app/pages/jogo/[id].vue](../../app/pages/jogo/) carrega no iframe.

## Slugs conhecidos

`evolution/bac-bo`, `fortune-tiger`, `aviator`, `spaceman`.
Os slugs realmente usados pelo app estão em
[app/constants/gameRoutes.ts](../../app/constants/gameRoutes.ts).
