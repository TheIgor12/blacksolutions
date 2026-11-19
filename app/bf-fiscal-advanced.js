/* BlackFlow Fiscal 1.11.0: configuração, rascunhos, validação e conciliação.
   Emissão NFS-e Nacional requer certificado, XML assinado, mTLS, homologação e integração ativa. */
(function(){
"use strict";
if(typeof render!=='function'||typeof NV==='undefined')return;
const html=s=>esc(String(s??''));
const val=id=>document.getElementById(id)?.value?.trim()||'';
const opt=(id,values,selected)=>'<select id="'+id+'" class="inp" style="min-width:170px">'+
 values.map(([v,n])=>'<option value="'+html(v)+'"'+(String(selected??'')===String(v)?' selected':'')+'>'+html(n)+'</option>').join('')+'</select>';
const field=(id,label,value="",type="text")=>'<label style="display:block;min-width:180px;flex:1"><small>'+html(label)+'</small><input class="inp" style="width:100%" id="'+id+'" value="'+html(value)+'" type="'+type+'"></label>';
const txt=(id,label,value="")=>'<label style="display:block"><small>'+html(label)+'</small><textarea class="inp" id="'+id+'" style="width:100%;min-height:65px">'+html(value)+'</textarea></label>';
const row=s=>'<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-bottom:10px">'+s+'</div>';
const card=(title,body)=>'<div class="card" style="margin-bottom:16px"><h2 style="margin:0 0 13px;font-size:17px">'+html(title)+'</h2>'+body+'</div>';
const bt=(label,fn,kind="btn sm")=>'<button class="'+kind+'" onclick="'+fn+'">'+html(label)+'</button>';
const table=(headers,rows)=>'<div style="overflow:auto"><table class="tbl"><thead><tr>'+headers.map(x=>'<th>'+html(x)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(x=>'<tr>'+x.map(y=>'<td>'+y+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const notify=e=>toast('Operação não concluída: '+String(e?.message||e).slice(0,150));
const clinic=()=>NV.clinicaId;
const admin=()=>NV.papel==='admin'||!!NV.mestre;
const num=v=>Number(v||0);
async function query(t,cols,where,order){
 let q=NV.sb.from(t).select(cols);
 Object.entries(where||{}).forEach(([k,v])=>q=q.eq(k,v));
 if(order)q=q.order(order,{ascending:false});
 const r=await q;if(r.error)throw r.error;return r.data||[];
}
async function insert(t,payload){const r=await NV.sb.from(t).insert(payload).select();if(r.error)throw r.error;return r.data||[];}
async function ensureAuthorized(){
 if(!NV.sb||!NV.sessao||!clinic()||!admin())throw Error('Acesse a conta administradora da clínica.');
}
let notes=[],cfg={};
async function fiscalView(){
 const el=document.getElementById('bf-fiscal-content');if(!el)return;
 try{
  await ensureAuthorized();
  const results=await Promise.all([
   query('bf_fiscal_config','*',{clinica_id:clinic()}),
   query('bf_fiscal_notas','*',{clinica_id:clinic()},'criado_em'),
   query('bf_fiscal_pagamentos','nota_id,referencia_externa,origem,valor,confirmado,meio',{clinica_id:clinic()}),
   query('bf_fiscal_documentos_externos','id,paciente_ref,paciente_nome,chave_acesso,numero_nfse,pdf_storage_path,criado_em',{clinica_id:clinic()},'criado_em')
  ]);
  cfg=results[0][0]||{};notes=results[1];const payments=results[2];const externals=results[3];
  const totals={draft:notes.filter(n=>n.status==='rascunho').length,
    authorized:notes.filter(n=>n.status==='autorizada').length,
    rejected:notes.filter(n=>n.status==='rejeitada').length};
  const badge='<div class="note" style="margin:0 0 15px">'+
    '<b>Atenção: este BlackFlow prepara rascunhos fiscais, mas ainda não transmite NFS-e.</b> Para notas válidas, são necessários o certificado digital, o XML DPS assinado, a integração mTLS e a homologação. O documento oficial é o XML autorizado. Não trate o comprovante Pix/cartão como nota fiscal.'+
    '<br><a href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noopener">Abrir o Emissor Nacional de NFS-e</a></div>';
  const summary='<div class="grid g3">'+[['Rascunhos',totals.draft],['Notas autorizadas importadas',totals.authorized],['Rejeições registradas',totals.rejected]].map(([name,n])=>'<div class="card"><small>'+name+'</small><h2 style="font-size:25px;margin:4px 0">'+n+'</h2></div>').join('')+'</div>';
  const configured=cfg.situacao_integracao||'nao_configurada';
  const settings=card('Configuração fiscal do estabelecimento',
    '<p class="sub">O CNPJ é recuperado automaticamente do cadastro do negócio. Os demais campos são definidos uma vez, com auxílio do contador. Lucro Presumido e Lucro Real não podem ser presumidos apenas pelo CNPJ. Alterar campos não habilita emissão.</p>'+
    row(field('bfxCnpj','CNPJ vinculado ao cadastro da clínica',cfg.cnpj||'')+field('bfxCpf','CPF do prestador (se aplicável)',cfg.cpf_prestador||'')+
        field('bfxIM','Inscrição municipal',cfg.inscricao_municipal||''))+
    row(field('bfxIBGE','Município IBGE (7 dígitos)',cfg.municipio_ibge||'')+
        field('bfxCNAE','CNAE',cfg.cnae||'')+field('bfxRegime','Regime tributário',cfg.regime||''))+
    row(field('bfxTrib','Código tributação nacional',cfg.ctrib_nacional||cfg.codigo_servico||'')+
        field('bfxTribMun','Código de tributação municipal',cfg.ctrib_municipal||'')+
        field('bfxNbs','Código NBS',cfg.codigo_nbs||''))+
    row('<label style="flex:1"><small>Optante pelo Simples Nacional?</small><br>'+opt('bfxSN', [['','Não informado'],['sim','Sim'],['nao','Não']],cfg.simples_nacional==null?'':cfg.simples_nacional?'sim':'nao')+'</label>'+
       '<label style="flex:1"><small>Série DPS para API (1 a 49999)</small><br>'+opt('bfxSerie',[[1,'00001']],cfg.serie_dps||1)+'</label>'+
       '<label style="flex:1"><small>Ambiente configurado</small><br>'+opt('bfxAmbiente',[['homologacao','Produção restrita (testes)'],['producao','Produção (depende de habilitação)']],cfg.ambiente||'homologacao')+'</label>')+
    '<p class="sub">Integração automática: <b>'+html(configured)+'</b>. A configuração técnica depende de certificado ou procuração eletrônica e serviço de assinatura homologado.</p>'+
    bt('Salvar dados fiscais','bfxSaveSettings()'));
  const recent=S.lancamentos.slice(-150).reverse().filter(l=>l&&Number(l.valor)>0);
  const finOptions=[['','Nenhum lançamento vinculado']].concat(recent.map(l=>[String(l.id),
    (l.descricao||'Lançamento')+' — '+Number(l.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+
    ' — '+(l.forma||'forma não informada')]));
  const draft=card('Preparar uma nova NFS-e',
    '<p class="sub">O valor e os dados do serviço devem corresponder à operação efetiva. Vincular um lançamento não comprova que o pagamento foi liquidado.</p>'+
    row('<label style="flex:1"><small>Lançamento financeiro do BlackFlow</small><br>'+opt('bfxLanc',finOptions,'')+'</label>'+
        bt('Preencher com lançamento','bfxUsePayment()','btn ghost sm'))+
    row('<label style="flex:1"><small>Origem do serviço</small><br>'+opt('bfxOrigem',[['atendimento','Atendimento'],['servico','Serviço avulso'],['pacote','Pacote de sessões'],['outro','Outro']],'atendimento')+'</label>'+
        field('bfxDesc','Descrição fiscal do serviço')+
        field('bfxValor','Valor (R$)','','number'))+
    row('<label style="min-width:180px;flex:1"><small>Cliente já cadastrado</small><br>'+opt('bfxPaciente',[['','Selecionar cliente']].concat((S.pacientes||[]).filter(p=>p.nome).map(p=>[String(p.id),p.nome])),'')+'</label>'+bt('Usar dados do cliente','bfxPickPatient()','btn ghost sm'))+
    row(field('bfxTomador','Nome do tomador')+field('bfxDoc','CPF/CNPJ do tomador')+
        field('bfxEmail','E-mail para envio da nota'))+
    row(field('bfxComp','Competência','','date')+
        field('bfxLocal','Município IBGE prestação',cfg.municipio_ibge||'')+
        '<label style="flex:1"><small>Pagamento</small><br>'+opt('bfxForma',[['','Não informado'],['Pix','Pix'],['Cartão de crédito','Cartão de crédito'],['Cartão de débito','Cartão de débito'],['Dinheiro','Dinheiro'],['Transferência','Transferência'],['Outro','Outro']],'')+'</label>')+
    row(field('bfxCodTrib','Código tributação nacional',cfg.ctrib_nacional||cfg.codigo_servico||'')+
        field('bfxCodMun','Código tributação municipal',cfg.ctrib_municipal||'')+
        field('bfxCodeNbs','NBS',cfg.codigo_nbs||''))+
    '<details style="margin:8px 0"><summary>Endereço do tomador (quando exigido)</summary>'+row(field('bfxCEP','CEP')+field('bfxRua','Logradouro')+field('bfxNumero','Número'))+row(field('bfxBairro','Bairro')+field('bfxMun','Município IBGE')+field('bfxUF','UF'))+'</details>'+ 
    txt('bfxExtra','Informações adicionais fiscais, sem informações clínicas sensíveis')+
    '<p class="sub">A nota só será transmitida após certificação da integração. O registro abaixo é um rascunho.</p>'+
    bt('Salvar rascunho','bfxCreateDraft()'));
  const history=card('Notas e rascunhos',
    row(bt('Exportar relação CSV','bfxExportCsv()','btn ghost sm')+
      '<a class="btn ghost sm" href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noopener">Emissor Nacional</a>')+
    table(['Criado','Descrição','Valor','Pagamento vinculado','Status','Operações'],
      notes.map(n=>{
        const ps=payments.filter(p=>p.nota_id===n.id);
        const pay=ps.length?ps.map(p=>html(p.origem)+': '+html(p.referencia_externa).slice(0,18)).join('<br>'):
            html(n.meio_pagamento||'—');
        return [html(new Date(n.criado_em).toLocaleDateString('pt-BR')),
          html(n.descricao_servico),Number(n.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
          pay,html(n.status),bt('Validar',"bfxValidate('"+n.id+"')",'btn ghost sm')+
          (n.status==='rascunho'?bt('Vincular pagamento',"bfxLinkPayment('"+n.id+"')",'btn ghost sm'):'')+
          (n.status==='autorizada'&&n.chave_acesso?bt('Enviar NFS-e por WhatsApp',"bfNfseWhatsApp('"+n.id+"')",'btn ghost sm'):'')];
      })));
  const imported=card('Compartilhar nota emitida no portal oficial',
    '<p class="sub">Se você emitiu a NFS-e no Portal Nacional ou no município, anexe o DANFSe original e encaminhe pelo WhatsApp. O BlackFlow não atesta a autenticidade dos documentos importados.</p>'+
    row('<label style="flex:2"><small>Paciente</small>'+ 
      '<select id="bfx-ext-patient" class="inp" style="width:100%">'+
      (S.pacientes||[]).map(p=>'<option value="'+html(p.id)+'">'+html(p.nome)+'</option>').join('')+'</select></label>'+
      field('bfx-ext-number','Número da NFS-e')+field('bfx-ext-key','Chave de acesso (se disponível)'))+
    row('<label><small>Origem</small>'+opt('bfx-ext-origin',[['portal_oficial','Emissor Nacional'],['portal_municipal','Emissor municipal']],'portal_oficial')+'</label>'+
      '<label style="flex:2"><small>DANFSe em PDF</small><input class="inp" type="file" id="bfx-ext-file" accept=".pdf,application/pdf" style="width:100%"></label>')+
    '<p><label><input type="checkbox" id="bfx-ext-confirm"> Confirmo que obtive este documento do emissor fiscal e que devo conferir seus dados e autenticidade.</label></p>'+
    bt('Salvar documento fiscal importado','bfxImportarDanfse()')+
    '<h4>Documentos importados</h4>'+
    table(['Paciente','Número','Data','Validação','Ação'],externals.map(d=>[
      html(d.paciente_nome||'—'),html(d.numero_nfse||'—'),
      html(new Date(d.criado_em).toLocaleDateString('pt-BR')),'Não verificada',
      bt('Enviar PDF por WhatsApp',"bfxWhatsAppDanfse('"+d.id+"')",'btn ghost sm')
    ])));
  el.innerHTML=badge+summary+settings+draft+imported+history;
 }catch(e){el.innerHTML='<div class="note">Não foi possível carregar o módulo fiscal: '+html(e.message||e)+'</div>'}
}
window.bfxPickPatient=function(){
 const p=(S.pacientes||[]).find(x=>String(x.id)===val('bfxPaciente'));if(!p)return toast('Selecione um cliente.');
 const pairs={bfxTomador:p.nome||'',bfxDoc:p.cpf||p.cnpj||'',bfxEmail:p.email||'',bfxCEP:p.cep||'',bfxRua:p.endereco||p.logradouro||'',bfxNumero:p.numero||'',bfxBairro:p.bairro||'',bfxMun:p.municipio_ibge||'',bfxUF:p.uf||''};
 Object.entries(pairs).forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v)el.value=v});toast('Dados já cadastrados preenchidos. Confira antes de emitir.');
};
const prevRender=render;
render=function(){
 if(UI.view!=='bffiscal')return prevRender();
 if(NV.ativa&&UI.auth)return prevRender();
 if(!admin()){UI.view='agenda';return prevRender();}
 // Keep UI.drawer as set by toggleDrawer(): otherwise hamburger never opens on fiscal page.
 document.getElementById('app').innerHTML=shell('<div class="page" style="max-width:1240px"><div class="phead"><div><h1>Nota Fiscal de Serviços — NFS-e</h1><p class="sub">Configurações, rascunhos, conferência e conciliação fiscal por estabelecimento</p></div></div><div id="bf-fiscal-content"><div class="card">Carregando informações fiscais...</div></div></div>');
 fiscalView();
};
window.bfxSaveSettings=async function(){
 try{
  await ensureAuthorized();
  const cnpj=val('bfxCnpj').replace(/\D/g,''),cpf=val('bfxCpf').replace(/\D/g,''),municipio=val('bfxIBGE');
  if(cnpj&&cnpj.length!==14)throw Error('O CNPJ deve conter 14 dígitos.');
  if(cpf&&cpf.length!==11)throw Error('O CPF deve conter 11 dígitos.');
  if(municipio&&!/^\d{7}$/.test(municipio))throw Error('Informe o município com 7 dígitos IBGE.');
  const d={clinica_id:clinic(),cnpj:cnpj||null,cpf_prestador:cpf||null,inscricao_municipal:val('bfxIM')||null,
    municipio_ibge:municipio||null,cnae:val('bfxCNAE')||null,regime:val('bfxRegime')||null,
    ctrib_nacional:val('bfxTrib')||null,ctrib_municipal:val('bfxTribMun')||null,codigo_nbs:val('bfxNbs')||null,
    serie_dps:Number(val('bfxSerie')||1),ambiente:val('bfxAmbiente')||'homologacao',
    simples_nacional:val('bfxSN')===''?null:val('bfxSN')==='sim'};
  const result=await NV.sb.from('bf_fiscal_config').upsert(d,{onConflict:'clinica_id'});
  if(result.error)throw result.error;
  toast('Cadastro fiscal atualizado. Nenhuma emissão foi habilitada.');render();
 }catch(e){notify(e)}
};
window.bfxUsePayment=function(){
 const ref=val('bfxLanc');const l=S.lancamentos.find(x=>String(x.id)===ref);
 if(!l)return toast('Selecione o lançamento.');
 const linked={bfxDesc:l.descricao||'Serviço prestado',bfxValor:l.valor||'',bfxForma:l.forma||'',bfxComp:l.pagamento||l.vencimento||''};
 Object.entries(linked).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value;});
 const p=S.pacientes.find(p=>p.id===l.pacienteId);
 if(p){const n=document.getElementById('bfxTomador'),d=document.getElementById('bfxDoc');
   if(n)n.value=p.nome||'';if(d)d.value=p.cpf||'';}
 toast('Preenchido com o lançamento. Confirme os valores e a competência.');
};
window.bfxCreateDraft=async function(){
 try{
  await ensureAuthorized();
  const description=val('bfxDesc'),amount=Number(val('bfxValor'));
  if(!description||!Number.isFinite(amount)||amount<=0)throw Error('Informe descrição e valor.');
  const doc=val('bfxDoc').replace(/\D/g,'');
  if(doc&&![11,14].includes(doc.length))throw Error('CPF/CNPJ do tomador está incompleto.');
  const r=await NV.sb.from('bf_fiscal_notas').insert({
    clinica_id:clinic(),origem:val('bfxOrigem'),origem_ref:val('bfxLanc')||null,
    paciente_ref:S.lancamentos.find(l=>String(l.id)===val('bfxLanc'))?.pacienteId||val('bfxPaciente')||null,
    descricao_servico:description,valor:amount,meio_pagamento:val('bfxForma')||null,
    tomador_nome:val('bfxTomador')||null,tomador_documento:doc||null,tomador_email:val('bfxEmail')||null,
    competencia:val('bfxComp')||null,data_prestacao:val('bfxComp')||null,
    municipio_prestacao_ibge:val('bfxLocal')||null,
    tomador_cep:val('bfxCEP')||null,tomador_logradouro:val('bfxRua')||null,
    tomador_numero:val('bfxNumero')||null,tomador_bairro:val('bfxBairro')||null,
    tomador_municipio_ibge:val('bfxMun')||null,tomador_uf:val('bfxUF')||null,
    codigo_tributacao_nacional:val('bfxCodTrib')||null,
    codigo_tributacao_municipal:val('bfxCodMun')||null,codigo_nbs:val('bfxCodeNbs')||null,
    informacoes_adicionais:val('bfxExtra')||null,status:'rascunho'
  }).select('id');
  if(r.error)throw r.error;
  toast('Rascunho fiscal criado. Nenhuma nota emitida.');render();
 }catch(e){notify(e)}
};
window.bfxValidate=async function(id){
 try{
  await ensureAuthorized();
  const {data,error}=await NV.sb.functions.invoke('bf-modulos-fiscal/validar',{body:{clinica_id:clinic(),nota_id:id}});
  if(error)throw error;
  if(!data)throw Error('Validação não retornou dados.');
  const errs=(data.erros||[]).map(s=>'<li>'+html(s)+'</li>').join(''),
        warnings=(data.avisos||[]).map(s=>'<li>'+html(s)+'</li>').join('');
  openModal('<h3>Conferência do rascunho</h3>'+
   '<p><b>Preparação:</b> '+(data.valido_para_preparacao?'Campos básicos preenchidos':'Faltam informações')+'</p>'+
   (errs?'<h4>Correções</h4><ul>'+errs+'</ul>':'')+
   (warnings?'<h4>Avisos</h4><ul>'+warnings+'</ul>':'')+
   '<div class="note"><b>NFS-e não emitida.</b> A validação local não substitui assinatura, homologação ou autorização da SEFIN Nacional.</div>'+
   '<div class="mact">'+bt('Fechar','closeModal()')+'</div>');
 }catch(e){notify(e)}
};
window.bfxLinkPayment=async function(id){
 try{
  await ensureAuthorized();
  const l=S.lancamentos.slice(-100).reverse().filter(l=>Number(l.valor)>0);
  openModal('<h3>Vincular lançamento ao rascunho</h3>'+
   '<p class="sub">A ligação não confirma recebimento bancário; confira no financeiro.</p>'+
   opt('bfLinkRef',l.map(x=>[x.id,(x.descricao||'Lançamento')+' — R$ '+num(x.valor).toFixed(2).replace('.',',')]),'')+
   '<div class="mact">'+bt('Cancelar','closeModal()','btn ghost sm')+
   bt('Vincular',"bfxConfirmLink('"+id+"')")+'</div>');
 }catch(e){notify(e)}
};
window.bfxConfirmLink=async function(id){
 try{
  const rid=val('bfLinkRef');const l=S.lancamentos.find(x=>String(x.id)===rid);
  if(!l)throw Error('Lançamento não localizado.');
  const r=await NV.sb.from('bf_fiscal_pagamentos').insert({
   clinica_id:clinic(),nota_id:id,origem:'financeiro',referencia_externa:String(l.id),
   valor:Number(l.valor),meio:l.forma||null,confirmado:false
  });
  if(r.error)throw r.error;
  closeModal();toast('Pagamento vinculado, aguardando conferência.');render();
 }catch(e){notify(e)}
};
window.bfxExportCsv=function(){
 const sep=';';const clean=x=>'"'+String(x??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
 const lines=[['Data','Descrição','Valor','Status','Número NFS-e','Chave'].map(clean).join(sep)];
 notes.forEach(n=>lines.push([n.criado_em,n.descricao_servico,n.valor,n.status,n.numero_nfse,n.chave_acesso].map(clean).join(sep)));
 download('blackflow_nfse_'+todayISO()+'.csv',new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
};
window.bfxImportarDanfse=async function(){
 try{
  await ensureAuthorized();
  const file=document.getElementById('bfx-ext-file')?.files?.[0],patientRef=val('bfx-ext-patient');
  if(!document.getElementById('bfx-ext-confirm')?.checked)throw Error('Confirme a procedência do PDF.');
  if(!file||file.size<100||file.size>15728640||!file.name.toLowerCase().endsWith('.pdf'))throw Error('Envie um PDF válido até 15 MB.');
  if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('O arquivo não possui cabeçalho PDF.');
  const key=val('bfx-ext-key').replace(/\s/g,'');
  if(key&&(!/^[A-Za-z0-9]{40,60}$/.test(key)))throw Error('Confira a chave de acesso informada.');
  const p=S.pacientes.find(x=>String(x.id)===String(patientRef));
  if(!p)throw Error('Selecione um cliente cadastrado.');
  const path=clinic()+'/'+NV.sessao.user.id+'/externo/'+crypto.randomUUID()+'.pdf';
  const storage=await NV.sb.storage.from('bf-nfse-documentos').upload(path,file,{upsert:false,contentType:'application/pdf'});
  if(storage.error)throw storage.error;
  const db=await NV.sb.from('bf_fiscal_documentos_externos').insert({
   clinica_id:clinic(),criado_por:NV.sessao.user.id,paciente_ref:String(p.id),paciente_nome:p.nome,
   chave_acesso:key||null,numero_nfse:val('bfx-ext-number')||null,
   origem:val('bfx-ext-origin')||'portal_oficial',pdf_storage_path:path,situacao_validacao:'nao_verificada'
  });
  if(db.error)throw db.error;
  toast('PDF da nota anexado. A autenticidade não foi validada pelo BlackFlow.');render();
 }catch(e){notify(e)}
};
window.bfxWhatsAppDanfse=async function(docId){
 try{
  await ensureAuthorized();
  const r=await NV.sb.from('bf_fiscal_documentos_externos')
    .select('id,paciente_ref,paciente_nome,chave_acesso,numero_nfse,pdf_storage_path,situacao_validacao')
    .eq('id',docId).eq('clinica_id',clinic()).single();
  if(r.error)throw r.error;const d=r.data;
  const p=S.pacientes.find(x=>String(x.id)===String(d.paciente_ref));
  if(!p?.celular)throw Error('Cadastre o WhatsApp do tomador na ficha.');
  const fileResp=await NV.sb.storage.from('bf-nfse-documentos').download(d.pdf_storage_path);
  if(fileResp.error)throw fileResp.error;
  const pdf=new File([fileResp.data],'danfse_'+String(d.numero_nfse||'documento').replace(/[^A-Za-z0-9_-]/g,'')+'.pdf',{type:'application/pdf'});
  const link=d.chave_acesso?' https://www.nfse.gov.br/consultapublica/?chave='+encodeURIComponent(d.chave_acesso)+'&tpc=1':'';
  const message='Olá, '+(d.paciente_nome||p.nome)+'. Segue o documento fiscal da clínica, obtido no portal de emissão. Confira a autenticidade no Portal Nacional da NFS-e.'+link;
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pdf]}))){
    await navigator.share({files:[pdf],text:message,title:'NFS-e / DANFSe'});return;
  }
  download(pdf.name,fileResp.data);
  window.open(waLink(p.celular,message+' Anexe o PDF baixado nesta conversa.'),'_blank','noopener,noreferrer');
  toast('Arquivo baixado. Anexe-o manualmente ao WhatsApp.');
 }catch(e){if(e?.name!=='AbortError')notify(e)}
};

})();
