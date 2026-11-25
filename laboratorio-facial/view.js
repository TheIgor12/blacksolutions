(function(){
'use strict';
const $=x=>document.getElementById(x), q=$('quadro'), ctx=q.getContext('2d');
const device=(window.parent===window?window:window.parent).matchMedia('(min-width: 1024px) and (pointer: fine)');
const ids=[1,2,3,4,5], iris=[468,473];
let engine, rendering=false, renderTicket=0, runtime, ready, busy=false, selected=468, pts=[], original=[], img, active=null, photo=null, photoVersion=0;
function status(t){$('status').textContent=t;}
const integrated=window.parent!==window;
function authorize(){
 if(!integrated)return Promise.resolve(false);
 return new Promise(resolve=>{
  const channel=new MessageChannel();
  const timer=setTimeout(()=>{channel.port1.close();resolve(false);},12000);
  channel.port1.onmessage=e=>{
   clearTimeout(timer);channel.port1.close();resolve(e.data===true);
  };
  window.parent.postMessage({type:'blackflow-lab-autorizar-v1'},window.location.origin,[channel.port2]);
 });
}
function check(){
 const probe=document.createElement('canvas'), gl=device.matches?probe.getContext('webgl2'):null;
 ready=integrated&&!!gl;gl?.getExtension('WEBGL_lose_context')?.loseContext();
 $('iniciar').disabled=!ready||busy;$('foto-local').disabled=!ready||busy;
 if(!integrated){clear();status('Abra este laboratório pelo Mapa estético do BlackFlow.');}
 else if(!ready){clear();status('Disponível apenas em computador, com tela a partir de 1.024 pixels, ponteiro fino e WebGL.');}
 else if(!busy)status('Selecione uma foto ou um exemplo e inicie a detecção local.');
}
function clear(){cancelPreview();pts=[];original=[];img=null;active=null;delete q.dataset.x;delete q.dataset.y;ctx.clearRect(0,0,q.width,q.height);$('resultado').hidden=true;}
function desenhar(){
 if(!img||!pts.length)return;
 ctx.drawImage(img,0,0,q.width,q.height);
 for(let i=0;i<pts.length;i++){
  const p=pts[i], x=p.x*q.width,y=p.y*q.height;
  ctx.beginPath();ctx.arc(x,y,i===selected?5:iris.includes(i)?4:1.55,0,Math.PI*2);
  ctx.fillStyle=i===selected?'#ffb320':iris.includes(i)?'#75ffeb':'rgba(115,52,220,.78)';ctx.fill();
  if(i===selected){ctx.lineWidth=1.5;ctx.strokeStyle='#34134c';ctx.stroke();}
 }
 q.dataset.x=String(pts[selected].x);q.dataset.y=String(pts[selected].y);
 const d=Math.hypot((pts[iris[0]].x-pts[iris[1]].x)*q.width,(pts[iris[0]].y-pts[iris[1]].y)*q.height);
 $('distancia').textContent='Distância interpupilar na imagem: '+d.toFixed(2).replace('.',',')+' px.';
}
function pick(i){
 if(!Number.isInteger(i)||i<0||i>=pts.length)return;
 selected=i;$('id-ponto').value=i+1;
 q.setAttribute('aria-label','Ponto '+(i+1)+' de 478. Use as setas para ajustar em pixels.');
 desenhar();
}
function xy(ev){const b=q.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(ev.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(ev.clientY-b.top)/b.height))};}
function set(p){
 if(!pts[selected])return;
 cancelPreview();pts[selected]={...pts[selected],x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))};
 desenhar();
}
q.addEventListener('pointerdown',ev=>{
 if(!pts.length)return;
 ev.preventDefault();q.focus();
 const p=xy(ev);
 let i=selected, d=Infinity;
 const b=q.getBoundingClientRect();
 pts.forEach((v,j)=>{const z=Math.hypot((v.x-p.x)*b.width,(v.y-p.y)*b.height);if(z<d){d=z;i=j;}});
 if(d>15)return;
 pick(i);active=ev.pointerId;q.setPointerCapture(ev.pointerId);
});
q.addEventListener('pointermove',ev=>{if(active===ev.pointerId)set(xy(ev));});
for(const e of ['pointerup','pointercancel','lostpointercapture'])q.addEventListener(e,()=>{active=null;});
q.addEventListener('keydown',ev=>{
 const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[ev.key];
 if(!d||!pts[selected])return;ev.preventDefault();const p=pts[selected], s=ev.shiftKey?5:1;
 set({x:p.x+s*d[0]/q.width,y:p.y+s*d[1]/q.height});
});
function cancelPreview(){
 renderTicket++;$('painel-previa').hidden=true;$('imprimir').disabled=true;engine?.dispose();engine=null;const out=$('previa');out.width=out.height=1;
 $('volume').value='0';$('atenuacao').value='0';
 $('val-volume').textContent='0';$('val-atenuacao').textContent='0';
}
function adjust(){
 if(!engine||$('painel-previa').hidden)return;
 const v=$('volume').value,f=$('atenuacao').value;
 $('val-volume').textContent=v;$('val-atenuacao').textContent=f;
 try{const dt=engine.draw(Number(v),Number(f));$('tempo-ajuste').dataset.elapsed=String(dt);
 $('tempo-ajuste').textContent='Ajuste local: '+Math.round(dt)+' ms.';}
 catch(_){cancelPreview();status('O ajuste foi interrompido; confirme os pontos no exemplo novamente.');}
}
$('volume').oninput=adjust;$('atenuacao').oninput=adjust;
$('confirmar-pontos').onclick=async()=>{
 if(!ready||!img||pts.length!==478||rendering)return;
 cancelPreview();const revision=renderTicket;rendering=true;
 try{
 if(!await authorize()){if(revision===renderTicket)status('Simulação bloqueada. Confira o termo de ciência deste prontuário.');return;}
 if(revision!==renderTicket||!ready)return;
 const {renderFixture}=await import('./viewengine.mjs');
 if(revision!==renderTicket||!ready)return;
 engine=renderFixture(img,$('previa'),pts);
 $('painel-previa').hidden=false;adjust();$('imprimir').disabled=$('painel-previa').hidden;
 }catch(_){cancelPreview();status('A escala ou o processador gráfico não aceitou este exemplo.');}
 finally{rendering=false;}
};
$('id-ponto').onchange=ev=>pick(Number(ev.target.value)-1);
$('restaurar').onclick=()=>{cancelPreview();pts=original.map(p=>({...p}));desenhar();};
function clearPhoto(){
 photoVersion++;photo=null;$('foto-local').value='';$('foto-hash').textContent='';$('foto-origem').hidden=true;$('limpar-foto').hidden=true;clear();
}
$('imagem').onchange=()=>{clearPhoto();if(ready)status('Exemplo alterado. Inicie a detecção local.');};
$('limpar-foto').onclick=()=>{clearPhoto();if(ready)status('Foto removida deste navegador.');};
$('imprimir').onclick=()=>{
 if(!ready||!engine||$('painel-previa').hidden)return;
 const image=$('previa');
 // Só copia os pixels já marcados. Não leva foto original, ficha ou dados do aplicativo.
 const sheet=window.open('about:blank','_blank','popup');
 if(!sheet){$('status').textContent='O navegador bloqueou a janela de impressão.';return;}
 try{
  sheet.opener=null;
  const doc=sheet.document;
  doc.title='Prévia ilustrativa | BlackFlow';doc.documentElement.lang='pt-BR';
  doc.body.replaceChildren();
  Object.assign(doc.body.style,{margin:'0',padding:'12mm',textAlign:'center',background:'white'});
  const canvas=doc.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  canvas.setAttribute('aria-label','Simulação ilustrativa. Não é promessa de resultado.');
  Object.assign(canvas.style,{width:'100%',maxWidth:'150mm',height:'auto',breakInside:'avoid'});
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Impressão indisponível');
  ctx.drawImage(image,0,0);doc.body.append(canvas);
  sheet.focus();sheet.print();
 }catch(_){sheet.close();$('status').textContent='Não foi possível preparar a impressão da prévia.';}
};
$('foto-local').onchange=async ev=>{
 const file=ev.currentTarget.files[0];clearPhoto();if(!ready||!file)return;
 const revision=photoVersion;
 try{
  const {preparePhoto}=await import('./foto.mjs');
  const result=await preparePhoto(file);
  if(!ready||revision!==photoVersion)return;
  photo=result;$('foto-hash').textContent=result.digest;$('foto-origem').hidden=false;$('limpar-foto').hidden=false;
  status('Foto preparada neste navegador. Inicie a detecção local.');
 }catch(_){if(ready&&revision===photoVersion)status('Não foi possível abrir a foto. Use JPEG, PNG ou WebP de até 15 MB.');}
};
$('iniciar').onclick=async()=>{
 if(!ready||busy)return;
 const n=Number($('imagem').value);if(!ids.includes(n))return;
 const stamp=performance.now();
 const revision=photoVersion, local=photo?.normalized||new Image();if(!photo)local.src='./samples/retrato-'+n+'.webp';
 busy=true;$('iniciar').disabled=true;$('imagem').disabled=true;$('foto-local').disabled=true;clear();
 status('Preparando o detector local…');
 try{
  const cold=!runtime;
  const preparation=performance.now();
  if(!runtime){
   const {openDetector}=await import('./runtime.mjs');
   runtime=await openDetector();
  }
  const setup=performance.now()-preparation;
  await local.decode();
  if(!ready||revision!==photoVersion)return;
  status('Detectando pontos faciais…');
  await new Promise(requestAnimationFrame);
  const start=performance.now(), item=runtime.detect(local);
  const detection=performance.now()-start, total=performance.now()-stamp;
  if(!ready||revision!==photoVersion)return;
  if(item.faceLandmarks.length!==1||item.faceLandmarks[0].length!==478){
   return status(item.faceLandmarks.length>1?'Mais de um rosto encontrado. Não há ajuste disponível.':'Não foi possível confirmar 478 pontos em um único rosto neste exemplo.');
  }
  original=item.faceLandmarks[0].map(({x,y,z})=>({x,y,z}));
  if(original.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)))return status('Pontos inválidos. A revisão não foi aberta.');
  const d=Math.hypot((original[iris[0]].x-original[iris[1]].x)*local.naturalWidth,(original[iris[0]].y-original[iris[1]].y)*local.naturalHeight);
  if(d<10)return status('Não foi possível confirmar a escala entre as íris neste exemplo.');
  pts=original.map(p=>({...p}));img=local;q.width=local.naturalWidth;q.height=local.naturalHeight;
  $('resultado').hidden=false;pick(468);
  $('metricas').dataset.cold=String(cold);$('metricas').dataset.detection=String(detection);$('metricas').dataset.setup=String(setup);$('metricas').dataset.total=String(total);
  $('metricas').textContent='Detecção: '+Math.round(detection)+' ms. Total: '+Math.round(total)+' ms.';
  status('478 pontos detectados. Confira e ajuste antes de usar os dados no ensaio.');
 }catch(_){status('O detector local não iniciou. Nenhuma imagem foi enviada.');}
 finally{busy=false;$('iniciar').disabled=!ready;$('foto-local').disabled=!ready;$('imagem').disabled=false;}
};
for(const t of ['dragover','drop'])window.addEventListener(t,e=>e.preventDefault());
device.addEventListener('change',check);
window.addEventListener('pagehide',()=>{clearPhoto();runtime?.close();runtime=null;});
check();
})();
