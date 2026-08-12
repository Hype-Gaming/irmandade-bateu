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
  icon: string
  // Rota interna ('/gestao') ou URL absoluta. Deixe vazio quando `affiliate`
  // for true — nesse caso a página resolve o link.
  url?: string
  // true = usa o link de afiliado da marca ATIVA (shared/brands.ts), em vez de
  // uma URL fixa. Cada deploy roda com uma casa diferente, então cravar o link
  // aqui mandaria o usuário da Bateu se cadastrar na Esportiva.
  affiliate?: boolean
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
    title: 'Como se cadastrar',
    description: 'Veja como criar sua conta e dar os primeiros passos.',
    cover: '/minicurso/como-se-cadastrar.webp',
    videoKey: 'clube-da-bb/como-se-cadastrar.mp4',
    orientation: 'vertical',
    actionLink: {
      label: 'Plataforma que eu opero',
      icon: 'ph:chart-line-up-bold',
      affiliate: true
    }
  },
  {
    title: 'Como operar',
    description: 'Entenda como funciona a operação de forma prática.',
    cover: '/minicurso/como-operar.webp',
    videoKey: 'clube-da-bb/como-operar.mp4',
    orientation: 'horizontal',
    actionLink: {
      label: 'Mesa de operações',
      icon: 'ph:monitor-play-bold',
      affiliate: true
    }
  },
  {
    title: 'Gerenciamento de banca',
    description: 'Aprenda a organizar sua banca com mais consciência.',
    cover: '/minicurso/gerenciamento-de-banca.webp',
    videoKey: 'clube-da-bb/Gerenciamento-de-Banca.mp4',
    orientation: 'horizontal',
    actionLink: {
      label: 'Abrir a gestão de banca',
      url: '/gestao',
      icon: 'ph:calculator-bold'
    }
  },
  {
    title: 'Como entrar no grupo VIP',
    description: 'Entenda o passo final para entrar no grupo VIP e aproveitar o conteúdo completo.',
    cover: '/minicurso/como-entrar-vip.webp',
    videoKey: 'clube-da-bb/como-entrar-no-grupo.mp4',
    orientation: 'vertical'
  }
]
