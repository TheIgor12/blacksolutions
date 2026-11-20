/* BlackFlow 1.22.0 - Orçamentos e Receituário, geração de PDF pelo navegador.
 * Dados são mantidos no registro da clínica. Sem emissão de prescrição eletrônica regulamentada.
 * Modelos visuais são por clínica e gerados a partir de papel timbrado SEM dados.
 */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const moneyBR=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const safeList=()=>Array.isArray(S.servicos)?S.servicos.filter(x=>x.ativo!==false):[];
const findPatient=id=>(S.pacientes||[]).find(x=>x.id===id);
const address=p=>[p?.endereco,p?.numero,p?.complemento,p?.bairro,p?.cidade,p?.uf,p?.cep].filter(Boolean).join(', ');
const clinic=()=>String(S.config.clinica||'Clínica');
const docs=()=>{if(!Array.isArray(S.orcamentos))S.orcamentos=[];if(!Array.isArray(S.receitasDocs))S.receitasDocs=[];return S};
const draft={kind:'orc',pid:'',items:[{servicoId:'',nome:'',descricao:'',valor:0,quantidade:1}],meds:[{nome:'',tipo:'Industrializado',concentracao:'',forma:'',posologia:'',quantidade:'',orientacoes:''}],nome:'',cpf:'',endereco:'',tratamento:'',validade:'',nota:'',farmacia:''};
const getFields=()=>{const f=document.getElementById('bf-doc-form');if(!f)return;for(const k of ['nome','cpf','endereco','tratamento','validade','nota','farmacia']){const v=f.elements.namedItem(k);if(v)draft[k]=v.value}};
const patientFields=(p)=>{draft.pid=p?.id||'';draft.nome=p?.nome||'';draft.cpf=p?.cpf||'';draft.endereco=address(p);};
const itemID=x=>'bf-oi-'+x;
function selectPatientHTML(){return '<label>Paciente cadastrado<select id="bf-doc-patient" onchange="bfDocsSelectPatient(this.value)"><option value="">Preencher manualmente / selecionar</option>'+
 (S.pacientes||[]).filter(p=>p.status!=='Inativo').sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR')).map(p=>'<option value="'+E(p.id)+'"'+(draft.pid===p.id?' selected':'')+'>'+E(p.nome)+'</option>').join('')+'</select></label>'}
function commonFields(){return '<div class="bf-doc-grid">'+selectPatientHTML()+
 '<label>Nome completo<input name="nome" required maxlength="180" value="'+E(draft.nome)+'"></label>'+
 '<label>CPF (quando houver)<input name="cpf" inputmode="numeric" maxlength="18" value="'+E(draft.cpf)+'"></label>'+
 '<label class="full">Endereço<input name="endereco" maxlength="280" value="'+E(draft.endereco)+'"></label></div>'}
const svcOptions=sel=>'<option value="">Selecionar serviço cadastrado</option>'+safeList().map(s=>'<option value="'+E(s.id)+'"'+(String(s.id)===String(sel)?' selected':'')+'>'+E(s.nome)+' — '+moneyBR(s.preco)+'</option>').join('');
function budgetRows(){return draft.items.map((x,i)=>'<div class="bf-doc-row"><div class="bf-doc-grid">'+
 '<label>Serviço<select data-index="'+i+'" onchange="bfDocChooseService('+i+',this.value)">'+svcOptions(x.servicoId)+'</select></label>'+
 '<label>Nome do serviço / produto<input data-index="'+i+'" data-key="nome" value="'+E(x.nome)+'" required></label>'+
 '<label class="full">Descrição<textarea data-index="'+i+'" data-key="descricao" rows="2">'+E(x.descricao)+'</textarea></label>'+
 '<label>Quantidade<input data-index="'+i+'" data-key="quantidade" type="number" min="1" max="999" step="1" value="'+E(x.quantidade)+'"></label>'+
 '<label>Valor unitário (R$)<input data-index="'+i+'" data-key="valor" type="number" min="0" max="999999" step="0.01" value="'+E(x.valor)+'"></label>'+
 '</div><button class="btn ghost sm" type="button" onclick="bfDocRemove('+i+')" '+(draft.items.length===1?'disabled':'')+'>Remover item</button></div>').join('')}
function medRows(){return draft.meds.map((x,i)=>'<div class="bf-doc-row"><div class="bf-doc-grid">'+
 '<label>Categoria<select data-med="'+i+'" data-key="tipo"><option'+(x.tipo==='Industrializado'?' selected':'')+'>Industrializado</option><option'+(x.tipo==='Manipulado'?' selected':'')+'>Manipulado</option></select></label>'+
 '<label>Medicamento / fórmula<input data-med="'+i+'" data-key="nome" value="'+E(x.nome)+'" required></label>'+
 '<label>Concentração / composição<input data-med="'+i+'" data-key="concentracao" value="'+E(x.concentracao)+'"></label>'+
 '<label>Forma farmacêutica<input data-med="'+i+'" data-key="forma" value="'+E(x.forma)+'"></label>'+
 '<label>Quantidade<input data-med="'+i+'" data-key="quantidade" value="'+E(x.quantidade)+'"></label>'+
 '<label class="full">Posologia prescrita pelo profissional habilitado<textarea rows="2" data-med="'+i+'" data-key="posologia">'+E(x.posologia)+'</textarea></label>'+
 '<label class="full">Orientações complementares<textarea rows="2" data-med="'+i+'" data-key="orientacoes">'+E(x.orientacoes)+'</textarea></label></div>'+
 '<button class="btn ghost sm" type="button" onclick="bfDocRemove('+i+')" '+(draft.meds.length===1?'disabled':'')+'>Remover item</button></div>').join('')}
function collectionHTML(){return draft.kind==='orc'?
 '<div class="bf-doc-grid"><label>Tratamento / objetivo<input name="tratamento" value="'+E(draft.tratamento)+'"></label><label>Validade da proposta<input type="date" name="validade" value="'+E(draft.validade)+'"></label></div><div id="bf-doc-rows">'+budgetRows()+'</div>'+
 '<button class="btn ghost" type="button" onclick="bfDocAdd()">+ Adicionar outro serviço ou produto</button>'+
 '<label class="bf-doc-note">Condições e observações<textarea name="nota" rows="2">'+E(draft.nota)+'</textarea></label>':
 '<p class="bf-doc-warning"><b>Atenção:</b> o documento é apenas rascunho. Medicamentos e posologia devem ser definidos e revisados por profissional legalmente habilitado. Receitas controladas exigem procedimentos específicos.</p>'+
 '<div id="bf-doc-rows">'+medRows()+'</div><button class="btn ghost" type="button" onclick="bfDocAdd()">+ Adicionar medicamento ou fórmula</button>'+
 '<div class="bf-doc-grid"><label>Farmácia de preferência (opcional)<input name="farmacia" value="'+E(draft.farmacia)+'" placeholder="Livre escolha do paciente"></label><label>Data de emissão<input type="date" value="'+new Date().toISOString().slice(0,10)+'" disabled></label></div>'+
 '<label class="bf-doc-note">Orientações gerais<textarea name="nota" rows="2">'+E(draft.nota)+'</textarea></label>';
function syncRows(){const form=document.getElementById('bf-doc-form');if(!form)return;getFields();
 if(draft.kind==='orc'){form.querySelectorAll('[data-index][data-key]').forEach(e=>{const x=draft.items[Number(e.dataset.index)];if(x)x[e.dataset.key]=e.value})}
 else {form.querySelectorAll('[data-med][data-key]').forEach(e=>{const x=draft.meds[Number(e.dataset.med)];if(x)x[e.dataset.key]=e.value})}
}
function renderForm(){const f=document.getElementById('bf-doc-form');if(!f)return;f.innerHTML=commonFields()+collectionHTML()+
 '<div class="bf-doc-actions"><button class="btn ghost" type="button" onclick="closeModal()">Cancelar</button>'+
 '<button class="btn ghost" type="button" onclick="bfDocSubmit(false)">Salvar rascunho</button>'+
 '<button class="btn" type="button" onclick="bfDocSubmit(true)">Salvar e gerar PDF</button></div>'}
window.bfDocChooseService=function(i,id){syncRows();let x=draft.items[i];if(!x)return;const s=safeList().find(v=>String(v.id)===id);x.servicoId=id;x.nome=s?.nome||x.nome;x.valor=Math.max(0,Number(s?.preco)||0);x.descricao=s?.descricao||x.descricao||'';renderForm()};
window.bfDocAdd=function(){syncRows();if(draft.kind==='orc')draft.items.push({servicoId:'',nome:'',descricao:'',valor:0,quantidade:1});
 else draft.meds.push({nome:'',tipo:'Industrializado',concentracao:'',forma:'',posologia:'',quantidade:'',orientacoes:''});
 renderForm()};
window.bfDocRemove=function(i){syncRows();const list=draft.kind==='orc'?draft.items:draft.meds;if(list.length<=1)return;list.splice(i,1);renderForm()};
window.bfDocsSelectPatient=function(id){syncRows();patientFields(findPatient(id));renderForm()};
window.bfDocOpen=function(kind,pid,id){
 if(kind==='receita'&&!window.confirm('O receituário gera um rascunho. Confirma que será revisado e assinado por profissional habilitado antes de utilizar?'))return;
 draft.kind=kind==='receita'?'receita':'orc';draft.items=[{servicoId:'',nome:'',descricao:'',valor:0,quantidade:1}];
 draft.meds=[{nome:'',tipo:'Industrializado',concentracao:'',forma:'',posologia:'',quantidade:'',orientacoes:''}];
 draft.tratamento='';draft.validade='';draft.nota='';draft.farmacia=S.config.bfFarmacia||'';
 patientFields(findPatient(pid));draft.editId='';
 const old=(kind==='receita'?docs().receitasDocs:docs().orcamentos).find(x=>x.id===id);
 if(old){Object.assign(draft,JSON.parse(JSON.stringify(old)));draft.editId=old.id}
 openModal('<h3>'+(draft.kind==='orc'?'Orçamento de serviços e produtos':'Receituário — rascunho')+'</h3>'+
 '<p class="sub">Selecione o paciente para preencher automaticamente nome, CPF e endereço; revise antes de imprimir.</p>'+
 '<form id="bf-doc-form" onsubmit="return false"></form>',true);
 renderForm()
};
const patientName=p=>p?.nome||'';
function records(kind){const L=kind==='orc'?docs().orcamentos:docs().receitasDocs;return L.slice().sort((a,b)=>String(b.criado).localeCompare(String(a.criado)))}
window.bfDocsView=function(kind){
 const isRx=kind==='receita',title=isRx?'Receituário':'Orçamentos';
 const L=records(isRx?'receita':'orc');
 return '<div class="page" style="max-width:1080px"><div class="phead"><div><h1>'+title+'</h1><p class="sub">Documentos por paciente, com modelo visual da clínica e saída PDF.</p></div>'+
 '<button class="btn" onclick="bfDocOpen(\''+(isRx?'receita':'orc')+'\')">+ '+(isRx?'Nova receita / orientação':'Novo orçamento')+'</button></div>'+
 (isRx?'<div class="note warn">Somente profissional habilitado pode prescrever medicamentos dentro dos limites legais de sua profissão. Este módulo não emite receita controlada e não fornece assinatura digital qualificada.</div>':'')+
 '<div class="card"><h2>Documentos salvos</h2>'+(L.length?'<div class="tw"><table class="tbl"><thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Ação</th></tr></thead><tbody>'+
 L.map(x=>'<tr><td>'+E(String(x.criado||'').slice(0,10))+'</td><td>'+E(x.nome)+'</td><td>'+E(isRx?'Rascunho de receituário':'Orçamento')+'</td><td>'+
 '<button class="btn ghost sm" onclick="bfDocOpen(\''+(isRx?'receita':'orc')+'\',null,\''+E(x.id)+'\')">Editar</button> '+
 '<button class="btn sm" onclick="bfDocPrint(\''+(isRx?'receita':'orc')+'\',\''+E(x.id)+'\')">PDF</button></td></tr>').join('')+
 '</tbody></table></div>':'<p class="sub">Nenhum documento ainda. Clique em Novo para começar.</p>')+'</div></div>'
};
function docValid(){if(!draft.nome?.trim()){toast('Informe o nome do paciente.');return false}
 if(draft.cpf?.trim()&&!/^[0-9.\-\s]{11,18}$/.test(draft.cpf)){toast('Confira o formato do CPF.');return false}
 if(draft.kind==='orc'&&draft.items.some(x=>!String(x.nome).trim()||Number(x.valor)<0||!Number.isFinite(Number(x.valor))||!Number.isInteger(Number(x.quantidade))||Number(x.quantidade)<1)){toast('Preencha todos os serviços, quantidades e valores válidos.');return false}
 if(draft.kind==='receita'&&draft.meds.some(x=>!String(x.nome).trim())){toast('Informe o nome de cada medicamento ou fórmula.');return false}
 return true}
window.bfDocSubmit=function(print){syncRows();if(!docValid())return;
 docs();const isRx=draft.kind==='receita',L=isRx?S.receitasDocs:S.orcamentos;
 const row={id:draft.editId||uid(),tipo:draft.kind,pid:draft.pid,nome:draft.nome,cpf:draft.cpf,endereco:draft.endereco,tratamento:draft.tratamento,validade:draft.validade,nota:draft.nota,farmacia:draft.farmacia,
 items:JSON.parse(JSON.stringify(draft.items)),meds:JSON.parse(JSON.stringify(draft.meds)),criado: new Date().toISOString().slice(0,10),status:'rascunho'};
 const ix=L.findIndex(x=>x.id===row.id);if(ix>=0)L[ix]=row;else L.push(row);
 save();closeModal();render();toast('Documento salvo como rascunho.');
 if(print)bfDocPrint(row.tipo,row.id);
};
const imageBg=()=>S.config?.bfModeloFundo||'';
const stylesheet='<style>html,body{margin:0;font-family:Arial,sans-serif;color:#21394f}*{box-sizing:border-box}@page{size:A4;margin:0} .paper{width:210mm;min-height:297mm;padding:29mm 18mm 23mm;background:#fff;position:relative;page-break-after:always}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0}.inner{position:relative;z-index:1}h1{font-size:18pt;color:#236ba7;margin:3mm 0 14mm;text-align:center}h2{font-size:12pt;color:#216ea7}.logo{font-size:23pt;color:#2879bb;font-weight:bold;text-align:center}.sub{color:#52718b;text-align:center;font-size:10pt;margin:3mm 0 9mm}.details{margin:8mm 0;line-height:1.65;font-size:10pt}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#397ab9;color:white;font-size:10pt;padding:9px}td{padding:10px;border:1px solid #d8e2e9;vertical-align:top;word-wrap:break-word;font-size:9pt}tr:nth-child(even){background:#f3f7fc}.total{text-align:right;font-size:14pt;font-weight:bold;margin-top:8mm;color:#244b8c}.notes{font-size:9pt;margin-top:9mm;line-height:1.5}.signature{border-top:1px solid #445872;margin:34mm auto 0;padding-top:2mm;width:80%;text-align:center;font-size:9pt}.banner{border:1px solid #c78f49;background:#fff5de;padding:9px;margin:10mm 0}.bottom{position:absolute;bottom:13mm;left:18mm;right:18mm;text-align:center;color:#387bb7;font-size:9pt;border-top:1px solid #397ab9;padding-top:7px;z-index:2}@media screen{body{background:#e7e7ef;padding:15px}.paper{box-shadow:0 3px 20px #0002;margin:0 auto}}@media print{body{background:white;padding:0}.paper{margin:0;box-shadow:none} .bg{print-color-adjust:exact;-webkit-print-color-adjust:exact}th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style>';
function rowOutput(d,rx){const r=rx?d.meds:d.items;return r.map(x=>rx?'<tr><td>'+E(x.tipo)+'</td><td>'+E(x.nome)+'<br>'+E([x.concentracao,x.forma].filter(Boolean).join(' · '))+'</td><td>'+E(x.quantidade)+'</td></tr>':
 '<tr><td>'+E(x.nome)+'</td><td>'+E(x.descricao)+'</td><td style="text-align:right">'+moneyBR(Number(x.valor)*Number(x.quantidade))+'</td></tr>').join('')}
window.bfDocPrint=function(kind,id){
 const d=(kind==='receita'?docs().receitasDocs:docs().orcamentos).find(x=>x.id===id);if(!d)return;
 const rx=kind==='receita',bg=imageBg(),logo= S.config.logo||'';
 const head=bg?'<img class="bg" src="'+bg+'" alt="">':('<div class="logo">'+E(clinic())+'</div><div class="sub">'+E(S.config.telefone||S.config.celular||'')+'</div>');
 const body='<div class="paper">'+head+'<div class="inner"><h1>'+(rx?'RECEITUÁRIO — RASCUNHO':'ORÇAMENTO DE ATENDIMENTO')+'</h1>'+
 '<div class="details"><b>Paciente:</b> '+E(d.nome)+'<br><b>CPF:</b> '+E(d.cpf||'Não informado')+
 '<br><b>Endereço:</b> '+E(d.endereco||'Não informado')+
 (rx?'':'<br><b>Tratamento / objetivo:</b> '+E(d.tratamento||'—'))+
 '<br><b>Data:</b> '+E(d.criado)+'</div>'+
 '<table><thead><tr>'+(rx?'<th>Categoria</th><th>Medicamento / fórmula</th><th>Quantidade</th>':'<th>Serviço / produto</th><th>Descrição</th><th>Valor</th>')+'</tr></thead><tbody>'+rowOutput(d,rx)+'</tbody></table>'+
 (rx?'<div class="notes">'+d.meds.map(m=>'<p><b>'+E(m.nome)+':</b> '+E(m.posologia||'Posologia não informada')+' '+E(m.orientacoes||'')+'</p>').join('')+'</div>'+
 '<div class="notes"><b>Farmácia de preferência (opcional):</b> '+E(d.farmacia||'Não indicada')+'<br><small>O paciente tem liberdade de escolha da farmácia.</small></div>'+
 '<div class="banner">RASCUNHO — SEM VALIDADE COMO PRESCRIÇÃO ATÉ REVISÃO E ASSINATURA DE PROFISSIONAL HABILITADO. NÃO É RECEITA CONTROLADA.</div>':
 '<div class="total">Total: '+moneyBR(d.items.reduce((t,x)=>t+Number(x.valor)*Number(x.quantidade),0))+'</div>'+
 '<div class="notes">Validade da proposta: '+E(d.validade||'A combinar')+'</div>')+
 '<div class="notes">'+E(d.nota||'')+'</div>'+
 (rx?'<div class="signature">Nome, conselho profissional, número do registro e assinatura do profissional habilitado</div>':'')+
 '</div><div class="bottom">'+E(clinic())+'</div></div>';
 const w=window.open('','_blank');if(!w){toast('Permita pop-ups para imprimir ou salvar em PDF.');return}
 w.document.open();w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+E(rx?'Receituário - Rascunho':'Orçamento')+'</title>'+stylesheet+'</head><body>'+body+'<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>');w.document.close()
};
window.bfDocsConfig=function(){return '<div class="card"><h2>Modelo de orçamento e receituário</h2>'+
 '<p class="sub">Envie seu <b>papel timbrado em branco</b> (PNG, JPG ou PDF, primeira página). O sistema converte e guarda uma imagem de fundo para os documentos da clínica. Não envie PDF com nome de paciente, tratamento ou valores. O modelo fica salvo nas configurações da clínica.</p>'+
 '<div class="bf-doc-config-actions"><label class="btn ghost" style="cursor:pointer">Enviar papel timbrado<input type="file" accept="application/pdf,image/png,image/jpeg" style="display:none" onchange="bfDocUpload(this)"></label>'+
 '<button class="btn ghost" onclick="S.config.bfModeloFundo=\\x27\\x27;save();render()">Remover modelo</button></div>'+
 (imageBg()?'<img alt="Prévia do papel timbrado" src="'+imageBg()+'" style="margin:12px 0;max-width:260px;max-height:370px;border:1px solid #ddd">':'<p class="sub">Sem modelo carregado: será utilizada a identidade do logotipo e das cores da clínica.</p>')+
 '<div class="bf-doc-grid"><label>Farmácia de preferência para documentos (opcional)<input id="bf-farmacia-cfg" value="'+E(S.config.bfFarmacia||'')+'" placeholder="Ex.: Farmácia indicada pelo profissional" onchange="S.config.bfFarmacia=this.value;save()"></label></div>'+
 '<p class="sub">Modelo de demonstração baseado na estrutura enviada: <a href="/download/Modelo_Orcamento_HappyFEET_em_branco.pdf" target="_blank" rel="noopener">baixar modelo em branco HappyFEET</a>.</p></div>'};
window.bfDocUpload=async function(input){const file=input.files?.[0];if(!file)return;input.value='';
 if(file.size>3*1024*1024){toast('Arquivo muito grande. Limite: 3 MB.');return}
 try{
 let im;
 if(file.type==='application/pdf'){
  if(!window.pdfjsLib){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const page=await doc.getPage(1),viewport=page.getViewport({scale:1.5});
  const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;im=canvas;
 }else{const url=URL.createObjectURL(file);const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});im=image;URL.revokeObjectURL(url)}
 const c=document.createElement('canvas'),scale=Math.min(1,1180/im.width,1680/im.height);
 c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);
 const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);
 const base=c.toDataURL('image/jpeg',.72);
 if(base.length>900000){toast('Modelo ainda muito grande. Envie arquivo mais leve.');return}
 S.config.bfModeloFundo=base;save();render();toast('Papel timbrado carregado para orçamento e receituário. Confira se está em branco.')
 }catch(e){console.warn(e);toast('Não foi possível ler o modelo. Use PDF simples, PNG ou JPG em branco.')}
};
const css='<style>.bf-doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bf-doc-grid label,.bf-doc-note{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mut);min-width:0}.bf-doc-grid .full{grid-column:1/-1}.bf-doc-grid input,.bf-doc-grid select,.bf-doc-grid textarea,.bf-doc-note textarea{width:100%;background:#fff;border:1px solid var(--line);border-radius:7px;color:var(--ink);padding:9px;font:inherit}.bf-doc-row{border:1px solid var(--line);border-radius:12px;margin:12px 0;padding:12px}.bf-doc-row .btn{margin-top:8px}.bf-doc-actions,.bf-doc-config-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:16px}.bf-doc-note{margin-top:12px}.bf-doc-warning{padding:12px;border:1px solid #c68b35;background:#fff5dd;border-radius:10px;font-size:12px}@media(max-width:650px){.bf-doc-grid{grid-template-columns:1fr}.bf-doc-grid .full{grid-column:auto}.bf-doc-actions .btn{flex:1;white-space:normal;justify-content:center}}</style>';
document.head.insertAdjacentHTML('beforeend',css);
})();