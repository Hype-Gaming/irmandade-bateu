// Links de contato do app. Fonte única: trocar número/grupo = mexer só aqui.
// Em Nuxt 4 o diretório shared/ é importável tanto no client quanto no server.

// Suporte 1:1. Usado no pop-up de bloqueio (BlockedModal) e na seção de ajuda
// do minicurso (/aulas).
//
// É um link curto wa.me/message/<código>, que NÃO aceita `?text=`. O modal de
// bloqueio antes mandava a mensagem "gostaria de desbloquear meu acesso"
// pré-preenchida; com o link curto o usuário chega no chat em branco.
export const SUPPORT_WHATSAPP_URL = 'https://wa.me/message/UJJETWZ6UC4RI1'

// Grupo da comunidade. É o convite do grupo, não um chat 1:1.
export const COMMUNITY_WHATSAPP_URL = 'https://chat.whatsapp.com/CG4CPX8zJqJ55G2qVoUMJq?s=sh&p=i&ilr=1'
