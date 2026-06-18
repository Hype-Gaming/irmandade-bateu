import xlsx from 'xlsx'

const FILE = process.argv[2] || 'sales_list_2026-06-17.xlsx'
const wb = xlsx.readFile(FILE)
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
const norm = (s) => String(s ?? '').trim()
const lower = (s) => norm(s).toLowerCase()

const IRMANDADE = new Set(['[APP] IRMANDADE CLUB', 'IRMANDADE CLUB [VIP]', '[VIP] IRMANDADE CLUB'])

const perProduct = {}
const irmEmails = new Set()
let comTel = 0
for (const r of rows) {
  if (norm(r['Status da venda']) !== 'Aprovada') continue
  const prod = norm(r['Produto principal'])
  if (!IRMANDADE.has(prod)) continue
  const email = lower(r['E-mail do membro'])
  if (!email) continue
  ;(perProduct[prod] = perProduct[prod] || new Set()).add(email)
  irmEmails.add(email)
  if (norm(r['Telefone do membro'])) comTel++
}

console.log('Pagantes do produto do app (IRMANDADE, status Aprovada) — emails únicos por produto:')
for (const [p, set] of Object.entries(perProduct)) console.log(`  ${p.padEnd(24)} ${set.size}`)
console.log(`\nTotal de pagantes IRMANDADE únicos (dedup entre produtos): ${irmEmails.size}`)
console.log(`Linhas IRMANDADE aprovadas com telefone preenchido: ${comTel}`)

const appProducts = {}
for (const r of rows) {
  const p = norm(r['Produto principal'])
  if (p.startsWith('[APP]')) appProducts[p] = (appProducts[p] || 0) + 1
}
console.log('\nTodos os produtos [APP] no arquivo (qualquer status, p/ contexto):')
for (const [p, n] of Object.entries(appProducts)) console.log(`  ${p.padEnd(40)} ${n}`)
