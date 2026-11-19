# BlackFlow — simulação fiscal e revisão do receituário
**Referência:** 19 de novembro de 2026
**Escopo:** CNPJ de teste cadastrado no Supabase, município Taboão da Serra/SP.

## Configuração realmente consultada no Supabase
- CNPJ: **34.160.123/0001-01** (usado apenas como emitente no teste virtual; nenhuma nota transmitida).
- IBGE: **3552809 = Taboão da Serra/SP**, confirmado pelo titular e IBGE. **Não mudar para SC.**
- CNAE principal na configuração fiscal: **9602-5/01 — Cabeleireiros, manicure e pedicure**.
- Situação cadastral de consulta histórica gravada pela plataforma: **ATIVA**, fonte ReceitaWS. Não se trata de consulta em tempo real.
- Regime fiscal preenchido no sistema: **Lucro Presumido**, não comprovado por documento fiscal neste teste.
- Simples Nacional: **não informado**.
- cTribNac: **não preenchido na configuração fiscal**; inscrição municipal idem.
- Integração: `nao_configurado`, `habilitado=false`; **não homologada**.
- Código de referência para o CNAE quando o serviço for efetivamente manicure, pedicure ou congêneres: **060101**, conforme o catálogo oficial. Não aplicar a procedimentos de podologia clínica sem analisar serviço e autorização da empresa.

## Implementação concluída
1. Versão ampliada da Edge Function JWT `bf-fiscal-autoteste`: consulta o próprio emitente pela RLS do usuário logado, sem credenciais secretas nem uso de `service_role`, executa **oito testes prévios e dezoito cenários novos**, com resultados por cenário.
2. Oito cenários prévios: CPF/CNPJ de exemplo com dígitos matematicamente consistentes e inválidos, valor positivo/zero e descrição presente/ausente.
3. Novos cenários: seis classificações oficiais candidatas (040102, 040303, 040901, 041201, 060101, 060201); CPF incorreto e repetido; CNPJ adulterado; município divergente; código inválido/ausente; valor zero, negativo ou não numérico; descrição vazia; competência malformada; repetição de chave idempotente. **18 de 18 passaram em execução local do código de simulação**.
4. Dez respostas **MOCK_SEFIN** de integração (HTTP 201, 400, 401, 403, 408, 409, 422, 429, 500, 503), com estratégia de erro e reconsulta antes de tentar reemitir, sem rede governamental, certificado ou gravações.
5. UI fiscal: botão existente de autoteste apresenta resultados, simulação de SEFIN e referências do prestador. Novo catálogo de códigos de serviço para ajudar a preencher **rascunho**; sem atribuição fiscal definitiva automática.
6. Receituário: preserva restrições de podologia (somente orientações e encaminhamentos), acesso ao ITI e orientações SNCR; rótulo explícito da assinatura externa `não verificada`, texto de WhatsApp sem declarar validade jurídica; consulta **de numeração SNCR efetivamente atribuída pela Anvisa** (`0000.0-00.0000000`).
7. Root e `app/` mantidos em sincronia; versão de cache dos scripts incrementada.

## Limites técnicos que NÃO foram concluídos
- **A simulação não é homologação oficial**. Não há documento emitido nem processado pela SEFIN, credenciamento, certificado mTLS, assinatura XML da DPS, resposta autorizadora, XML autorizado, DANFSe oficial, cancelamento, substituição, sincronização governamental ou prova de aceite em produção restrita.
- Não existe validação real do leiaute de XML pelos XSD oficiais, tampouco implementação integral de todos os grupos da Reforma Tributária (IBS/CBS, CST e cClassTrib). O modelo do teste é **objeto ilustrativo**, não um arquivo DPS homologado.
- A alíquota de ISS de referência de 2% na tabela publicada de Taboão da Serra não substitui cálculo conforme regime, retenção, operação e norma aplicável; o teste **não recolhe tributos**.
- O endpoint `bf-fiscal-autoteste` requer usuário autenticado e acesso ao emitente pela RLS. Foi publicado; **não foi possível testar uma sessão real de usuário no navegador**.
- O QR do BlackFlow identifica o registro e permite comparar o SHA-256 do PDF, **não** constitui QR oficial da Anvisa, assinatura ICP-Brasil ou certificação jurídica.
- Para receitas especiais com SNCR é necessário número oficial, profissional habilitado e assinatura qualificada (quando exigida), além de integração autorizada; a implementação atual permite **consultar** número SNCR, não **emitir** receita controlada nova.
- A API do SNCR possui documentação pública, mas credencial ou token de acesso **não é público universal**. O mesmo vale para operações fiscais em nome de um CNPJ.

## Fontes públicas verificáveis
- IBGE Taboão da Serra: https://www.ibge.gov.br/cidades-e-estados/sp/taboao-da-serra.html
- Lista federal cTribNac: https://www.gov.br/nfse/pt-br/mei-e-demais-empresas/codigos-de-tributacao-nacional-nbs
- Leiautes NFS-e produção restrita: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita
- APIs fiscais: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- Regras de IBS/CBS e NT 009: https://www.gov.br/nfse/pt-br/noticias/nfs-e-nacional-confira-oas-rientacoes-sobre-leiaute-em-producao-regras-de-preenchimento-de-ibs-cbs-e-status-da-nota-tecnica-009
- Portal Anvisa SNCR: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr
- QR oficial para receitas controladas: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-eletronico
- Portal do ITI: https://validar.iti.gov.br/

**Conclusão:** simulador e consultas incorporados ao código; o estado operacional seguro de transmissão da NFS-e e receitas controladas permanece bloqueado até autorização externa e requisitos legais demonstrados.
