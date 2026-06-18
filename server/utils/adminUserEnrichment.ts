import type { Document } from 'mongodb'

export const HOUR_MS = 60 * 60 * 1000

// $unionWith que injeta assinantes ativos SEM registro em app_users como
// "usuários" sintéticos (pagaram via webhook mas nunca abriram o app).
// Compartilhado entre /api/admin/users e /api/admin/stats pra não divergir.
export const buildSubsOnlyUnion = (rx: RegExp | null = null): Document[] => [
  {
    $unionWith: {
      coll: 'subscriptions',
      pipeline: [
        { $match: { status: 'active' } },
        { $group: { _id: '$email', phone: { $first: '$phone' }, name: { $first: '$name' } } },
        { $match: { _id: { $ne: null } } },
        { $lookup: { from: 'app_users', localField: '_id', foreignField: 'email', as: '_au' } },
        { $match: { _au: { $size: 0 } } },
        {
          $project: {
            _id: 0,
            email: '$_id',
            name: { $ifNull: ['$name', null] },
            phone: { $ifNull: ['$phone', null] },
            brand_slug: { $literal: null },
            blocked: { $literal: false },
            first_seen_at: { $literal: null },
            last_seen_at: { $literal: null },
            source: { $literal: 'subscription' }
          }
        },
        ...(rx ? [{ $match: { email: rx } }] : [])
      ]
    }
  }
]

// Estágios de $lookup + campos derivados (assinatura, depósitos e tag de risco)
// compartilhados entre /api/admin/users e /api/admin/stats.
//
// Regra da tag (spec 2026-06-12): elegível se assinatura ativa E first_seen_at
// posterior à ativação da assinatura E zero PIX gerados. Aí:
//   first_seen_at <= now-48h  -> 'risk_48h'
//   first_seen_at <= now-24h  -> 'risk_24h'
export const buildUserEnrichmentStages = (now = new Date()): Document[] => {
  const cutoff24 = new Date(now.getTime() - 24 * HOUR_MS)
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)

  return [
    { $lookup: { from: 'subscriptions', localField: 'email', foreignField: 'email', as: 'sub' } },
    { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
    { $lookup: { from: 'user_contact_status', localField: 'email', foreignField: 'email', as: 'cstatus' } },
    {
      $addFields: {
        subscription: {
          $cond: [{ $eq: [{ $arrayElemAt: ['$sub.status', 0] }, 'active'] }, 'paid', 'free']
        },
        sub_created_at: { $arrayElemAt: ['$sub.created_at', 0] },
        deposits_count: { $size: '$deps' },
        deposits_sum: { $sum: '$deps.amount' },
        // status de contato manual (CRM). Sem registro = 'pendente'.
        contact_status: { $ifNull: [{ $arrayElemAt: ['$cstatus.status', 0] }, 'pendente'] },
        // override manual da tag. 'auto' = usa o cálculo; 'none' = sem tag.
        tag_override: { $ifNull: [{ $arrayElemAt: ['$cstatus.tag', 0] }, 'auto'] }
      }
    },
    {
      $addFields: {
        // $gt contra null usa a ordem de tipos do BSON: qualquer Date > null,
        // então isso cobre "campo existe e não é null".
        risk_eligible: {
          $and: [
            { $eq: ['$subscription', 'paid'] },
            { $gt: ['$first_seen_at', null] },
            { $gt: ['$sub_created_at', null] },
            { $gte: ['$first_seen_at', '$sub_created_at'] },
            { $eq: ['$deposits_count', 0] }
          ]
        },
        // pago que NUNCA abriu o app (sem first_seen_at) e sem depósito.
        // $not contra "$gt null" = "first_seen_at é null ou não existe".
        no_access_eligible: {
          $and: [
            { $eq: ['$subscription', 'paid'] },
            { $gt: ['$sub_created_at', null] },
            { $not: [{ $gt: ['$first_seen_at', null] }] },
            { $eq: ['$deposits_count', 0] }
          ]
        }
      }
    },
    {
      $addFields: {
        auto_risk_tag: {
          $switch: {
            branches: [
              { case: { $and: ['$risk_eligible', { $lte: ['$first_seen_at', cutoff48] }] }, then: 'risk_48h' },
              { case: { $and: ['$risk_eligible', { $lte: ['$first_seen_at', cutoff24] }] }, then: 'risk_24h' },
              // pago, nunca acessou e já passou da carência de 24h da assinatura
              { case: { $and: ['$no_access_eligible', { $lte: ['$sub_created_at', cutoff24] }] }, then: 'risk_no_access' }
            ],
            default: null
          }
        }
      }
    },
    {
      $addFields: {
        // tag efetiva: override manual manda; 'auto' cai no cálculo, 'none' zera.
        risk_tag: {
          $switch: {
            branches: [
              { case: { $eq: ['$tag_override', 'none'] }, then: null },
              { case: { $eq: ['$tag_override', 'auto'] }, then: '$auto_risk_tag' }
            ],
            default: '$tag_override'
          }
        }
      }
    },
    { $project: { sub: 0, deps: 0, cstatus: 0, risk_eligible: 0, no_access_eligible: 0 } }
  ]
}
