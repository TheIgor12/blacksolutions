# BlackFlow — auditoria técnica delimitada e integração fiscal
**Data:** 19/11/2026 | **Escopo:** GitHub `TheIgor12/blacksolutions` e Supabase `blszdbjpxgtloblxlusr`.

## Resultado objetivo
**Não está homologada a emissão automática de NFS-e.** A NFS-e exige prestador habilitado, parâmetros tributários, assinatura de DPS/XML, certificado ICP-Brasil do emitente ou de procurador eletrônico autorizado, sob guarda segura, comunicação mTLS e confirmação fiscal do órgão emissor, além de testes oficiais. Nunca transformar um rascunho em nota "autorizada" apenas pela interface ou por confirmação de pagamento.

### Configuração fiscal constatada
| Item | Estado em 19/11 |
|---|---|
| CNPJ cadastrado | Sim |
| IBGE município | Sim |
| Inscrição municipal | Não preenchida |
| Código tributário nacional | Não preenchido |
| Integrador fiscal | `nao_configurado` |
| Situação integração | `nao_configurada` |
| Emissão habilitada | `false` |
| Ambiente | `homologacao` (configuração interna, **não** comprovação de homologação) |
| Notas / tentativas registradas | 0 / 0 |

## Auditoria por módulo
| Área | Evidência conferida | Constatação / pendência |
|---|---|---|
| Cadastro de clínica e usuários | `clinicas`, `membros` e RLS | Estrutura de multiempresa. Revisar privilégios e rotas públicas de criação/alteração de acesso; não houve pentest. |
| Agenda e atendimento | Código `index.html`, `registros`, `agenda_online` | Fluxos existentes; funcionamento transacional e cenários de simultaneidade **não testados** nesta auditoria. |
| Financeiro e pagamentos | `index.html`, `bf_fiscal_pagamentos`, módulo fiscal | Conciliação financeira não é autorização fiscal. Conferir duplicidade, parcelas, estorno e idempotência ao integrar. |
| Prontuários e clínica | `bf-clinical.js`, tabelas clínicas com RLS | Operações cadastradas; controlar acesso pelo profissional, segmento e clínica. Revisão completa LGPD e prontuário não realizada. |
| Receituário eletrônico | `bf-receituario.js`, Supabase Storage privado e RLS | Gerava rascunhos e permitia anexar assinatura externa, **sem validar assinatura**. Agora inclui QR de consulta e hashes SHA-256. |
| Notas de serviço | `bf-fiscal-advanced.js`, função `bf-modulos-fiscal` | Cadastro, validação e rascunhos existentes. Rota `emitir` explicitamente bloqueia envio real enquanto integração não estiver pronta. |
| Cadastro fiscal | `bf-cadastro-fiscal.js`, `bf_fiscal_config` | CNPJ vinculado, mas faltam inscrição municipal e código tributário; contador precisa confirmar regime, incidência e códigos. |
| Armazenamento de documentos | Storage de receituários, tabelas fiscais e hash de PDFs | Armazenar XML autorizado e DANFSe em local protegido e trilha de auditoria; verificar retenção e recuperação. |
| Segurança Supabase | Advisor `security` e políticas existentes | 52 alertas de RPCs `SECURITY DEFINER` executáveis por `anon` (algumas públicas de propósito); 12 `search_path` mutáveis; 8 tabelas com RLS sem políticas (podem ser propositalmente privadas). Analisar caso a caso, sem revogar indevidamente serviços ativos. |
| Interface web e publicação | `index.html` e cópia em `/app`; GitHub Pages via `CNAME` | Arquivos duplicados requerem sincronia; cache de módulos atualizado. Sem teste completo em navegador. |

## Alterações introduzidas
1. QR Code ao fim de cada novo PDF de rascunho de receituário no editor BlackFlow. O QR contém link HTTPS para consulta de registro com token aleatório de 256 bits.
2. No banco: persistir **somente SHA-256 do token**, não o segredo; índice exclusivo por hash, hashes SHA-256 do PDF de rascunho e do PDF anexado externamente.
3. Função pública `bf-receita-validar` no Supabase: retorna apenas tipo, estado e hashes, não paciente nem texto clínico. Confere **registro**, não assinatura, competência legal ou prescrição controlada.
4. Página `/validar/receita/`: consulta o código e oferece comparação local de SHA-256 do PDF (o arquivo não é enviado). Link ao validador oficial ITI.
5. Diagnóstico de estado da integração fiscal na interface (não transmite NFS-e).
6. Páginas principal e `/app` sincronizadas. PDFs antigos não adquirem QR retroativamente.

## Limites legais e de segurança
- O QR **não é** selo ou assinatura certificada da ICP-Brasil. Um documento pode constar como `assinado_externo_nao_validado` sem verificação criptográfica. Nunca mudar o rótulo para "assinatura válida" sem validação real.
- Para receitas controladas ou de exigência específica, cumprir Anvisa/SNCR e o respectivo fluxo de autenticação. Não se deve criar QR que simula o QR oficial da Anvisa.
- Transmitir NFS-e somente via emissor/provedor autorizado, com confirmação de autorização e XML íntegro; nunca inferir autorização a partir de Pix/cartão.

## Checklist para homologar NFS-e no futuro
1. Confirmar CNPJ, município/adesão à NFS-e nacional, regime tributário, inscrição municipal quando aplicável, CNAE, código de tributação nacional/municipal, NBS e retenções com contador.
2. Credenciar o prestador na API e configurar certificado ICP-Brasil do emitente ou procurador eletrônico autorizado em cofre de segredos/serviço de assinatura **fora do navegador e fora do GitHub**; aprovar custos de certificadora/integrador.
3. Implementar DPS no leiaute oficial vigente e assinatura XML; comunicação com o endpoint fiscal adequado em mTLS. Anotar versões, horários, erros, protocolos e identificadores idempotentes.
4. Homologar com documentos de teste no ambiente oficial e reprocessar falhas sem duplicar NFS-e. Validar retorno por consulta oficial.
5. Liberar produção por estabelecimento **somente após prova de autorização**, armazenar XML autorizado e DANFSe, conectar cancelamento/substituição/sincronização e auditoria.
6. Validar cenários: CNPJ sem habilitação, 400/401/403, certificado expirado, indisponibilidade, timeout depois de envio, tentativa duplicada, rejeição e reconsulta.

## Testes executados / não executados
- **Executado:** sintaxe JavaScript de `bf-receituario.js` e `bf-fiscal-advanced.js` por `new Function`; verificação dos 3 campos novos de banco; migration aplicada no Supabase; função de consulta com estado `ACTIVE`; leitura dos status fiscais; verificação das cópias em raiz e `/app`.
- **Não executado:** QR escaneado num navegador real, geração de receita com paciente/modelo real, upload de arquivo assinado de exemplo, teste de ponta a ponta do endpoint HTTP, envio/consulta oficial de NFS-e, homologação e testes de carga/pentesting.
- **Não alterar:** notas fiscais de terceiros, prontuários, receitas antigas e CNPJ; nada disso foi reescrito pela atualização do QR.

## Referências públicas
- Emissor nacional e APIs: https://www.gov.br/nfse/pt-br
- Emissor oficial NFS-e: https://www.nfse.gov.br/EmissorNacional/
- Validação oficial de assinatura: https://validar.iti.gov.br/
- Anvisa (receituário controlado e SNCR): https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr
- Segurança Supabase: https://supabase.com/docs/guides/database/database-linter
