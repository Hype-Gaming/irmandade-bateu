# Integrações

Serviços externos dos quais o app depende.

| Integração | O que resolve | Documento |
|---|---|---|
| **Cactus** | login, perfil, depósito PIX e abertura de jogos das casas | [cactus-multimarca.md](cactus-multimarca.md) · [API](../api/README.md) |
| **Lastlink** | pagamento; o webhook é o que libera acesso | [lastlink.md](lastlink.md) |
| **Web Push** | notificações nativas, manuais e agendadas | [web-push.md](web-push.md) |
| **Catalogador** | histórico dos jogos (`casino-data.grupoautoma.com`), via proxy `/api/casino-results` | [../api/interna.md](../api/interna.md) |
| **Bucket de vídeo** | aulas do minicurso | [shared/videos.ts](../../shared/videos.ts) |
