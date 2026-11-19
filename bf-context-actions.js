/* BlackFlow 1.17.0 — Ações contextuais para fiscal e receituário.
   Prefill em memória; não gera notas ou prescrições sem revisão profissional. */
(function(){
'use strict';
if(typeof UI==='undefined'||typeof S==='undefined'||typeof go!=='function')return;
let context=null,sequence=0;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const patient=id=>(S.pacientes||[]).find(p=>String(p.id)===String(id));
const permissionFiscal=()=>typeof NV!=='undefined'&&(NV.papel==='admin'||!!NV.mestre);
const permissionRec=()=>['podologia','medicina','odontologia','biomedicina'].includes(S.config.segmento);
const btns=(ctx)=>'<div class="bf-quick-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">'+
 (permissionFiscal()?'<button type="button" class="btn sm" onclick="bfAbrirNfe('+ctx+')">Emitir NFE</button>':'')+
 (permissionRec()?'<button type="button" class="btn ghost sm" onclick="bfAbrirReceituario('+ctx+')">Receituário</button>':'')+'</div>';
const contexts=new Map();
function register(value){
 const k=++sequence;contexts.set(k,value||{});
 if(contexts.size>120)contexts.delete(contexts.keys().next().value);
 return k;
}
function record(pacienteId,valor,descricao,origemRef){
 return register({pacienteId:String(pacienteId||''),valor:Number(valor)||0,descricao:String(descricao||''),origemRef:String(origemRef||'')});
}
function fill(id,value){
 const el=document.getElementById(id);
 if(el&&value!==undefined&&value!==null&&String(value)!=='')el.value=String(value);
}
function apply(){
 if(!context||context.view!==UI.view)return;
 const target=context.view==='bffiscal'?'bfxValor':'bfrec-paciente';
 if(!document.getElementById(target))return;
 const item=context, p=patient(item.pacienteId);
 if(p&&item.view==='bffiscal'){
  fill('bfxPaciente',p.id);
  if(typeof window.bfxPickPatient==='function')window.bfxPickPatient();
  fill('bfxTomador',p.nome||'');fill('bfxDoc',p.cpf||p.cnpj||'');
  fill('bfxEmail',p.email||'');
 }
 if(item.view==='bffiscal'){
  fill('bfxDesc',item.descricao);if(item.valor>0)fill('bfxValor',item.valor);
  if(item.origemRef&&S.lancamentos.some(l=>String(l.id)===item.origemRef)){
   fill('bfxLanc',item.origemRef);
  }
 }else if(p){fill('bfrec-paciente',p.id)}
 context=null;
}
function open(view,key){
 if(view==='bffiscal'&&!permissionFiscal()){if(typeof toast==='function')toast('Somente o administrador pode preparar NFS-e.');return}
 if(view==='receituario'&&!permissionRec()){if(typeof toast==='function')toast('Receituário indisponível para este segmento.');return}
 context={...(contexts.get(Number(key))||{}),view};
 if(typeof closeModal==='function')closeModal();
 go(view);
 setTimeout(apply,0);setTimeout(apply,300);setTimeout(apply,900);
}
window.bfAbrirNfe=key=>open('bffiscal',key);
window.bfAbrirReceituario=key=>open('receituario',key);
function attachModalButtons(info){
 const root=document.querySelector('#modalRoot .modal');
 if(!root||root.querySelector('.bf-quick-actions'))return;
 root.insertAdjacentHTML('beforeend',btns(info));
}
if(typeof pixAgora==='function'){
 const original=pixAgora;
 pixAgora=function(valor,descricao,pacienteId,lancamentoId){
  const k=record(pacienteId,valor,descricao,lancamentoId);
  const result=original.apply(this,arguments);
  attachModalButtons(k);
  return result;
 };
}
// Alterar valor ou procedimento no Pix também altera a sugestão fiscal, sem registrar pagamento.
if(typeof pixRecalc==='function'){
 const old=pixRecalc;
 pixRecalc=function(){
  const result=old.apply(this,arguments),root=document.querySelector('#modalRoot .bf-quick-actions');
  if(root){
   const k=record(typeof PX!=='undefined'?PX.pid:'',typeof PX!=='undefined'?PX.valor:0,
     (document.getElementById('pixDesc')||{}).value||'',typeof PX!=='undefined'?PX.lid:'');
   const fiscal=root.querySelector('button:first-child');
   if(fiscal&&fiscal.textContent.includes('NFE'))fiscal.setAttribute('onclick','bfAbrirNfe('+k+')');
   const rec=[...root.querySelectorAll('button')].find(x=>x.textContent.includes('Receituário'));
   if(rec)rec.setAttribute('onclick','bfAbrirReceituario('+k+')');
  }
  return result;
 };
}
if(typeof agModal==='function'){
 const old=agModal;
 agModal=function(id){
  const a=(S.agendamentos||[]).find(x=>String(x.id)===String(id));
  const k=record(a?.pacienteId,a?.valor||0,a?.procedimento||'',a?.lancamentoId||'');
  const out=old.apply(this,arguments);if(a)attachModalButtons(k);return out;
 };
}
if(typeof comandaModal==='function'){
 const old=comandaModal;
 comandaModal=function(id){
  const c=(S.comandas||[]).find(x=>String(x.id)===String(id));
  const descr=c?(c.itens||[]).map(i=>i.descricao).filter(Boolean).join(', '):'';
  const total=c&&typeof comandaLiquido==='function'?comandaLiquido(c):0;
  const k=record(c?.clienteId,total,descr,'');
  const out=old.apply(this,arguments);if(c)attachModalButtons(k);return out;
 };
}
if(typeof vPaciente==='function'){
 const old=vPaciente;
 vPaciente=function(){
  const page=old.apply(this,arguments),p=patient(UI.param);
  if(!p)return page;
  const k=record(p.id,0,'','');
  return page.replace(/(<div class="phead"[^>]*>)/,'$1'+btns(k));
 };
}
// Acesso também no financeiro, nos lançamentos e na ficha, mesmo sem Pix.
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 if(UI.view==='financeiro'&&permissionFiscal()){
  const page=document.querySelector('#app .page');
  if(page&&!page.querySelector('.bf-quick-actions')){
   const holder=document.createElement('div');
   holder.innerHTML=btns(record('',0,'',''));
   page.insertBefore(holder.firstElementChild,page.firstChild);
  }
 }
 apply();return result;
};
if(typeof MutationObserver!=='undefined'){
 const observe=new MutationObserver(()=>{if(context)apply()});
 observe.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
}
})();