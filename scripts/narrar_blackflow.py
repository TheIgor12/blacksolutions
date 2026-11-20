"""BlackFlow — narração comercial original em português brasileiro."""
import asyncio,subprocess
import imageio_ffmpeg
from pathlib import Path
from gtts import gTTS
ROOT=Path(__file__).resolve().parent.parent
VIDEO=ROOT/"download/BlackFlow_ecossistema_2026.mp4"
OUTPUT=ROOT/"download/BlackFlow_ecossistema_2026_narrado.mp4"
AUDIO=ROOT/"download/.blackflow_voice_2026.mp3"
TEXT=("Conheça o BlackFlow. A plataforma de gestão da BlackSolutions, criada para deixar o dia a dia da sua clínica mais simples. "
"Na agenda, você organiza horários, profissionais e confirmações. "
"Na ficha do paciente, reúne cadastro, anamnese, prontuário, fotos e evolução. "
"Os procedimentos e preços alimentam o atendimento, e o financeiro permite acompanhar contas a pagar e receber, cobranças e relatórios. "
"O Pix utiliza a conta cadastrada pela própria clínica. "
"O módulo fiscal ajuda a preparar os dados da nota de serviço, mas a emissão oficial depende de integração e autorização. "
"Os documentos e o receituário exigem revisão e responsabilidade profissional. "
"Na ajuda, a Tati responde dúvidas de utilização e mostra o caminho até a função correta. "
"E o BlackPay apresenta o futuro dos pagamentos integrados, atualmente apenas em demonstração, sem movimentar dinheiro real. "
"BlackFlow. Um sistema para sua clínica crescer com organização. Conheça em blackflow ponto app ponto br.")
async def main():
 if not VIDEO.exists():raise RuntimeError("Vídeo original não encontrado")
 gTTS(TEXT,lang='pt',tld='com.br',slow=False).save(str(AUDIO))
 if AUDIO.stat().st_size<10000:raise RuntimeError("Áudio recebido está vazio ou incompleto")
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),"-hide_banner","-loglevel","error","-y","-i",str(VIDEO),"-i",str(AUDIO),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","144k","-af","apad","-shortest","-movflags","+faststart",str(OUTPUT)],check=True)
 if OUTPUT.stat().st_size<100000:raise RuntimeError("Vídeo narrado inválido")
 print("NARRADO",OUTPUT,OUTPUT.stat().st_size)
 AUDIO.unlink(missing_ok=True)
if __name__=="__main__":asyncio.run(main())
