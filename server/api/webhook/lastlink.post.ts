import { getDb } from '../../utils/mongodb'

// Tokens da conta Lastlink deste deploy, vindos só do .env (sem fallback).
const VALID_TOKENS = new Set(
  [
    process.env.LASTLINK_WEBHOOK_SECRET,
    process.env.LASTLINK_WEBHOOK_SECRET_SEM_GALE
  ].filter((t): t is string => !!t)
)

const ACTIVE_EVENTS = new Set([
  'paid',
  'active',
  'approved',
  'completed',
  'product_access_started',
  'purchase_approved',
  'purchase_completed',
  'subscription_started',
  'subscription_renewed'
])

const INACTIVE_EVENTS = new Set([
  'product_access_ended',
  'purchase_refused',
  'purchase_canceled',
  'purchase_refunded',
  'subscription_canceled',
  'subscription_expired',
  'chargeback'
])

const pickEmail = (body: any): string | null => {
  return (
    body?.Data?.Member?.Email
    || body?.data?.member?.email
    || body?.Member?.Email
    || body?.member?.email
    || body?.Buyer?.Email
    || body?.buyer?.email
    || body?.Data?.Buyer?.Email
    || body?.data?.buyer?.email
    || body?.customer?.email
    || body?.Customer?.Email
    || body?.email
    || body?.Email
    || null
  )
}

const pickEvent = (body: any): string => {
  return String(
    body?.Event
    || body?.event
    || body?.EventType
    || body?.event_type
    || body?.status
    || body?.Status
    || ''
  )
}

const pickProductName = (body: any): string | null => {
  const products = body?.Data?.Products || body?.Products || body?.products
  if (Array.isArray(products) && products.length) {
    return products[0]?.Name || products[0]?.name || null
  }
  return (
    body?.Data?.Product?.Name
    || body?.data?.product?.name
    || body?.Product?.Name
    || body?.product?.name
    || body?.plan?.name
    || body?.Plan?.Name
    || null
  )
}

const pickPhone = (body: any): string | null => {
  return (
    body?.Data?.Member?.PhoneNumber
    || body?.Data?.Member?.Phone
    || body?.data?.member?.phoneNumber
    || body?.data?.member?.phone
    || body?.Data?.Buyer?.PhoneNumber
    || body?.Data?.Buyer?.Phone
    || body?.data?.buyer?.phoneNumber
    || body?.data?.buyer?.phone
    || body?.Member?.PhoneNumber
    || body?.member?.phone
    || body?.Buyer?.PhoneNumber
    || body?.buyer?.phone
    || body?.customer?.phone
    || body?.phone
    || body?.Phone
    || null
  )
}

const pickName = (body: any): string | null => {
  return (
    body?.Data?.Member?.Name
    || body?.data?.member?.name
    || body?.Data?.Buyer?.Name
    || body?.data?.buyer?.name
    || body?.Member?.Name
    || body?.member?.name
    || body?.Buyer?.Name
    || body?.buyer?.name
    || body?.customer?.name
    || body?.name
    || body?.Name
    || null
  )
}

const pickOrderId = (body: any): string | null => {
  return (
    body?.Data?.SubscriptionId
    || body?.data?.subscriptionId
    || body?.SubscriptionId
    || body?.Data?.PurchaseId
    || body?.PurchaseId
    || body?.purchase_id
    || body?.order_id
    || body?.OrderId
    || body?.Id
    || body?.id
    || null
  )
}

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'x-lastlink-token')
    || getQuery(event).token as string

  if (!VALID_TOKENS.has(token)) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const body = await readBody(event)
  console.log('[Lastlink Webhook] payload recebido:', JSON.stringify(body, null, 2))

  const email = pickEmail(body)
  const eventName = pickEvent(body)

  if (!email) {
    console.warn('[Lastlink Webhook] Email não encontrado. Evento:', eventName)
    throw createError({ statusCode: 400, message: 'Email não encontrado no payload' })
  }

  const evLower = eventName.toLowerCase()
  const isActive = ACTIVE_EVENTS.has(evLower)
  const isInactive = INACTIVE_EVENTS.has(evLower)

  // contato pode vir em qualquer evento (nome/telefone só existem em alguns)
  const phone = pickPhone(body)
  const name = pickName(body)

  const db = await getDb()
  const col = db.collection('subscriptions')

  // Evento que não muda status (ex.: confirmação de compra). Mesmo assim pode
  // trazer nome/telefone — então atualiza o contato se a assinatura já existir,
  // sem criar registro novo só por causa disso.
  if (!isActive && !isInactive) {
    if (phone || name) {
      const contact: Record<string, any> = { updated_at: new Date() }
      if (phone) contact.phone = phone
      if (name) contact.name = name
      const r = await col.updateOne({ email: email.toLowerCase() }, { $set: contact })
      console.log(`[Lastlink Webhook] ${eventName} sem mudança de status; contato ${r.matchedCount ? 'atualizado' : 'sem assinatura existente'}: ${email}`)
      return { received: true, ignored: true, contactUpdated: !!r.matchedCount, event: eventName }
    }
    console.log(`[Lastlink Webhook] Evento ignorado para ${email}: ${eventName}`)
    return { received: true, ignored: true, event: eventName }
  }

  const set: Record<string, any> = {
    email: email.toLowerCase(),
    status: isActive ? 'active' : 'inactive',
    role: isActive ? 'paid' : 'free',
    lastlink_status: eventName,
    lastlink_order_id: pickOrderId(body),
    product: pickProductName(body),
    updated_at: new Date()
  }
  // só grava contato quando vier no payload (não sobrescreve com null)
  if (phone) set.phone = phone
  if (name) set.name = name

  await col.updateOne(
    { email: email.toLowerCase() },
    { $set: set, $setOnInsert: { created_at: new Date() } },
    { upsert: true }
  )

  console.log(`[Lastlink Webhook] ${email} → ${isActive ? 'ATIVO' : 'INATIVO'} (${eventName})`)

  return { received: true, email, status: isActive ? 'active' : 'inactive' }
})
