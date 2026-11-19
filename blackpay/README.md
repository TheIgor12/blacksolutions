# BlackPay — Fundação técnica v0.1.0
**Situação (19/11/2026):** protótipo navegável e arquitetura inicial; **não é banco**, **não é instituição de pagamento autorizada**, **não tem Pix real**, **não movimenta recursos de terceiros**.

## Entregue
- Portal responsivo isolado em `/blackpay/`, com contas fictícias e KYC pendente/aprovado de demonstração.
- Simulador de transferências internas, retiradas para conta externa fictícia, cobranças Pix **não pagáveis**, gerenciamento de terminais e vendas com cartão fictícias.
- Registro de transações com partidas duplas em centavos, idempotência local, saldo derivado do diário e validação básica de saldo e status.
- Extrato, conciliação simulada, bloqueio de contas, eventos de risco e cadeia de SHA-256 apenas para fins pedagógicos.
- Esquema SQL privado preparado para Supabase/PostgreSQL, sem permissão ao usuário do navegador, com RLS, integridade de partidas, isolamento multitenant e bloqueio permanente de dinheiro real.
- Contrato de adaptador financeiro `provider-contract.mjs` que **falha fechado**: nenhum método pode enviar recursos sem implementação de parceiro e controles.
- Código separado do aplicativo BlackFlow e LexCalc. Não altera dados de clientes do BlackFlow nem acessa o Supabase de produção.

## Arquitetura planejada
```
Web/app BlackPay (clientes e operadores)
             │ TLS + MFA + gestão de sessão
             ▼
Gateway / API autenticada — RBAC + rate limit + trilha antifraude
             │
  ┌──────────┼───────────┬─────────────────────┐
  ▼          ▼           ▼                     ▼
Cadastro     Ledger      Compliance           Orquestrador PSP
KYC/KYB      partidas    PLD/FTP, limites     Pix/cartões/contas
              dobradas    bloqueio/alertas          │
  ▲          ▲           ▲                     ▼
  └──── Webhooks verificados ← Parceiro autorizado ← SPI/DICT/adquirentes
             │
      Conciliação e evidências imutáveis
```

## Cuidado: Pix não funciona sobre blockchain
O Pix é um arranjo do Banco Central. A liquidação usa o Sistema de Pagamentos Instantâneos (SPI) e o DICT permite consultas a chaves Pix. A cadeia de hashes criada no portal demonstra integridade local; não é rede blockchain, não garante imutabilidade sob atacante com acesso ao ambiente nem valida liquidação bancária. Uma infraestrutura blockchain separada para ativos digitais demandaria desenho e enquadramento legal próprios.

## Próximos blocos necessários para lançamento comercial
1. Definir modelo contratual: software como serviço/BaaS por parceiro autorizado, credenciadora/parceiro de adquirência, ou constituição de IP própria. Solicitar parecer jurídico e regulatório atualizado.
2. Formalização empresarial e identificação societária; cadastro de beneficiários finais, representantes, políticas PLD/FTP, avaliação de riscos, atendimento, ouvidoria conforme modelo, gestão de fraude e governança.
3. Seleção e contratação do parceiro regulado, verificando modalidade de participação Pix, liquidação, DICT, terminal/cartões, responsabilidades, segregação dos recursos, tarifas, SLAs, chargeback/MED e deveres de reporte.
4. Criar backend privado executando exclusivamente no servidor: autenticação forte, autorização contextual, MFA adaptativo, idempotência persistente, trilha de consentimento, registro financeiro imutável e bloqueio transacional com locking SQL.
5. Concluir KYC/KYB (não apenas CPF/CNPJ), sanções/PEP, beneficiários finais, avaliação de fraude e limites, revalidação documental, gestão de casos e proteção LGPD.
6. Implementar fluxo completo de ordens: criação → autenticação → aprovação → reserva de saldo → envio PSP → confirmação por webhook validado e consulta independente → contabilização e conciliação → extrato. Reversão requer lançamentos inversos, não apagar diário.
7. Terminal físico via credenciador e fabricantes (provisionamento, TMS, inventário, captura, TEF/Tap to Pay onde aplicável, PCI DSS e obrigações dos arranjos); **nunca** processar PAN/CVV no frontend.
8. Garantir disponibilidade, monitoramento, backups testados, segregação de ambientes e chaves HSM/KMS, pentest, testes de intrusão, resposta a incidentes, disaster recovery, suporte, auditoria e observabilidade.
9. Para fase separada de ativos virtuais: custódia, carteiras, AML blockchain, gerenciamento de chaves e enquadramento de prestador de serviços de ativos virtuais, se aplicável; **não** confundir com Pix.
10. Testar com parceiros em ambiente de homologação e obter os atos, credenciais e liberações aplicáveis antes de solicitar transações reais.

## Esquema SQL
O arquivo `sql/001_private_schema.sql` é base **não executada**, não habilita acesso do navegador. Suas invariantes não substituem transações seriais de posting nem revisão especializada. Na futura execução, testar constraints, locking simultâneo, trilha de reversões, ausência de privilégios indevidos, políticas de segregação, saldo não negativo, transações duplicadas e consistência dos tenants.

## Normas a conferir na implantação
- Resolução BCB nº 1/2020 (Regulamento do Pix): https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=1&tipo=Resolu%C3%A7%C3%A3o+BCB
- Resolução BCB nº 195/2022 (SPI): https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=195&tipo=Resolu%C3%A7%C3%A3o+BCB
- Instituições de pagamento / Resolução BCB nº 80/2021 (com alterações): https://www.bcb.gov.br/estabilidadefinanceira/instituicaopagamento
- Participação no Pix: https://www.bcb.gov.br/estabilidadefinanceira/participantespix
- Circular BCB nº 3.978/2020 e alterações (PLD/FTP); Lei nº 9.613/1998; Lei nº 13.709/2018 (LGPD).
- Manuais e versões vigentes: https://www.bcb.gov.br/estabilidadefinanceira/pix-normas

## Observações de segurança
O portal não solicita dados pessoais ou bancários verdadeiros; não possui login, KYC real nem API de PSP. Toda operação é demonstração. As informações fictícias são armazenadas apenas em memória e zeradas ao recarregar. Não usar o portal como sistema de pagamentos ou saldo fiduciário. 
