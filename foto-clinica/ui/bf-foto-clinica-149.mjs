/* BlackFlow: foto clínica normalizada. Corrige orientação, preserva o arquivo
   de origem sem transmiti-lo e grava apenas a cópia sem metadados. Não simula. */
import {cleanPng,sha256,verifyPng} from '../api/png.mjs';
export const vistas={frontal:'Frontal',perfil_direito:'Perfil direito',perfil_esquerdo:'Perfil esquerdo',obliqua_direita:'Oblíqua direita',obliqua_esquerda:'Oblíqua esquerda'};
export function podeCompararFotos(a,b){
 return !!a?.foto_vista&&a.foto_vista===b?.foto_vista&&
   (a.foto_vista!=='frontal'||(['repouso','contracao'].includes(a.foto_expressao)&&a.foto_expressao===b.foto_expressao));
}
export async function normalizar(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file?.type)||!file.size||file.size>15*1048576)throw Error('Escolha JPG, PNG ou WebP de até 15 MB.');
 const fonte=await sha256(await file.arrayBuffer());
 const url=URL.createObjectURL(file);
 try{
  const i=new Image();i.src=url;await i.decode();
  if(!i.naturalWidth||!i.naturalHeight||i.naturalWidth*i.naturalHeight>30_000_000)throw Error('Imagem supera 30 megapixels.');
  const scale=Math.min(1,1600/Math.max(i.naturalWidth,i.naturalHeight)), c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(i.naturalWidth*scale));c.height=Math.max(1,Math.round(i.naturalHeight*scale));
  const ctx=c.getContext('2d',{alpha:false});
  ctx.fillStyle='#f2f0f6';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(i,0,0,c.width,c.height);
  const png=await new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(Error('Não foi possível normalizar.')),'image/png'));
  const clean=cleanPng(new Uint8Array(await png.arrayBuffer()));
  const dim=await verifyPng(clean);
  return {...dim,bytes:clean,fonte};
 }finally{URL.revokeObjectURL(url);}
}
export function montarFotoClinica(el,{contexto,enviar,concluiu=()=>{}}){
 el.innerHTML=`<section aria-labelledby="titulo-foto-clinica" class="card">
 <h2 id="titulo-foto-clinica">Foto de evolução</h2><p>Guardar somente o registro clínico do atendimento. Simulações não são aceitas neste fluxo.</p>
 <details><summary>Padronizar a captura</summary><p>Use a marca fixa a cerca de 1,20 m, a lente principal, luz difusa frontal ou duas fontes a 45 graus e fundo liso sem branco puro. Sem flash direto. Mantenha os olhos na altura da câmera, sem maquiagem, com cabelo preso e sem brincos grandes.</p></details>
 <label for="bfFCArquivo">Escolher foto original</label><input id="bfFCArquivo" type="file" accept="image/jpeg,image/png,image/webp">
 <label for="bfFCVista">Vista</label><select id="bfFCVista"><option value="">Escolher</option>${Object.entries(vistas).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')}</select>
 <div id="bfFCExpCaixa" hidden><label for="bfFCExp">Expressão frontal</label><select id="bfFCExp"><option value="">Escolher</option><option value="repouso">Em repouso</option><option value="contracao">Em contração</option></select></div>
 <figure id="bfFCPreview" hidden><img alt="Prévia da cópia clínica sem metadados" style="display:block;max-width:100%;max-height:420px;width:auto;height:auto"><figcaption>Cópia normalizada que será gravada. O original não sai do aparelho.</figcaption></figure>
 <label><input id="bfFCConfirma" type="checkbox"> Conferi o paciente, a vista, o lado quando houver e confirmei que esta é uma foto clínica, não uma simulação.</label>
 <div><button id="bfFCGuardar" type="button" disabled>Guardar foto no prontuário</button><button id="bfFCLimpar" type="button">Limpar</button></div>
 <p id="bfFCStatus" role="status">Selecione a foto e confira a vista.</p></section>`;
 const fields=new Map([...el.querySelectorAll('[id^=bfFC]')].map(x=>[x.id.slice(4),x]));
 const $=k=>fields.get(k);
 let generation=0,prepared=null,busy=false,preview='',valid=true;
 const foto=$('Preview').querySelector('img');
 const status=t=>{$('Status').textContent=t;};
 const same=c=>{const x=contexto();return valid&&!!x&&!!c&&c.ficha===x.ficha&&c.paciente===x.paciente&&c.clinica===x.clinica&&c.usuario===x.usuario;};
 const form=()=>[$('Vista').value,$('Exp').value];
 function habilitar(){
  const [v,e]=form();
  $('Guardar').disabled=busy||!prepared||!v||(v==='frontal'&&!e)||!$('Confirma').checked||!same(prepared?.c);
 }
 function apagar(){
  generation++;prepared=null;if(preview)URL.revokeObjectURL(preview);preview='';
  $('Preview').hidden=true;foto.removeAttribute('src');$('Confirma').checked=false;habilitar();
 }
 $('Arquivo').onchange=async ev=>{
  const src=ev.target.files[0];ev.target.value='';apagar();const g=generation,c=contexto();
  if(!src||!c)return;
  status('Preparando cópia sem metadados…');
  try{
   const a=await normalizar(src);
   if(g!==generation||!same(c))return;
   prepared={...a,c};preview=URL.createObjectURL(new Blob([a.bytes],{type:'image/png'}));foto.src=preview;$('Preview').hidden=false;
   status('Confira a cópia e a vista antes de guardar.');
  }catch(e){if(g===generation&&same(c))status('Não foi possível preparar a foto. Use JPG, PNG ou WebP com até 15 MB.');}
  finally{habilitar();}
 };
 $('Vista').onchange=()=>{$('ExpCaixa').hidden=$('Vista').value!=='frontal';$('Exp').value='';$('Confirma').checked=false;habilitar();};
 $('Exp').onchange=()=>{$('Confirma').checked=false;habilitar();};
 $('Confirma').onchange=habilitar;
 $('Limpar').onclick=()=>{if(!busy){apagar();status('Foto removida da prévia.');}};
 $('Guardar').onclick=async()=>{
  const a=prepared,[v,e]=form();
  if(busy||!a||!same(a.c)||!$('Confirma').checked||!Object.hasOwn(vistas,v)||(v==='frontal'&&!['repouso','contracao'].includes(e)))return;
  busy=true;['Arquivo','Vista','Exp','Confirma','Limpar'].forEach(k=>{$(k).disabled=true;});habilitar();
  status('Guardando cópia clínica no prontuário…');
  try{
   const r=await enviar(a.c,a.bytes,v,v==='frontal'?e:null,a.fonte);
   if(!same(a.c))return;
   if(!r?.id)throw Error('Não confirmado');
   apagar();status('Foto de evolução guardada neste prontuário.');concluiu(r.id);
  }catch(_){if(same(a.c)){apagar();status('Não foi possível confirmar a gravação. Confira os anexos do prontuário antes de repetir.');}}
  finally{busy=false;['Arquivo','Vista','Exp','Confirma','Limpar'].forEach(k=>{$(k).disabled=false;});habilitar();}
 };
 return ()=>{valid=false;apagar();el.replaceChildren();};
}
export async function enviarFotoClinica(sb,c,bytes,v,e,h){
 const {data,error}=await sb.functions.invoke('bf-foto-clinica',{body:new Blob([bytes],{type:'image/png'}),headers:{
  'Content-Type':'image/png','x-bf-clinica':c.clinica,'x-bf-ficha':c.ficha,'x-bf-paciente':c.paciente,'x-bf-vista':v,'x-bf-expressao':e||'','x-bf-fonte-sha':h
 }});
 if(error)throw error;return data;
}
