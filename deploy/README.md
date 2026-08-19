# deploy/

Arquivos de configuração de infraestrutura. Ficam versionados para que a VPS
possa ser reconstruída sem depender de memória.

| Diretório | Conteúdo |
|---|---|
| [nginx/](nginx/) | virtual host do domínio de produção |

Estes arquivos **não** são aplicados por deploy automático: são copiados à mão
para a VPS na primeira instalação, ou quando mudam. O
[workflow](../.github/workflows/) só atualiza código e recarrega o PM2.

Roteiro completo: [docs/operacao/deploy-vps.md](../docs/operacao/deploy-vps.md).
