/* BlackFlow 1.23.0 — anamnese, equipe, chat interno e ajuda.
   Extensao nao destrutiva da interface 1.22.0. */
(function(){
'use strict';
const R=window;
const sc=document.createElement('style');
sc.textContent='#bfchat{position:fixed;bottom:18px;right:18px;z-index:1500;font:14px system-ui;max-width:calc(100vw - 20px)}#bfchat button{cursor:pointer}#bfchat .bf-launch{border:0;border-radius:18px;background:#302c83;color:white;padding:13px 19px;box-shadow:0 6px 22px #0004;font-weight:700}#bfchat .bf-panel{width:min(355px,calc(100vw - 20px));height:min(500px,75vh);background:var(--bg,#fff);border:1px solid var(--line,#ddd);border-radius:15px;box-shadow:0 12px 38px #0004;display:flex;flex-direction:column;overflow:hidden}#bfchat .bf-header{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#302c83;color:white}#bfchat .bf-messages{overflow-y:auto;flex:1;padding:12px;background:var(--bg,#fff)}#bfchat .bf-message{padding:8px 10px;border:1px solid var(--line,#ddd);border-radius:10px;margin-bottom:8px;overflow-wrap:anywhere}#bfchat .bf-message small{display:block;color:var(--mut,#777);margin:3px 0}#bfchat .bf-entry{display:flex;padding:9px;gap:5px;border-top:1px solid var(--line,#ddd)}#bfchat .bf-entry input{min-width:0;flex:1;padding:8px}#bfchat .bf-entry button{padding:8px;border-radius:8px}';
document.head.appendChild(sc);
const oldModelo=R.anamModelo;
const more=[
['Tem câncer ou já teve diagnóstico oncológico?','Diagnóstico, acompanhamento e tratamento'],
['Está fazendo quimioterapia?','Medicamentos e período'],
['Está fazendo radioterapia?','Região e período'],
['Tem alguma doença cardíaca?','Diagnóstico e acompanhamento'],
['Tem arritmia cardíaca?','Diagnóstico e acompanhamento'],
['Tem insuficiência cardíaca?','Diagnóstico e acompanhamento'],
['Já teve infarto?','Quando e acompanhamento'],
['Tem varizes?','Região, sintomas e tratamento'],
['Tem insuficiência venosa?','Diagnóstico e acompanhamento'],
['Tem edema ou inchaço nas pernas?','Região e frequência'],
['Tem problemas de circulação arterial?','Diagnóstico e acompanhamento'],
['Tem neuropatia?','Qual e localização'],
['Tem doença renal?','Diagnóstico e tratamento'],
['Tem doença hepática?','Diagnóstico e tratamento'],
['Tem HIV ou outra condição imunológica relevante?','Informação clínica pertinente ao atendimento'],
['Tem alguma doença autoimune?','Qual e acompanhamento'],
['Tem asma ou doença respiratória?','Diagnóstico e tratamento'],
['Já teve acidente vascular cerebral (AVC)?','Quando e sequelas'],
['Tem histórico de cicatrização difícil?','Descreva'],
['Tem feridas ou lesões abertas atualmente?','Local e evolução'],
['Tem doença dermatológica?','Qual e localização'],
['Tem algum outro diagnóstico ou CID informado pelo paciente?','CID, nome da condição e observações']
];
R.anamModelo=function(){
 const list=oldModelo();
 const expanded=[];
 list.forEach(x=>{
  if(/circula.{0,15}varizes.{0,15}inchaço/i.test(x.q)){
   expanded.push({q:'Tem problema de circulação?',tipo:'simnao',alerta:true,det:'Diagnóstico e detalhes'});
   expanded.push({q:'Tem varizes?',tipo:'simnao',alerta:true,det:'Localização e detalhes'});
   expanded.push({q:'Tem inchaço nas pernas?',tipo:'simnao',alerta:true,det:'Localização e detalhes'});
  }else if(/epilepsia, convulsão ou desmaios/i.test(x.q)){
   ['Tem epilepsia?','Já teve convulsões?','Já teve desmaios?'].forEach(q=>expanded.push({q,tipo:'simnao',alerta:true,det:'Quando e acompanhamento'}));
  }else if(/grávida ou amamentando/i.test(x.q)){
   ['Está grávida?','Está amamentando?'].forEach(q=>expanded.push({q,tipo:'simnao',alerta:true,det:'Descreva'}));
  }else expanded.push(x);
 });
 const seen=new Set(expanded.map(x=>x.q.toLocaleLowerCase('pt-BR')));
 more.forEach(([q,det])=>{if(!seen.has(q.toLocaleLowerCase('pt-BR')))expanded.push({q,tipo:'simnao',alerta:true,det})});
 return expanded;
};
const oldPintar=R.anaPintar;
R.anaPintar=function(){
 const c=document.querySelector('#modalRoot [data-bf-ana-scroll]');
 const top=c?c.scrollTop:0;
 const dlg=document.querySelector('#modalRoot');
 const dlgTop=dlg?dlg.scrollTop:0;
 oldPintar();
 const n=document.querySelector('#modalRoot [data-bf-ana-scroll]');
 if(n)n.scrollTop=top;
 const d=document.querySelector('#modalRoot');if(d)d.scrollTop=dlgTop;
};
const oldMenu=R.menuItens;
R.menuItens=function(){const a=oldMenu();const semAnamnese=typeof ehSeg==='function'&&ehSeg('barbearia');if(!semAnamnese&&!a.some(x=>x[0]==='anamnese')&&podeTela('pacientes'))a.splice(1,0,['anamnese','Anamnese','file']);return a};
R.vAnamnese=function(){
 const L=az(S.pacientes).filter(p=>p&&p.id);
 return '<div class="page"><div class="phead"><div><h1>Anamnese</h1><p class="sub">Módulo independente. As fichas também permanecem disponíveis nos prontuários.</p></div></div><div class="card"><label>Localizar paciente<input id="bf-ana-find" oninput="bfAnaFiltrar(this.value)" placeholder="Nome do paciente"></label><div id="bf-ana-list" style="margin-top:12px">'+L.map(p=>'<div class="row bf-ana-row" data-name="'+esc(norm(p.nome))+'"><span><b>'+esc(p.nome)+'</b><br><small>'+esc(resumoAnamnese(p))+'</small></span><span><button class="btn ghost sm" onclick="anaRapida('+esc(JSON.stringify(String(p.id)))+')">Histórico</button> <button class="btn sm" onclick="anaForm('+esc(JSON.stringify(String(p.id)))+')">Nova anamnese</button></span></div>').join('')+'</div></div></div>';
};
R.bfAnaFiltrar=function(q){const n=norm(q);document.querySelectorAll('.bf-ana-row').forEach(e=>e.style.display=(e.dataset.name||'').includes(n)?'':'none')};
R.bfUserManagement=function(){
 if(!NV.ativa)return '<div class="card"><h2>Usuários da clínica</h2><p>Gestão disponível quando conectado à nuvem.</p></div>';
 return '<div class="card"><h2>Usuários e acessos</h2><p class="sub">Administradores podem retirar o acesso de colaboradores desligados. Nenhum usuário será removido automaticamente. Os registros históricos são preservados.</p><div id="bf-users">Carregando usuários...</div></div>';
};
R.bfUsersLoad=async function(){
 const el=document.getElementById('bf-users');
 if(!el||!NV.sb||!NV.clinicaId)return;
 const r=await NV.sb.from('membros').select('user_id,email,nome,papel').eq('clinica_id',NV.clinicaId);
 if(!document.getElementById('bf-users'))return;
 if(r.error){el.textContent='Não foi possível consultar os usuários: '+r.error.message;return}
 const own=NV.sessao&&NV.sessao.user&&NV.sessao.user.id;
 el.innerHTML=(r.data||[]).map(m=>'<div class="row"><span><b>'+esc(m.nome||m.email||'Usuário')+'</b><br><small>'+esc(m.email||'')+' · '+esc(m.papel||'usuario')+'</small></span><span>'+(NV.papel==='admin'&&m.user_id!==own?'<button class="btn danger sm" onclick="bfRevogarUsuario('+esc(JSON.stringify(m.user_id))+','+esc(JSON.stringify(m.nome||m.email||'usuário'))+')">Remover acesso</button>':m.user_id===own?'Sua conta':'Somente administrador')+'</span></div>').join('')||'<p>Nenhum membro cadastrado.</p>';
};
R.bfRevogarUsuario=function(id,nome){
 if(NV.papel!=='admin'||id===(NV.sessao&&NV.sessao.user&&NV.sessao.user.id))return;
 confirmModal('Retirar o acesso de <b>'+esc(nome)+'</b> a esta clínica? Não apaga pacientes, agendamentos nem históricos.',async()=>{
  const r=await NV.sb.rpc('remover_membro',{p_clinica:NV.clinicaId,p_user:id});
  toast(r.error?'Erro ao retirar acesso: '+r.error.message:'Acesso removido da clínica');
  if(!r.error)await R.bfUsersLoad();
 },'Remover acesso');
};
R.bfChatWidget=function(){
 if(!NV.ativa||!NV.clinicaId||UI.auth)return '';
 setTimeout(()=>{if(R.bfChatAberto)R.bfChatLoad();if(document.getElementById('bf-users'))R.bfUsersLoad()},0);
 return '<div id="bfchat">'+(R.bfChatAberto?'<div class="bf-panel"><div class="bf-header"><b>Chat · '+esc(NV.nomeClinica||'equipe')+'</b><button class="btn ghost sm" onclick="bfChatToggle()" aria-label="Fechar chat">Fechar</button></div><div class="bf-messages" id="bf-chat-lines" aria-live="polite">Carregando conversas...</div><form class="bf-entry" onsubmit="bfChatSend();return false"><input maxlength="4000" id="bf-chat-text" placeholder="Mensagem para a equipe" autocomplete="off" required><button type="submit">Enviar</button></form><div style="padding:5px 10px;font-size:11px;color:var(--mut,#777)">Histórico gravado na clínica. <button class="lnk" onclick="bfChatExport()">Exportar histórico</button></div></div>':'<button class="bf-launch" onclick="bfChatToggle()">Chat</button>')+'</div>';
};
R.bfChatToggle=function(){R.bfChatAberto=!R.bfChatAberto;render()};
R.bfChatCache=[];
R.bfChatLoad=async function(){
 const target=document.getElementById('bf-chat-lines');
 if(!target||!NV.sb||!NV.clinicaId)return;
 const clinic=NV.clinicaId;
 const r=await NV.sb.from('bf_chat_mensagens').select('id,autor_id,autor_nome,mensagem,criado_em').eq('clinica_id',clinic).order('id',{ascending:false}).limit(100);
 const e=document.getElementById('bf-chat-lines');if(!e||clinic!==NV.clinicaId)return;
 if(r.error){e.textContent='Erro ao consultar chat. Confirme seu acesso à clínica.';return}
 R.bfChatCache=(r.data||[]).slice().reverse();
 const nearEnd=e.scrollTop+e.clientHeight>=e.scrollHeight-45;
 e.innerHTML=R.bfChatCache.length?R.bfChatCache.map(m=>'<div class="bf-message"><b>'+esc(m.autor_nome||'Profissional')+'</b><small>'+esc(new Date(m.criado_em).toLocaleString('pt-BR'))+'</small>'+esc(m.mensagem).replace(/\n/g,'<br>')+'</div>').join(''):'<p class="sub">Nenhuma mensagem ainda. Escreva para sua equipe.</p>';
 if(nearEnd)e.scrollTop=e.scrollHeight;
};
R.bfChatSend=async function(){
 const inp=document.getElementById('bf-chat-text');if(!inp||!NV.sb||!NV.clinicaId||!NV.sessao)return;
 const msg=inp.value.trim();if(!msg)return;
 inp.disabled=true;
 const r=await NV.sb.from('bf_chat_mensagens').insert({clinica_id:NV.clinicaId,autor_id:NV.sessao.user.id,autor_nome:nomeUsuario(),mensagem:msg});
 inp.disabled=false;
 if(r.error){toast('Mensagem não enviada: '+r.error.message);return}
 inp.value='';await R.bfChatLoad();inp.focus();
};
R.bfChatExport=async function(){
 if(NV.papel!=='admin'||!NV.clinicaId||!NV.sb){toast('Somente o administrador pode exportar o histórico.');return}
 const all=[];const limit=500;let start=0;
 try{
  for(;;){
   const r=await NV.sb.from('bf_chat_mensagens').select('id,autor_nome,mensagem,criado_em').eq('clinica_id',NV.clinicaId).order('id',{ascending:true}).range(start,start+limit-1);
   if(r.error)throw r.error;
   const rows=r.data||[];all.push(...rows);
   if(rows.length<limit)break;
   start+=limit;
  }
  download('blackflow-chat-'+todayISO()+'.json',new Blob([JSON.stringify({clinica:NV.nomeClinica,exportadoEm:new Date().toISOString(),mensagens:all},null,2)],{type:'application/json'}));
  toast('Histórico exportado: '+all.length+' mensagens.');
 }catch(e){toast('Não foi possível exportar o histórico: '+e.message)}
}
if(!R.bfChatPoll)R.bfChatPoll=setInterval(()=>{if(R.bfChatAberto&&document.getElementById('bf-chat-lines'))R.bfChatLoad()},10000);
R.bfHelpAddon=function(){
 return '<div class="card"><h2>Escreva sua dúvida</h2><p class="sub">Consulte as respostas do BlackFlow. Se não houver correspondência, abra a assistente Tati.</p><form onsubmit="bfHelpAsk();return false"><label>O que você precisa saber?<textarea id="bf-help-question" rows="3" placeholder="Ex.: Como preencher uma anamnese?"></textarea></label><div style="margin-top:10px"><button class="btn" type="submit">Perguntar</button></div></form><div id="bf-help-answer" style="margin-top:10px"></div></div>';
};
R.bfHelpAsk=function(){
 const q=(document.getElementById('bf-help-question')||{}).value||'';
 const el=document.getElementById('bf-help-answer');if(!el)return;
 const hits=ajudaBusca(q.trim());
 if(hits.length){const a=hits[0];el.innerHTML='<b>'+esc(a.t)+'</b><ol>'+a.p.map(p=>'<li>'+p+'</li>').join('')+'</ol>';return}
 el.innerHTML='<p>Não encontrei uma resposta verificada. Você pode consultar a assistente Tati ou o suporte.</p><button class="btn ghost" onclick="bfTatiOpen()">Abrir Tati</button>';
};
const oldHelp=R.vAjuda;
R.vAjuda=function(){return oldHelp().replace(/<\/div>\s*$/,R.bfHelpAddon()+'</div>')};
})();
