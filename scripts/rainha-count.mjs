import xlsx from 'xlsx'
const wb = xlsx.readFile('rainha.list.xlsx')
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
const norm = (s) => String(s ?? '').trim().toLowerCase()
const all = new Set(), paid = new Set()
for (const r of rows) {
  const e = norm(r['E-mail do membro']); if (!e) continue
  all.add(e)
  if (String(r['Status da venda']).trim() === 'Aprovada') paid.add(e)
}
console.log('emails únicos (qualquer status):', all.size)
console.log('emails únicos Aprovados:', paid.size)
