# Plano de segurança do BlackFlow
**Aberto em 24/11/2026 · versão 1.43.0**

Estado de cada item da auditoria. Feito é o que está no ar e foi medido.
Pendente é o que depende de trabalho, de decisão sua ou de contratação.

---

## 1. Isolar cada clínica e limitar acesso por função

**Feito nesta versão**
- Permissão clínica nos perfis de acesso. Recepção e estoque veem a ficha do
  paciente para agendar e cobrar, e não veem prontuário, anamnese, evolução,
  fotos, exames, termos nem o mapa dos pés. Profissional vê tudo. Entrou o
  perfil Financeiro.
- Antes bastava ter a tela Pacientes para abrir a anamnese e as fotos de
  qualquer paciente, porque a trava era por tela e as abas clínicas ficam
  dentro da ficha.
- Medido com quatro perfis: recepção fica com seis abas e nenhuma clínica,
  profissional com doze.

**Pendente, e por quê**
- **Revisar as políticas do banco (RLS), do Storage e das funções de borda.**
  Isto se faz dentro do painel do Supabase, com SQL. Eu só alcanço o Supabase
  pelo navegador do seu computador, com a extensão conectada. Quando você
  estiver no computador com o Chrome aberto e a extensão ligada, me avise que
  eu levanto o inventário de políticas tabela por tabela e corrijo o que
  estiver aberto.
- **Segundo fator para administrador e suporte.** O Supabase Auth tem MFA por
  aplicativo autenticador. Precisa ser ligado no projeto e a tela de login
  precisa do passo do código. É trabalho de meio dia, com teste.
- **Revogação imediata ao desligar alguém.** Hoje remover o membro tira o
  acesso. Falta encerrar as sessões abertas naquele momento, que é uma chamada
  de administração no Supabase.
- **Acesso temporário e registrado do suporte.** Hoje o acesso mestre é
  permanente. O correto é acesso com prazo, com motivo escrito e com registro
  de tudo que foi aberto.
- **Duas clínicas fictícias em homologação.** Exige um segundo projeto
  Supabase, de homologação. Hoje existe um só, que é produção.

---

## 2. Proteger prontuários contra perda, mistura e sobrescrita

**Feito nesta versão**
- **Nome igual nunca mais funde paciente.** CPF igual é a mesma pessoa. Código
  mais nome é a mesma pessoa. Nome sozinho não é: cria ficha separada, marcada
  para conferência, com aviso em vermelho na lista de pacientes.
- Na conferência, dois caminhos: **São pessoas diferentes**, que só tira a
  marca, e **É a mesma pessoa**, que move todos os registros para a ficha
  antiga, completa os campos vazios dela e apaga a duplicada, avisando quantos
  registros vão passar e que não tem desfazer.
- Medido: importar "Maria Silva" sem CPF cria ficha separada; com o CPF da
  Maria que já existia, reaproveita a ficha; juntar move a evolução para a
  ficha antiga.

**Já existia**
- A sincronização não sobrescreve em silêncio desde a 1.38.1: quando dois
  aparelhos mudam o mesmo registro, o aparelho mantém a versão dele e a versão
  da nuvem vai para um arquivo que dá para restaurar.

**Pendente**
- **Desfazer um lote de importação.** Exige carimbar cada registro criado com
  o número do lote. É trabalho de um dia.
- **Prévia antes de importar.** Hoje a importação executa e depois relata.
- **Backup de fotos, exames, documentos assinados e evidências de assinatura.**
  O backup atual leva os dados, não os arquivos. As fotos ficam no Storage do
  Supabase. Falta uma exportação que empacote tudo.
- **Restauração ensaiada antes de migrar clínica.** Depende do ambiente de
  homologação do item 1.

---

## 3. Proteger navegador, aparelhos e integrações

**Feito nesta versão**
- **Política de conteúdo (CSP)** na página: o navegador passa a recusar script,
  estilo, imagem, fonte ou conexão de origem que não esteja na lista. Testado
  em quatorze telas mais o pé em três dimensões, sem nenhuma violação e sem
  nada parar de funcionar.
- **Versão presa da biblioteca do banco.** Era `@supabase/supabase-js@2`, que
  deixa o CDN trocar o arquivo sozinho dentro de um sistema que guarda
  prontuário. Passou a ser 2.119.2, que é a mesma versão que já rodava,
  conferida no `package.json` do pacote.
- O three.js do pé tridimensional já nasceu guardado no próprio repositório,
  sem CDN.

**Observação honesta sobre a CSP**
Ela ainda precisa de `'unsafe-inline'` para script, porque o sistema usa
`onclick` escrito direto no HTML em centenas de lugares. Tirar isso é reescrever
a interface inteira. Fica anotado como dívida: a CSP de hoje barra script de
origem estranha, que é o caminho principal de roubo de dados, mas não barra
script injetado dentro da própria página.

**Pendente**
- **HSTS.** O GitHub Pages já envia HSTS quando o domínio está com HTTPS
  obrigatório. Confirme em Settings, Pages, a opção *Enforce HTTPS*.
- **Integridade dos arquivos de CDN (SRI).** Exige o hash exato do arquivo que
  o CDN entrega. Eu não alcanço esses CDNs daqui para calcular, e hash errado
  derruba o sistema inteiro. Faço com você ao lado, em homologação.
- **Limite de tentativas no login, no agendamento público e nas integrações de
  pagamento.** O Supabase tem limite de tentativas no Auth; falta ligar e
  medir. O agendamento público precisa de limite por endereço e por telefone.
- **Modo offline só em aparelho autorizado, aviso de dados pendentes e apagar
  dados deste aparelho.** Hoje o sistema é só nuvem e o cache do navegador
  guarda dados locais. Falta o botão de limpar este aparelho.
- **Conferir que prontuário e foto não aparecem em registro nem em ferramenta
  de publicidade.** Hoje não há ferramenta de publicidade no sistema. Falta a
  verificação formal, telas a telas.

---

## 4. LGPD utilizável no dia a dia

**Pendente, inteiro.** O que precisa ser escrito e colocado:
- Aviso no cadastro e no agendamento: quais dados, para quê, por quanto tempo e
  com quem falar.
- Caminho para a clínica atender pedido de acesso, correção e exportação do
  paciente.
- Documento de retenção, descarte, fornecedores, acesso do suporte e resposta a
  incidente.
- Registro de operações de tratamento, que é o que a ANPD pede do agente de
  pequeno porte.

O guia da ANPD para agente de pequeno porte é a base certa. Isso é trabalho de
redação com decisão sua em cada prazo de retenção, e eu preparo os textos quando
você disser que é a vez disso.

---

## 5. Funcionar para quem tem pouca familiaridade

**Pendente**
- Teste com pessoas reais nas cinco tarefas: cadastrar, agendar, anamnese,
  orçamento e pagamento. Isso não se simula: precisa de gente usando.
- Padronizar Voltar, Fechar e Salvar, preservar rascunho ao trocar de tela e
  confirmar mostrando paciente, valor ou arquivo afetado.
- Acessibilidade WCAG 2.2: navegação por teclado, contraste medido, VoiceOver.

**Já medido e corrigido antes**
- Alvo de toque mínimo de 40 pixels e fonte de campo de 16 pixels no celular,
  em 87 telas, sem rolagem lateral.

---

## Para chegar a cinco estrelas

- **Bloquear publicação que falhe em teste.** Hoje eu rodo as medições à mão a
  cada versão. O certo é uma esteira que rode sozinha e recuse publicar.
- **Registro de acesso a prontuário, mudança de permissão e exportação**, sem
  copiar conteúdo clínico para o registro.
- **Ensaio de restauração completa**, com tempo fora do ar e perda aceitável
  definidos por você.
- **Auditoria independente** em homologação, sem prontuário real, mais revisão
  de acessibilidade.

---

## O que eu preciso de você, em ordem

1. Dizer quando estará no computador com o Chrome e a extensão ligada, para eu
   revisar as políticas do Supabase com você.
2. Decidir se cria um segundo projeto Supabase de homologação. Sem ele, nada do
   item 1 e do item 2 pode ser ensaiado antes de ir para o cliente.
3. Dizer qual prazo de retenção você quer para prontuário, foto e documento
   assinado, que é a única parte da LGPD que eu não posso decidir por você.
