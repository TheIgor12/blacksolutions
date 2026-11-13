# -*- coding: utf-8 -*-
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether)

AZUL  = colors.HexColor('#1d4ed8')
ESC   = colors.HexColor('#0f172a')
CINZA = colors.HexColor('#475569')
LINHA = colors.HexColor('#e2e8f0')
FUNDO = colors.HexColor('#f8fafc')
AVISO = colors.HexColor('#fffbeb')
AVISOB= colors.HexColor('#f59e0b')
DICA  = colors.HexColor('#eff6ff')
DICAB = colors.HexColor('#3b82f6')

ss = getSampleStyleSheet()
def E(nome, **kw):
    base = dict(name=nome, fontName='Helvetica', fontSize=10.2, leading=15.2,
                textColor=ESC, alignment=TA_LEFT, spaceAfter=7)
    base.update(kw); return ParagraphStyle(**base)

P      = E('P')
Psub   = E('Psub', textColor=CINZA, fontSize=9.4, leading=13.6)
H1     = E('H1', fontName='Helvetica-Bold', fontSize=19, leading=23, textColor=ESC, spaceBefore=4, spaceAfter=10)
H2     = E('H2', fontName='Helvetica-Bold', fontSize=12.6, leading=17, textColor=ESC, spaceBefore=12, spaceAfter=5)
H3     = E('H3', fontName='Helvetica-Bold', fontSize=10.6, leading=15, textColor=AZUL, spaceBefore=9, spaceAfter=3)
Cap    = E('Cap', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=AZUL, spaceAfter=2)
Li     = E('Li', leftIndent=11, bulletIndent=2, spaceAfter=4)
Passo  = E('Passo', leftIndent=16, bulletIndent=2, spaceAfter=4)
TitCapa= E('TitCapa', fontName='Helvetica-Bold', fontSize=30, leading=35, spaceAfter=10)
SubCapa= E('SubCapa', fontSize=13, leading=19, textColor=CINZA, spaceAfter=6)
Cel    = E('Cel', fontSize=9.2, leading=12.8, spaceAfter=0)
CelB   = E('CelB', fontSize=9.2, leading=12.8, fontName='Helvetica-Bold', spaceAfter=0)

hist = []
def h1(t, cap=None):
    if cap: hist.append(Paragraph(cap.upper(), Cap))
    hist.append(Paragraph(t, H1))
def h2(t): hist.append(Paragraph(t, H2))
def h3(t): hist.append(Paragraph(t, H3))
def p(t, st=P): hist.append(Paragraph(t, st))
def sub(t): hist.append(Paragraph(t, Psub))
def li(itens):
    for i in itens: hist.append(Paragraph(i, Li, bulletText='•'))
def passos(itens):
    for n, i in enumerate(itens, 1): hist.append(Paragraph(i, Passo, bulletText='%d.' % n))
def sp(h=5): hist.append(Spacer(1, h))
def pb(): hist.append(PageBreak())

def caixa(titulo, texto, tipo='dica'):
    fundo = DICA if tipo == 'dica' else AVISO
    borda = DICAB if tipo == 'dica' else AVISOB
    inner = [[Paragraph('<b>%s</b>' % titulo, E('bt', fontName='Helvetica-Bold', fontSize=9.6, leading=13, spaceAfter=3))],
             [Paragraph(texto, E('bx', fontSize=9.4, leading=13.4, spaceAfter=0))]]
    t = Table(inner, colWidths=[155*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), fundo),
        ('LINEBEFORE',(0,0),(0,-1), 2.2, borda),
        ('LEFTPADDING',(0,0),(-1,-1), 9), ('RIGHTPADDING',(0,0),(-1,-1), 9),
        ('TOPPADDING',(0,0),(-1,-1), 5), ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('VALIGN',(0,0),(-1,-1),'TOP')]))
    hist.append(Spacer(1,3)); hist.append(KeepTogether(t)); hist.append(Spacer(1,9))

def tabela(linhas, larguras, cabecalho=True):
    dados = []
    for i, ln in enumerate(linhas):
        est = CelB if (cabecalho and i == 0) else Cel
        dados.append([Paragraph(str(c), est) for c in ln])
    t = Table(dados, colWidths=[w*mm for w in larguras], repeatRows=1 if cabecalho else 0)
    st = [('VALIGN',(0,0),(-1,-1),'TOP'),
          ('LINEBELOW',(0,0),(-1,-2), 0.4, LINHA),
          ('TOPPADDING',(0,0),(-1,-1), 5), ('BOTTOMPADDING',(0,0),(-1,-1), 5),
          ('LEFTPADDING',(0,0),(-1,-1), 0), ('RIGHTPADDING',(0,0),(-1,-1), 7)]
    if cabecalho:
        st += [('LINEBELOW',(0,0),(-1,0), 0.9, ESC), ('BOTTOMPADDING',(0,0),(-1,0), 6)]
    t.setStyle(TableStyle(st))
    hist.append(Spacer(1,2)); hist.append(t); hist.append(Spacer(1,10))

VERSAO = '1.9.24'
DATA = '13 de novembro de 2026'

class Doc(BaseDocTemplate):
    def __init__(self, arq):
        BaseDocTemplate.__init__(self, arq, pagesize=A4,
            leftMargin=27*mm, rightMargin=27*mm, topMargin=22*mm, bottomMargin=20*mm,
            title='Manual do BlackFlow, complemento %s' % VERSAO, author='BlackSolutions')
        f = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='n')
        self.addPageTemplates([PageTemplate(id='capa', frames=[f], onPage=self.capa),
                               PageTemplate(id='corpo', frames=[f], onPage=self.rodape)])
    def capa(self, c, d): pass
    def rodape(self, c, d):
        c.saveState()
        c.setStrokeColor(LINHA); c.setLineWidth(0.5)
        c.line(27*mm, 15*mm, A4[0]-27*mm, 15*mm)
        c.setFont('Helvetica', 8); c.setFillColor(CINZA)
        c.drawString(27*mm, 10.5*mm, 'Manual do BlackFlow, complemento da versao %s' % VERSAO)
        c.drawRightString(A4[0]-27*mm, 10.5*mm, 'pagina %d' % (c.getPageNumber()-1))
        c.restoreState()


# ============================== CAPA ==============================
sp(58)
p('BlackFlow <font color="#1d4ed8">by BlackSolutions</font>', E('m', fontSize=11, textColor=CINZA, spaceAfter=18))
p('Manual do BlackFlow', TitCapa)
p('Complemento da versão 1.5 à versão %s' % VERSAO, SubCapa)
p('Tudo o que entrou no sistema depois que o manual principal foi escrito. Leia junto com o '
  'Manual do BlackFlow, que continua valendo para instalação, primeiros passos, agenda, '
  'ficha do paciente e os módulos de cada segmento.', Psub)
sp(16)
tabela([['Para quem', 'Quem usa o BlackFlow no dia a dia e quem administra a clínica'],
        ['Base', 'Manual do BlackFlow, versão 1.4'],
        ['Cobre', 'Da versão 1.5 até a %s' % VERSAO],
        ['Atualizado em', DATA]], [32, 123], cabecalho=False)
sp(30)
sub('BlackFlow, by BlackSolutions  |  blackflow.app.br  |  blacksolutions.net.br')
pb()

# ============================== SUMÁRIO ==============================
h1('O que você vai encontrar aqui')
p('Os capítulos estão na ordem em que as novidades aparecem no uso do dia a dia. '
  'Se você só quer saber o que mudou de mais importante, leia os capítulos 1, 6 e 10.')
tabela([['Capítulo', 'Assunto'],
        ['1', 'Agendar e cadastrar na mesma tela'],
        ['2', 'Foto do paciente em todo lugar'],
        ['3', 'Anamnese a um clique de distância'],
        ['4', 'Documentos do paciente'],
        ['5', 'Exames, a tela que reconhece de quem é o arquivo'],
        ['6', 'Formato dos campos, telefone, CPF, CNPJ, CEP e dinheiro'],
        ['7', 'Procedimentos, preços e pacotes'],
        ['8', 'Estoque e produtos'],
        ['9', 'Inadimplência, cobrar, protestar e executar'],
        ['10', 'Conferência com o Clinicorp'],
        ['11', 'Backup, o que entra e o que não entra'],
        ['12', 'Teste grátis, planos e mais prazo'],
        ['13', 'Dúvidas frequentes']], [20, 135])
caixa('Como saber em que versão você está',
      'Abra o menu lateral e olhe o rodapé, ou entre em Configurações e depois Minha conta. '
      'O número da versão aparece nos dois lugares. Para atualizar, clique em Procurar atualização '
      'ou recarregue a página.')
pb()

# ============================== 1 ==============================
h1('Agendar e cadastrar na mesma tela', 'Capítulo 1')
p('Antes, para marcar horário de alguém que nunca veio, era preciso sair da agenda, cadastrar '
  'o paciente e voltar. Agora as duas coisas acontecem juntas.')
h2('Como funciona')
passos(['Na agenda, clique no horário vago ou no botão de novo agendamento.',
        'Comece a digitar o nome no campo Paciente.',
        'O sistema responde a cada letra digitada, logo abaixo do campo.'])
h3('Se a pessoa já está cadastrada')
p('Aparece em verde a palavra <b>Já cadastrado</b>, com a foto, o código, o celular, o CPF, '
  'o endereço e quando foi a última anamnese. Junto vêm três botões: Inserir foto, Anamnese '
  'e Abrir ficha.')
h3('Se o nome não está no cadastro')
p('Aparece em laranja <b>Paciente novo</b>, avisando que a ficha será criada ao salvar. '
  'O sistema abre os campos que faltam, e nenhum outro:')
li(['Celular ou WhatsApp, obrigatório',
    'CPF e data de nascimento',
    'CEP, endereço, número, bairro, cidade e estado, no fim do formulário',
    'Profissão e empresa onde a pessoa trabalha'])
p('Tudo o que for preenchido ali vai para o cadastro do paciente, não fica preso no agendamento. '
  'Se a pessoa já tiver o dado na ficha, o campo nem aparece.')
caixa('O sistema avisa quando o nome é parecido com alguém que já existe',
      'Digitar Maria de Soza quando existe Maria de Souza criava uma ficha nova e partia o '
      'histórico da paciente em duas. Agora o sistema mostra os nomes parecidos já cadastrados '
      'em botões. Um clique corrige o campo. Isso vale também para procedimentos e produtos.')
h2('Duração do atendimento')
p('O campo de duração virou uma lista fechada: 15, 30, 45, 60, 75, 90, 120, 150 e 180 minutos. '
  'Antes era um campo numérico com passo de um centésimo, e a setinha do teclado produzia '
  'valores como 30,04.')
pb()

# ============================== 2 ==============================
h1('Foto do paciente em todo lugar', 'Capítulo 2')
p('A foto de perfil já existia dentro da ficha do paciente. Agora ela aparece, e pode ser '
  'colocada, de qualquer tela em que o nome da pessoa esteja escrito.')
tabela([['Onde aparece', 'O que acontece ao clicar'],
        ['Agenda do computador e do celular', 'Abre o agendamento'],
        ['Janela do agendamento', 'Abre a tela de foto, para inserir ou trocar'],
        ['Lista de pacientes', 'Abre a ficha'],
        ['Financeiro e inadimplência', 'Abre a ficha no financeiro'],
        ['Ficha do paciente', 'Abre a tela de foto']], [62, 93])
p('Quando não há foto, aparecem as iniciais do nome em um círculo colorido. A foto é reduzida '
  'antes de ser guardada, para não pesar a sincronização.')
caixa('Foto é dado de saúde',
      'A foto do paciente, as fotos de antes e depois e os exames são dados pessoais sensíveis. '
      'Ficam guardados neste computador e na nuvem da clínica, em nenhum outro lugar. '
      'Trate com o mesmo cuidado do prontuário.', 'aviso')

# ============================== 3 ==============================
h1('Anamnese a um clique de distância', 'Capítulo 3')
p('A anamnese continua no mesmo lugar, dentro da ficha do paciente. O que mudou é que agora '
  'dá para consultar sem sair do que você está fazendo.')
li(['No agendamento, ao lado do nome, aparece quando foi a última anamnese, com o botão Anamnese.',
    'Na janela do agendamento já salvo, o mesmo botão.',
    'Na lista de pacientes, um link chamado anamnese ao lado de cada nome.'])
p('A anamnese abre em uma janela por cima, sem perder o agendamento que você estava digitando. '
  'Enquanto existe formulário aberto embaixo, o botão de criar anamnese nova não aparece, '
  'justamente para não apagar o que está sendo preenchido. Consultar funciona sempre.')
h2('Paciente novo')
p('Ao cadastrar alguém novo pela agenda, o sistema pergunta na hora se você quer preencher a '
  'anamnese e colocar a foto. Quem quiser deixar para depois clica em Depois e segue.')
pb()

# ============================== 4 ==============================
h1('Documentos do paciente', 'Capítulo 4')
p('Cada paciente ganhou uma aba chamada Documentos, ao lado de Fotos. Ela guarda qualquer arquivo '
  'daquela pessoa: exame, laudo, receita, atestado, encaminhamento, termo assinado ou documento pessoal.')
h2('Como anexar')
passos(['Abra a ficha do paciente e clique na aba Documentos.',
        'Clique em Anexar arquivos.',
        'Escolha um ou vários arquivos de uma vez. Aceita PDF e imagem.',
        'Depois de anexado, dá para mudar o tipo, a data e o nome direto na lista.'])
tabela([['Limite por arquivo', '12 MB'],
        ['Formatos aceitos', 'PDF e imagem'],
        ['Onde o arquivo fica', 'Neste computador e na nuvem da clínica'],
        ['Imagem', 'Entra reduzida, para ocupar menos espaço'],
        ['PDF', 'Entra inteiro, sem alteração']], [42, 113], cabecalho=False)
caixa('Se o arquivo não abrir em outro aparelho',
      'Ele pode ainda não ter terminado de subir para a nuvem. Abra pelo computador onde foi '
      'anexado, ou espere a sincronização terminar. O sistema avisa quando é esse o caso.')

# ============================== 5 ==============================
h1('Exames, a tela que reconhece de quem é o arquivo', 'Capítulo 5')
p('Existe agora uma tela chamada Exames, no menu principal. Ela serve para quando você baixou '
  'vários exames de uma vez e não quer abrir ficha por ficha para anexar.')
h2('Como usar')
passos(['Abra a tela Exames.',
        'Arraste os arquivos para a área pontilhada, ou clique para escolher.',
        'O sistema lê cada arquivo e procura de quem ele é.',
        'O que ele reconhece com certeza vai direto para a ficha do paciente, como documento do tipo Exame.',
        'O que ficou em dúvida aparece na lista esperando você confirmar o nome.'])
h2('Como o sistema descobre o paciente')
p('Ele procura nesta ordem, primeiro no nome do arquivo e, quando o arquivo é um PDF com texto, '
  'também nas três primeiras páginas do documento:')
tabela([['Ordem', 'O que procura', 'Arquiva sozinho?'],
        ['1', 'CPF do paciente', 'Sim'],
        ['2', 'Nome completo', 'Sim'],
        ['3', 'Primeiro nome e sobrenome', 'Sim'],
        ['4', 'Nome parecido', 'Não, pede confirmação']], [16, 94, 45])
caixa('Por que nome parecido não é arquivado sozinho',
      'Exame guardado na ficha do paciente errado é erro que ninguém percebe na hora e ninguém '
      'conserta depois, porque ninguém vai procurar o exame da Maria na ficha da Mariana. '
      'Pior ainda, é dado de saúde na ficha de outra pessoa. Por isso o sistema só arquiva '
      'sozinho quando a identificação é certa.', 'aviso')
p('A tela mostra também os últimos exames guardados, com a foto do paciente e um botão para '
  'abrir o arquivo. Cada exame aparece igualmente na aba Documentos da ficha.')
h2('Exame digitalizado, sem texto')
p('Exame escaneado como imagem não tem texto para ler. Nesse caso o sistema usa só o nome do '
  'arquivo. Se o nome do arquivo tiver o nome da paciente, funciona igual.')
pb()

# ============================== 6 ==============================
h1('Formato dos campos', 'Capítulo 6')
p('Todo campo que tem formato próprio agora se formata sozinho.')
tabela([['Campo', 'Você digita', 'Fica assim'],
        ['Celular', '47988887777', '(47) 98888-7777'],
        ['Telefone fixo', '4733334444', '(47) 3333-4444'],
        ['CEP', '89251000', '89251-000'],
        ['CPF', '00537931961', '005.379.319-61'],
        ['CNPJ', '12345678000199', '12.345.678/0001-99'],
        ['Dinheiro', '1234,5', '1.234,50']], [38, 60, 57])
p('Telefone, CEP, CPF e CNPJ se formatam enquanto você digita. O telefone reconhece sozinho se '
  'o número tem onze dígitos, celular, ou dez, fixo, e coloca o hífen no lugar certo nos dois casos.')
h2('Campos de dinheiro')
p('Os campos de valor, preço, custo e total deixaram de ser campo numérico do navegador. '
  'Aquilo obrigava ponto no lugar da vírgula e tinha setinha com passo de um centavo. '
  'Agora você escreve do jeito que quiser e o valor se formata quando você sai do campo.')
caixa('Por que o dinheiro só se formata ao sair do campo',
      'A alternativa comum, preencher da direita para a esquerda enquanto se digita, faz quem '
      'digita 150 ver 1,50 na tela. Em campo de preço, isso vira cobrança errada.')
h2('Endereço pelo CEP')
p('Em qualquer tela com campo de CEP, ao completar os oito dígitos o sistema busca o endereço e '
  'preenche rua, bairro, cidade e estado, deixando o cursor no número. Ele só preenche campo '
  'vazio: o que você digitou à mão fica. Sem internet, ou com CEP inexistente, ele avisa e deixa '
  'preencher à mão.')
pb()

# ============================== 7 ==============================
h1('Procedimentos, preços e pacotes', 'Capítulo 7')
p('Na tela Procedimentos e preços, ao digitar o nome de um procedimento que já existe, o sistema '
  'avisa e traz o preço, o valor do pacote e o número de sessões já preenchidos. Isso evita o '
  'mesmo procedimento cadastrado duas vezes com preços diferentes.')
h2('Como funciona pacote')
p('Todo pacote tem dois valores, e os dois importam:')
tabela([['Preço por sessão', 'Quanto vale cada sessão dentro do pacote'],
        ['Valor do pacote', 'Quanto a pessoa paga pelo pacote inteiro'],
        ['Sessões do pacote', 'Quantas sessões o pacote tem']], [42, 113], cabecalho=False)
caixa('Confira sempre a conta do pacote',
      'Preço por sessão vezes número de sessões tem que dar o valor do pacote. Quando não dá, '
      'um dos dois números está errado, e a clínica cobra errado até alguém perceber.', 'aviso')

# ============================== 8 ==============================
h1('Estoque e produtos', 'Capítulo 8')
p('No cadastro de produto, ao digitar um nome que já existe, o preço, o custo e a marca vêm '
  'preenchidos, e o sistema avisa quantas unidades há em estoque. Os campos continuam livres '
  'para alterar, e o que você digitar nunca é sobrescrito.')
caixa('Para repor quantidade, não cadastre de novo',
      'Cadastrar o mesmo produto duas vezes divide o estoque em dois cadastros, e os relatórios '
      'param de fechar. Para repor, use Entrou produto na linha do produto que já existe.', 'aviso')
pb()

# ============================== 9 ==============================
h1('Inadimplência, cobrar, protestar e executar', 'Capítulo 9')
p('A tela de Inadimplência, dentro do Financeiro, mostra quem está com parcela vencida. '
  'Ela ganhou uma coluna de CPF e endereço ao lado de cada devedor.')
li(['Quando falta o CPF, aparece sem CPF em vermelho.',
    'Quando falta o endereço, aparece sem endereço em vermelho.',
    'Ao lado, o link completar cadastro abre a ficha para preencher na hora.'])
p('A planilha exportada por essa tela passou a levar CPF, endereço completo, profissão e empresa, '
  'além do que já levava.')
h2('Por que isso importa')
p('Para mandar mensagem de cobrança basta o celular. Para protestar em cartório ou entrar com '
  'ação de execução, a qualificação do devedor é nome, CPF e endereço. Sem esses três, o caso '
  'não anda. Deixar o vermelho aparecer na tela é a forma de saber de quem falta dado antes '
  'de precisar.')
caixa('Preencha só quem interessa',
      'Os pacientes que vieram da importação costumam estar sem endereço. Não vale a pena parar '
      'para completar o cadastro de todos. O vermelho na tela de inadimplência mostra exatamente '
      'quem está incompleto entre os que devem, que são os únicos que importam para cobrança.')

# ============================== 10 ==============================
h1('Conferência com o Clinicorp', 'Capítulo 10')
p('Quem usa dois sistemas ao mesmo tempo acaba com números diferentes nos dois. A tela '
  'Conferência, dentro do Financeiro, existe para acertar isso.')
h2('Por que a diferença aparece')
p('A importação do Clinicorp é uma fotografia de um dia. Tudo que for pago ou lançado depois '
  'daquele dia fica de fora. Em um mês de uso paralelo, a diferença já é grande o bastante '
  'para cobrar errado.')
h2('Como fazer')
passos(['No Clinicorp, abra Relatórios, depois Pacientes, depois Cobrança e Pagamentos.',
        'Escolha o período e o status Todos, e clique em Listar.',
        'Exporte em Excel.',
        'No BlackFlow, abra Financeiro e depois Conferência.',
        'Escolha o arquivo exportado.',
        'Confira a lista de divergências, paciente por paciente.',
        'Acerte um por um, ou todos de uma vez.'])
p('A conferência substitui apenas os lançamentos que vieram do Clinicorp. O que foi lançado '
  'direto no BlackFlow, como venda de produto no balcão, não é tocado.')
caixa('O sistema avisa quando a conferência está atrasada',
      'Passando trinta dias da última conferência, aparece um aviso no alto do Financeiro. '
      'Passando sessenta, o aviso fica vermelho. Enquanto a clínica lançar dinheiro nos dois '
      'sistemas, a diferença volta a crescer sozinha, todo mês.', 'aviso')
h2('O que a conferência não resolve')
p('Ela acerta o BlackFlow pelo Clinicorp, e não o contrário. E não resolve a causa: enquanto '
  'houver lançamento nos dois sistemas, haverá divergência. A decisão de usar um só para '
  'lançar dinheiro é da clínica, e é a única que acaba com o problema de vez.')
pb()

# ============================== 11 ==============================
h1('Backup, o que entra e o que não entra', 'Capítulo 11')
p('Em Configurações, na aba Backup e segurança, estão os botões de baixar e restaurar.')
tabela([['Entra no arquivo de backup', 'Não entra'],
        ['Pacientes e fichas', 'Fotos de perfil'],
        ['Agenda e agendamentos', 'Fotos de antes e depois'],
        ['Financeiro e parcelas', 'Exames e documentos'],
        ['Anamneses e evoluções', ''],
        ['Procedimentos, preços e estoque', '']], [78, 77])
p('Fotos, exames e documentos ficam guardados na nuvem da clínica e neste computador, mas não '
  'cabem dentro do arquivo de backup, que é um arquivo de texto com os dados escritos.')
h2('Com que frequência')
p('A tela mostra há quantos dias foi o último backup. A partir de sete dias ela avisa em amarelo, '
  'a partir de trinta em vermelho. Guarde o arquivo em lugar seguro, porque é prontuário.')
caixa('Sincronização não é backup',
      'A nuvem protege contra perder o computador. Não protege contra apagar sem querer, porque '
      'o que foi apagado sincroniza junto. Por isso o backup continua necessário mesmo com a '
      'sincronização ligada.', 'aviso')

# ============================== 12 ==============================
h1('Teste grátis, planos e mais prazo', 'Capítulo 12')
p('O teste grátis do BlackFlow é de sete dias. Durante o teste tudo funciona, sem limite de '
  'pacientes nem de agendamentos.')
tabela([['Plano', 'O que inclui'],
        ['Só agenda', 'Agenda, cadastro, profissionais, serviços e preços, confirmação por WhatsApp e agendamento online. Sem financeiro, sem estoque e sem comanda.'],
        ['Completo', 'Tudo o que o segmento usa: agenda, financeiro, relatórios, painel e os módulos próprios do negócio.']], [30, 125])
p('Quando o teste vence, aparece a tela de assinatura com os planos. Quem precisa de alguns dias '
  'a mais pode pedir pelo botão da própria tela, sem falar com ninguém.')

# ============================== 13 ==============================
h1('Dúvidas frequentes', 'Capítulo 13')
h3('Abri o agendamento e não aparece nada além de data e hora')
p('É assim mesmo enquanto o campo Paciente estiver vazio. Comece a digitar o nome e os campos '
  'aparecem conforme a pessoa esteja ou não cadastrada.')
h3('Atualizei e continua aparecendo a versão antiga')
p('Recarregue a página. Se o número da versão no menu lateral continuar antigo, feche e abra o '
  'programa de novo.')
h3('Anexei um exame e ele não abre no celular')
p('O arquivo ainda não terminou de subir para a nuvem, ou o celular está sem internet. '
  'Espere a sincronização e tente de novo.')
h3('O CEP não preencheu o endereço')
p('Confira se o CEP tem oito dígitos e se existe. Sem internet a busca não funciona, e aí o '
  'endereço pode ser preenchido à mão normalmente.')
h3('Cadastrei o mesmo paciente duas vezes, e agora?')
p('Os dois cadastros continuam existindo, cada um com o seu histórico. Abra a ficha que ficou '
  'errada e corrija, ou desative. O sistema passou a avisar quando o nome digitado é parecido '
  'com alguém que já existe, para isso não se repetir.')
h3('Posso apagar um documento anexado?')
p('Pode, pelo botão Excluir na lista de documentos. O arquivo sai deste computador e da nuvem, '
  'e não tem como voltar.')
h3('A duração do atendimento não tem o tempo que eu preciso')
p('A lista vai de 15 em 15 minutos até 180. Se a clínica precisa de um tempo que não está ali, '
  'avise que a lista é fácil de ampliar.')
sp(14)
sub('BlackFlow, by BlackSolutions. Documento gerado em %s, referente à versão %s.' % (DATA, VERSAO))

doc = Doc('/tmp/claude-0/-home-claude/6968ea63-dfcd-5d7d-9d74-c107d59cb306/scratchpad/man/Manual_BlackFlow_Complemento.pdf')
doc.build(hist)
print('PDF gerado')
