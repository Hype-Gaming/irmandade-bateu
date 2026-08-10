// Conteúdo do minicurso. É o único arquivo a editar para trocar aula, ordem,
// vídeo ou capa — a página /aulas só renderiza o que estiver aqui.
//
// Cada aula toca de uma destas duas formas, nesta ordem de prioridade:
//   1. videoKey  — chave COMPLETA do objeto no bucket R2 (ex.: 'minicurso/aula-1.mp4'),
//                  tocada no player nativo. Exige VIDEO_BASE_URL em shared/videos.ts.
//   2. embedUrl  — URL de embed do YouTube, tocada em iframe.
// Sem nenhuma das duas (ou com o bucket ainda não configurado), o modal mostra
// o aviso "Em breve" em vez de um player quebrado.
//
// cover é opcional: sem capa, o card cai num bloco com o número e o título da
// aula, então dá pra publicar conteúdo antes da arte ficar pronta.
//
// orientation deve refletir a proporção REAL do arquivo — gravação de mesa
// costuma ser 16:9 e gravação de celular 9:16. O modal se adapta em vez de
// deformar o vídeo numa moldura errada. Vídeo do YouTube é sempre horizontal.

export interface AulaActionLink {
  label: string
  url: string
  icon: string
}

export interface Aula {
  title: string
  description: string
  cover?: string
  videoKey?: string
  embedUrl?: string
  orientation: 'vertical' | 'horizontal'
  actionLink?: AulaActionLink
}

export const AULAS: Aula[] = [
  {
    title: 'Boas Vindas',
    description: 'Introdução à plataforma e como aproveitar ao máximo o que ela oferece.',
    embedUrl: 'https://www.youtube.com/embed/wl4OV4A0_jQ',
    orientation: 'horizontal'
  },
  {
    title: 'Gestão de Banca',
    description: 'Aprenda a gerenciar sua banca de forma inteligente e sustentável.',
    embedUrl: 'https://www.youtube.com/embed/sqqiDdWbCng',
    orientation: 'horizontal',
    actionLink: {
      label: 'Abrir a gestão de banca',
      url: '/gestao',
      icon: 'ph:calculator-bold'
    }
  },
  {
    title: 'Planilha na Prática',
    description: 'Como utilizar a planilha de controle para acompanhar seus resultados.',
    embedUrl: 'https://www.youtube.com/embed/mR7-zf8zq4E',
    orientation: 'horizontal'
  },
  {
    title: 'Estratégia',
    description: 'Conheça as melhores estratégias para maximizar seus ganhos.',
    embedUrl: 'https://www.youtube.com/embed/MQib7ycd6G8',
    orientation: 'horizontal'
  }
]
