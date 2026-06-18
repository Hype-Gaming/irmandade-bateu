// Link de suporte mostrado no pop-up de bloqueio.
// Número com DDI (55) + DDD + número, só dígitos.
const SUPPORT_NUMBER = '5571993626325'
const SUPPORT_MESSAGE = 'Olá, gostaria de desbloquear meu acesso ao app'

export const SUPPORT_WHATSAPP_URL =
  `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`
