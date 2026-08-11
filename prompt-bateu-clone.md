# Prompt — levar a repaginada do Club da BB para o repositório Bateu

Copie o bloco abaixo e execute-o com o agente aberto **no repositório de destino da Bateu**.
O repositório `clube_BB` deve estar disponível localmente para consulta.

---

## PROMPT

Você está trabalhando no repositório da aplicação cuja marca/slug é **`bateu`**. Sua missão é
levar para este projeto a repaginada visual e de experiência já implementada no repositório
**`clube_BB`**, adaptando-a à identidade e ao conteúdo da Bateu.

Trate o estado atual da branch ativa de `clube_BB` como fonte de verdade para layout, componentes,
responsividade e acabamento visual. Use estes arquivos como referências prioritárias:

- `app/assets/css/main.css`
- `app/assets/css/admin-theme.css`
- `app/app.vue`
- `app/pages/index.vue`
- `app/pages/auth/login.vue`
- `app/pages/aulas.vue`
- `app/pages/assinar.vue`
- `app/pages/gestao.vue`
- `app/pages/jogo/[id].vue`
- `app/pages/admin/*.vue`
- `app/components/*.vue`
- `app/components/admin/*.vue`

Os arquivos `print-club-da-bb-desktop.png` e `print-club-da-bb-mobile.png` são referências visuais
secundárias. Se houver divergência, prevalece o código atual.

### Resultado esperado

Entregue na Bateu a mesma linguagem visual e o mesmo nível de acabamento do Club da BB:

- experiência dark premium, com fundos quase pretos e variações vinho;
- cor de destaque rosa `#ff1493`, com tons auxiliares como `#ff7ac8`, `#ff4db8`, `#b80067` e
  `#ffb3dc`;
- superfícies elevadas, bordas suaves, glows discretos e gradientes bem dosados;
- cards arredondados, boa hierarquia tipográfica e estados claros de hover, foco, loading, vazio,
  erro, bloqueado e sucesso;
- cabeçalhos, menus, modais, formulários, banners, cards de jogos e painéis administrativos
  consistentes entre si;
- layout realmente responsivo, sem overflow horizontal e sem conteúdo ou ações cortadas no mobile;
- suporte a `prefers-reduced-motion`, foco visível e contraste legível.

Não faça apenas uma troca global de cores. Reproduza a composição, os espaçamentos, a hierarquia,
os estados interativos e os ajustes responsivos da repaginada.

### Regras obrigatórias da migração

1. Antes de editar, leia as instruções do repositório de destino (`AGENTS.md`, README e scripts do
   `package.json`), confira `git status` e mapeie as diferenças entre os dois projetos.
2. O código da Bateu é a base funcional. Preserve integralmente regras de negócio, autenticação,
   permissões, APIs, banco, webhooks, tracking, checkout, rotas, feature flags e variáveis de
   ambiente existentes no destino.
3. O slug deve continuar sendo exatamente **`bateu`**. Não altere para `esportiva`, `club-da-bb`,
   `clube-bb` ou qualquer outro valor.
4. Preserve a marca **Bateu**: nome, textos comerciais, links, logos, favicons, manifest, banners,
   imagens, dados de suporte e metadados devem vir do projeto Bateu. Não copie conteúdo de marca,
   links de afiliado, checkout, Telegram/WhatsApp ou assets exclusivos do Club da BB.
5. Não copie arquivos inteiros quando isso apagar diferenças funcionais do destino. Compare cada
   tela e transplante somente estrutura visual, estilos e melhorias de UX compatíveis.
6. Não invente assets, URLs, credenciais, produtos ou textos. Quando não houver equivalente Bateu,
   mantenha o conteúdo atual e adapte apenas sua apresentação. Registre qualquer ausência no
   relatório final.
7. Reaproveite componentes e tokens existentes. Centralize cores, superfícies, sombras, raios e
   transições em variáveis CSS sempre que isso reduzir duplicação sem provocar uma refatoração
   desnecessária.
8. Não quebre SSR/hidratação, navegação, acessibilidade nem o comportamento do PWA. Evite APIs do
   browser fora de guards/client lifecycle quando o projeto puder renderizar no servidor.
9. Preserve alterações locais preexistentes e não mexa em arquivos alheios ao escopo.

### Escopo de implementação

Faça a migração nesta ordem:

1. **Fundação visual:** tokens globais, tipografia, reset, fundo, transições, focus ring, scrollbar e
   tema administrativo.
2. **Shell da aplicação:** loading inicial, header, navegação, perfil, saldo e comportamento desktop/mobile.
3. **Home:** avisos, banners, seções, cards, bloqueios, CTAs, estados vazios e grid responsivo.
4. **Fluxos de acesso e compra:** login, assinatura, depósito, KYC, bloqueio e notificações.
5. **Conteúdo e gestão:** aulas e gestão de banca, preservando player, orientação dos vídeos e dados.
6. **Jogos:** aplicar o acabamento visual sem alterar algoritmos, catálogo, sinais, resultados ou
   particularidades semânticas de cada jogo.
7. **Admin:** dashboard, gráfico, tabelas, filtros, formulários, push e webhook com a mesma família
   visual dark/rosa.
8. **Polimento responsivo e acessível:** validar larguras pequenas, tablet e desktop, teclado,
   loading, mensagens de erro e redução de movimento.

### Método de trabalho

- Primeiro apresente um inventário curto do que existe nos dois repositórios e um plano por arquivos.
- Implemente em etapas pequenas e verificáveis.
- Use o diff do `clube_BB` como referência, mas adapte nomes de componentes e estrutura quando os
  projetos não forem idênticos.
- Não pare apenas no diagnóstico: faça as alterações no repositório Bateu.
- Ao encontrar uma diferença funcional, mantenha a implementação da Bateu e incorpore apenas a
  camada visual/UX.

### Validação obrigatória

Ao terminar:

1. Execute os comandos de lint/typecheck/test/build que existirem no `package.json`; no mínimo, o
   build de produção precisa concluir sem erros.
2. Verifique as rotas principais em desktop e mobile, incluindo home, login, aulas, assinatura,
   gestão, ao menos uma página de jogo e as telas administrativas.
3. Confirme que não há overflow horizontal, texto ilegível, modal fora da viewport, imagem
   deformada, ação inacessível ou erro no console.
4. Pesquise no diff por referências indevidas a `Club da BB`, `clube_BB`, `club-da-bb`,
   `esportiva` e por URLs copiadas do projeto de origem. Remova somente as que tenham sido
   introduzidas pela migração; não altere integrações legítimas preexistentes sem evidência.
5. Confirme explicitamente que o slug ativo continua `bateu` e que autenticação, checkout,
   integrações e rotas continuam apontando para as configurações próprias da Bateu.

### Entrega

Finalize com:

- resumo objetivo do que foi migrado;
- lista dos principais arquivos alterados;
- validações executadas e seus resultados;
- diferenças intencionais mantidas na Bateu;
- pendências reais, especialmente assets específicos que não existam no destino.

Não declare conclusão se o build falhar ou se ainda houver referência de marca do Club da BB
introduzida no repositório Bateu.

## FIM DO PROMPT
