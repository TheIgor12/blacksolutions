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
 return json.loads(cmd("ffprobe","-v","error","-show_format","-show_streams","-of","json",p))
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
 font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
 body="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
 filters=(
 "[0:v]split[bg0][fg0];"
 "[bg0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=35:1,eq=brightness=-0.22,tpad=stop_mode=clone:stop_duration=90[bg];"
 "[fg0]scale=1080:1920:force_original_aspect_ratio=decrease,tpad=stop_mode=clone:stop_duration=90[fg];"
 "[bg][fg]overlay=(W-w)/2:(H-h)/2[raw];"
 f"[raw]drawtext=fontfile={font}:text=BLACKFLOW:fontcolor=white:fontsize=85:x=(w-text_w)/2:y=95:box=1:boxcolor=0x0A0820@0.8:boxborderw=22,"
 f"drawtext=fontfile={body}:text=Gestão inteligente para clínicas:fontcolor=white:fontsize=32:x=(w-text_w)/2:y=210,"
 f"drawtext=fontfile={font}:text=EXPERIMENTE POR 7 DIAS:fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h-325:box=1:boxcolor=0x684AF2@0.92:boxborderw=15,"
 f"drawtext=fontfile={body}:text=blackflow.app.br:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-190,format=yuv420p[v];"
 "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=2[a]"
 )
 TARGET.parent.mkdir(exist_ok=True)
 cmd("ffmpeg","-hide_banner","-loglevel","error","-y",
 "-i",SOURCE,"-i",voice,"-filter_complex",filters,
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
