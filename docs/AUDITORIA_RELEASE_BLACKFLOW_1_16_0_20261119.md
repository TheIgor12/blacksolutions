# Auditoria técnica e publicação — BlackFlow 1.16.0
**Data:** 19 de novembro de 2026
**Ambiente:** repositório `TheIgor12/blacksolutions`, Supabase `blszdbjpxgtloblxlusr`, domínio configurado `blackflow.app.br`.

## Defeito principal encontrado
O código da interface estava atualizado em módulos isolados, mas o elemento de versão embutido em `index.html` e `app/index.html` continuava em **1.14.0**; `versao.json` também tinha **1.14.0**. O PWA em `sw.js` e `app/sw.js` persistia cache **blackflow-v14**. Por isso o indicador visível não representava a revisão dos módulos.

## Correções realizadas (release 1.16.0)
1. Versão sincronizada: `VERSAO_APP='1.16.0'` em ambas as páginas e `versao.json=1.16.0`. Códigos de versão dos scripts de módulos clínico, receituário, fiscal e cadastro fiscal atualizados para **1.16.0**.
2. SW/PWA: cache **blackflow-v16-20261119**; atualização pela rede e `updateViaCache:'none'`; cache offline restrito a recursos estáticos públicos, excluindo URL de verificação com token; não devolver HTML quando um JS estiver indisponível. Manifesto PWA atualizado na raiz e em `app/`.
3. Medicina: novo segmento `medicina` para consultórios médicos, separado de Podologia, Odontologia e Biomedicina. Cadastro médico com CRM e UF; tabelas e funções de segmento reconhecem `medicina`; acesso a prontuário e receituário vinculado a um profissional CRM ativo na clínica.
4. Receita simples (Medicina): formulário com nome do medicamento, apresentação/concentração, via, dose/frequência, duração e quantidade; uso de modelo PDF individual; validação do profissional CRM/UF no momento de salvar modelo e gerar documento; QR de consulta com hash, PDF sempre marcado **RASCUNHO — NÃO ASSINADO**; sem falsa emissão de controlados, antimicrobianos sujeitos à retenção ou notificações SNCR.
5. Banco: migração `blackflow_1_16_0_medicina_crm_20261119` aplicada, atualizando restrições de segmentos/conselhos e funções SQL, preservando dados e políticas existentes.
6. Verificação automatizada: `.github/workflows/blackflow-release-smoke.yml` executa `scripts/auditar-release.mjs` em push e PR, para impedir versões divergentes, scripts com erro sintático e `sw.js` defasado.

## Escopo do controle de acesso
- Cadastro profissional: `bf_profissionais` — restrição de CRM/CRO/CRBM e vínculo `clinica_id,user_id,segmento`.
- Emissão de documentos: `bf_receituario_pode_emitir` exige membro do tenant, CRM ativo e UF/inscrição numericamente bem formadas para Medicina. Os dados sensíveis continuam sujeitos às RLS existentes.
- Estabelecimentos diferentes não compartilham prescrições, logins profissionais ou credenciais fiscais.
- **A presença de CRM preenchido não comprova a regularidade do registro no CRM/CFM**; documentação profissional deve ser validada antes de utilizar uma prescrição como documento médico.

## Checklist de verificação
| Área | Resultado |
| --- | --- |
| Versão exibida em raiz e /app | 1.16.0, sincronizada no código |
| versao.json | 1.16.0, atualização registrada no código |
| SW e manifestos da raiz e /app | Atualizados e idênticos |
| JavaScript dos módulos fiscal, clínico e receituário | V8: sintaxe válida |
| Dez scripts inline de cada index.html | V8: sintaxe válida |
| SQL: bf_segmento_disponivel('medicina') | true; segmentos existentes preservados |
| SQL: constraints de prontuário, receita, profissional e catálogo | aceitam Medicina; Conselho CRM |
| Roteador fiscal nacional | Endpoint Supabase ativo; 60/60 cenários sintéticos aprovados (release anterior) |
| Autoteste fiscal por município | Endpoint Supabase ativo; testes sintéticos aprovados |
| NFS-e real via SEFIN/município | Não habilitada; requer credenciamento, assinatura e autorização oficial |
| Receitas médicas simples | Disponibilizados rascunhos; assinatura a validar externamente |
| Receitas médicas controladas | Não habilitadas, sem falsa numeração ou QR de Anvisa |
| End-to-end com login e CNPJ real | Não comprovado nesta auditoria |
| Resposta HTTPS do domínio e atualização de cache no dispositivo real | Requer verificação externa após publicação |
| Aplicativo Windows instalável | A versão web não substitui eventual versão empacotada; compilação/instalador não testado |

## Alertas de segurança e conformidade
- O linter de segurança Supabase já relatou alertas relacionados a políticas RLS ausentes em tabelas específicas, `search_path` mutável, funções SECURITY DEFINER executáveis e proteção de senhas vazadas. **Esses avisos não foram eliminados em bloco** porque qualquer alteração indiscriminada poderia quebrar permissões de clientes. Exigem revisão separada por função/tabela.
- A aplicação web tem um `index.html` monolítico (aproximadamente 0,9 MB) e recursos legados; desempenho e teste completo de interface em navegador autenticado seguem recomendados.
- Validação por QR/hash da receita apenas confirma registro/integridade. Assinatura criptográfica e qualificação profissional precisam de validação real no ITI/CFM.
- As APIs oficiais da NFS-e e SNCR têm documentação pública, mas **credenciais e autorização para produzir documentos em nome de cada titular não são públicas**. Nenhuma simulação constitui homologação governamental.

## Referências
- https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-eletronico
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- https://validar.iti.gov.br/
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security

**Conclusão:** a inconsistência de versão/cache foi corrigida no código, a opção Medicina e a geração de rascunhos médicos simples foram incorporadas e o banco foi migrado com sucesso. Publicação no domínio e testes reais devem ser verificados após merge. Não há fundamento para declarar emissão fiscal real homologada ou assinatura médica automaticamente válida.
