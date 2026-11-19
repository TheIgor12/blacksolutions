# BlackPay — Dossiê de preparação regulatória (não protocolado)
**Data:** 19/11/2026 · **Status:** constituição empresarial e definição de enquadramento pendentes.

## Proposta de serviço
A BlackSolutions pretende oferecer, inicialmente, software de conciliação de cobranças, demonstração de conta de pagamento e integração com instituição autorizada (modelo BaaS/PSP parceiro). Não receberá nem custodiará recursos de terceiros por conta própria enquanto não houver autorização, contratos e infraestrutura adequados.

## Rotas jurídicas a decidir
1. **Fornecedora de tecnologia / parceria com PSP autorizado**: opção preferencial de menor complexidade, com funções financeiras reais executadas pelo parceiro e contratos definindo titularidade da conta, KYC, PLD/FTP, segurança, responsabilidade por Pix, relatórios e conciliação.
2. **Instituição de Pagamento (IP) própria**: exige enquadramento (emissora de moeda eletrônica, credenciadora etc.), requisitos de capital, governança, autorização e controles. Consultar Resoluções BCB 80 e 81/2021, alterações vigentes e Resolução Conjunta 14/2025 alterada em 2026.
3. **Banco comercial/múltiplo**: regime mais complexo; não basta possuir CNPJ, abrir LTDA nem cadastrar uma API. A expressão "banco" para apresentação ao público depende da categoria/autorização pertinente.

## Pendências para autorização
- Denominação/razão social, tipo societário, atos constitutivos e CNPJ (ainda não informado).
- Controladores, beneficiários finais, administradores e comprovantes pertinentes.
- Plano de negócios: receitas, segmentos, projeções, riscos, fontes de financiamento e patrimônio integralizado adequado ao enquadramento.
- Modelo de arquitetura: proteção de recursos do cliente, liquidação Pix, credenciadora, participantes, terceirização, gestão de dados, autenticação, antifraude, PLD/FTP, LGPD, continuidade de negócios.
- Documentos correspondentes aos modelos do Sisorf.
- Definição formal de modalidade e admissibilidade da participação Pix, acesso a SPI/DICT e parceiros.
- Validação do cálculo de capital mínimo com base nas regras em vigor e no modelo escolhido.
- Acesso/credenciamento para eventual protocolo de pleito junto ao Banco Central.

**Pedido de autorização NÃO ENVIADO.** Ainda não é possível determinar a modalidade ou protocolar um pleito válido sem dados e documentos essenciais. Não existe conta bancária real, ISPB, COMPE ou agência atribuídos à BlackSolutions; o valor sugerido '00001' não deve ser divulgado como agência real.

## Precificação
A intenção comercial é **não cobrar tarifa própria de Pix do cliente BlackPay**, tanto para envio quanto recebimento, sujeito à viabilidade contratual e custos. Isso não decorre de proibição regulatória; o Banco Central permite cobrança em diversas operações de pessoas jurídicas. Débito/crédito: preços só após negociação com adquirente; nenhuma taxa presumida.

## Ponto de entrada oficial
- Banco Central — processos de autorização: https://www.bcb.gov.br/estabilidadefinanceira/autorizabc
- FAQs sobre autorização: https://www.bcb.gov.br/meubc/faqs/s/autorizacao-para-funcionamento
- Sisorf / modelos para instituições de pagamento: https://www.bcb.gov.br/meubc/faqs/p/modelo-de-documentos-para-pedido-de-autorizacao-instituicoes-nao-regidas-pela-resolucao-cmn-4-970-de-2021
- Regras para instituições de pagamento: https://www.bcb.gov.br/estabilidadefinanceira/instituicaopagamento
- Capital mínimo regulatório: https://www.bcb.gov.br/estabilidadefinanceira/capital-minimo-regulatorio
- Pix — normas: https://www.bcb.gov.br/estabilidadefinanceira/pix-normas

## Preparação técnica realizada
- BlackPay 0.1.1 portal demonstrativo, integrado no BlackFlow 1.19.0 em **modo cliente somente leitura**.
- Banco Supabase: schema privado `blackpay`, RLS, sem permissões para `anon`/`authenticated`; chave de ativação real bloqueada por constraint.
- Simulação isolada, sem registro de contas reais ou depósito. Preferência futura de receber no BlackPay **não altera chave Pix de produção**.
- Contrato de adaptador para instituição de pagamento regulada: métodos ausentes falham fechados.
- Política futura: R$ 0 em tarifa própria de Pix, cartão com taxas a negociar.

## Itens seguintes para a futura empresa
Constituição da pessoa jurídica; estrutura societária e representantes; análise regulatória especializada; escolha e contratação do parceiro financeiro; homologação API, políticas de risco, testes de segurança e dados pessoais; solicitação e deferimento dos atos regulatórios aplicáveis. Solicitação de autorização ao Banco Central se e quando a modalidade escolhida exigir.
