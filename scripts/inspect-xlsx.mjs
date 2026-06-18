import xlsx from 'xlsx'

const FILE = process.argv[2] || 'sales_list_2026-06-17.xlsx'
const wb = xlsx.readFile(FILE)
console.log('sheets:', wb.SheetNames)

const ws = wb.Sheets[wb.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(ws, { defval: null })
console.log('total rows:', rows.length)
console.log('\ncolumns:', JSON.stringify(Object.keys(rows[0] || {}), null, 2))

const mask = (s) => (typeof s === 'string' && s.length > 4 ? s.slice(0, 3) + '***' + s.slice(-2) : s)
console.log('\nprimeira linha (mascarada):')
const r0 = rows[0] || {}
const masked = {}
for (const [k, v] of Object.entries(r0)) {
  masked[k] = /mail|nome|telefone|documento|name|phone|email/i.test(k) ? mask(v) : v
}
console.log(JSON.stringify(masked, null, 2))

// distribuição de status e produtos
const colStatus = Object.keys(r0).find((k) => /status da venda/i.test(k))
const colProd = Object.keys(r0).find((k) => /produto principal/i.test(k))
const colEmail = Object.keys(r0).find((k) => /mail/i.test(k))
const colName = Object.keys(r0).find((k) => /nome|raz/i.test(k))
console.log('\ncolStatus:', colStatus, '| colProd:', colProd, '| colEmail:', colEmail, '| colName:', colName)

const tally = (col) => {
  const m = {}
  for (const r of rows) { const v = r[col] ?? '(vazio)'; m[v] = (m[v] || 0) + 1 }
  return m
}
if (colStatus) console.log('\nstatus:', JSON.stringify(tally(colStatus), null, 2))
if (colProd) console.log('\nprodutos:', JSON.stringify(tally(colProd), null, 2))

// quantos IRMANDADE aprovados
if (colStatus && colProd) {
  const IRM = ['[APP] IRMANDADE CLUB', 'IRMANDADE CLUB [VIP]', '[VIP] IRMANDADE CLUB']
  const irmAprov = rows.filter((r) => String(r[colStatus]).trim() === 'Aprovada' && IRM.includes(String(r[colProd]).trim()))
  const emails = new Set(irmAprov.map((r) => String(r[colEmail] || '').trim().toLowerCase()).filter(Boolean))
  console.log(`\nIRMANDADE aprovadas: ${irmAprov.length} linhas | ${emails.size} emails únicos`)
  const semNome = irmAprov.filter((r) => !r[colName]).length
  console.log(`IRMANDADE aprovadas sem nome: ${semNome}/${irmAprov.length}`)
}
