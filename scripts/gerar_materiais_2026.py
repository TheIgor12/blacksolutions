#!/usr/bin/env python3
"""Material comercial BlackFlow 2026 — gera manual PDF e vídeo MP4 atualizados.
Sem vídeos terceirizados ou dados de pacientes. Usa as imagens públicas do site."""
from __future__ import annotations
import html, subprocess, tempfile
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as PDFImage, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
OUT_PDF = ROOT / "download" / "Manual_BlackFlow.pdf"
OUT_VIDEO = ROOT / "download" / "BlackFlow_ecossistema_2026.mp4"
OUT_COVER = ROOT / "img" / "blackflow-ecossistema-capa.jpg"
for p in (OUT_PDF.parent, OUT_VIDEO.parent, OUT_COVER.parent):
    p.mkdir(parents=True,exist_ok=True)
font_root = Path("/usr/share/fonts/truetype/dejavu")
FONT = font_root / "DejaVuSans.ttf"
BOLD = font_root / "DejaVuSans-Bold.ttf"
source = SITE / "manual" / "index.html"
if not source.exists(): raise RuntimeError("Manual HTML não encontrado; checkout do site é necessário")
soup = BeautifulSoup(source.read_text(encoding="utf8"),"html.parser")
chapters = []
for item in soup.select("section.chapter"):
    title = item.find("h2").get_text(" ",strip=True)
    body = " ".join(p.get_text(" ",strip=True) for p in item.find_all("p"))
    chapters.append((item.get("id",""),title,body))
assert len(chapters)>=15, "Manual precisa conter capítulos atualizados"

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("BF",str(FONT)))
pdfmetrics.registerFont(TTFont("BF-Bold",str(BOLD)))
pdfmetrics.registerFontFamily("BF",normal="BF",bold="BF-Bold")
NAVY=colors.HexColor("#0a0820")
PURPLE=colors.HexColor("#7b5cff")
CYAN=colors.HexColor("#00d1ff")
INK=colors.HexColor("#1d1a39")
MUT=colors.HexColor("#595874")
paper=A4
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name="BFTitle",fontName="BF-Bold",fontSize=29,leading=37,textColor=INK,spaceAfter=18))
styles.add(ParagraphStyle(name="BFHeading",fontName="BF-Bold",fontSize=20,leading=26,textColor=INK,spaceAfter=16))
styles.add(ParagraphStyle(name="BFBody",fontName="BF",fontSize=10.5,leading=18,textColor=INK,spaceAfter=16))
styles.add(ParagraphStyle(name="BFSub",fontName="BF",fontSize=11.5,leading=19,textColor=MUT,spaceAfter=18))
styles.add(ParagraphStyle(name="BFNote",fontName="BF",fontSize=10,leading=16,textColor=INK,spaceAfter=10))
styles.add(ParagraphStyle(name="BFSmall",fontName="BF",fontSize=9,leading=15,textColor=MUT,spaceAfter=10))
styles.add(ParagraphStyle(name="BFToc",fontName="BF",fontSize=10.5,leading=20,textColor=INK))
styles.add(ParagraphStyle(name="BFBadge",fontName="BF-Bold",fontSize=9,leading=17,textColor=PURPLE,spaceAfter=15))
mapshots = {
 "primeiros":"bf_inicio.webp","pacientes":"bf_pacientes.webp",
 "agenda":"bf_agenda.webp","atendimento":"bf_atendimento.webp",
 "anamnese":"bf_anamnese.webp","financeiro":"bf_financeiro.webp",
 "pix":"bf_pix.webp","relatorios":"bf_relatorios.webp",
 "sincronismo":"bf_importar.webp","receituario":"bf_ficha.webp",
 "estoque":"bf_dashboard.webp",
}
def draw_page(c, doc):
    c.saveState()
    w,h=A4
    c.setFillColor(NAVY)
    c.rect(0,h-1.3*cm,w,1.3*cm,fill=1,stroke=0)
    c.setFont("BF-Bold",11)
    c.setFillColor(colors.white)
    c.drawString(1.9*cm,h-0.85*cm,"BlackSolutions")
    c.setFillColor(CYAN)
    c.drawString(5.05*cm,h-0.85*cm,"/ BlackFlow")
    c.setStrokeColor(colors.HexColor("#d8d5ea"))
    c.line(1.9*cm,1.6*cm,w-1.9*cm,1.6*cm)
    c.setFillColor(MUT)
    c.setFont("BF",8)
    c.drawString(1.9*cm,1.18*cm,"Manual BlackFlow • novembro de 2026 • atualização 1.20.0")
    c.drawRightString(w-1.9*cm,1.18*cm,str(doc.page))
    c.restoreState()
pdf=SimpleDocTemplate(str(OUT_PDF),pagesize=A4,rightMargin=1.9*cm,
 leftMargin=1.9*cm,topMargin=2.1*cm,bottomMargin=2.2*cm,
 title="Manual BlackFlow — BlackSolutions — 2026",author="BlackSolutions")
story=[]
story.extend([Spacer(1,1.7*cm),Paragraph("MANUAL DO SISTEMA",styles["BFBadge"]),
 Paragraph("BlackFlow",styles["BFTitle"]),
 Paragraph("Gestão clínica, pacientes, agenda, financeiro e a evolução do ecossistema BlackSolutions.",styles["BFSub"]),
 Spacer(1,1*cm)])
coverimg=SITE/"img/telas/bf_inicio.webp"
if coverimg.exists():
    img=Image.open(coverimg)
    iw,ih=img.size
    dw,dh=16.4*cm,16.4*cm*ih/iw
    story.append(PDFImage(str(coverimg),width=dw,height=min(dh,8.5*cm)))
story.extend([Spacer(1,0.65*cm),
 Paragraph("<b>Versão de referência:</b> BlackFlow 1.20.0 · 19 de novembro de 2026",styles["BFBody"]),
 Paragraph("Este manual diferencia recursos operacionais de integrações fiscais, médicas ou financeiras que ainda exigem habilitação, revisão profissional ou contratação.",styles["BFSmall"]),
 PageBreak(),Paragraph("Conteúdo",styles["BFTitle"])])
for idx,(code,title,body) in enumerate(chapters,1):
    story.append(Paragraph("%02d. %s"%(idx,html.escape(title)),styles["BFToc"]))
story.append(PageBreak())
for idx,(code,title,body) in enumerate(chapters,1):
    story.append(Paragraph("CAPÍTULO %02d"%idx,styles["BFBadge"]))
    story.append(Paragraph(html.escape(title),styles["BFHeading"]))
    story.append(Paragraph(html.escape(body),styles["BFBody"]))
    if code in {"fiscal","receituario","blackpay"}:
        note={
         "fiscal":"NFS-e em rascunho NÃO equivale a nota fiscal autorizada pelo município ou prestador nacional.",
         "receituario":"Rascunho não equivale a prescrição assinada por profissional habilitado.",
         "blackpay":"BlackPay continua em DEMONSTRAÇÃO; saldos e pagamentos são fictícios, sem banco ou maquininha conectados."
        }[code]
        story.append(Paragraph("<b>Importante:</b> "+html.escape(note),styles["BFNote"]))
    file = SITE/"img/telas"/mapshots.get(code,"--")
    if file.exists():
        with Image.open(file) as im:
            iw,ih=im.size
        maxw,maxh=16.1*cm,11.2*cm
        factor=min(maxw/iw,maxh/ih)
        story.append(PDFImage(str(file),width=iw*factor,height=ih*factor))
        story.append(Spacer(1,0.28*cm))
        story.append(Paragraph("Imagem de referência: a apresentação pode variar conforme plano, segmento e atualização.",styles["BFSmall"]))
    story.append(Spacer(1,.35*cm))
    if idx<len(chapters):story.append(PageBreak())
pdf.build(story,onFirstPage=draw_page,onLaterPages=draw_page)
print("PDF",OUT_PDF,OUT_PDF.stat().st_size,"bytes",len(chapters),"capítulos")

# Vídeo original de apresentação, sem reutilizar material de terceiros.
W,H=1280,720
REG=ImageFont.truetype(str(FONT),27)
TITLE=ImageFont.truetype(str(BOLD),43)
HERO=ImageFont.truetype(str(BOLD),65)
SMALL=ImageFont.truetype(str(FONT),20)
SUB=ImageFont.truetype(str(BOLD),21)
scenes=[
 ("BlackFlow","O centro da BlackSolutions","Agenda, gestão e atendimento integrado","bf_inicio.webp"),
 ("Uma gestão que acompanha sua clínica","Do agendamento à evolução do paciente","Tudo conectado ao histórico","bf_dashboard.webp"),
 ("Agenda e profissionais","Horários por dia e profissional","Confirmações e organização de atendimentos","bf_agenda.webp"),
 ("Paciente no centro","Cadastro, CPF, contato e ficha","Histórico ligado aos atendimentos","bf_pacientes.webp"),
 ("Anamnese e prontuário","Informações clínicas no mesmo lugar","Registros, evoluções e fotos","bf_anamnese.webp"),
 ("Evolução e atendimento","Cada procedimento com seu histórico","Data, profissional e informações relevantes","bf_evolucao.webp"),
 ("Financeiro completo","Entradas, saídas e contas a receber","Controle por período e relatórios","bf_financeiro.webp"),
 ("Cobrança por Pix","QR Code e referência de pagamento","Pagamento direto na chave da clínica","bf_pix.webp"),
 ("Relatórios para decidir melhor","Faturamento e desempenho da clínica","Indicadores e exportações","bf_relatorios.webp"),
 ("Nota fiscal e documentos","NFS-e: cadastro e rascunhos","Emissão oficial exige habilitação","bf_receber.webp"),
 ("Receituário e profissionais","Modelos e rascunhos com dados do paciente","Revisão e assinatura quando exigidas","bf_ficha.webp"),
 ("BlackPay — próxima evolução","Contas, Pix e maquininhas","HOJE: SIMULAÇÃO, SEM DINHEIRO REAL",None),
 ("BlackSolutions","O BlackFlow vem primeiro","Teste a plataforma em blackflow.app.br","bf_inicio.webp"),
]
def rr(draw,xy,fill,radius=25,outline=None,width=1):
    draw.rounded_rectangle(xy,radius=radius,fill=fill,outline=outline,width=width)
def wrap_text(draw,text,font,maxw):
    words=text.split();lines=[];line=""
    for word in words:
        nxt=(line+" "+word).strip()
        if draw.textbbox((0,0),nxt,font=font)[2]>maxw and line:
            lines.append(line);line=word
        else:line=nxt
    if line:lines.append(line)
    return lines
with tempfile.TemporaryDirectory(prefix="bf-vid-") as tmp:
    tmp=Path(tmp)
    frames=[]
    for i,(title,sub,detail,shot) in enumerate(scenes):
        canvas=Image.new("RGB",(W,H),(10,8,32))
        d=ImageDraw.Draw(canvas)
        d.ellipse((-180,-250,530,460),fill=(29,23,78))
        d.ellipse((970,390,1510,930),fill=(12,41,72))
        rr(d,(48,48,1232,672),(18,20,52),30,outline=(58,48,112),width=2)
        d.text((86,81),"Black",font=SUB,fill="#ffffff")
        d.text((148,81),"Flow",font=SUB,fill="#00d1ff")
        d.text((86,110),"by BlackSolutions",font=SMALL,fill="#c0b8e3")
        d.rounded_rectangle((86,183,330,193),radius=5,fill="#7b5cff")
        target=HERO if i in (0,len(scenes)-1) else TITLE
        y=230
        for line in wrap_text(d,title,target,510):
            d.text((86,y),line,font=target,fill="white")
            y+=73 if target==HERO else 56
        y+=19
        for line in wrap_text(d,sub,REG,480):
            d.text((88,y),line,font=REG,fill="#b6d1ff");y+=40
        y+=16
        for line in wrap_text(d,detail,SMALL,465):
            d.text((88,y),line,font=SMALL,fill="#d9d4ed");y+=31
        d.text((86,612),f"{i+1:02d} / {len(scenes):02d}    •    Demonstração de funcionalidades",font=SMALL,fill="#a9a4d1")
        d.rounded_rectangle((86,649,1195,655),radius=3,fill="#2e2854")
        d.rounded_rectangle((86,649,86+int(1109*(i+1)/len(scenes)),655),radius=3,fill="#00d1ff")
        if shot:
            path=SITE/"img/telas"/shot
            if path.exists():
                pic=Image.open(path).convert("RGB")
                # Preserva a captura integral numa moldura arredondada.
                box=(660,156,1190,555)
                rr(d,(649,145,1201,566),(5,9,24),24,outline=(120,92,245),width=3)
                pic.thumbnail((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
                px=box[0]+((box[2]-box[0])-pic.width)//2
                py=box[1]+((box[3]-box[1])-pic.height)//2
                canvas.paste(pic,(px,py))
            else:
                d.text((690,350),"BLACKFLOW",font=TITLE,fill="#7b5cff")
        else:
            rr(d,(681,195,1163,506),(14,20,52),28,outline=(95,72,166),width=3)
            d.text((724,239),"Black",font=HERO,fill="#ffffff")
            d.text((907,239),"Pay",font=HERO,fill="#00d1ff")
            d.text((727,335),"Pix  •  Contas  •  POS",font=REG,fill="#b6d1ff")
            d.text((727,399),"SIMULAÇÃO",font=SUB,fill="#ffca8a")
        frame=tmp/f"slide_{i:02d}.png"
        canvas.save(frame)
        frames.append(frame)
    # Cartaz/poster disponível no site antes do primeiro play.
    Image.open(frames[0]).save(OUT_COVER,quality=88,optimize=True)
    concat=tmp/"scenes.txt"
    with concat.open("w",encoding="utf8") as f:
        for frame in frames:
            f.write("file '"+str(frame)+"'\n")
            f.write("duration 5.5\n")
        f.write("file '"+str(frames[-1])+"'\n")
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y",
         "-f","concat","-safe","0","-i",str(concat),
         "-vf","fps=24,format=yuv420p","-c:v","libx264",
         "-pix_fmt","yuv420p","-preset","veryfast","-crf","23",
         "-movflags","+faststart",str(OUT_VIDEO)]
    subprocess.run(cmd,check=True)
    print("VIDEO",OUT_VIDEO,OUT_VIDEO.stat().st_size,"bytes",len(scenes),"quadros",len(scenes)*5.5,"segundos")

# Build revision: 2026-11-19 materials refresh; public BlackFlow resources only.
