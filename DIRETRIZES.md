# Manual obrigatório do BlackFlow

Transcrição da diretriz de manutenção, auditoria e calibragem da Coordenação BlackSolutions, de 24 de novembro de 2026. Em caso de dúvida, consulte o PDF original aprovado pela direção.

```text
         BlackSolutions / BlackFlow
         D I R E T R I Z E S P E R M A N E N T E S • R O L TA X AT I V O • C U M P R I M E N T O O B R I G AT Ó R I O


         Manual de manutenção, auditoria e
         calibragem
         Regras obrigatórias para alterar, publicar, auditar e manter o BlackFlow. Vale para toda
         alteração, de qualquer tamanho, feita por qualquer pessoa ou sessão, com ou sem a
         coordenação presente. As regras do Título I são taxativas: não comportam exceção,
         interpretação extensiva nem analogia.

         Para: Tâmara e qualquer sessão que trabalhe no sistema • De: Coordenação BlackSolutions • 24 de novembro
         de 2026 • Versão no ar: 1.48.0




   Por que este documento existe. A coordenação nem sempre está disponível. Entre 19 e 23 de
   novembro de 2026 ela ficou ausente e o sistema seguiu recebendo alterações. Em vinte e quatro
   horas de trabalho em paralelo houve três rebases e uma regressão publicada em produção. Este
   manual substitui a coordenação naquilo que pode ser escrito como regra. O que não puder, para e
   espera.

T Í T U LO I

Regras invioláveis, rol taxativo
As onze regras abaixo são a lista fechada do que não pode ser alterado, removido, simplificado nem
contornado. Cada uma nasceu de um defeito real, e o motivo vai escrito junto para que ninguém a
desfaça por achar que é excesso. Alteração que esbarre em qualquer uma delas para e vai para o Igor.

 #       Regra                                            Motivo, com a história

 1       Paciente por nome:                               Em 24 de novembro de 2026 a podóloga relatou que, ao marcar o retorno
         ensurePatient sem porNome                        de uma paciente recém-cadastrada, o sistema agia como se o cadastro
         nas telas, com false na                          não existisse. A causa: desde a 1.43.0, findPatient só casava por CPF ou
         importação                                       código, nunca por nome. A busca por nome havia sido retirada para a
                                                          importação em lote não juntar paciente errado, mas ensurePatient
                                                          atende também agenda, comanda, atendimento e indicação, onde a
                                                          pessoa digita o nome escolhendo da lista. Cada remarcação abria uma
                                                          segunda ficha e a anamnese ficava presa na primeira. Função nova que
                                                          resolva paciente por nome chama ensurePatient sem passar porNome .
                                                          Importação em lote passa false . Não existe terceiro caso.

 2       Pacote é pacote, avulso é                        Em 24 de novembro de 2026 um pacote de dez sessões cadastrado por R$
         avulso                                           600,00 saiu no orçamento por R$ 1.000,00, porque o sistema pegou as dez
                                                          sessões do pacote e multiplicou pelo preço avulso de R$ 100,00. A
                                                          quantidade de um pacote é um, e o valor é o do pacote. Nunca inferir
                                                          quantidade a partir do nome do serviço.

 3       O item do orçamento nunca                        O campo de nome do item é texto livre e fica ao lado do seletor de serviço.
         sai zerado em silêncio                           Quem digitava o procedimento nunca passava pelo seletor e o item saía
                                                          com valor zero sem aviso. O campo sugere os nomes cadastrados,
                                                          preenche o valor quando o nome bate, e mostra aviso no item enquanto
                                                          estiver zerado. Valor digitado à mão não é sobrescrito.





 4       bfPes3dCabe exige as três                        Largura mínima de 1024 pixels, ponteiro fino e WebGL. Reduzir a uma
         condições juntas                                 checagem de WebGL faz o celular baixar 687 KB da biblioteca mais 252 KB
                                                          do modelo. Aconteceu entre a 1.44.0 e a 1.45.0, foi medido e revertido. É
                                                          decisão da direção, não otimização.

 5       Token fiscal é por clínica                       A nota fiscal sai com o CNPJ da clínica que prestou o serviço, assinada pelo
                                                          certificado digital dela. No integrador, quem emite é o token da empresa.
                                                          Um token único faria sair nota com CNPJ errado. Não criar token de reserva
                                                          em configIntegrador . A tabela bf_fiscal_token tem RLS ligada e
                                                          nenhuma política de leitura: quem lê é só a função de borda.

 6       Permissão clínica                                 podeTela , ABAS_CLINICAS e TELAS_CLINICAS separam quem vê
                                                          prontuário. Recepção e estoque não veem prontuário, anamnese,
                                                          evolução, fotos nem exames. Tela nova de conteúdo clínico entra em
                                                          TELAS_CLINICAS no mesmo commit em que nasce.

 7       Supabase pregado em                              Versão flutuante no CDN quebra o aplicativo sem aviso e sem ninguém ter
         2.119.2                                          mexido em nada.

 8       A política de segurança de                       Destino novo entra um a um, nominalmente. Afrouxar a política inteira
         conteúdo do index.html                           para fazer um módulo funcionar é proibido.

 9       Dado de paciente nunca vai                       O repositório é público no GitHub. Teste com dado fictício, sempre,
         para o repositório                               inclusive em captura de tela e vídeo.

 10      Toda coleção nova entra em                        COLS é o que sobe para a nuvem. Coleção fora dela existe só no aparelho
         defaultState() e em COLS                         e desaparece quando o cache é limpo, sem ninguém perceber que perdeu.

 11      Nada vai para produção sem                       Quando a coordenação estiver disponível, ela audita antes. Quando não
         auditoria                                        estiver, a auditoria do Título V é feita pela própria pessoa que construiu,
                                                          com as evidências registradas por escrito, e a publicação só ocorre com
                                                          todos os itens aprovados.


T Í T U LO I I

Antes de alterar qualquer coisa
Nenhuma linha é escrita antes dos cinco passos abaixo. Eles custam dez minutos e evitam a maior parte
do retrabalho já observado.

1. git pull --rebase origin main . Trabalhar sobre versão velha é a origem dos três rebases e da
   regressão publicada nesta semana.
2. Ler o arquivo que será alterado inteiro, não apenas o trecho. Os cabeçalhos dos módulos dizem o que
   o arquivo é, que nomes ele usa e o que ele deliberadamente não faz.
3. Procurar se a função já existe. grep -rn "nomeDaFuncao" --include=*.js --include=*.html . O sistema já
     tem função para quase tudo: formatar dinheiro, achar paciente, abrir modal, normalizar texto. Criar
     uma segunda é duplicação, e duplicação é o defeito que mais custa depois.
4. Procurar se a tabela ou a coleção já existe, no código e no banco. O odontograma é o exemplo: já
   existia gravando em bf_odontogramas , e criar uma tabela paralela teria partido o prontuário em dois.
5. Escrever, antes de codificar, qual é o critério objetivo de pronto. Se não for possível escrever um
   número ou um arquivo que prove o pronto, o escopo ainda não está claro.

T Í T U LO I I I

Como alterar
Artigo 1. Um arquivo por módulo
Funcionalidade nova nasce em arquivo próprio, bf-<nome>-<versão>.js , com 'use strict' , função
imediatamente invocada, guarda if (window.__bfXxx) return; e cabeçalho em português explicando o





que é, que nomes usa e o que o módulo não faz. Não se acrescenta lógica nova dentro do index.html ,
que já tem cerca de 940 KB.

Artigo 2. Três pontos de registro, sempre os três
Arquivo novo é registrado na tag <script> do index.html com ?v= , na lista const BASE do sw.js , e, se
guardar dados, em defaultState() e em COLS . Faltando qualquer um dos três, o módulo funciona na
máquina de quem escreveu e falha no aparelho da clínica.

Artigo 3. Editar no lugar, nunca reescrever de memória
Alteração se faz com edição pontual no arquivo. É proibido reconstruir o conteúdo de um arquivo a partir
do que apareceu na tela de uma ferramenta, porque a saída pode estar truncada e o que falta some sem
erro. Esta é a causa mais comum de código perdido.

Artigo 4. Nada de arquivo paralelo
É proibido criar bf-x-novo.js ao lado de bf-x.js , ou index-teste.html , ou qualquer variante que
duplique o mesmo comportamento. Quando a versão do módulo mudar, o arquivo é renomeado e os três
pontos de registro são atualizados no mesmo commit. Arquivo antigo não fica para trás.

Artigo 5. Copiar bloco de código é proibido
Se o mesmo comportamento é necessário em dois lugares, extrai-se uma função e chamam-se os dois.
Bloco copiado é duas verdades que divergem na primeira correção, e a segunda ninguém lembra de
corrigir.

Artigo 6. Texto de tela em português do dia a dia
Sem travessões, sem colchetes, sem abreviações, sem linguagem de marketing. As palavras são as que a
profissional usa, não os nomes internos do sistema.

Artigo 7. Limite clínico escrito
Módulo clínico não diagnostica, não indica local de aplicação, não sugere dose, não sugere técnica e não
prevê resultado. Esse limite vai escrito no cabeçalho do arquivo e, quando couber, visível na tela.

T Í T U LO I V

Como publicar
Procedimento obrigatório, na ordem, sem pular passo. Pular o passo 4 é o que gera a reclamação de que o
módulo não subiu: o aparelho continua com a versão antiga em cache.

 Passo O que fazer

 1          git pull --rebase origin main .

 2         Construir, seguindo o Título III.

 3         Registrar nos três pontos, conforme o Artigo 2.

 4         Subir a versão nos quatro lugares: trocar a versão antiga pela nova em todo o index.html , trocar const
           CACHE no sw.js por um nome novo, atualizar o versao.json , e acrescentar um item no começo de
            NOVIDADES , com a chave seg do ramo quando o aviso for só de um segmento.

 5         Testar com Playwright, servidor em python3 -m http.server 8099 , entrando com UI.auth=null;
           NV.ativa=true; S.config.clinica='T'; render() . Medir em 390 e em 1440 pixels.

 6         Rodar ./sincronizar-app.sh e conferir a contagem de arquivos. A pasta /app/ é uma segunda porta de
           entrada com service worker e cache próprios e não se atualiza sozinha.

 7         Rodar a auditoria do Título V inteira e registrar as evidências.





 8         git pull --rebase origin main outra vez. Em conflito nos arquivos de versão, ficar com a versão do outro
           e reaplicar a sua por cima, nunca o contrário. Depois conferir que o trabalho do outro continua no lugar.

 9         Commit com mensagem que explica o motivo, não só o quê, e git push origin main .

 10        Conferir no ar depois do push, nunca antes.


   Proibições de versionamento. Nunca git push --force . Nunca git checkout --ours ou --theirs
   em arquivo inteiro sem depois reaplicar à mão o que era seu e conferir o que era do outro. Nunca
   resolver conflito apagando o bloco alheio. Nunca reverter trabalho de outra pessoa sem falar com o
   Igor.

T Í T U LO V

Auditoria depois de cada entrega
Checklist obrigatório. Nenhum item é satisfeito por demonstração ou por impressão: todos produzem
número ou arquivo. Guardar o resultado por escrito, com data.

A. Não quebrou o que já existia
1. Agendar retorno de paciente já cadastrado continua usando a mesma ficha, e a anamnese dela
   continua visível. Conferir que o número de pacientes não aumentou.
2. Orçamento com o procedimento digitado continua trazendo o valor, e item sem valor continua
   mostrando o aviso.
3. Pacote continua saindo pelo valor do pacote, com quantidade um.
4. O pé em três dimensões continua ausente no celular e presente no computador.
5. Perfil sem permissão clínica continua sem enxergar prontuário, anamnese, evolução, fotos e exames.
6. Importação em lote continua sem juntar paciente por nome.

B. Telas, em 390 e em 1440 pixels
1. Nenhum erro de console em nenhuma tela.
2. document.documentElement.scrollWidth igual à largura da janela, em todas as telas. Rolagem lateral é
     defeito, não gosto.
3. Campo com 46 pixels de altura e 16 de letra no celular. Letra menor que 16 faz o navegador dar zoom
   sozinho quando a pessoa toca.
4. Botão com 44 pixels, ou 40 nos pequenos.
5. Caixas do mesmo tipo com o mesmo tamanho entre si, na mesma tela.

C. Integridade dos dados
1. Toda coleção nova aparece em COLS e sobe para a nuvem. Conferir criando um registro, sincronizando
     e abrindo em outro aparelho.
2. Nenhum dado de paciente no repositório. Conferir com git diff antes do commit.
3. Nenhuma tabela duplicada no banco para o mesmo assunto.

D. Antiduplicação e código perdido
1. Todo bf-*.js presente na raiz aparece no index.html e na lista const BASE do sw.js . Arquivo que não
     aparece nos dois é código morto e deve ser removido ou registrado.
2. Nenhum nome de função definido em dois lugares. Conferir com grep -rn "^function \|window\.[a-zA-
     Z]* *= *function" --include=*.js . | sort e procurar repetidos.

3. A versão citada no index.html , no sw.js , no versao.json e em NOVIDADES é a mesma. Divergência aqui
     faz o aparelho servir uma mistura de versões.
4. Contagem de arquivos do ./sincronizar-app.sh bate com a da raiz.




5. git status limpo depois do push. Arquivo não rastreado é trabalho que vai se perder.

   Recomendação de calibragem. Transformar os itens A, B e D num único script de verificação
   guardado no repositório, rodado antes de todo push. Hoje as varreduras vivem em pasta temporária e
   desaparecem. Enquanto o script não existir, o checklist é feito à mão e o resultado é registrado por
   escrito.


T Í T U LO V I

Manutenção periódica
 Quando                           O que

 A cada entrega                   Auditoria do Título V inteira.

 Toda semana                      Conferir a faixa de duplicados no alto da lista de pacientes e juntar o que estiver repetido.
                                  Conferir se o backup rodou. Ler os avisos de erro do navegador relatados pela clínica.

 Todo mês                         Medir o volume do banco e dos baldes de arquivos, com consulta a storage.objects e
                                   pg_database_size , e anotar. Em 24 de novembro de 2026 eram 2.896 objetos e 385,2 MB
                                  no balde de fotos, 1,1 MB em receituários e 123,4 MB de banco, total de 509,8 MB. Fazer um
                                  teste de restauração completo, cronometrado.

 Todo mês                         Conferir se alguma biblioteca externa mudou de versão sozinha. Todas devem estar
                                  pregadas em versão exata.

 A cada três meses                Revisar quem tem acesso ao sistema e a que perfil, e desligar quem saiu.


T Í T U LO V I I

Pedido do Igor ou reclamação da profissional
Toda demanda passa por triagem antes de virar código. A triagem é de cinco perguntas e leva minutos.

1. O que exatamente aconteceu? Reproduzir o caminho que a pessoa descreveu, com dado fictício,
   antes de supor a causa. A podóloga descreveu o caminho certo e a causa estava a três funções de
   distância do que parecia.
2. Isso é defeito ou é pedido novo? Defeito é o sistema não fazer o que já prometia. Pedido novo é
   funcionalidade. Defeito entra na frente.
3. Estraga dado? Se perde, duplica ou vaza dado de paciente, é urgência e segue o Título VIII. Se não
   estraga dado, entra na fila normal.
4. É plausível? Dizer com franqueza quando não for, e por quê, e o que é possível no lugar. Aceitar um
   pedido impossível e entregar meia-coisa é pior do que recusar na hora.
5. Esbarra no Título I? Se esbarrar, para e vai para o Igor, mesmo que o pedido venha dele.

   Quando o pedido vier em áudio ou em conversa solta. Escrever de volta, em uma frase, o que se
   entendeu, e confirmar antes de construir. A reclamação do orçamento sem valor e a do cadastro
   sumido vieram assim, e as duas tinham causa diferente do que a frase sugeria à primeira leitura.

T Í T U LO V I I I

Defeito em produção
Clínica real usa o sistema todo dia. Defeito que está estragando dado agora tem procedimento próprio.

1. Primeiro, estancar. Se houver como desligar a função defeituosa sem derrubar o resto, desligar antes
   de investigar. Dado que não se perde enquanto se investiga é dado que não precisa ser recuperado
   depois.
2. Avisar o Igor na hora, em uma frase, dizendo o que está acontecendo e o que já foi feito.
3. Reproduzir com dado fictício e achar a causa no código, não no palpite.




4. Corrigir a causa, não o sintoma. A ficha duplicada não se resolve apagando duplicados: resolve-se
   na função que decide se o paciente já existe.
5. Medir a correção no caminho exato que a pessoa relatou, antes de publicar.
6. Verificar o estrago já feito e dar à clínica o caminho de reparo. No caso das fichas duplicadas, a faixa
   de conferência no alto da lista de pacientes mostra as repetidas e junta com um toque.
7. Publicar e contar o que aconteceu no aviso de novidades, em português claro, dizendo o que era,
   que nada se perdeu quando for o caso, e o que a pessoa precisa fazer.

T Í T U LO I X

Defeitos já conhecidos
Registro para não repetir. Cada um custou tempo e alguns chegaram ao cliente.

 Defeito                                              Causa e lição

 Pacote de R$ 600,00 saiu por                         Quantidade do pacote multiplicada pelo preço avulso. Nunca misturar as duas
 R$ 1.000,00                                          grandezas.

 Ficha duplicada ao remarcar                          Busca por nome retirada de uma função usada por telas e pela importação ao
                                                      mesmo tempo. Antes de mudar o comportamento de uma função, listar todos
                                                      os chamadores.

 Item de orçamento zerado                             Campo de texto livre ao lado do seletor. Campo que a pessoa preenche
                                                      primeiro precisa funcionar sozinho.

 Pé em três dimensões no                              Regra de três condições reduzida a uma por outra sessão. Depois de todo
 celular                                              rebase, conferir que as decisões de produto continuam no lugar.

 Estilo fora do bloco de celular                      Regras inseridas após a chave de fechamento da consulta de mídia, gerando
                                                      chave solta. Conferir onde o bloco termina antes de inserir.

 Nome de função repetido                              Um auxiliar com o mesmo nome de outro escondeu o original e produziu valor
                                                      indefinido, sem erro. Nome de função é único no arquivo.

 Cores do mapa de regiões não                         A biblioteca converte cor para sRGB na saída. Mapa de regiões precisa de
 batiam                                               espaço de cor linear.

 Vista plantar mostrando o                            Enrolamento invertido na malha. Materiais precisam desenhar os dois lados.
 dorso

 Primeiro toque sem região                            A imagem do mapa só começava a carregar no clique. Carregar antes e
                                                      esperar antes de perguntar.

 Atributo de preenchimento                            Atributo de apresentação perde para regra de estilo. Usar estilo quando
 ignorado                                             houver regra concorrente.

 Painel dizendo que não havia                         A chave estava como segredo do projeto, que a tela não enxerga. Tela não
 chave                                                deve afirmar ausência do que ela não tem como ver.


T Í T U LO X

O que nunca fazer
1. Publicar sem rodar a auditoria do Título V.
2. Afirmar que algo funciona sem ter medido.
3. Reescrever arquivo a partir de saída de ferramenta.
4. Criar arquivo paralelo ou copiar bloco de código.
5. Reverter trabalho de outra pessoa sem falar com o Igor.
6. Usar git push --force .
7. Pôr dado de paciente no repositório, em teste, em captura de tela ou em vídeo.





8. Guardar certificado digital ou senha de cliente.
9. Fazer o sistema sugerir dose, técnica, local de aplicação, diagnóstico ou resultado.
0. Gravar simulação de imagem no prontuário.
1. Emitir nota fiscal com CNPJ que não seja o da clínica que prestou o serviço.
2. Deixar coleção nova fora de COLS .

A N E XO

Comandos e caminhos
  Repositório      TheIgor12/blacksolutions, branch main
  Aplicativo       index.html na raiz, cerca de 940 KB, mais os módulos bf-*.js
  Segunda entrada /app/, sincronizada por ./sincronizar-app.sh
  Service worker   sw.js, com const CACHE e const BASE
  Versão           const VERSAO_APP no index.html, mais versao.json e NOVIDADES
  Banco            projeto Supabase blszdbjpxgtloblxlusr, organização HappyFEET
  Funções de borda supabase/functions/, publicadas pelo painel, aba Code, Deploy updates
  SQL              arquivos em sql/, executados no editor de SQL do painel
  Figuras do pé    ferramentas/gerar-figuras-do-pe.js, com LEIA-ME.md ao lado
  Malha anatômica pes/modelo-anatomico-1.json, licença CC0, Blender Studio

  Servidor de teste
    python3 -m http.server 8099 --directory <pasta do repositório>

  Entrada do teste automatizado
    UI.auth=null; NV.ativa=true; S.config.clinica='T'; render()
    Para um ramo específico, acrescentar S.config.segmento='<ramo>'

  Conferir função repetida
    grep -rn "^function \|window\.[a-zA-Z]* *= *function" --include=*.js . | sort

  Conferir módulo não registrado
    ls bf-*.js e conferir cada um no index.html e na lista BASE do sw.js

  Medir volume guardado
    select count(*), sum((metadata->>'size')::bigint) from storage.objects;
    select pg_database_size(current_database());



   Onde este manual deve viver. Além deste arquivo, gravar o conteúdo no próprio repositório, como
   DIRETRIZES.md na raiz, para que fique ao lado do código e ninguém trabalhe sem ele. Toda alteração
   futura destas regras passa pelo Igor.


BlackSolutions, coordenação. 24 de novembro de 2026. Documento sem dados de pacientes. Versão no ar na data: 1.48.0. As regras
do Título I são taxativas. Os demais títulos são de cumprimento obrigatório e admitem acréscimo, nunca supressão, por decisão do
Igor.
```
