# BlackPay — enquadramento jurídico e caminho de contratação
**Data:** 23/11/2026 · **Status:** levantamento concluído, contratos não assinados.

Documento de apoio à decisão. Não substitui contador nem advogado, e as
condições de cada prestador só se confirmam na proposta assinada.

---

## 1. A pergunta era sobre o BlackPay, mas o problema começa antes

Desenvolvimento e licenciamento de software **não constam no Anexo XI da
Resolução CGSN nº 140/2018**, que é a lista fechada de ocupações do MEI. Os
CNAEs 6201, 6202, 6203, 6204 e 6209 são todos vedados ao MEI.

Isso significa que o BlackFlow e o Lex Calc, como são vendidos hoje, já estão
fora do enquadramento, independentemente do BlackPay. O risco do
desenquadramento é retroativo: cancelamento do CNPJ com efeito para trás,
recálculo de tributos com multa e juros, e perda dos benefícios
previdenciários do período.

Teto do MEI: R$ 81.000 por ano em 2026. A Lei Complementar nº 238, de
21/10/2026, eleva para R$ 110.000 em 2027 e R$ 140.000 em 2028. O aumento não
resolve a questão da atividade, que é o ponto que impede.

O PLP 25/2026 propõe incluir desenvolvimento de software no MEI. Não foi
aprovado, então não muda nada hoje.

## 2. Não é preciso virar LTDA

A alternativa que atende sem sócio e sem o custo de uma sociedade é a
**Sociedade Limitada Unipessoal**, criada pela Lei nº 13.874/2019. Um titular
só, responsabilidade limitada ao capital, sem exigência de capital mínimo.

No Simples Nacional, com Fator R acima de 28%, a atividade cai no **Anexo III,
a partir de 6%**, em vez do Anexo V, que começa em 15,5%. Como o custo com
pró-labore conta no Fator R e aqui existe um único prestador, o Anexo III é
alcançável.

Resumo da decisão: sair do MEI é necessário, virar LTDA não é.

## 3. CPF puro não atende

- **Getnet**: o cadastro de parceiro exige CNPJ, campo obrigatório. Aceita
  "software house" como modelo de negócio, e não impõe porte nem natureza
  jurídica na página pública.
- **Celcoin**: trata a contratante como "empresa não regulada" e aplica KYB,
  que é verificação de pessoa jurídica. Pressupõe CNPJ.

## 4. Não é preciso autorização própria do Banco Central

Operando sob a licença da prestadora, no modelo BaaS, a contratante não
precisa de autorização própria. Licença própria de Instituição de Pagamento
levaria de 12 a 24 meses e exige capital mínimo, e não se justifica aqui.

O que mudou e passa a valer:

- **Resolução Conjunta CMN/BCB nº 16/2025**, em vigor desde 28/11/2025, com
  prazo de adequação contratual e operacional até **31/12/2026**.
- **IN BCB nº 754/2026**, alterada pela **IN BCB nº 776/2026**, vigente desde
  **01/10/2026**: a prestadora registra cada contratante no Unicad. Quem
  registra é a prestadora, não a contratante.

## 5. Quatro regras que mudam o desenho do produto

1. **A palavra "banco" não pode ser usada** na comunicação com o consumidor.
   Celcoin e Getnet são prestadoras de serviço de pagamento, não bancos do
   BlackPay, e o BlackPay não é banco.
2. **A prestadora aparece em todos os pontos de contato** com o cliente final.
   Não cabe white label que esconda quem presta o serviço.
3. **Conta-bolsão é vedada.** Cada cliente final precisa de conta
   individualizada, com titular e documento próprios.
4. **A contratante não assume responsabilidade regulatória** que a norma
   atribui à prestadora, e não se apresenta como instituição financeira
   independente.

## 6. Divisão de papéis proposta

| Função | Quem faz |
|---|---|
| Conta de pagamento e Pix | Celcoin, instituição autorizada |
| Maquininha e cartão | Getnet, credenciadora |
| Interface, conciliação, suporte e venda | BlackSolutions, fornecedora de tecnologia |
| Responsabilidade regulatória, KYC, PLD e FTP | a prestadora de cada função |

## 7. Ordem prática

1. Constituir a SLU e migrar os contratos e o faturamento atuais para ela.
   Isto é pré-requisito dos dois prestadores e já era necessário.
2. Definir os CNAEs de software e enquadrar no Simples, conferindo o Fator R.
3. Candidatar-se ao programa de parceria da Getnet, declarando o modelo como
   software house.
4. Abrir conversa comercial com a Celcoin para o BaaS, já informando que a
   operação será com contas individualizadas.
5. Fechados os contratos, gravar as chaves como segredo do projeto e virar o
   modo da função de conexão para produção.

## 8. O que já está construído

A função `bf-blackpay-conexao` existe e está pronta para receber as
credenciais. Ela guarda as chaves no servidor, nunca no navegador, recusa
conta não individualizada antes de qualquer chamada externa, valida CPF e
CNPJ do titular, e devolve em toda resposta o nome da prestadora e o aviso de
que a BlackSolutions é fornecedora de tecnologia.

Sem contrato e sem chave, ela responde em simulação, e cada resposta vem
marcada como simulada. Nada de dinheiro real se move enquanto for assim.

## 9. Fontes consultadas em 23/11/2026

- Resolução CGSN nº 140/2018, Anexo XI, lista de ocupações do MEI
- Lei Complementar nº 123/2006
- Lei Complementar nº 238, de 21/10/2026, novo teto do MEI
- Lei nº 13.874/2019, Sociedade Limitada Unipessoal
- Resolução Conjunta CMN/BCB nº 16/2025
- IN BCB nº 754/2026, alterada pela IN BCB nº 776/2026
- Página de parcerias da Getnet, requisitos de cadastro
- Documentação pública de BaaS da Celcoin
