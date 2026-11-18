# -*- coding: utf-8 -*-
# Gera o Manual do BlackFlow, documento unico e completo.
# As imagens vem das capturas feitas na clinica de demonstracao, com dados
# inventados. Nenhum dado de paciente real entra neste documento.
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors, utils
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether, Image)

VERSAO = '1.9.58'
DATA   = '18 de novembro de 2026'
IMGDIR = '/home/claude/demo/jpg'
SAIDA  = '/home/claude/blacksolutions/download/Manual_BlackFlow.pdf'

AZUL  = colors.HexColor('#1d4ed8')
ESC   = colors.HexColor('#0f172a')
CINZA = colors.HexColor('#475569')
LINHA = colors.HexColor('#e2e8f0')
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
H1     = E('H1', fontName='Helvetica-Bold', fontSize=19, leading=23, spaceBefore=4, spaceAfter=10)
H2     = E('H2', fontName='Helvetica-Bold', fontSize=12.6, leading=17, spaceBefore=12, spaceAfter=5)
H3     = E('H3', fontName='Helvetica-Bold', fontSize=10.6, leading=15, textColor=AZUL, spaceBefore=9, spaceAfter=3)
Cap    = E('Cap', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=AZUL, spaceAfter=2)
Li     = E('Li', leftIndent=11, bulletIndent=2, spaceAfter=4)
Passo  = E('Passo', leftIndent=16, bulletIndent=2, spaceAfter=4)
TitCapa= E('TitCapa', fontName='Helvetica-Bold', fontSize=32, leading=37, spaceAfter=10)
SubCapa= E('SubCapa', fontSize=13, leading=19, textColor=CINZA, spaceAfter=6)
Cel    = E('Cel', fontSize=9.2, leading=12.8, spaceAfter=0)
CelB   = E('CelB', fontSize=9.2, leading=12.8, fontName='Helvetica-Bold', spaceAfter=0)
Leg    = E('Leg', fontSize=8.6, leading=12, textColor=CINZA, alignment=TA_CENTER, spaceAfter=10)

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

def figura(arq, legenda, larg=155):
    caminho = os.path.join(IMGDIR, arq)
    if not os.path.exists(caminho):
        return
    iw, ih = utils.ImageReader(caminho).getSize()
    w = larg*mm
    h = w*ih/float(iw)
    teto = 112*mm
    if h > teto:
        h = teto; w = h*iw/float(ih)
    im = Image(caminho, width=w, height=h)
    im.hAlign = 'CENTER'
    bloco = [im, Spacer(1,4), Paragraph(legenda, Leg)]
    hist.append(Spacer(1,4)); hist.append(KeepTogether(bloco))

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

class Doc(BaseDocTemplate):
    def __init__(self, arq):
        BaseDocTemplate.__init__(self, arq, pagesize=A4,
            leftMargin=27*mm, rightMargin=27*mm, topMargin=22*mm, bottomMargin=20*mm,
            title='Manual do BlackFlow %s' % VERSAO, author='BlackSolutions')
        f = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='n')
        self.addPageTemplates([PageTemplate(id='corpo', frames=[f], onPage=self.rodape)])
    def rodape(self, c, d):
        if c.getPageNumber() == 1: return
        c.saveState()
        c.setStrokeColor(LINHA); c.setLineWidth(0.5)
        c.line(27*mm, 15*mm, A4[0]-27*mm, 15*mm)
        c.setFont('Helvetica', 8); c.setFillColor(CINZA)
        c.drawString(27*mm, 10.5*mm, 'Manual do BlackFlow, versao %s' % VERSAO)
        c.drawRightString(A4[0]-27*mm, 10.5*mm, 'pagina %d' % (c.getPageNumber()-1))
        c.restoreState()

# ============================== CAPA ==============================
sp(52)
p('BlackFlow <font color="#1d4ed8">by BlackSolutions</font>', E('m', fontSize=11, textColor=CINZA, spaceAfter=18))
p('Manual do BlackFlow', TitCapa)
p('Sistema de gestão para clínicas de podologia, estética, salões de beleza e para quem atende com hora marcada', SubCapa)
sp(10)
p('Este manual cobre o sistema inteiro, da criação da conta ao último relatório. '
  'Ele substitui o manual anterior e o complemento, que deixam de circular.', Psub)
sp(16)
tabela([['Para quem', 'Quem usa o BlackFlow no dia a dia e quem administra a clínica'],
        ['Versão', VERSAO],
        ['Atualizado em', DATA],
        ['Onde usar', 'Celular, tablet e computador, pela internet, e também em programa instalado no Windows e no Mac'],
        ['Onde ficam os dados', 'Servidor no Brasil, em São Paulo']], [32, 123], cabecalho=False)
sp(26)
sub('BlackFlow, by BlackSolutions  |  blackflow.app.br  |  blacksolutions.net.br')
pb()

# ============================== SUMÁRIO ==============================
h1('O que você vai encontrar aqui')
p('Os capítulos seguem a ordem do uso real: primeiro colocar a clínica para funcionar, depois '
  'o atendimento do dia, depois o dinheiro, e por último o que ajuda a crescer. '
  'Se você está começando agora, leia os capítulos 1, 2 e 3 e já consegue trabalhar.')
tabela([['Capítulo', 'Assunto'],
        ['1',  'Começar a usar'],
        ['2',  'A tela de início e o menu'],
        ['3',  'Agenda'],
        ['4',  'Pacientes e a ficha'],
        ['5',  'Prontuário, evolução, anamnese e fotos'],
        ['6',  'Procedimentos, preços e pacotes'],
        ['7',  'Financeiro'],
        ['8',  'Receber por Pix'],
        ['9',  'Cobrar quem está devendo'],
        ['10', 'Contrato com assinatura pelo celular'],
        ['11', 'Estoque e produtos'],
        ['12', 'Profissionais e comissões'],
        ['13', 'Relatórios e painel'],
        ['14', 'Recuperação de pacientes'],
        ['15', 'Trazer os seus dados do Excel'],
        ['16', 'Configurações e a marca da clínica'],
        ['17', 'Seus dados, cópia de segurança e a lei de proteção de dados'],
        ['18', 'Planos e assinatura'],
        ['19', 'Ajuda e suporte']], [20, 135])
caixa('Como saber em que versão você está',
      'Abra o menu lateral e olhe o rodapé, ou entre em Configurações e depois Minha conta. '
      'O número aparece nos dois lugares. Para atualizar, clique em Procurar atualização ou '
      'recarregue a página segurando a tecla Ctrl e apertando F5.')
pb()

# ============================== 1 ==============================
h1('Começar a usar', 'Capítulo 1')
p('O BlackFlow funciona pela internet. Não tem instalação obrigatória, não tem licença para '
  'liberar e não precisa de técnico para configurar.')
h2('Criar a conta')
passos(['Abra blackflow.app.br no celular ou no computador.',
        'Clique em Criar conta e informe o seu e-mail e uma senha.',
        'Confirme o e-mail que o sistema envia.',
        'Escreva o nome da clínica e escolha o segmento: podologia, estética, salão de beleza ou outro.'])
p('O segmento muda o vocabulário e as telas. Em podologia o sistema fala em paciente, anamnese e '
  'evolução. Em salão de beleza, em cliente, ficha técnica e comanda. Dá para trocar depois, em Configurações.')
h2('Os sete dias de teste')
p('Toda conta nova começa com sete dias de teste, com tudo liberado e sem pedir cartão. Durante o '
  'teste aparece no alto da tela quantos dias faltam. Quando o teste termina, os dados continuam '
  'guardados: basta assinar para voltar a usar.')
h2('Usar no celular, no computador e sem internet')
li(['No celular, abra o endereço e use o menu do navegador para adicionar à tela de início. Fica com ícone, como qualquer aplicativo.',
    'No computador, use pelo navegador ou baixe o programa em blackflow.app.br/programa, para Windows e para Mac.',
    'Se a internet cair, o sistema continua funcionando no aparelho. Quando a conexão volta, ele envia sozinho o que foi feito.'])
caixa('Mais de uma pessoa na mesma clínica',
      'Cada pessoa entra com o próprio e-mail e a própria senha. Em Configurações, na parte de '
      'Equipe, o administrador convida quem vai usar e escolhe o que cada um enxerga.')
pb()

# ============================== 2 ==============================
h1('A tela de início e o menu', 'Capítulo 2')
p('A tela de início é o resumo do dia. Ela mostra os aniversariantes da semana, os atalhos para as '
  'partes mais usadas e quanto está em atraso para cobrar.')
figura('01_inicio.jpg', 'Tela de início, com os aniversariantes e os atalhos das áreas do sistema.')
h2('O que fica em cada lugar')
tabela([['Onde', 'Para que serve'],
        ['Menu lateral, no canto esquerdo', 'Abre as áreas do sistema: Agenda, Pacientes, Financeiro, Relatórios, Painel, Importar, Profissionais e Configurações'],
        ['Busca, no alto', 'Encontra paciente pelo nome, pelo telefone ou pelo código, e também encontra funções do sistema'],
        ['Botão Pix, no alto', 'Gera o código de cobrança por Pix de qualquer tela em que você estiver'],
        ['Seta circular, no alto', 'Procura atualização do sistema'],
        ['Seu nome, no canto direito', 'Conta, assinatura, equipe e sair']], [38, 117])
caixa('A busca entende nome parecido',
      'Digitar Maria de Soza encontra Maria de Souza. Serve para não cadastrar a mesma pessoa duas '
      'vezes e partir o histórico dela em dois.')
pb()

# ============================== 3 ==============================
h1('Agenda', 'Capítulo 3')
p('A agenda é a tela onde a clínica passa o dia. Ela mostra a semana inteira, o dia isolado ou a '
  'coluna de cada profissional.')
figura('02_agenda.jpg', 'Agenda da semana. Cada profissional tem a sua cor e cada situação tem a sua.')
h2('Marcar um horário')
passos(['Clique no horário vago, ou no botão Agendar.',
        'Comece a digitar o nome. Se a pessoa já existe, o sistema mostra a ficha dela logo abaixo.',
        'Se for alguém novo, o sistema avisa em laranja e abre só os campos que faltam, como celular, CPF e endereço.',
        'Escolha o profissional, o procedimento e a duração.',
        'Salve. O que você preencheu ali vai para o cadastro do paciente, não fica preso no agendamento.'])
figura('17_agendar.jpg', 'Janela de agendamento. Cadastrar e marcar acontecem na mesma tela.')
h2('As situações e as cores')
tabela([['Situação', 'O que significa'],
        ['Agendado',   'Horário marcado, ainda sem confirmação'],
        ['Confirmado', 'A pessoa respondeu que vem'],
        ['Paciente novo', 'Primeira vez na clínica'],
        ['Atendido',   'O atendimento aconteceu'],
        ['Faltou',     'A pessoa não veio e não avisou'],
        ['Desmarcou',  'O horário voltou a ficar livre']], [36, 119])
h2('Confirmar pelo WhatsApp')
p('Em cada agendamento existe o botão de confirmação. Ele abre o WhatsApp da pessoa com a '
  'mensagem já escrita, com o nome dela, o dia, a hora e o nome da clínica. Você só confere e envia. '
  'O texto padrão pode ser mudado em Configurações.')
h2('Agendamento pela internet')
p('Em Configurações existe a página de agendamento online. Você escolhe quais serviços e quais '
  'profissionais aparecem, os horários de funcionamento e se o preço fica visível. O sistema gera '
  'um endereço para você colocar no Instagram ou mandar no WhatsApp. Quem marcar por ali entra na '
  'sua agenda e, se ainda não tiver cadastro, ganha um com a marcação de que veio do agendamento online.')
caixa('Imprimir o dia',
      'O ícone de impressora, no alto da agenda, gera a lista do dia para deixar na recepção.')
pb()

# ============================== 4 ==============================
h1('Pacientes e a ficha', 'Capítulo 4')
p('A lista de pacientes mostra quem está cadastrado, com código, telefone e a última vez que a '
  'pessoa veio. Dá para filtrar, ordenar e abrir a ficha com um clique.')
figura('04_pacientes.jpg', 'Lista de pacientes, com busca e filtros.')
h2('A ficha')
p('A ficha reúne tudo da pessoa em abas. Em podologia, elas são estas:')
tabela([['Aba', 'O que tem dentro'],
        ['Visão Geral',          'Dados de contato, endereço, observações e os últimos acontecimentos'],
        ['Prontuário',           'A linha do tempo completa: agendamentos, evoluções, pagamentos, fotos e documentos, em ordem'],
        ['Orçamentos',           'O que foi proposto, o que foi aprovado e o que ficou em aberto'],
        ['Financeiro',           'Lançamentos, parcelas e o que a pessoa deve'],
        ['Controle de Sessões',  'Pacotes: quantas sessões já foram feitas e quantas faltam'],
        ['Evolução',             'O que foi feito em cada atendimento, escrito e datado'],
        ['Anamnese',             'O questionário de saúde, já pronto para o segmento'],
        ['Fotos',                'Antes e depois, por área e por data'],
        ['Exames',               'Arquivos de exame'],
        ['Documentos',           'Arquivos em geral, como receituário e atestado'],
        ['Termos',               'Termos de consentimento, com assinatura pelo celular'],
        ['Contratos',            'Contratos de prestação de serviço, com assinatura e código de verificação'],
        ['Agendamentos',         'Todo o histórico de horários da pessoa']], [40, 115])
figura('05_ficha.jpg', 'Ficha do paciente, aberta na visão geral.')
caixa('Estética e salão de beleza têm abas próprias',
      'Em estética entram Avaliação e Antes e depois. Em salão de beleza entram Comandas, '
      'Ficha técnica e Pacotes e assinaturas. O resto funciona igual.')
pb()

# ============================== 5 ==============================
h1('Prontuário, evolução, anamnese e fotos', 'Capítulo 5')
h2('Prontuário')
p('O prontuário é a linha do tempo da pessoa. Cada acontecimento aparece com a data, o tipo e quem '
  'registrou. Serve para, em trinta segundos, saber o que já foi feito, quanto foi pago e o que '
  'ficou combinado.')
h2('Evolução')
p('A evolução é o texto do atendimento. Escreva o que foi observado, o que foi feito e o que foi '
  'orientado. O sistema guarda por data, com o nome do profissional. Esse registro é o que sustenta '
  'o trabalho da clínica se houver qualquer discussão depois.')
h2('Anamnese')
p('O questionário de saúde já vem pronto para o segmento da clínica, com as perguntas que importam. '
  'Dá para preencher no atendimento, no celular ou no computador, e a data de cada anamnese fica '
  'guardada. Na tela de agendamento aparece a data da última anamnese da pessoa, para você saber '
  'se precisa refazer.')
h2('Fotos de antes e depois')
p('A foto é tirada pelo próprio celular, sem baixar nada. Ao inserir, o sistema pergunta de que '
  'tipo é a foto, de qual área e de qual momento, e já sugere o procedimento do agendamento do dia. '
  'A imagem fica guardada na ficha da pessoa, dentro do seu computador e na nuvem.')
caixa('Por que isso importa mais do que parece',
      'Foto datada e evolução escrita são a prova de como a pessoa chegou e de como ela saiu. '
      'Sem isso, uma reclamação vira a palavra de um contra a do outro.')
pb()

# ============================== 6 ==============================
h1('Procedimentos, preços e pacotes', 'Capítulo 6')
p('Em Configurações você cadastra o que a clínica faz. Cada procedimento tem nome, preço e duração.')
li(['A duração alimenta a agenda e o agendamento pela internet.',
    'O preço entra sozinho no financeiro quando o atendimento é lançado.',
    'Um procedimento pode ser desativado sem ser apagado, e some das listas novas sem mexer no histórico.'])
h2('Pacotes e sessões')
p('Quando o tratamento tem várias sessões, cadastre o total. A cada atendimento o sistema baixa uma '
  'sessão e mostra quantas faltam, na aba Controle de Sessões da ficha. Assim ninguém perde a conta '
  'de um pacote de laser pela metade.')
caixa('Tabela de preços por profissional',
      'Se um profissional cobra diferente, o preço pode ser ajustado no momento do lançamento, sem '
      'mudar a tabela da clínica inteira.')
pb()

# ============================== 7 ==============================
h1('Financeiro', 'Capítulo 7')
p('O financeiro do BlackFlow não é só uma lista de recebimentos. Ele é dividido em abas, cada uma '
  'respondendo a uma pergunta diferente.')
figura('06_financeiro.jpg', 'Tela do financeiro, com as abas no alto.')
tabela([['Aba', 'A pergunta que ela responde'],
        ['Geral',             'Como está o mês, no resumo'],
        ['Conta Corrente',    'O que entrou e o que saiu, em ordem'],
        ['Fluxo de Caixa',    'O que ainda vai entrar e o que ainda vai sair'],
        ['Contas a Pagar',    'O que a clínica deve, para quem e quando vence'],
        ['Contas a Receber',  'O que as clientes devem e quando vence'],
        ['Inadimplência',     'Quem está em atraso e há quantos dias'],
        ['Conferência',       'Bate o que foi lançado com o que foi atendido'],
        ['Imposto de Renda',  'Os números organizados para a declaração']], [40, 115])
h2('Lançar um atendimento')
p('Ao marcar o agendamento como atendido, o sistema já oferece o lançamento com o valor do '
  'procedimento. Você confirma a forma de pagamento e pronto. Se for parcelado, informe quantas '
  'vezes: o sistema cria as parcelas com os vencimentos certos.')
h2('Comanda e caixa do dia')
p('A comanda reúne tudo que a pessoa consumiu no atendimento, inclusive produto vendido. No fim do '
  'expediente, o caixa do dia mostra quanto entrou por cada forma de pagamento, para conferir com o '
  'dinheiro na gaveta e com a maquininha.')
caixa('Quanto sobrou de verdade',
      'A aba Geral desconta as despesas lançadas em Contas a Pagar. O número que aparece é o que '
      'sobrou, não o que entrou. É a diferença entre movimento e lucro.')
pb()

# ============================== 8 ==============================
h1('Receber por Pix', 'Capítulo 8')
p('O BlackFlow gera o código de cobrança por Pix na hora, com o valor já preenchido. O dinheiro cai '
  'direto na conta da clínica: o sistema não fica com nada e não passa por intermediário.')
h2('Cadastrar a chave, uma vez só')
p('Em Configurações, informe a chave Pix da clínica, o nome do recebedor e a cidade. Serve qualquer '
  'chave do banco de vocês: aleatória, CPF, CNPJ, e-mail ou celular.')
h2('Cobrar')
passos(['Clique no botão Pix, que aparece no alto da tela e em vários lugares do sistema.',
        'Escolha a pessoa na lista de quem está para pagar, ou digite o valor à mão.',
        'Mostre o QR Code na tela para a pessoa ler pelo banco dela.',
        'Se ela não estiver na clínica, use Copiar código ou Mandar no WhatsApp.',
        'Depois que o dinheiro cair, clique em Recebi, registrar. O lançamento entra no financeiro.'])
figura('15_pix.jpg', 'Janela do Pix, com o QR Code gerado e o código para copiar e colar.')
caixa('O botão do Pix está em sete lugares',
      'No alto da tela, no agendamento, na comanda aberta, no cabeçalho da ficha do paciente, na aba '
      'Financeiro da ficha, na lista do prontuário e no caixa do dia. Em qualquer um deles o valor '
      'já vem preenchido.')
pb()

# ============================== 9 ==============================
h1('Cobrar quem está devendo', 'Capítulo 9')
p('A aba Inadimplência mostra quem está em atraso, de quanto é a dívida e há quantos dias ela '
  'venceu, ordenada do mais antigo para o mais recente.')
figura('08_inadimplencia.jpg', 'Relatório de parcelas em atraso.')
h2('A mensagem já vem escrita')
p('Ao lado de cada pessoa existe o botão que abre o WhatsApp dela com a cobrança pronta, com o nome, '
  'o valor, a data de vencimento e o nome da clínica. O texto padrão pode ser mudado em Configurações.')
caixa('Cobrança tem regra, e a regra protege você',
      'O artigo 42 do Código de Defesa do Consumidor proíbe expor a pessoa ao ridículo e constranger '
      'quem deve. Cobrança se faz em conversa reservada, sem avisar terceiros e sem ameaça. A mensagem '
      'que o sistema escreve segue esse limite de propósito.', 'aviso')
pb()

# ============================== 10 ==============================
h1('Contrato com assinatura pelo celular', 'Capítulo 10')
p('Para tratamento longo ou caro, o combinado precisa estar escrito. O BlackFlow monta o contrato, '
  'envia pelo WhatsApp e guarda a assinatura com prova de autenticidade.')
h2('Como funciona')
passos(['Na ficha da pessoa, ou no agendamento, abra Contratos e clique em novo contrato.',
        'Os dados da pessoa já vêm preenchidos. Informe o serviço, o valor total, a entrada, em quantas vezes e a data da primeira parcela.',
        'O sistema escreve o contrato, com o valor por extenso e a tabela de parcelas com os vencimentos.',
        'Escolha assinar ali mesmo, no seu aparelho, ou enviar pelo WhatsApp para a pessoa assinar do celular dela.',
        'A pessoa lê, confere o CPF e assina com o dedo.'])
figura('16_contrato.jpg', 'Montagem do contrato, com a forma de pagamento e as parcelas.')
h2('O que fica guardado')
tabela([['O que', 'Para que serve'],
        ['Texto do contrato',        'O combinado, por escrito'],
        ['Código de verificação',    'Um código de 64 caracteres calculado a partir do texto. Se uma vírgula mudar, o código muda'],
        ['Data de abertura e de assinatura', 'Quando a pessoa abriu e quando assinou'],
        ['Conferência de CPF',       'A pessoa digita o CPF antes de assinar, com bloqueio após oito tentativas'],
        ['Endereço de rede e aparelho', 'De onde a assinatura partiu']], [44, 111])
h2('Conferir depois, sem entrar no sistema')
p('Qualquer pessoa pode conferir um contrato assinado em <b>blackflow.app.br/validar</b>, digitando o '
  'código. A página responde se o documento existe, quem assinou, quando assinou e se o texto continua '
  'o mesmo. Ela não mostra o conteúdo do contrato nem dado de saúde.')
caixa('O que essa assinatura é, e o que ela não é',
      'É assinatura eletrônica avançada, nos termos do artigo 4º, inciso II, da Lei 14.063 de 2020, e '
      'vale entre as partes pelo artigo 10, parágrafo 2º, da Medida Provisória 2.200-2 de 2001. '
      'Não é assinatura qualificada com certificado da ICP-Brasil. Para que o contrato seja título '
      'executivo extrajudicial, colha as duas testemunhas do artigo 784, inciso III, do Código de '
      'Processo Civil.', 'aviso')
pb()

# ============================== 11 ==============================
h1('Estoque e produtos', 'Capítulo 11')
p('O estoque guarda o que a clínica usa e o que ela vende, com quantidade, lote e validade.')
li(['Cada saída baixa a quantidade automaticamente quando o produto entra na comanda.',
    'O sistema avisa quando a quantidade fica abaixo do mínimo que você definiu.',
    'O lote e a validade ficam registrados, o que importa em fiscalização e em qualquer problema com produto.'])
pb()

# ============================== 12 ==============================
h1('Profissionais e comissões', 'Capítulo 12')
p('Cada profissional tem nome, cor na agenda e situação de ativo ou inativo. A cor é o que faz a '
  'agenda ser legível quando três pessoas atendem ao mesmo tempo.')
figura('12_profissionais.jpg', 'Cadastro de profissionais.')
h2('Comissão')
p('A comissão pode ser por percentual ou por valor fixo, por procedimento. O sistema calcula sobre o '
  'que foi efetivamente recebido e mostra o total do período, para fechar o acerto sem planilha.')
h2('Salão parceiro')
p('Para quem divide espaço, o sistema separa o que é da casa e o que é do profissional parceiro, com '
  'o percentual combinado.')
pb()

# ============================== 13 ==============================
h1('Relatórios e painel', 'Capítulo 13')
p('Os relatórios ficam agrupados por assunto. Todos podem ser impressos.')
tabela([['Grupo', 'Relatórios'],
        ['Pacientes',     'Alertas de retorno, Aniversariantes, Cadastros incompletos, Como conheceu, Localização, Recuperação de pacientes, Último agendamento'],
        ['Financeiro',    'Despesas por categoria, Parcelas em atraso, Recebimentos por forma de pagamento, Todos os lançamentos'],
        ['Tratamentos',   'Procedimentos mais vendidos, Tratamentos em aberto'],
        ['Agendamentos',  'Atendimentos por profissional, Faltas e desmarcações por mês']], [30, 125])
figura('09_procedimentos.jpg', 'Procedimentos mais vendidos.')
h2('Painel')
p('O painel reúne os números do mês em uma tela só: atendimentos, faturamento, ticket médio, faltas e '
  'comparação com o mês anterior.')
figura('10_dashboard.jpg', 'Painel com os indicadores do período.')
pb()

# ============================== 14 ==============================
h1('Recuperação de pacientes', 'Capítulo 14')
p('Este é o relatório que mais devolve dinheiro, e por isso tem capítulo próprio. Ele responde a uma '
  'pergunta que quase nenhuma clínica sabe responder: quem parou de vir, e por qual tratamento.')
figura('07_retorno.jpg', 'Recuperação de pacientes, separada por serviço e por situação.')
h2('As quatro situações')
tabela([['Situação', 'Quem entra aqui'],
        ['Abandonou',            'Começou o tratamento e parou no meio'],
        ['Avaliou e não voltou', 'Fez a avaliação e nunca marcou o tratamento'],
        ['Fez e não voltou',     'Fez o procedimento uma vez e sumiu'],
        ['Nunca fez',            'É paciente da casa, mas nunca fez aquele serviço']], [44, 111])
h2('Como usar')
passos(['Escolha há quantos dias a pessoa não aparece. A lista vai de 30 a 365 dias, e você também pode escrever o número que quiser.',
        'Olhe a coluna Potencial: é quanto entraria se todas voltassem uma vez. Serve para escolher por onde começar, não como previsão.',
        'Clique em Abrir no serviço que tiver o maior potencial.',
        'Para cada pessoa, use o botão que abre o WhatsApp com a mensagem de retorno já escrita.'])
caixa('Comece pelo dinheiro parado, não pelo nome',
      'Chamar quinze pessoas de um serviço de R$ 289,00 vale mais do que chamar quarenta de um '
      'serviço de R$ 70,00. A coluna Potencial existe para essa escolha.')
pb()

# ============================== 15 ==============================
h1('Trazer os seus dados do Excel', 'Capítulo 15')
p('Quem já usa planilha ou outro sistema não precisa digitar tudo de novo. A tela Importar Dados '
  'recebe os arquivos e reconhece sozinha o que é cada um.')
figura('11_importar.jpg', 'Tela de importação.')
h2('Como fazer')
passos(['Exporte os dados do seu sistema atual em Excel, ou use a sua própria planilha.',
        'Em Importar Dados, selecione os arquivos de uma vez.',
        'O sistema identifica se cada arquivo é de pacientes, agendamentos, financeiro, tratamentos ou anamnese.',
        'Confira a prévia na tela antes de confirmar.',
        'Escolha entre somar ao que já existe ou substituir o que veio de importações anteriores.'])
caixa('Se a importação trouxer algo errado',
      'Importe de novo escolhendo substituir. O sistema troca o que veio por importação e não mexe no '
      'que foi digitado à mão.')
pb()

# ============================== 16 ==============================
h1('Configurações e a marca da clínica', 'Capítulo 16')
figura('13_config.jpg', 'Configurações.')
tabela([['O que dá para mudar', 'Onde isso aparece'],
        ['Nome e logotipo da clínica',   'No alto do sistema, nos recibos, nos contratos e na página de agendamento'],
        ['Cor principal e cor do topo',  'No sistema inteiro'],
        ['Letra do sistema',             'Sete opções, com exemplo na tela antes de aplicar'],
        ['Mensagens de WhatsApp',        'Confirmação, cobrança, retorno e aniversário'],
        ['Procedimentos e preços',       'Agenda, financeiro e agendamento online'],
        ['Profissionais',                'Agenda e comissões'],
        ['Chave Pix',                    'Em todos os botões de Pix'],
        ['Modelo de contrato',           'Nos contratos que você gerar'],
        ['Dias para alerta de retorno',  'Nos alertas e na recuperação de pacientes'],
        ['Equipe e acessos',             'Quem entra e o que cada um enxerga'],
        ['Agendamento online',           'Serviços, profissionais, horários e preço visível']], [48, 107])
pb()

# ============================== 17 ==============================
h1('Seus dados, cópia de segurança e a lei de proteção de dados', 'Capítulo 17')
h2('Onde os dados ficam')
p('Os dados ficam em servidor no Brasil, em São Paulo. Cada clínica enxerga apenas os próprios '
  'dados, e essa separação é feita no servidor, não na tela.')
h2('Cópia de segurança')
p('O sistema guarda os dados na nuvem e no próprio aparelho. Além disso, você pode exportar tudo '
  'para Excel quando quiser. Faça isso de tempos em tempos e guarde o arquivo fora do computador da '
  'recepção, em um pen drive ou em um e-mail seu.')
h2('A lei de proteção de dados')
p('Ficha de paciente é dado pessoal sensível pelo artigo 5º, inciso II, da Lei 13.709 de 2018. '
  'Três cuidados resolvem quase tudo:')
li(['Cada pessoa da equipe entra com o próprio acesso, nunca com um login compartilhado.',
    'Foto de paciente não sai do sistema para o celular pessoal de ninguém.',
    'Peça autorização por escrito para usar foto em divulgação. Atendimento e divulgação são finalidades diferentes.'])
caixa('Sobre apagar dados a pedido da pessoa',
      'O titular pode pedir a eliminação, pelo artigo 18, inciso VI. Mas prontuário tem prazo próprio '
      'de guarda, e a eliminação não alcança o que a clínica precisa manter por obrigação legal. '
      'Na dúvida, consulte um advogado antes de apagar.', 'aviso')
pb()

# ============================== 18 ==============================
h1('Planos e assinatura', 'Capítulo 18')
tabela([['Plano', 'Valor', 'O que inclui'],
        ['Teste grátis', '7 dias, sem cartão', 'Tudo liberado'],
        ['Só agenda',    'R$ 29,90 por mês',   'Agenda, cadastro, profissionais, procedimentos e preços, confirmação pelo WhatsApp e agendamento pela internet'],
        ['Completo',     'R$ 79,90 por mês',   'Tudo do Só agenda, mais financeiro, comanda, caixa, estoque, comissões, contratos com assinatura e todos os relatórios']],
       [26, 34, 95])
h2('Como assinar')
p('No alto da tela, clique em Assinar, ou entre em Minha conta. O pagamento é por Pix ou cartão. '
  'Assim que o pagamento é confirmado, o plano é liberado sozinho, desde que o pagamento seja feito '
  'com o mesmo e-mail da conta.')
h2('Promoção de Black Friday')
p('Quem entra na promoção paga R$ 59,90 por mês nos seis primeiros meses. A partir do sétimo mês a '
  'mensalidade passa a ser R$ 79,90 por mês. O sistema guarda a data de entrada, mostra na tela de '
  'assinatura até quando vale o preço promocional e avisa no alto da tela quando faltam trinta dias '
  'ou menos. Não há fidelidade.')
caixa('Cancelar',
      'Dá para cancelar quando quiser, sem multa. Os dados continuam guardados, e voltam assim que a '
      'assinatura for retomada.')
pb()

# ============================== 19 ==============================
h1('Ajuda e suporte', 'Capítulo 19')
p('Dentro do sistema existe a tela de Ajuda, com a explicação de cada parte, passo a passo.')
figura('14_ajuda.jpg', 'Tela de Ajuda, dentro do sistema.')
h2('Falar com gente')
p('O atendimento do BlackFlow é com a Tati, pelo WhatsApp (47) 98843-2859, de segunda a sexta, das '
  '8h às 18h, e no sábado pela manhã. Ela ajuda inclusive a trazer as suas planilhas para dentro do '
  'sistema.')
h2('Perguntas que aparecem sempre')
h3('Perdi a senha')
p('Na tela de entrada, clique em Esqueci a senha. O sistema envia o link de troca para o seu e-mail.')
h3('Posso usar no celular e no computador ao mesmo tempo?')
p('Pode. O que você faz em um aparece no outro assim que a internet permitir.')
h3('A internet caiu no meio do atendimento')
p('Continue trabalhando. O sistema guarda no aparelho e envia sozinho quando a conexão voltar.')
h3('O QR Code do Pix não apareceu')
p('Confira se a chave Pix está cadastrada em Configurações. Se estiver, use o botão Copiar código, '
  'que funciona mesmo quando o desenho não carrega.')
h3('Cadastrei a mesma pessoa duas vezes')
p('Os dois cadastros continuam existindo, cada um com o seu histórico. Abra o que ficou errado, '
  'corrija ou desative. O sistema avisa quando o nome digitado é parecido com alguém que já existe.')
h3('Como sei que estou na versão mais nova?')
p('Clique na seta circular no alto da tela, ou entre em Configurações e depois Minha conta.')
sp(14)
sub('BlackFlow, by BlackSolutions. Documento gerado em %s, referente à versão %s. '
    'As telas deste manual foram feitas em uma clínica de demonstração, com dados inventados.' % (DATA, VERSAO))

doc = Doc(SAIDA)
doc.build(hist)
print('PDF gerado em', SAIDA, round(os.path.getsize(SAIDA)/1024), 'KB')
