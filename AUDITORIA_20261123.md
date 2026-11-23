# Auditoria do BlackFlow
**Data:** 23/11/2026 · **Versão auditada:** 1.38.4

Auditoria executada com teste automatizado, não por leitura de código. O que
está escrito aqui foi medido.

---

## 1. Celular: Android e iOS

### O defeito que você descreveu, encontrado e corrigido

A página rolava para os lados sem fim. A causa era uma só, e em cadeia:

1. No topo da Agenda, o botão **Agendar** ficava na mesma linha das setas e do
   seletor de dia, sem permissão para quebrar. Em tela de 320 ou 360 pixels
   ele passava 49 pixels da borda direita.
2. Isso dava rolagem horizontal à página inteira.
3. Com a página mais larga que a tela, o **botão flutuante de ajuda**, que é
   preso na tela, passou a se posicionar pela largura rolada, e não pela
   largura visível. Ele saía pela direita e alargava a página de novo.

Daí a sensação de página sem fim, e o visual aparentemente "grande demais":
o navegador mostrava uma área maior que a tela.

### O que foi feito

- `overflow-x: clip` no `html` e no `body`, com `hidden` de reserva para o iOS
  mais antigo, que ainda não conhece `clip`. Escolhi `clip` e não `hidden`
  porque `hidden` cria área de rolagem e quebraria o cabeçalho grudado no
  alto. Conferi depois: o cabeçalho continua grudado.
- O topo da Agenda agora quebra linha, e abaixo de 430 pixels o botão Agendar
  ocupa a largura inteira.
- `viewport-fit=cover` na etiqueta de viewport, que é o padrão para telas com
  recorte, como as do iPhone a partir do X.

### Medição

| O que foi testado | Resultado |
|---|---|
| Larguras: 320, 360, 390, 430 e 768 | todas |
| Segmentos: podologia, barbearia, biomedicina, odontologia, estética, beleza | todos |
| Telas por segmento | 28 |
| Combinações totais | 840 |
| Estouro horizontal antes | 18 ocorrências |
| Estouro horizontal depois | **0** |
| Erros de JavaScript | **0** |

Conferido ainda, em 390 por 844: cabeçalho grudado continua grudado após
rolar, tabela larga continua rolando dentro da própria caixa, menu lateral
abre e fecha, botão flutuante dentro da tela.

### O que esse teste não cobre

Navegador real tem particularidades que o teste automatizado não reproduz: o
teclado do iOS que empurra a tela, o Safari que esconde a barra de endereço ao
rolar e o gesto de voltar do Android. Se aparecer algo nessas situações, me
diga o aparelho e a tela.

---

## 2. CPF no início do cadastro

Você perguntou se tira, se deixa, se mantém. Minha recomendação: **deixe como
está hoje**, e explico o porquê.

Hoje o fluxo é: primeira etapa pede nome, celular e e-mail. Segunda etapa
pergunta se a pessoa possui CNPJ, e pede o CNPJ de quem possui ou o CPF de
quem não possui.

**Por que não voltar a pedir CPF na primeira tela.** O artigo 6º, inciso III,
da Lei nº 13.709/2018 manda coletar apenas o necessário para a finalidade.
Na primeira tela a finalidade é criar um acesso, e para isso o documento não
serve de nada. Pedir documento antes de a pessoa sequer ver o sistema aumenta
a desistência e é exatamente a insegurança que você percebeu.

**Por que não remover o documento de vez.** Ele sustenta duas coisas reais: a
trava que impede a mesma pessoa de repetir o teste grátis indefinidamente, e a
cobrança, porque o prestador de pagamento exige CPF ou CNPJ para criar o
cliente. Sem documento, o teste grátis vira porta aberta.

**Conclusão.** Documento na segunda etapa, um ou outro, nunca os dois. É o
desenho que está no ar.

---

## 3. Módulos barbearia, biomedicina e odontologia

Todos funcionando. Cada tela de cada menu foi aberta, uma a uma.

| Segmento | Preço | Telas no menu | Telas com falha | Receituário | Orçamento |
|---|---|---|---|---|---|
| Barbearia | R$ 34,90 | 8 | nenhuma | não | não |
| Biomedicina | R$ 104,90 | 28 | nenhuma | sim | sim |
| Odontologia | R$ 114,90 | 28 | nenhuma | sim | sim |
| Podologia | R$ 79,90 | 22 | nenhuma | sim | sim |

Catálogos embarcados: biomedicina, odontologia e podologia. A barbearia não
tem catálogo clínico, e está certo assim.

**Um ponto para a sua decisão.** A barbearia mostra no menu, além dos quatro
módulos do plano, o **NFS-e / Fiscal** e o **BlackPay**. Isso está de acordo
com o que você pediu depois, nota fiscal em todos os módulos, mas é diferente
do plano enxuto que você descreveu antes. Se quiser tirar, é uma linha.

---

## 4. Nota fiscal eletrônica

Aqui preciso ser direto, porque é dinheiro e é risco legal.

### O que existe e funciona

- Dez tabelas fiscais no banco, uma configuração por estabelecimento.
- Cadastro fiscal com CNPJ, inscrição municipal, código IBGE, CNAE, regime
  tributário, Simples, série e ambiente.
- Rascunho de nota, com tomador trazido do cadastro do paciente.
- Conferência do rascunho, que aponta o que falta campo a campo.
- Conciliação com o financeiro, importação de DANFSE e envio do PDF.
- Roteamento: o sistema decide se o caso é do emissor nacional ou do município.
- **Novo nesta versão:** o botão Consultar CNPJ agora traz de verdade os dados
  da Receita Federal pela BrasilAPI, com a CNPJa de reserva, e preenche
  sozinho razão social, situação cadastral, município, código IBGE, CNAE e
  endereço. Antes a função do banco validava o CNPJ, mas não saía para a
  internet: o botão não trazia nada.

### O que não existe

**O sistema não emite nota fiscal.** Nenhuma nota foi emitida até hoje: a
tabela `bf_fiscal_notas` está vazia, com zero registros. Todas as funções de
servidor dizem isso no próprio código, e a tela também avisa.

Não é descuido de programação. Emitir NFS-e exige quatro coisas que não se
resolvem escrevendo código:

1. **Certificado digital e-CNPJ A1** de cada cliente, ou procuração
   eletrônica dele para a BlackSolutions. Sem isso não há assinatura válida.
2. **XML assinado em ICP-Brasil**, por cada nota.
3. **Conexão mTLS** com a SEFIN Nacional ou com o sistema do município.
4. **Credenciamento e homologação**, que no caso municipal é prefeitura por
   prefeitura.

### Sobre "totalmente sincronizada com a Receita Federal"

Isso não existe do jeito que foi pedido, e não é limitação nossa. A Receita
Federal não emite NFS-e: nota de serviço é tributo municipal, o ISS. O que a
Receita oferece é o cadastro do CNPJ, que é justamente o que passou a ser
consultado nesta versão. A emissão nacional unificada existe, é a NFS-e
Nacional em nfse.gov.br, mas a adesão é por município e exige o certificado e
a homologação acima.

### O que falta, na ordem

1. Decidir o modelo: certificado de cada cliente, procuração eletrônica para a
   BlackSolutions, ou um integrador já homologado, como Focus NFe, PlugNotas,
   eNotas ou Nuvem Fiscal. O integrador é o caminho mais curto e previsível.
2. Fechar o contrato e gravar a chave como segredo do projeto, do mesmo jeito
   que a chave da cobrança.
3. Homologar com um CNPJ real, em ambiente de testes, antes de qualquer nota
   de verdade.

Enquanto isso, o botão prepara o rascunho, confere e avisa que não emitiu. Não
vou fazer o sistema dizer que emitiu nota quando não emitiu: nota fiscal falsa
é crime, e quem responderia seria o cliente que confiou na tela.
