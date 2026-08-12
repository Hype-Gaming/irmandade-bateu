// Fonte única da base pública dos vídeos das aulas (bucket R2 + domínio próprio).
// Em Nuxt 4 o diretório shared/ é importável tanto no client quanto no server.
//
// Sem barra no fim. Trocar de bucket ou de provedor = mexer só aqui.
// Vazio desliga o player nativo: toda aula com videoKey cai no aviso "Em breve".
//
// TODO: mover os vídeos para o storage próprio deste deploy. Hoje eles são
// servidos do bucket do projeto de referência (clube_BB). O domínio não aparece
// na interface — só na URL do <video> —, mas a origem é de outro projeto, então
// derrubar aquele bucket derruba as aulas daqui junto.
export const VIDEO_BASE_URL = 'https://video.clubedabb.com'

// Monta a URL pública a partir da chave COMPLETA do objeto no bucket
// (ex.: 'minicurso/como-operar.mp4'). A função não insere prefixo de pasta —
// isso a mantém agnóstica da estrutura do bucket.
// Sem base configurada devolve string vazia, e quem chama trata como "sem vídeo".
export const videoUrl = (key: string): string =>
  VIDEO_BASE_URL && key ? `${VIDEO_BASE_URL}/${key}` : ''
