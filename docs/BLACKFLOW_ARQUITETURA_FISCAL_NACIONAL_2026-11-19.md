# BlackFlow — arquitetura fiscal nacional multiempresa
**Atualização:** 19/11/2026 · **Repositório:** TheIgor12/blacksolutions · **Supabase:** happyfeet-gestao

## Decisão de arquitetura
O BlackFlow atende qualquer clínica cadastrada, de qualquer estado do Brasil, sem utilizar um CNPJ, município ou credenciamento global como requisito para os demais. A única unidade de isolamento de operações fiscais é a `clinica_id` do estabelecimento, sob autenticação e políticas de acesso RLS.

### Emissor Nacional e prestadores municipais
- **MEI e ME/EPP optantes do Simples Nacional:** roteiro para o **Emissor Nacional**, observada a obrigatoriedade vigente desde 01/11/2026.
- **Lucro Presumido, Lucro Real ou outros enquadramentos:** identificar qual sistema recebe a emissão no município, conforme convênio, habilitação e regime. O município pode utilizar API nacional, emissor próprio integrado ao ADN ou outro provedor. O sistema aponta os canais candidatos, sem supor que estejam autorizados.
- **Regime inconsistente, CNPJ inválido ou IBGE não reconhecido:** diagnóstico isolado daquele cliente. Nenhum outro estabelecimento sofre bloqueio ou troca de credenciais.
- **cTribNac, ISS, retenções e IBS/CBS:** selecionar por serviço e regras aplicáveis; não determinar valores apenas pelo CNAE e não impor alíquota fixa nacional.

### Implementações desta atualização
1. Nova Edge Function `bf-fiscal-nacional` (JWT obrigatório): usa autenticação Supabase e consulta `membros` do estabelecimento; apenas administradores podem obter o diagnóstico. Usa `bf_fiscal_config` do próprio tenant sob RLS, sem service-role exposta, sem credenciais ou dados clínicos na resposta.
2. Roteamento baseado em **IBGE (7 dígitos), UF e regime fiscal da clínica**. Cobre as 27 UFs usando as regras nacionais conhecidas e informa quando o emissor dos demais regimes precisa de confirmação. Não efetua transmissão.
3. **60 casos de simulação** — 27 UFs × dois regimes + seis verificações negativas: código UF inválido, regime vazio/contraditório, CNPJ inválido, independência de SC e PR em relação a SP.
4. Endpoint `acao: "municipios", uf:"SC"`: consulta a API pública de Localidades do IBGE para listar os municípios de qualquer UF e devolver apenas código IBGE/nome. Se a API estiver indisponível, a falha é informada e não altera o cadastro.
5. Interface do módulo NFS-e: botão **Testar cobertura nacional — 27 UFs** apresenta o roteamento do estabelecimento, resultados por UF e requisitos exclusivos daquele cliente; seleção de UF e município por catálogo IBGE para completar a configuração fiscal.
6. `bf-fiscal-autoteste` adaptada a qualquer município, removendo o município fixo, a alíquota fixa de ISS e a descrição genérica que usava pedicure para clientes de outros segmentos.
7. Módulos raiz e `app/` sincronizados e controle de cache atualizado para `1.15.4`.

## Testes executados
- `bf-fiscal-nacional`: **60/60 cenários sintéticos aprovados** (27 UFs e seis verificações).
- `bf-fiscal-autoteste`: **18/18 novos cenários por estabelecimento**, executados separadamente com IBGE de Taboão da Serra/SP, Jaraguá do Sul/SC, Curitiba/PR, Belo Horizonte/MG e Rio de Janeiro/RJ.
- JavaScript da interface validado sintaticamente; consulta a banco confirmou RLS por clínica nos módulos fiscais e autenticação de administrador no novo endpoint.
- O projeto **não** executou chamadas fiscais externas de emissão nem gerou documentos fictícios na base.
- **Não foi realizado teste de navegador autenticado, nem verificada a disponibilidade da API IBGE a partir do Edge Runtime em uma sessão real**.

## Receituários nacionais
A preparação dos documentos e o QR BlackFlow já são independentes do município. O mecanismo de autenticação de prescrição controlada é nacional pelo **SNCR/Anvisa**, mas exige integração reconhecida e autenticação do prescritor autorizado. O QR da plataforma comprova somente a associação do registro e a integridade SHA-256, **não** a assinatura eletrônica qualificada nem autorização jurídica. O código existente não declara controle especial liberado.

## O que continua externo à simulação
- Os padrões oficiais das NFS-e nacionais permitem integração; **nem todas as emissões de todo município e regime passam por um único endpoint de autorização**. Alguns municípios conservam emissores próprios sincronizados com o ADN.
- Para **emissão fiscal efetiva**, é necessário concluir cada conector real, a autenticação/assinatura exigida pelo emissor escolhido, teste em produção restrita quando aplicável, consulta da autorização, XML oficial, DANFSe, cancelamento e reconciliação. Nenhuma credencial de um cliente autoriza emitir notas de outro.
- Para **receitas controladas**, é necessária integração do SNCR com autenticação do profissional, numeração oficial, assinatura admitida e validação jurídica. A API pública é documentada; **tokens de usuários e certificados privados não são públicos**.
- Restrições cadastrais ou tributárias de um cliente devem produzir um erro isolado na emissão daquele cliente, sem impedir a contratação e configuração dos demais.

## Referências normativas e técnicas
- [NFS-e — documentação atual (04/11/2026)](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual)
- [NFS-e — APIs de produção e produção restrita](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao)
- [Emissor Nacional obrigatório para optantes do Simples](https://www.gov.br/nfse/pt-br/noticias/nfs-e-informa-diretrizes-sobre-a-obrigatoriedade-da-emissao-da-nfs-e-nacional-para-optantes-do-simples-nacional/)
- [IBGE — API de Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)
- [Anvisa — API e documentos SNCR](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr)
- [ITI — validação oficial de assinatura](https://validar.iti.gov.br/)

**Conclusão:** roteamento e testes nacionais implementados. Os conectores fiscais autorizadores e a prescrição controlada juridicamente integrada ainda não estão homologados; nunca rotular simulação como autorização governamental.
