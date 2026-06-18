# Painel Admin v2 — Design

Data: 2026-06-12
Status: aprovado pelo usuário (conversa)

## Objetivo

Melhorar o painel admin (`/admin`) em duas frentes:

1. **Tags de risco de churn** — identificar assinantes pagos que acessaram o app e não geraram nenhum PIX.
2. **Mais dados úteis + layout visual** — métricas de conversão, dados por usuário, gráfico de atividade e filtros, mantendo a estrutura de página única.

## Regra das tags de risco

Um usuário é **elegível** para tag quando:

- Tem assinatura com `status: 'active'` na coleção `subscriptions`; **e**
- Seu primeiro acesso ao app (`app_users.first_seen_at`) aconteceu **depois** da ativação da assinatura (`subscriptions.created_at`).

Para elegíveis **sem nenhum PIX gerado** (nenhum documento em `deposits` para o email):

- `risk_24h`: `first_seen_at` entre 24h e 48h atrás → chip âmbar "⚠ 24h sem depósito".
- `risk_48h`: `first_seen_at` há mais de 48h → chip vermelho "48h+ sem depósito".
- Menos de 24h ou já gerou PIX → sem tag (`risk_tag: null`).

"Depósito" = **PIX gerado no app** (coleção `deposits`, status `generated`). Não há confirmação de pagamento na casa; decisão explícita do usuário.

## Backend

### `/api/admin/users` (alterado)

Pipeline de agregação no MongoDB com `$lookup`:

- `subscriptions` por `email` → `subscription` (`paid`/`free`) e data de ativação.
- `deposits` por `email` → `deposits_count`, `deposits_sum`.
- Campo computado `risk_tag` (`risk_24h` | `risk_48h` | `null`) conforme regra acima.
- Retorna também `first_seen_at`.

Novos parâmetros de filtro (combináveis com `search`, `skip`, `limit`):

- `risk`: `24h` | `48h` | `any`
- `subscription`: `paid` | `free`
- `status`: `active` | `blocked`
- `brand`: slug da marca

Filtros aplicados dentro da agregação (funcionam com paginação).

### `/api/admin/stats` (alterado)

Cards extras:

- `newToday` / `new7d`: usuários com `first_seen_at` no dia / nos últimos 7 dias.
- `conversionRate`: % de assinantes ativos que têm ≥1 PIX gerado.
- `avgTicket`: `depositsSum / depositsCount`.
- `atRisk`: contagem de usuários com `risk_tag` ≠ null (24h + 48h).

### `/api/admin/activity` (novo)

Últimos 14 dias, agrupado por dia (`$group` por data, fuso local do servidor):

```json
{ "days": [{ "date": "2026-06-01", "newUsers": 3, "pixCount": 5, "pixSum": 250 }] }
```

Protegido por `getAdminSession` como os demais.

## Frontend (`app/pages/admin/index.vue`)

- **Cards** — linha atual (Usuários, Ativos 48h, PIX gerados, Valor total) + segunda linha: Conversão %, Novos 7d (com "hoje" no subtítulo), Ticket médio, Em risco (destaque vermelho quando > 0; clicar aplica o filtro de risco na tabela).
- **Gráfico** — card com barras SVG puras (sem dependência) dos últimos 14 dias; alternância entre série "novos usuários" e "PIX gerados"; tooltip ao hover.
- **Tabela de usuários** — colunas novas: Assinatura (chip pago/free), PIX (qtd + total formatado), 1º acesso (tempo relativo). Tag de risco como chip junto ao nome.
- **Filtros em chips** acima da tabela: Em risco (24h / 48h+), Pago / Free, Ativos / Bloqueados, marca. Combináveis com a busca; refazem a query no servidor.
- **Polimento visual** — hierarquia nos cards, espaçamentos, hover states; responsivo mantido (tabela vira cards no mobile com tags visíveis).

## Fora de escopo (não muda)

Login, middleware admin, bloquear/desbloquear, modal de confirmação, toast, página de webhook. A tabela de depósitos recebe apenas polimento visual.

## Erros e estados

Mesmo padrão atual: skeletons no carregamento, mensagem de erro por seção, estado vazio com instrução. Filtro sem resultado → "Nenhum usuário com esse filtro".

## Decisões registradas

- Agregação no servidor (opção A) — filtros corretos com paginação; browser não cruza coleções.
- Gráfico em SVG artesanal — evita +70kb de Chart.js para barras simples.
- PIX gerado conta como depósito — único dado existente hoje.
