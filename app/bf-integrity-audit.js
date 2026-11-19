/* BlackFlow 1.18.0 — Auditoria local não destrutiva de vínculos cadastrais.
   Integra dados centrais por IDs. Não altera documentos fiscais ou históricos. */
(function(){
'use strict';
if(typeof S==='undefined'||typeof vConfig!=='function')return;
const escAudit=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normAudit=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
function inspect(){
 const checks=[],stats={},patients=new Set((S.pacientes||[]).map(p=>String(p.id)));
 const names=new Set((S.servicos||[]).map(x=>normAudit(x.nome)).filter(Boolean));
 const appointments=new Set((S.agendamentos||[]).map(a=>String(a.id)));
 const max=120;
 const issue=(tipo,colecao,id,descricao)=>{if(checks.length<max)checks.push({tipo,colecao,id:String(id||''),descricao})};
 const all=typeof COLS!=='undefined'?COLS:Object.keys(S).filter(k=>Array.isArray(S[k]));
 for(const colecao of all){
  const arr=Array.isArray(S[colecao])?S[colecao]:[];
  stats[colecao]=arr.length;
  const ids=new Set();
  for(const r of arr){
   if(!r||typeof r!=='object')continue;
   const id=String(r.id??'');
   if(!id)issue('Erro',colecao,'','Registro sem identificador único');
   else if(ids.has(id))issue('Erro',colecao,id,'Identificador duplicado na mesma coleção');
   ids.add(id);
   if(colecao!=='pacientes'){
    for(const key of ['pacienteId','clienteId','paciente_id','paciente_ref']){
     if(r[key]!=null&&String(r[key])!==''&&!patients.has(String(r[key])))
      issue('Erro',colecao,id,'Referência ao paciente inexistente ('+key+')');
    }
   }
   if(colecao==='lancamentos'&&r.agendamentoId&&!appointments.has(String(r.agendamentoId)))
    issue('Atenção',colecao,id,'Lançamento aponta para um agendamento inexistente');
   if(colecao==='agendamentos'&&r.procedimento&&names.size&&
      !names.has(normAudit(r.procedimento))&&
      !['Atendido','Desmarcado','Faltou'].includes(String(r.status||'')))
    issue('Atenção',colecao,id,'Procedimento do agendamento não consta com esse nome na tabela atual; confira se foi renomeado');
  }
 }
 const docs=new Map();
 for(const p of S.pacientes||[]){
  const cpf=String(p.cpf||'').replace(/\D/g,'');
  if(cpf.length!==11)continue;
  if(docs.has(cpf))issue('Atenção','pacientes',p.id,'CPF repetido com outro cadastro de paciente');
  else docs.set(cpf,p.id);
 }
 return {stats,checks,total:checks.length,limite:max,online:typeof NV==='undefined'?'desconhecido':NV.status||'desconhecido'};
}
window.bfAuditarVinculos=function(){
 const el=document.getElementById('bf-audit-result');if(!el)return;
 const result=inspect();
 const bad=result.checks.filter(x=>x.tipo==='Erro').length,warning=result.checks.filter(x=>x.tipo==='Atenção').length;
 const details=result.checks.map(x=>'<tr><td>'+escAudit(x.tipo)+'</td><td>'+escAudit(x.colecao)+'</td><td>'+escAudit(x.id)+'</td><td>'+escAudit(x.descricao)+'</td></tr>').join('');
 el.innerHTML='<p><b>'+bad+' erro(s) de vínculo</b> · '+warning+' aviso(s) · sincronização em nuvem: '+escAudit(result.online)+'</p>'+
  '<p class="sub">Verificação local de '+Object.values(result.stats).reduce((a,b)=>a+b,0)+' registros em '+Object.keys(result.stats).length+' coleções. Não cria, modifica ou exclui dados. Avisos de procedimentos antigos exigem revisão humana.</p>'+
  (details?'<div style="overflow:auto;max-height:340px"><table class="tbl"><thead><tr><th>Tipo</th><th>Área</th><th>ID</th><th>Ocorrência</th></tr></thead><tbody>'+details+'</tbody></table></div>':'<p>Não foram encontradas referências órfãs ou duplicações nos critérios verificados.</p>')+
  '<p class="sub">Esta checagem não testa todas as permissões, o navegador de outro usuário, os serviços externos nem o banco fiscal. Para verificar sincronização entre dispositivos é necessário um teste autenticado com duas sessões da mesma clínica.</p>'+
  (result.total>=result.limite?'<p class="sub">Exibidas apenas as primeiras '+result.limite+' ocorrências.</p>':'');
 return result;
};
const originalConfig=vConfig;
vConfig=function(){
 const html=originalConfig();
 if(UI.view!=='config'||UI.cfgTab!=='sistema')return html;
 const card='<div class="card" style="margin:14px 0"><h3>Conferência de vínculos e sincronização</h3><p class="sub">Identifica cadastros duplicados, referências órfãs de pacientes e agendamentos e possíveis procedimentos renomeados. Nenhum histórico é alterado automaticamente.</p><button class="btn sm" type="button" onclick="bfAuditarVinculos()">Verificar vínculos agora</button><div id="bf-audit-result" role="status" style="margin-top:12px"></div></div>';
 const end=html.lastIndexOf('</div>');
 return end<0?html+card:html.slice(0,end)+card+html.slice(end);
};
if(typeof delPac==='function'){
 const previousDelete=delPac;
 delPac=function(id){
  const p=(S.pacientes||[]).find(x=>String(x.id)===String(id));
  if(!p)return;
  const linked=[];
  for(const col of Object.keys(S)){
   if(!Array.isArray(S[col])||col==='pacientes')continue;
   const n=S[col].filter(x=>x&&['pacienteId','clienteId','paciente_id','paciente_ref'].some(k=>String(x[k]??'')===String(id))).length;
   if(n)linked.push(col+': '+n);
  }
  if(linked.length){
   const msg='Este paciente possui registros em '+linked.map(escAudit).join(', ')+'. Excluí-lo apagaria ou deixaria dados desvinculados. Deseja apenas marcar seu cadastro como Inativo, preservando os registros associados?';
   confirmModal(msg,()=>{p.status='Inativo';save();render();toast('Paciente arquivado sem apagar seu histórico.');},'Arquivar cadastro');
   return;
  }
  previousDelete(id);
 };
}
})();