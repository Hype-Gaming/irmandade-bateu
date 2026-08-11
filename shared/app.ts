// Nome de exibição do app (o "clube"), separado da casa de apostas.
// Em Nuxt 4 o diretório shared/ é importável tanto no client quanto no server.
//
// Isto NÃO é a marca da casa de apostas — essa vive em shared/brands.ts e é
// escolhida por NUXT_PUBLIC_APP_BRAND. Aqui é só o nome do produto que aparece
// em títulos, metas e textos. Trocar de nome = mexer só nesta constante
// (exceto public/manifest.json e app.html, que são estáticos e não importam TS).
export const APP_NAME = 'Clube da BB'

export const APP_TAGLINE = 'Sua comunidade de estratégias'

export const APP_DESCRIPTION = `${APP_NAME} - ${APP_TAGLINE}`

// Versão do nome própria pra nome de arquivo (ex.: o CSV de usuários do admin):
// sem acento, minúscula e com hífen no lugar do espaço.
// ̀-ͯ é o bloco de acentos que o normalize('NFD') separa das letras.
export const APP_SLUG = APP_NAME
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
