# app/components/admin/

Componentes usados só pelo painel. O prefixo da pasta entra no nome auto-importado:
`ActivityChart.vue` → `<AdminActivityChart />`.

| Componente | Papel |
|---|---|
| `ActivityChart.vue` | gráfico da série temporal de `/api/admin/activity` |

O gráfico é desenhado à mão (sem biblioteca de charts) para não somar peso ao
bundle por causa de uma única tela. O estilo vem do
[admin-theme.css](../../assets/css/), importado pelas páginas de
[pages/admin/](../../pages/admin/).
