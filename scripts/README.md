# scripts/

Scripts avulsos de operação, executados **à mão** com Node. Não entram no build
nem são importados pelo app.

```bash
node scripts/<arquivo>
```

Todos leem as credenciais do `.env` da raiz. **Confira `MONGODB_URI` e
`MONGODB_DB` antes de rodar qualquer coisa que escreva** — vários destes scripts
nasceram apontando para bancos de outros projetos.

## Diagnóstico (somente leitura)

| Script | O que faz |
|---|---|
| `diag-stats.mjs` | reproduz as agregações de `/api/admin/stats` conectando como o app |
| `verify-stats.mjs` | mesma verificação, com a URI corrigida |
| `verify-dest.mjs` | confere o banco de destino de uma migração |
| `explorar-usuarios.cjs` | lista bancos, coleções e campos de usuário disponíveis |
| `explorar-profile.cjs` | amostra a estrutura do campo `profile` nas coleções candidatas |
| `check-products.mjs` | produtos cadastrados |
| `app-payers.mjs` | quem pagou |
| `ver-depositos.cjs` | depósitos, marcando os de usuários bloqueados |
| `inspect-xlsx.mjs` | inspeciona uma planilha antes de importar |

## Escrita — rodar com atenção

| Script | O que faz |
|---|---|
| `import-lastlink-phones.mjs` | backfill de telefones em `subscriptions` a partir do relatório de vendas |
| `migrate-eb.mjs` | cópia idêntica de todas as collections entre bancos; idempotente (`replaceOne` + upsert por `_id`) |
| `seed-mixed.mjs`, `seed-rainha.mjs` | populam dados de teste |
| `exportar-usuarios.cjs` | exporta usuários para CSV |

> Export gera arquivo com **dados pessoais**. Salve fora do repositório — o
> `.gitignore` não cobre CSV solto por padrão.

## Legado de outros projetos

Estes vieram das migrações Irmandade/Rainha e falam de collections que **não
existem** neste deploy (`rainha-da-bet`, `irmandade-hyper`, `zkdados`). Ficam
como referência de como o cruzamento foi feito; não devem ser rodados às cegas:

`checar-rainha-match.cjs` · `cruzar-telefones.cjs` · `cruzar-telefones-v2.cjs` ·
`inspecionar-rainha.cjs` · `rainha-count.mjs` · `inspect-eb.mjs` ·
`inspect-eb2.mjs` · `xref.mjs`

> `rainha-count.mjs` e `seed-rainha.mjs` esperam a planilha `rainha.list.xlsx`
> (ou o caminho em `LASTLINK_XLSX`). Ela foi removida do repositório por conter
> dados pessoais — recupere do histórico do git se precisar rodá-los.

Collections deste app: [docs/banco-de-dados.md](../docs/banco-de-dados.md).
