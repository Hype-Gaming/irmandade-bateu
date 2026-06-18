import { getDb } from '../utils/mongodb'
import { isPushConfigured } from '../utils/webpush'
import { dispatchToAllSubscriptions } from '../utils/pushDispatch'

const TICK_MS = 60_000

// Avança uma data em N dias mantendo o mesmo horário (Brasil não tem DST desde
// 2019, então somar dias preserva a hora local).
const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Plugin do Nitro: inicia um agendador em memória que, a cada minuto, dispara as
// notificações agendadas que já venceram. Reagenda as diárias e finaliza as
// únicas. Usa claim atômico (status 'sending') para não disparar em duplicidade.
export default defineNitroPlugin(() => {
  // evita múltiplos intervalos em hot-reload (dev)
  const g = globalThis as any
  if (g.__notificationSchedulerStarted) return
  g.__notificationSchedulerStarted = true

  let ticking = false

  const tick = async () => {
    if (ticking) return
    ticking = true
    try {
      if (!isPushConfigured()) return

      const db = await getDb()
      const collection = db.collection('scheduled_notifications')
      const now = new Date()

      // pega os vencidos um a um, com claim atômico
      while (true) {
        const job = await collection.findOneAndUpdate(
          { status: 'active', nextRunAt: { $lte: now } },
          { $set: { status: 'sending' } },
          { sort: { nextRunAt: 1 }, returnDocument: 'after' }
        )
        if (!job) break

        let result
        try {
          result = await dispatchToAllSubscriptions({
            title: job.title,
            body: job.body,
            url: job.url || '/',
            icon: job.icon || '/images/logo.png'
          })
        } catch (err) {
          console.error('[scheduler] Falha ao disparar agendamento:', err)
          result = { error: true }
        }

        if (job.type === 'daily') {
          // reagenda para a próxima ocorrência futura do mesmo horário
          let next = addDays(job.nextRunAt as Date, 1)
          const tNow = new Date()
          while (next.getTime() <= tNow.getTime()) {
            next = addDays(next, 1)
          }
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'active', nextRunAt: next, lastSentAt: new Date(), lastResult: result } }
          )
        } else {
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'done', lastSentAt: new Date(), lastResult: result } }
          )
        }

        console.log(`[scheduler] Agendamento "${job.title}" disparado:`, result)
      }
    } catch (err) {
      console.error('[scheduler] Erro no tick:', err)
    } finally {
      ticking = false
    }
  }

  // primeira execução logo após o boot (pega agendamentos vencidos enquanto o
  // servidor estava fora), depois a cada minuto.
  setTimeout(tick, 5_000)
  setInterval(tick, TICK_MS)

  console.log('[scheduler] Agendador de notificações iniciado.')
})
