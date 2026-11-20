#!/usr/bin/env python3
"""Edição original de locução para Instagram Reels do BlackFlow."""
import asyncio
import json
import re
import subprocess
from pathlib import Path

SOURCE=Path("download/BlackFlow_ecossistema_2026_narrado.mp4")
TARGET=Path("download/BlackFlow_Reels_Instagram_voz_natural.mp4")
TEMP=Path("/tmp/blackflow_reels")
TEMP.mkdir(exist_ok=True)
FALLBACK=("A rotina de uma clínica exige atenção a cada detalhe. E a gestão precisa acompanhar esse ritmo. "
"Com o BlackFlow, você organiza agendamentos, prontuários, finanças e estoque em um só lugar. "
"Você e sua equipe acessam as informações no computador ou no celular. "
"É uma solução pensada para clínicas de podologia, estética e beleza. "
"Experimente gratuitamente por sete dias. Depois, escolha o plano ideal para o seu negócio. "
"Conheça o BlackFlow. Acesse blackflow ponto app ponto bê erre.")

def cmd(*a):
 print("RUN",*[str(x) for x in a],flush=True)
 return subprocess.run([str(x) for x in a],text=True,capture_output=True,check=True).stdout
def info(p):
 proc=subprocess.run(["ffmpeg","-hide_banner","-i",str(p)],capture_output=True,text=True)
 txt=proc.stderr
 m=re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)",txt)
 if not m:raise RuntimeError("Não foi possível ler a duração: "+txt[-500:])
 length=int(m.group(1))*3600+int(m.group(2))*60+float(m.group(3))
 streams=[]
 for line in txt.splitlines():
  if "Video:" in line:
   c=re.search(r"Video:\s*(\w+)",line)
   d=re.search(r"(\d{2,4})x(\d{2,4})",line)
   streams.append({"codec_type":"video","codec_name":c.group(1) if c else "","width":int(d.group(1)) if d else 0,"height":int(d.group(2)) if d else 0})
  elif "Audio:" in line:
   c=re.search(r"Audio:\s*(\w+)",line)
   streams.append({"codec_type":"audio","codec_name":c.group(1) if c else ""})
 return {"format":{"duration":str(length)},"streams":streams}
def transcript(audio):
 try:
  from faster_whisper import WhisperModel
  model=WhisperModel("base",device="cpu",compute_type="int8")
  segments,_=model.transcribe(str(audio),language="pt",vad_filter=True,beam_size=3)
  text=" ".join(s.text.strip() for s in segments)
  print("SOURCE_TRANSCRIPT",text[:2500],flush=True)
  if 38<=len(text.split())<=180:return text
 except Exception as ex:print("TRANSCRIPTION_FALLBACK",repr(ex),flush=True)
 return FALLBACK
async def synth(text,out):
 import edge_tts
 for voice in ("pt-BR-FranciscaNeural","pt-BR-ThalitaNeural","pt-BR-AntonioNeural"):
  try:
   await edge_tts.Communicate(text,voice,rate="-5%",pitch="-3Hz").save(str(out))
   if out.stat().st_size>8000:
    print("NARRATION_VOICE",voice,flush=True)
    return
  except Exception as e:print("VOICE_ATTEMPT",voice,str(e)[:180],flush=True)
 raise RuntimeError("Falha ao gerar voz neural, não entregar voz robotizada.")
def main():
 if not SOURCE.exists():raise RuntimeError("Vídeo original ausente")
 p=info(SOURCE)
 print("SOURCE_METADATA",str(SOURCE),p["format"]["duration"],SOURCE.stat().st_size,flush=True)
 audio=TEMP/"original.wav"
 subprocess.run(["ffmpeg","-v","error","-y","-i",str(SOURCE),"-vn","-ac","1","-ar","16000",str(audio)],check=False)
 text=transcript(audio) if audio.exists() else FALLBACK
 # Avoid reproducing false unlimited-free claims in the original narration.
 text=re.sub(r"\b(grátis para sempre|gratuito para sempre|sem pagar nunca)\b","teste por sete dias",text,flags=re.I)
 if len(text.split())>170:text=" ".join(text.split()[:170]).rsplit(".",1)[0]+"."
 (TEMP/"transcricao.txt").write_text(text,encoding="utf-8")
 voice=TEMP/"narracao.mp3"
 asyncio.run(synth(text,voice))
 clip=min(89.0,float(info(voice)["format"]["duration"])+2)
 from PIL import Image,ImageDraw,ImageFont
 poster=TEMP/"branding.png"
 im=Image.new("RGBA",(1080,1920),(0,0,0,0))
 dr=ImageDraw.Draw(im)
 def font(size,bold=False):
  names=(["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf","DejaVuSans-Bold.ttf"] if bold else
         ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","DejaVuSans.ttf"])
  for n in names:
   try:return ImageFont.truetype(n,size)
   except OSError:continue
  return ImageFont.load_default()
 dr.rounded_rectangle((35,55,1045,285),radius=34,fill=(10,8,32,225))
 dr.text((540,140),"BLACKFLOW",font=font(88,True),anchor="mm",fill="white")
 dr.text((540,230),"Gestão inteligente para clínicas",font=font(36),anchor="mm",fill="white")
 dr.rounded_rectangle((35,1575,1045,1850),radius=36,fill=(45,32,123,225))
 dr.text((540,1640),"EXPERIMENTE POR 7 DIAS",font=font(46,True),anchor="mm",fill="white")
 dr.text((540,1760),"blackflow.app.br",font=font(46),anchor="mm",fill="white")
 im.save(poster)
 filters=(
 "[0:v]split[bg0][fg0];"
 "[bg0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=35:1,eq=brightness=-0.22,tpad=stop_mode=clone:stop_duration=90[bg];"
 "[fg0]scale=1080:1920:force_original_aspect_ratio=decrease,tpad=stop_mode=clone:stop_duration=90[fg];"
 "[bg][fg]overlay=(W-w)/2:(H-h)/2[raw];"
 "[raw][2:v]overlay=0:0,format=yuv420p[v];"
 "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=2[a]"
 )
 TARGET.parent.mkdir(exist_ok=True)
 cmd("ffmpeg","-hide_banner","-loglevel","error","-y",
 "-i",SOURCE,"-i",voice,"-loop","1","-i",poster,"-filter_complex",filters,
 "-map","[v]","-map","[a]","-t",f"{clip:.2f}",
 "-c:v","libx264","-preset","veryfast","-crf","24","-maxrate","3200k","-bufsize","6400k",
 "-r","30","-pix_fmt","yuv420p","-movflags","+faststart",
 "-c:a","aac","-b:a","160k","-ar","48000",TARGET)
 result=info(TARGET)
 video=next(x for x in result["streams"] if x["codec_type"]=="video")
 sound=next(x for x in result["streams"] if x["codec_type"]=="audio")
 assert (video["width"],video["height"])==(1080,1920)
 assert video["codec_name"]=="h264" and sound["codec_name"]=="aac"
 print("FINAL_REEL",TARGET,"duration",result["format"]["duration"],"bytes",TARGET.stat().st_size,flush=True)
if __name__=="__main__":main()
