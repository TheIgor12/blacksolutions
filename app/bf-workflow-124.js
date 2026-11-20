/* BlackFlow 1.24: profissionais + pagamentos mistos */
(function(){
'use strict';
const W=window;
const css=document.createElement('style');
css.textContent='#bfchat{right:110px!important;bottom:20px!important}#bfchat .bf-panel{width:min(340px,calc(100vw - 130px))}.bfpay-row{display:grid;grid-template-columns:2fr 1.25fr 1fr auto;gap:8px;align-items:end;margin:9px 0}.bfpay-row label{font-size:12px;min-width:0}.bfpay-row input,.bfpay-row select{width:100%;padding:8px;min-width:0}.bfpay-row .bfpay-parc{display:none}.bfpay-row .bfpay-parc.on{display:block}.bfpro-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 0;border-bottom:1px solid var(--bd,#ddd)}@media(max-width:700px){#bfchat{right:94px!important}.bfpay-row{grid-template-columns:1.5fr 1fr}.bfpay-remove{grid-column:2}}';
document.head.appendChild(css);
function admin(){return !NV.ativa||(NV.papel==='admin'&&!NV.offline)}
const oldUsers=W.bfUserManagement;
W.bfUserManagement=function(){
 const people=az(S.profissionais||[]);
 let html='<div class="card"><h2>Profissionais cadastrados na agenda</h2><p class="sub">A lista abaixo contém os nomes que aparecem nas agendas. Desativar esconde o profissional das opções atuais; excluir retira o cadastro, mantendo o nome nos atendimentos históricos. Isso não revoga eventual login.</p>';
 html+=!admin()?'<p>Somente o administrador pode alterar profissionais.</p>':people.length?people.map(p=>{
  const id=esc(JSON.stringify(String(p.id)));
  const count=S.agendamentos.filter(a=>norm(a.profissional)===norm(p.nome)).length;
  return '<div class="bfpro-row"><div><b>'+esc(p.nome)+'</b> · '+(p.ativo===false?'Inativo':'Ativo')+'<br><small>'+count+' agendamentos anteriores</small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" onclick="bfProToggle('+id+')">'+(p.ativo===false?'Reativar':'Desativar')+'</button><button class="btn danger sm" onclick="bfProDelete('+id+')">Excluir</button></div></div>';
 }).join(''):'<p>Nenhum profissional cadastrado.</p>';
 html+='</div><div class="card"><h2>Contas com login</h2><p class="sub">Abaixo estão os acessos por e-mail e senha. Remova também o login quando o colaborador não deve mais entrar na clínica.</p></div>';
 return html+(oldUsers?oldUsers():'');
};
W.bfProToggle=function(id){
 if(!admin())return toast('Apenas administradores podem modificar profissionais.');
 const p=S.profissionais.find(p=>String(p.id)===String(id));if(!p)return;
 const activate=p.ativo===false;
 confirmModal((activate?'Reativar':'Desativar')+' <b>'+esc(p.nome)+'</b> na agenda? O histórico não será alterado.',()=>{p.ativo=activate;save()},activate?'Reativar':'Desativar');
};
W.bfProDelete=function(id){
 if(!admin())return toast('Apenas administradores podem excluir profissionais.');
 const p=S.profissionais.find(p=>String(p.id)===String(id));if(!p)return;
 const count=S.agendamentos.filter(a=>norm(a.profissional)===norm(p.nome)).length;
 confirmModal('Excluir <b>'+esc(p.nome)+'</b> da lista de profissionais? '+(count?count+' agendamentos históricos continuarão identificando essa pessoa. ':'')+'Essa operação não bloqueia o acesso por senha.',()=>{
 S.profissionais=S.profissionais.filter(x=>String(x.id)!==String(id));
 if(UI.agProf&&norm(UI.agProf)===norm(p.nome))UI.agProf='';
 save();
 },'Excluir cadastro');
};
W.bfPayRowHTML=function(i){
 return '<div class="bfpay-row"><label>Forma<select class="bfpay-form" onchange="bfPayUpdate()">'+['Pix','Cartão de crédito','Cartão de débito','Dinheiro','Transferência','Boleto'].map(v=>'<option '+(i===1&&v==='Cartão de crédito'?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Valor (R$)<input class="bfpay-amount" type="number" step="0.01" min="0.01" placeholder="0,00" oninput="bfPayUpdate()"></label><label class="bfpay-parc">Parcelas<select class="bfpay-install">'+Array.from({length:12},(_,k)=>'<option value="'+(k+1)+'" '+(i===1&&k===1?'selected':'')+'>'+(k+1)+'x</option>').join('')+'</select></label><button class="btn ghost sm bfpay-remove" onclick="this.closest(&quot;.bfpay-row&quot;).remove();bfPayUpdate()">Remover</button></div>';
};
W.bfPayAdd=function(){
 const root=document.getElementById('bfpay-rows');if(!root)return;
 root.insertAdjacentHTML('beforeend',bfPayRowHTML(root.children.length));
 bfPayUpdate();
};
W.bfPayUpdate=function(){
 const root=document.getElementById('bfpay');if(!root)return;
 let n=0;root.querySelectorAll('.bfpay-row').forEach(row=>{
 const method=row.querySelector('.bfpay-form').value;
 row.querySelector('.bfpay-parc').classList.toggle('on',method==='Cartão de crédito');
 n+=Math.max(0,Math.round((Number(row.querySelector('.bfpay-amount').value)||0)*100));
 });
 const out=root.querySelector('#bfpay-total');if(out)out.textContent=money(n/100);
 const ag=S.agendamentos.find(a=>String(a.id)===root.dataset.agid);
 if(ag){const l=lancDoAg(ag),already=Math.round((l?pagoEf(l):0)*100),due=Math.max(0,Math.round(valorAg(ag)*100)-already);
 const hint=root.querySelector('#bfpay-hint');if(hint)hint.textContent='Saldo a receber: '+money(due/100)+(n>due?' — Atenção: valores acima do saldo.':'');}
};
const orig=W.agValHTML;
W.agValHTML=function(ag){
 const l=lancDoAg(ag),paid=l?pagoEf(l):0;
 return orig(ag)+'<div class="card" id="bfpay" data-agid="'+esc(String(ag.id))+'" style="margin:12px 0 0;padding:12px"><b>Pagamento por várias modalidades</b><p class="sub">Salve os valores do atendimento antes de registrar os recebimentos. Cartão em 2x significa duas parcelas na operadora.</p><div id="bfpay-rows">'+bfPayRowHTML(0)+bfPayRowHTML(1)+'</div><button class="btn ghost sm" onclick="bfPayAdd()">+ Adicionar forma de pagamento</button><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0"><b>Selecionado: <span id="bfpay-total">R$ 0,00</span></b><small id="bfpay-hint">Saldo a receber: '+money(Math.max(0,valorAg(ag)-paid))+'</small></div><label>Data do recebimento <input type="date" id="bfpay-date" value="'+todayISO()+'"></label><button class="btn sm" style="margin:8px 0 0 8px" onclick="bfPayCommit()">Registrar modalidades</button></div>';
};
W.bfPayCommit=function(){
 const root=document.getElementById('bfpay');if(!root)return;
 const ag=S.agendamentos.find(a=>String(a.id)===root.dataset.agid);if(!ag)return toast('Atendimento não localizado.');
 const total=Math.round(valorAg(ag)*100),l=lancDoAg(ag);
 if(!l||Math.round((Number(l.valor)||0)*100)!==total)return toast('Primeiro salve os valores do atendimento e reabra esta janela.');
 const received=Math.round(pagoEf(l)*100),due=total-received;
 if(due<=0)return toast('O atendimento já está quitado. Evite registrar o pagamento em duplicidade.');
 const rows=[...root.querySelectorAll('.bfpay-row')].map(row=>({
 method:row.querySelector('.bfpay-form').value,
 cents:Math.round(Number(row.querySelector('.bfpay-amount').value)*100),
 parts:Number(row.querySelector('.bfpay-install').value)
 }));
 if(!rows.length||rows.some(x=>!Number.isInteger(x.cents)||x.cents<=0))return toast('Preencha uma ou mais modalidades com valores positivos.');
 const n=rows.reduce((sum,x)=>sum+x.cents,0);
 if(n>due)return toast('Os pagamentos ultrapassam o saldo do atendimento.');
 const date=root.querySelector('#bfpay-date').value;if(!date)return toast('Informe a data.');
 const description=rows.map(x=>esc(x.method)+(x.method==='Cartão de crédito'?' ('+x.parts+'x)':'')+': '+money(x.cents/100)).join('<br>');
 confirmModal('Registrar os recebimentos abaixo?<br>'+description+'<br><b>Total: '+money(n/100)+'</b>'+(n<due?'<br>Restante em aberto: '+money((due-n)/100):''),()=>{
  const P=parcL(l);
  for(let i=P.length-1;i>=0;i--)if(P[i].status!=='Recebido'&&P[i].status!=='Cancelado')P.splice(i,1);
  rows.forEach(x=>P.push({id:uid(),venc:date,data:date,receb:date,valor:x.cents/100,forma:x.method,cartaoModo:x.method==='Cartão de crédito'?(x.parts>1?'Parcelado':'À vista'):'',cartaoParcelas:x.method==='Cartão de crédito'?x.parts:'',maquininha:'',bandeira:'',taxa:'',taxaValor:'',liquido:x.cents/100,status:'Recebido',obs:'Pagamento misto registrado no atendimento'}));
  if(n<due)P.push({id:uid(),venc:date,valor:(due-n)/100,forma:'',status:'Em aberto',obs:'Restante do pagamento misto'});
  lancRecalc(l);save();
 },'Confirmar recebimentos');
};

W.bfAIAsk=async function(question,target){
 const node=typeof target==='string'?document.querySelector(target):target;
 if(!node)return;
 const q=String(question||'').trim();
 if(!q){node.textContent='Escreva sua pergunta.';return}
 if(!NV.sb||!NV.clinicaId||!NV.sessao){node.textContent='Faça login na clínica para consultar a IA.';return}
 if(q.length>600){node.textContent='Limite sua pergunta a 600 caracteres.';return}
 node.textContent='Consultando a ajuda...';
 try{
  const answer=await NV.sb.functions.invoke('bf-ajuda-ia',{body:{pergunta:q,clinica_id:NV.clinicaId}});
  if(answer.error)throw answer.error;
  node.textContent=(answer.data&&answer.data.resposta)||'Sem resposta no momento.';
  node.dataset.mode=String((answer.data&&answer.data.modo)||'');
 }catch(e){node.textContent='Não foi possível consultar a IA. Utilize as respostas verificadas ou contate o suporte.'}
};
W.bfHelpAsk=async function(){
 const input=document.getElementById('bf-help-question');
 const box=document.getElementById('bf-help-answer');
 if(!input||!box)return;
 const question=input.value.trim();
 if(!question){box.textContent='Digite sua pergunta.';return}
 const hits=ajudaBusca(question);
 if(hits.length){
  const a=hits[0];
  box.innerHTML='<b>'+esc(a.t)+'</b><ol>'+a.p.map(p=>'<li>'+p+'</li>').join('')+'</ol><p class="sub">Resposta da base de ajuda do BlackFlow.</p>';
  return;
 }
 await W.bfAIAsk(question,box);
};
})();
