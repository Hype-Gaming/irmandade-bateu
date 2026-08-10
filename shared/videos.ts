// Fonte única da base pública dos vídeos das aulas (bucket R2 + domínio próprio).
// Em Nuxt 4 o diretório shared/ é importável tanto no client quanto no server.
//
// AINDA NÃO CONFIGURADO: enquanto esta constante estiver vazia, nenhuma aula com
// videoKey toca — o modal cai no aviso "Em breve". Preencha com o domínio do
// bucket (ex.: 'https://video.seudominio.com', sem barra no fim) quando os
// vídeos subirem. Trocar de bucket ou de provedor = mexer só aqui.
export const VIDEO_BASE_URL = ''

// Monta a URL pública a partir da chave COMPLETA do objeto no bucket
// (ex.: 'minicurso/como-operar.mp4'). A função não insere prefixo de pasta —
// isso a mantém agnóstica da estrutura do bucket.
// Sem base configurada devolve string vazia, e quem chama trata como "sem vídeo".
export const videoUrl = (key: string): string =>
  VIDEO_BASE_URL && key ? `${VIDEO_BASE_URL}/${key}` : ''
