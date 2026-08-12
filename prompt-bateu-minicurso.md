# Prompt para levar o minicurso ao app da Bateu

Use o texto abaixo dentro do repositório do app da Bateu.

---

Quero que você implemente no app da Bateu a página completa de aulas/minicurso existente no projeto de referência:

`C:\Users\Thiago\Desktop\clube_BB`

Trabalhe de forma autônoma: primeiro inspecione a arquitetura, as rotas, o sistema de autenticação, o tema, a marca e os componentes já existentes no app da Bateu. Depois faça a integração seguindo os padrões do projeto de destino. Não copie cegamente arquivos inteiros nem substitua configurações globais.

## Fonte da implementação

Use como referência principal:

- `C:\Users\Thiago\Desktop\clube_BB\app\pages\aulas.vue`
- `C:\Users\Thiago\Desktop\clube_BB\shared\videos.ts`
- `C:\Users\Thiago\Desktop\clube_BB\shared\support.ts`
- `C:\Users\Thiago\Desktop\clube_BB\public\minicurso\`

## Objetivo

Criar no app da Bateu uma rota `/aulas` com a experiência completa do minicurso:

- cabeçalho com logo da Bateu e botão para voltar à página principal;
- apresentação do minicurso;
- lista de aulas numeradas;
- cards alternados e responsivos;
- capas horizontais e verticais exibidas sem deformação;
- botão de reprodução sobre cada capa;
- modal com player de vídeo nativo;
- suporte correto a vídeos `9:16` e `16:9`;
- fechamento do modal ao clicar no botão ou fora do conteúdo;
- mensagem amigável quando um vídeo não estiver disponível ou falhar;
- seção de suporte usando o WhatsApp configurado no app da Bateu;
- aviso de conteúdo educativo, jogo responsável e proibição para menores de 18 anos.

## Aulas que devem ser levadas

Mantenha esta ordem, os textos e as orientações:

1. **Como se cadastrar**
   - Descrição: `Veja como criar sua conta e dar os primeiros passos.`
   - Capa: `/minicurso/como-se-cadastrar.png`
   - Vídeo: `clube-da-bb/como-se-cadastrar.mp4`
   - Orientação: `vertical`
   - Deve ter um botão para a plataforma usada pela Bateu. Reutilize o link de afiliado já configurado no app de destino; não invente URL.

2. **Como operar**
   - Descrição: `Entenda como funciona a operação de forma prática.`
   - Capa: `/minicurso/como-operar.png`
   - Vídeo: `clube-da-bb/como-operar.mp4`
   - Orientação: `horizontal`
   - Deve ter um botão para a mesa/plataforma de operações usando o link já configurado na Bateu.

3. **Gerenciamento de banca**
   - Descrição: `Aprenda a organizar sua banca com mais consciência.`
   - Capa: `/minicurso/gerenciamento-de-banca.png`
   - Vídeo: `clube-da-bb/Gerenciamento-de-Banca.mp4`
   - Orientação: `horizontal`

4. **Como entrar no grupo VIP**
   - Descrição: `Entenda o passo final para entrar no grupo VIP e aproveitar o conteúdo completo.`
   - Capa: `/minicurso/como-entrar-vip.png`
   - Vídeo: `clube-da-bb/como-entrar-no-grupo.mp4`
   - Orientação: `vertical`

## Imagens obrigatórias

Copie fisicamente para `public/minicurso/` do app da Bateu todas estas imagens do projeto de referência:

- `como-se-cadastrar.png`
- `como-operar.png`
- `gerenciamento-de-banca.png`
- `como-entrar-vip.png`
- `como-entrar-no-grupo.png`

Não apenas referencie caminhos do outro repositório. Confirme que os arquivos existem no projeto da Bateu e são entregues pelas URLs `/minicurso/...`.

Não copie `banner-clube-da-bb.png`, `logo.png` nem qualquer arte que mostre a marca CLUB DA BB. No topo da página, reutilize logo, banner e componentes visuais próprios da Bateu. Se não existir banner adequado, mantenha uma apresentação em CSS com a identidade já usada no app, sem criar uma referência visual à outra marca.

## Vídeos

Centralize a URL pública dos vídeos em uma única função/configuração, seguindo o padrão de `shared/videos.ts`. Não espalhe URLs completas pela página.

Se o app da Bateu ainda não possuir host ou bucket próprio para esses vídeos, mantenha temporariamente a base pública funcional do projeto de referência:

`https://video.clubedabb.com`

Nesse caso, deixe um comentário claro de migração, como `TODO: mover vídeos para o storage da Bateu`, sem exibir “Clube da BB” na interface. Se a Bateu já tiver storage/CDN de mídia, use esse serviço e ajuste as chaves somente depois de confirmar que os quatro arquivos existem nele.

O player deve usar:

- `controls`;
- `playsinline`;
- `preload="metadata"`;
- a capa da aula como `poster`;
- tratamento de `error`;
- `object-fit: contain`, para nunca cortar o vídeo;
- modal estreito para `vertical` (`9:16`) e largo para `horizontal` (`16:9`).

## Adaptação obrigatória para a marca Bateu

Remova da nova implementação toda referência textual ou visual a:

- `CLUB DA BB`;
- `Clube da BB`;
- `BB` como nome da marca;
- Irmandade Club.

Troque por textos naturais da Bateu, por exemplo:

- `Bateu apresenta`;
- `Voltar ao início` ou o rótulo já usado no app;
- `Suporte da Bateu`;
- título da página `Minicurso - Bateu`.

Reutilize as cores, fontes, espaçamentos, botões, ícones e componentes do design system da Bateu quando existirem. Preserve a boa experiência visual da referência, mas o resultado deve parecer uma parte nativa do app de destino.

## Integração

- Adicione uma entrada visível para `/aulas` na página principal, menu ou área de perfil equivalente à usada pelo app.
- Respeite a política de autenticação já existente. Se as demais áreas de conteúdo exigirem login, proteja `/aulas` da mesma forma; se forem públicas, mantenha a rota pública.
- Reutilize a configuração central de suporte/WhatsApp e os links de afiliado existentes.
- Não altere banco de dados, webhooks, pagamentos, assinatura ou autenticação além do necessário para registrar/proteger a rota.
- Não remova nem sobrescreva mudanças locais que já estejam no repositório.

## Qualidade e acessibilidade

- Preserve `alt`, `aria-label`, `role="dialog"` e `aria-modal="true"`.
- Garanta navegação e leitura adequadas no celular.
- Não deforme capas verticais em molduras horizontais.
- Não permita que o erro de uma aula contamine a reprodução da seguinte; resete o estado de erro ao abrir uma aula.
- Evite intervalos, listeners ou estados que permaneçam ativos depois que a página for desmontada.

## Verificação obrigatória

Ao terminar:

1. Execute o build e os testes disponíveis no app da Bateu.
2. Confirme que `/aulas` abre pelo link incluído na interface.
3. Confirme que as cinco imagens estão dentro de `public/minicurso/` no projeto de destino.
4. Abra todas as quatro aulas e verifique capa, orientação, modal e player.
5. Confirme que os vídeos verticais não são cortados e os horizontais não são espremidos.
6. Teste o fallback simulando uma chave inválida e depois abra outra aula, confirmando que o erro foi resetado.
7. Pesquise nos arquivos alterados por `CLUB DA BB`, `Clube da BB`, `Irmandade` e referências visuais antigas; não deve restar nenhuma na interface criada.
8. Revise o resultado em desktop e mobile.

No relatório final, liste os arquivos criados/alterados, diga de onde os vídeos estão sendo servidos, informe os comandos de validação executados e registre qualquer pendência real de infraestrutura. Não encerre apenas com instruções: implemente e valide a funcionalidade.

---
