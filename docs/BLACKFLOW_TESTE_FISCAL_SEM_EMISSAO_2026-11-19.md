# BlackFlow — autoteste fiscal sem emissão real
**Data:** 19/11/2026
**Ambiente:** Supabase `happyfeet-gestao`, módulo fiscal do BlackFlow.

## Objetivo
Conferir campos básicos e regras locais com tomador fictício, sem escrever em tabelas fiscais, cobrar ou transmitir documentos à Administração Tributária. O endpoint `bf-fiscal-autoteste` exige JWT Supabase e autorização de leitura do administrador da clínica pela RLS de `bf_fiscal_config`.

### Cenário fictício
- Nome de teste: **PACIENTE TESTE BLACKFLOW**
- Documento de teste: **CPF sintético de exemplo (não utilizar em nota real)**
- Valor simulado: **R$ 100,00**
- Descrição: **SERVIÇO FICTÍCIO - NÃO EMITIR**
- Sem transmissão à SEFIN, sem efeitos tributários, sem criação de rascunhos, notas ou pagamentos

### Ensaios de função (código implementado)
- CPF sintético com dígitos consistentes: aceito.
- CPF repetido, incorreto e curto: rejeitados.
- CNPJ do cenário com dígitos consistentes: aceito.
- CNPJ modificado, repetido e vazio: rejeitados.
- Validações sintéticas adicionais na função: valor positivo, rejeição de valor zero, descrição presente e rejeição de descrição vazia.
- Testes de função JS executados localmente: **8/8 passaram**.
- **Não realizados:** autenticação de usuário real na função HTTP, consulta oficial Receita Federal por certificado, contato SEFIN produção restrita, teste mTLS, geração XSD/XML de DPS, protocolo de autorização, DANFSe oficial, cancelamento/substituição, conferência oficial de assinatura digital.

### Achados reais no banco (sem exibir dados confidenciais)
- CNPJ associado entre `clinicas` e `bf_fiscal_config`: **sim**.
- Código IBGE cadastrado: `3552809` (Taboão da Serra/SP).
- Se o emitente estiver em Jaraguá do Sul/SC, o código oficial é `4208906`; somente corrigir após confirmar inscrição real do estabelecimento.
- Código de serviço e tributação nacional: **não preenchidos**.
- Inscrição municipal: **não preenchida** (exigência a conferir com município).
- Regime cadastrado: **Lucro Presumido**, sem validação externa.
- Simples Nacional: sem confirmação.
- Integrador: `nao_configurado`; `habilitado=false`; `situacao_integracao=nao_configurada`.
- Total de NFS-e emitidas, tentativas e receitas clínicas encontradas no escopo: **0**, tanto antes como após a criação da função.
- Não houve operação fiscal externa.

## Bloqueios obrigatórios para emissão automática real
1. Conferir endereço e município fiscal, CNPJ ativo, credenciamento, inscrição municipal aplicável e cadastro econômico da Prefeitura.
2. Confirmar enquadramento tributário, CNAE e código nacional/municipal de serviços com contador, considerando a legislação de IBS/CBS e layouts vigentes.
3. Integrar certificado ICP-Brasil ou procurador autorizado com assinatura XML DPS e mTLS e armazenar credenciais fora do frontend.
4. Executar testes reais em **produção restrita** conforme documentação governamental e obter evidências de autorização da SEFIN.
5. Concluir API de transmissão, reconsulta, idempotência, XML autorizado, DANFSe, cancelamento, substituição, persistência, conciliação e auditoria.
6. Somente liberar modo produção para um CNPJ após comprovação de autorização, com liberação explícita. Não autorizar ou simular nota em nome de terceiros.

## Receituários — limites
O QR do BlackFlow consulta um registro e oferece comparação SHA-256 do PDF. Isso **não** comprova assinatura ICP-Brasil nem substitui regras de receituário controlado. Para controlados, cumprir RDC nº 1.000/2025, SNCR e verificação ITI/VALIDAR, inclusive competência do profissional. Homologação jurídica depende de serviços, credenciais e aprovações externas.

## Referências técnicas oficiais
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- https://www.gov.br/pt-br/servicos/consultar-cadastro-nacional-de-pessoas-juridicas
- https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/
- https://validar.iti.gov.br/

**Resultado:** autoteste técnico disponibilizado, emissão governamental efetiva **não homologada** e bloqueada com segurança.
