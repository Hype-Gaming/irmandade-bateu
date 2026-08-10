// Proxy do histórico do catalogador (casino-data.grupoautoma.com).
//
// Por que existe: o servidor do grupoautoma responde 403 para domínios que não
// estão na allowlist dele (bloqueio por Referer/IP de origem). Chamado direto do
// browser a partir de um domínio novo, dá 403 e o histórico do jogo fica vazio.
//
// Este proxy roda no servidor (mesma VPS já liberada) e repassa a chamada com o
// Referer de um domínio autorizado — então o histórico funciona em qualquer
// domínio novo, sem depender de nova liberação manual do grupoautoma.
//
// O front chama /api/casino-results com os mesmos params de antes
// (collection, game, limit, _t); eles são repassados intactos.

const CATALOGADOR_BASE = 'https://casino-data.grupoautoma.com'

// Domínio que o grupoautoma já aceita — enviado como Referer/Origin no proxy.
// Configurável por env caso a allowlist deles mude.
const ALLOWED_REFERER =
  process.env.CATALOGADOR_REFERER || 'https://app.irmandadebacbo.com'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  try {
    return await $fetch(`${CATALOGADOR_BASE}/results`, {
      query,
      headers: {
        Referer: ALLOWED_REFERER,
        Origin: ALLOWED_REFERER
      }
    })
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.response?.status || 502
    throw createError({
      statusCode,
      message: `Falha ao buscar resultados do catalogador (${statusCode})`
    })
  }
})
