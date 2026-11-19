/* BlackFlow 1.12.0: receituarios PDF personalizados, individuais e privados. */
(function(){
'use strict';
if(typeof render!=='function'||typeof vConfig!=='function'||typeof menuItens!=='function')return;
const segments=['podologia','odontologia','biomedicina'];
const scope=()=>segments.includes(S.config.segmento);
const cid=()=>NV.clinicaId,uid=()=>NV.sessao&&NV.sessao.user&&NV.sessao.user.id;
const seg=()=>S.config.segmento;
const escH=v=>esc(String(v==null?'':v));
const field=(i,n,v='',type='text')=>'<label style="display:block;flex:1;min-width:175px"><small>'+escH(n)+'</small><input class="inp" id="'+i+'" type="'+type+'" value="'+escH(v)+'" style="width:100%"></label>';
const row=v=>'<div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0">'+v+'</div>';
const card=(name,contents)=>'<div class="card" style="margin:12px 0"><h3>'+escH(name)+'</h3>'+contents+'</div>';
const note=s=>'<div class="note" style="margin:10px 0">'+s+'</div>';
const btn=(title,action)=>'<button class="btn sm" onclick="'+action+'">'+escH(title)+'</button>';
const choice=(id,items)=>'<select id="'+id+'" class="inp" style="width:100%">'+items.map(x=>'<option value="'+escH(x[0])+'">'+escH(x[1])+'</option>').join('')+'</select>';
const read=id=>document.getElementById(id)?.value?.trim()||'';
const person=id=>(S.pacientes||[]).find(p=>String(p.id)===String(id));
const fail=e=>toast('Não foi possível concluir: '+String(e&&e.message||e).slice(0,190));
const zone=html=>{const x=document.getElementById('bfrec-zone');if(x)x.innerHTML=html;};
const BUCKET='bf-receituarios';
/* O QR consulta um registro; não valida assinatura digital ou receituário controlado. */
const BF_VERIFY_URL='https://blackflow.app.br/validar/receita/';
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function hash256(bytes){return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));}
function newVerificationToken(){return toHex(crypto.getRandomValues(new Uint8Array(32)));}
function qrAsPng(url){
 if(typeof qrcode!=='function')throw Error('Biblioteca QR indisponível. Documento não gerado.');
 const qr=qrcode(0,'M');qr.addData(url);qr.make();
 const step=5,quiet=4,count=qr.getModuleCount(),size=(count+quiet*2)*step;
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Falha ao montar QR Code.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.fillStyle='#000';
 for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))ctx.fillRect((x+quiet)*step,(y+quiet)*step,step,step);
 return canvas.toDataURL('image/png');
}
let model=null,docs=[],authorized=false;
async function list(table,cols,filters={},sort=''){
 let q=NV.sb.from(table).select(cols);Object.entries(filters).forEach(([k,v])=>q=q.eq(k,v));
 if(sort)q=q.order(sort,{ascending:false});const r=await q;if(r.error)throw r.error;return r.data||[];
}
async function allowed(){
 if(!NV.sb||!NV.sessao||!cid()||!uid())throw Error('Entre na conta da clínica.');
 const r=await NV.sb.rpc('bf_receituario_pode_emitir',{c:cid(),s:seg()});if(r.error)throw r.error;
 return r.data===true;
}
async function refresh(){
 authorized=await allowed();if(!authorized){model=null;docs=[];return;}
 const x=await Promise.all([
  list('bf_receituario_modelos','*',{clinica_id:cid(),user_id:uid(),segmento:seg()}),
  list('bf_receituario_documentos','id,paciente_ref,paciente_nome,tipo,status,pdf_rascunho_path,pdf_assinado_path,verificacao_token_hash,criado_em',{clinica_id:cid(),user_id:uid(),segmento:seg()},'criado_em')
 ]);model=x[0][0]||null;docs=x[1];
}
async function pdfLibrary(){
 if(window.PDFLib)return window.PDFLib;
 await new Promise((resolve,reject)=>{
  const old=document.querySelector('script[data-bfpdf]');if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}
  const e=document.createElement('script');e.src='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';e.dataset.bfpdf='1';
  e.onload=resolve;e.onerror=()=>reject(Error('Não foi possível carregar a biblioteca PDF.'));document.head.appendChild(e);
 });
 if(!window.PDFLib)throw Error('Biblioteca PDF não disponível.');return window.PDFLib;
}
async function validPDF(file){
 if(!file||file.size<100||file.size>15728640||!file.name.toLowerCase().endsWith('.pdf'))throw Error('PDF inválido ou acima de 15 MB.');
 if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('Cabeçalho do PDF inválido.');
 const lib=await pdfLibrary();const d=await lib.PDFDocument.load(await file.arrayBuffer());
 if(!d.getPageCount())throw Error('PDF sem páginas.');
}
async function upload(file,name){const r=await NV.sb.storage.from(BUCKET).upload(name,file,{upsert:false,contentType:'application/pdf'});if(r.error)throw r.error;}
async function downloadPDF(name){const r=await NV.sb.storage.from(BUCKET).download(name);if(r.error)throw r.error;return r.data;}
const path=kind=>cid()+'/'+uid()+'/'+kind+'/'+crypto.randomUUID()+'.pdf';
const safeName=x=>String(x||'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,50);
const warnings=()=>seg()==='odontologia'?'Receitas sujeitas a controle especial devem seguir a Anvisa e os serviços oficiais do CFO.':seg()==='biomedicina'?'Prescrição restrita à habilitação profissional e às normas CFBM/Anvisa; não abrange tratamento indiscriminado de doenças ou deficiência vitamínica.':'Em Podologia, utilize orientações e encaminhamentos; o sistema não autoriza prescrição de medicamentos.';
const configLink=()=>btn('Configurar modelo PDF',"UI.cfgTab='receituario';go('config')");
async function config(){
 try{
  await refresh();if(!authorized){zone(note('Este usuário ainda não possui autorização profissional. Em Podologia, o administrador pode autorizar membros da equipe; em Odontologia e Biomedicina, cadastre o profissional habilitado.'));await renderAdmin();return;}
  const m=model||{};
  zone(note('O PDF é individual do profissional. Não é um certificado digital nem uma assinatura. '+escH(warnings()))+
   card('Identidade visual do receituário',
    '<p class="sub">Anexe seu PDF de papel timbrado em branco. O conteúdo será inserido sobre a primeira página, a partir da margem configurada.</p>'+
    row(field('bfrec-name','Nome completo',m.profissional_nome||'')+field('bfrec-reg','Registro/identificação profissional',m.identificacao_profissional||''))+
    row(field('bfrec-top','Margem superior em pontos',m.margem_superior||140,'number')+field('bfrec-bottom','Margem inferior em pontos',m.margem_inferior||65,'number'))+
    '<p><label><small>Escolha seu PDF personalizado (até 15 MB)</small><input class="inp" type="file" accept=".pdf,application/pdf" id="bfrec-model-file" style="width:100%"></label></p>'+
    (m.pdf_path?'<p><small>Modelo atualmente salvo.</small></p>':'<p><small>Nenhum modelo salvo.</small></p>')+
    btn('Salvar modelo','bfRecSaveModel()')+' '+(m.pdf_path?btn('Baixar modelo','bfRecPreview()'):'')
   ));
  await renderAdmin();
 }catch(e){fail(e);zone(note(escH(e.message||e)));}
}

async function renderAdmin(){
 if(NV.papel!=='admin')return;
 try{
  const members=await list('membros','user_id,nome,papel',{clinica_id:cid()});
  const authorizations=seg()==='podologia'?
   await list('bf_receituario_autorizacoes','user_id,ativo',{clinica_id:cid(),segmento:seg()}):
   await list('bf_profissionais','user_id,ativo,nome,conselho,inscricao',{clinica_id:cid(),segmento:seg()});
  const options=members.map(m=>[m.user_id,m.nome||'Usuário '+String(m.user_id).slice(0,8)]);
  const selectId='bfrec-member';
  let html='';
  if(seg()==='podologia'){
   html='<p class="sub">O administrador pode liberar membros cadastrados para criar orientações, sem conceder autorização para prescrever medicamentos.</p>'+
      '<label><small>Membro da clínica</small>'+choice(selectId,options)+'</label>'+
      '<p>'+btn('Autorizar membro',"bfRecGrantMember(true)")+' '+btn('Revogar autorização',"bfRecGrantMember(false)")+'</p>';
  }else{
   html='<p class="sub">Cadastre o profissional habilitado, vinculado ao login dele. Confirme documentalmente a inscrição e as habilitações no CRO/CRBM antes de autorizar uso.</p>'+
    '<label><small>Login do profissional</small>'+choice(selectId,options)+'</label>'+
    row(field('bfrec-pro-name','Nome profissional')+field('bfrec-pro-reg','Número do conselho')+field('bfrec-pro-uf','UF do conselho'))+
    '<p>'+btn('Cadastrar e ativar',"bfRecRegisterProfessional()")+'</p>';
  }
  html+=authorizations.length?authorizations.map(a=>'<div class="row"><span>'+escH(members.find(m=>m.user_id===a.user_id)?.nome||a.nome||'Profissional')+
    ' — '+(a.ativo?'Ativo':'Inativo')+'</span>'+
    (seg()==='podologia'?'':btn(a.ativo?'Desativar':'Ativar',"bfRecToggleProfessional('"+a.user_id+"',"+(!a.ativo)+")"))+'</div>').join(''):'<p class="sub">Nenhuma autorização específica cadastrada.</p>';
  const holder=document.getElementById('bfrec-zone');if(holder)holder.insertAdjacentHTML('beforeend',card('Administração de acessos profissionais',html));
 }catch(e){fail(e)}
}
window.bfRecGrantMember=async function(enabled){
 try{
  if(NV.papel!=='admin'||seg()!=='podologia')throw Error('Somente administrador de Podologia.');
  const user_id=read('bfrec-member');if(!user_id)throw Error('Selecione o usuário.');
  const r=await NV.sb.from('bf_receituario_autorizacoes').upsert({
   clinica_id:cid(),user_id,segmento:'podologia',ativo:enabled,criado_por:uid()
  },{onConflict:'clinica_id,user_id,segmento'});
  if(r.error)throw r.error;toast('Autorização atualizada.');config();
 }catch(e){fail(e)}
};
window.bfRecRegisterProfessional=async function(){
 try{
  if(NV.papel!=='admin'||seg()==='podologia')throw Error('Somente administrador do segmento clínico.');
  const user_id=read('bfrec-member'),nome=read('bfrec-pro-name'),inscricao=read('bfrec-pro-reg'),uf=read('bfrec-pro-uf').toUpperCase();
  if(!user_id||nome.length<4||!inscricao||!/^[A-Z]{2}$/.test(uf))throw Error('Confira usuário, nome, registro e UF.');
  const r=await NV.sb.from('bf_profissionais').upsert({
   clinica_id:cid(),user_id,segmento:seg(),nome,inscricao,uf,conselho:seg()==='odontologia'?'CRO':'CRBM',habilitacoes:[],ativo:true
  },{onConflict:'clinica_id,user_id,segmento'});
  if(r.error)throw r.error;toast('Profissional cadastrado. Verifique documentos de habilitação.');config();
 }catch(e){fail(e)}
};
window.bfRecToggleProfessional=async function(userId,ativo){
 try{
  if(NV.papel!=='admin')throw Error('Acesso reservado ao administrador.');
  const r=await NV.sb.from('bf_profissionais').update({ativo}).eq('clinica_id',cid()).eq('user_id',userId).eq('segmento',seg());
  if(r.error)throw r.error;toast('Acesso profissional atualizado.');config();
 }catch(e){fail(e)}
};

window.bfRecSaveModel=async function(){
 try{
  if(!await allowed())throw Error('Sem autorização profissional.');
  const file=document.getElementById('bfrec-model-file')?.files?.[0];
  const name=read('bfrec-name'),top=Number(read('bfrec-top')||140),bottom=Number(read('bfrec-bottom')||65);
  if(name.length<4||top<60||top>330||bottom<30||bottom>180)throw Error('Confira o nome e margens.');
  if(!file&&!model)throw Error('Selecione o PDF em branco.');
  let filePath=model?.pdf_path;
  if(file){await validPDF(file);filePath=path('modelos');await upload(file,filePath);}
  const record={clinica_id:cid(),user_id:uid(),segmento:seg(),profissional_nome:name,identificacao_profissional:read('bfrec-reg')||null,pdf_path:filePath,margem_superior:top,margem_inferior:bottom,atualizado_em:new Date().toISOString()};
  const r=await NV.sb.from('bf_receituario_modelos').upsert(record,{onConflict:'clinica_id,user_id,segmento'}).select();if(r.error)throw r.error;
  model=r.data[0];toast('Modelo de receituário salvo para este profissional.');config();
 }catch(e){fail(e)}
};
window.bfRecPreview=async()=>{try{if(!model)throw Error('Modelo não localizado.');download('modelo_receituario.pdf',await downloadPDF(model.pdf_path));}catch(e){fail(e)}};
function wrapText(text,font,size,width){
 const lines=[];for(const paragraph of String(text).split(/\r?\n/)){
  if(!paragraph.trim()){lines.push('');continue;}
  let line='';for(const word of paragraph.replace(/[^\u0020-\u00FF]/g,' ').trim().split(/\s+/)){
   const proposed=line?line+' '+word:word;
   if(font.widthOfTextAtSize(proposed,size)<=width){line=proposed;continue;}
   if(line)lines.push(line);line='';let part='';
   for(const c of word){if(part&&font.widthOfTextAtSize(part+c,size)>width){lines.push(part);part=c;}else part+=c;}
   line=part;
  }if(line)lines.push(line);
 }return lines;
}
async function generate(template,patient,text,kind,verificationUrl){
 const lib=await pdfLibrary(),base=await lib.PDFDocument.load(await template.arrayBuffer());
 const out=await lib.PDFDocument.create(),font=await out.embedFont(lib.StandardFonts.Helvetica),bold=await out.embedFont(lib.StandardFonts.HelveticaBold);
 const qrImage=await out.embedPng(await (await fetch(qrAsPng(verificationUrl))).arrayBuffer());
 let page,y;
 async function newPage(){const [copy]=await out.copyPages(base,[0]);page=out.addPage(copy);y=page.getHeight()-Number(model.margem_superior||140);
  page.drawText('RASCUNHO - NAO ASSINADO',{x:Math.max(26,page.getWidth()-220),y:page.getHeight()-40,font:bold,size:9,color:lib.rgb(.72,.14,.14)});
 }
 await newPage();const margin=55,max=page.getWidth()-2*margin;
 const header=['Paciente: '+patient.nome,'Data: '+new Date().toLocaleDateString('pt-BR'),'Tipo: '+kind,'Profissional: '+model.profissional_nome,'Identificacao: '+(model.identificacao_profissional||'')];
 for(const line of header){for(const l of wrapText(line,font,10,max)){y-=16;page.drawText(l,{x:margin,y,font,size:10,color:lib.rgb(.12,.13,.17)});}}
 y-=20;const lines=wrapText(text,font,11,max);if(lines.length>450)throw Error('Conteúdo muito extenso.');
 for(const l of lines){if(y<Number(model.margem_inferior||65)+20)await newPage();if(l)page.drawText(l,{x:margin,y,font,size:11,color:lib.rgb(.12,.13,.17)});y-=15;}
 if(y<Number(model.margem_inferior||65)+30)await newPage();
 y-=20;page.drawText('Documento para revisao e assinatura profissional.',{x:margin,y,font,size:9,color:lib.rgb(.56,.2,.2)});
 if(y<Number(model.margem_inferior||65)+130)await newPage();
 y-=115;
 page.drawImage(qrImage,{x:margin,y,width:98,height:98});
 page.drawText('Consulta do registro via QR Code',{x:margin+108,y:y+72,font:bold,size:9,color:lib.rgb(.12,.13,.17)});
 page.drawText('Nao comprova assinatura digital.',{x:margin+108,y:y+54,font,size:8,color:lib.rgb(.5,.18,.18)});
 page.drawText('Receitas controladas: sistema oficial.',{x:margin+108,y:y+40,font,size:8,color:lib.rgb(.5,.18,.18)});
 return new Blob([await out.save()],{type:'application/pdf'});
}
async function home(){
 try{await refresh();if(!authorized){zone(note('Este perfil não está autorizado a produzir receituários. Solicite cadastro ou autorização profissional.'));return;}
  let body=note('Documentos de saúde são confidenciais. '+escH(warnings())+' O PDF gerado será um rascunho sem assinatura; receitas controladas exigem fluxo oficial.')+
   '<p class="sub"><a href="https://validar.iti.gov.br/" target="_blank" rel="noopener noreferrer">Conferir assinatura eletrônica no VALIDAR (ITI)</a> · '+
   '<a href="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-eletronico" target="_blank" rel="noopener noreferrer">Regras e QR oficiais de receituários controlados (Anvisa)</a></p>';
  body+=card('Modelo individual',model?'<b>'+escH(model.profissional_nome)+'</b> — '+escH(model.identificacao_profissional||'')+'<p>'+configLink()+'</p>':note('Ainda não há PDF de receituário cadastrado.')+configLink());
  if(model){
   body+=card('Novo documento',
    '<label><small>Paciente</small>'+choice('bfrec-paciente',(S.pacientes||[]).map(p=>[p.id,p.nome]))+'</label>'+
    '<label style="display:block;margin:12px 0"><small>Tipo de documento</small>'+choice('bfrec-tipo',seg()==='podologia'?[['orientacoes','Orientações'],['encaminhamento','Encaminhamento']]:[['receituario_simples','Receituário comum (rascunho)'],['orientacoes','Orientações'],['encaminhamento','Encaminhamento']])+'</label>'+
    '<label><small>Texto para inserir no papel timbrado</small><textarea id="bfrec-texto" maxlength="8000" class="inp" style="width:100%;min-height:180px"></textarea></label>'+
    '<p><label><input type="checkbox" id="bfrec-responsavel"> Declaro que o conteúdo foi revisado por mim e está dentro da minha competência profissional.</label></p>'+
    btn('Gerar rascunho PDF','bfRecGenerate()'));
  }
  const listHtml=docs.map(d=>'<div class="row" style="flex-wrap:wrap"><span><b>'+escH(d.paciente_nome)+'</b><br><small>'+escH(d.tipo)+' — '+escH(new Date(d.criado_em).toLocaleDateString('pt-BR'))+' — '+escH(d.status==='assinado_externo_nao_validado'?'PDF recebido — assinatura não verificada':d.status==='rascunho'?'Rascunho sem assinatura':d.status)+(d.verificacao_token_hash?' — QR de consulta no PDF':' — sem QR (documento antigo)')+'</small></span><span>'+btn('Baixar rascunho',"bfRecDownload('"+d.id+"',false)")+' '+(d.pdf_assinado_path?btn('Enviar PDF pelo WhatsApp',"bfRecShare('"+d.id+"')"):btn('Anexar PDF assinado',"bfRecSignPrompt('"+d.id+"')"))+'</span></div>').join('');
  body+=card('Consultar numeração oficial de receita controlada (SNCR)',
   '<p class="sub">Somente números efetivamente atribuídos pela Anvisa. Esta consulta não emite receita nem substitui assinatura digital qualificada.</p>'+
   '<label><small>Numeração SNCR (0000.0-00.0000000)</small><input type="text" id="bfrec-sncr-numero" class="inp" placeholder="0000.0-00.0000000" maxlength="17"></label>'+
   '<p>'+btn('Consultar no SNCR da Anvisa','bfRecAbrirSNCR()')+'</p>');
  body+=card('Documentos deste profissional',listHtml||note('Nenhum documento criado.'));
  zone(body);
 }catch(e){fail(e);zone(note(escH(e.message||e)));}
}
window.bfRecAbrirSNCR=function(){
 const numero=read('bfrec-sncr-numero');
 if(!/^\d{4}\.\d-\d{2}\.\d{7}$/.test(numero))return toast('Informe um número SNCR no formato 0000.0-00.0000000.');
 window.open('https://sncr.anvisa.gov.br/receita/consultar?numero='+encodeURIComponent(numero),'_blank','noopener,noreferrer');
};
window.bfRecGenerate=async()=>{
 try{
  if(!await allowed())throw Error('Sem autorização.');if(!model)throw Error('Cadastre o PDF em Configurações.');
  if(!document.getElementById('bfrec-responsavel')?.checked)throw Error('Confirme a responsabilidade profissional.');
  const p=person(read('bfrec-paciente')),tipo=read('bfrec-tipo'),texto=read('bfrec-texto');
  if(!p||texto.length<5||texto.length>8000)throw Error('Informe o paciente e o texto.');
  const token=newVerificationToken();
  const verifyUrl=BF_VERIFY_URL+'?token='+encodeURIComponent(token);
  const pdf=await generate(await downloadPDF(model.pdf_path),p,texto,tipo,verifyUrl);
  const pdfHash=await hash256(await pdf.arrayBuffer());
  const tokenHash=await hash256(new TextEncoder().encode(token));
  const storage=path('documentos');await upload(pdf,storage);
  const rec={clinica_id:cid(),user_id:uid(),segmento:seg(),modelo_id:model.id,paciente_ref:String(p.id),paciente_nome:p.nome,tipo,texto,pdf_rascunho_path:storage,pdf_rascunho_sha256:pdfHash,verificacao_token_hash:tokenHash,status:'rascunho'};
  const r=await NV.sb.from('bf_receituario_documentos').insert(rec);if(r.error)throw r.error;
  download('rascunho_'+safeName(p.nome)+'.pdf',pdf);toast('Rascunho PDF gerado. Assine externamente antes de enviar.');home();
 }catch(e){fail(e)}
};
window.bfRecSignPrompt=id=>{
 if(!docs.some(x=>x.id===id))return;
 openModal('<h3>Documento assinado externamente</h3>'+note('Anexe somente um PDF assinado fora do BlackFlow. O sistema não valida a assinatura, o certificado ou o registro profissional.')+
  '<p class="sub">Antes de utilizar o documento como receita, consulte <a href="https://validar.iti.gov.br/" rel="noopener noreferrer" target="_blank">o validador de assinatura do ITI</a>. O QR BlackFlow confirma somente o registro.</p>'+
  '<input type="file" id="bfrec-signed-file" accept=".pdf,application/pdf" class="inp" style="width:100%">'+
  '<p><label><input type="checkbox" id="bfrec-signed-confirm"> Confirmo que o arquivo foi assinado externamente pelo profissional responsável.</label></p>'+
  '<div class="mact"><button class="btn ghost" onclick="closeModal()">Cancelar</button>'+btn('Salvar arquivo assinado',"bfRecSign('"+id+"')")+'</div>');
};
window.bfRecSign=async id=>{
 try{
  const d=docs.find(x=>x.id===id);if(!d||d.status!=='rascunho')throw Error('Documento não pode ser atualizado.');
  if(!document.getElementById('bfrec-signed-confirm')?.checked)throw Error('Confirme a assinatura externa.');
  const f=document.getElementById('bfrec-signed-file')?.files?.[0];await validPDF(f);
  const signedHash=await hash256(await f.arrayBuffer());
  const storage=path('assinados');await upload(f,storage);
  const r=await NV.sb.from('bf_receituario_documentos').update({pdf_assinado_path:storage,pdf_assinado_sha256:signedHash,status:'assinado_externo_nao_validado',assinatura_declarada_em:new Date().toISOString()}).eq('id',id).eq('clinica_id',cid()).eq('user_id',uid()).select();
  if(r.error)throw r.error;if(!r.data?.length)throw Error('O banco não confirmou a atualização.');
  closeModal();toast('Arquivo anexado. Assinatura não validada pelo BlackFlow.');home();
 }catch(e){fail(e)}
};
window.bfRecDownload=async(id,signed)=>{try{const d=docs.find(x=>x.id===id);if(!d)throw Error('Documento não encontrado.');download('documento_'+safeName(d.paciente_nome)+'.pdf',await downloadPDF(signed?d.pdf_assinado_path:d.pdf_rascunho_path));}catch(e){fail(e)}};
window.bfRecShare=async id=>{
 try{
  const d=docs.find(x=>x.id===id);if(!d?.pdf_assinado_path)throw Error('Anexe primeiro a versão assinada externamente.');
  const p=person(d.paciente_ref);if(!p?.celular)throw Error('Cadastre o WhatsApp do paciente.');
  const blob=await downloadPDF(d.pdf_assinado_path),file=new File([blob],'receituario_'+safeName(d.paciente_nome)+'.pdf',{type:'application/pdf'});
  const msg='Olá, '+d.paciente_nome+'. Segue o documento da clínica '+(S.config.clinica||'')+'. Assinatura digital não verificada pelo BlackFlow; confira em https://validar.iti.gov.br/ caso o documento exija assinatura eletrônica.';
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'Documento profissional',text:msg});return;}
  download(file.name,blob);window.open(waLink(p.celular,msg+'\nAnexe o PDF baixado nesta conversa.'),'_blank','noopener,noreferrer');
  toast('PDF baixado. Anexe-o manualmente na conversa do WhatsApp.');
 }catch(e){if(e?.name!=='AbortError')fail(e)}
};
const priorMenu=menuItens;
menuItens=function(){const old=priorMenu();if(!scope()||!Array.isArray(old)||UI.auth)return old;
 const cleaned=old.filter(x=>x[0]!=='blackpay'&&x[0]!=='receituario');cleaned.push(['receituario','Receituário','file']);return menuOrdem(cleaned);
};
const priorConfig=vConfig;
vConfig=function(){
 const original=priorConfig();if(!scope())return original;
 const active=UI.cfgTab==='receituario';
 const tab='<button class="btn '+(active?'':'ghost')+' sm" onclick="UI.cfgTab=\'receituario\';render()">Modelo de receituário</button>';
 if(active){const tabs=CFG_ABAS.map(([id,name])=>'<button class="btn ghost sm" onclick="UI.cfgTab=\''+id+'\';render()">'+escH(name)+'</button>').join('');
  return '<div class="page" style="max-width:1000px"><div class="phead"><h1>Configurações</h1></div><div class="filters" style="flex-wrap:wrap">'+tabs+tab+'</div><div id="bfrec-zone">'+note('Carregando modelo...')+'</div></div>';
 }
 const start=original.indexOf('<div class="filters"'),end=original.indexOf('</div>',start);
 return start>=0&&end>=0?original.slice(0,end)+tab+original.slice(end):original;
};
const priorRender=render;
render=function(){
 if(UI.view==='receituario'){
  if(NV.ativa&&UI.auth)return priorRender();if(!scope()){UI.view='agenda';return priorRender();}
  document.getElementById('app').innerHTML=shell('<div class="page" style="max-width:1120px"><div class="phead"><div><h1>Receituário</h1><p class="sub">Documento com PDF próprio do profissional, histórico e compartilhamento manual por WhatsApp.</p></div></div><div id="bfrec-zone">'+note('Carregando documentos...')+'</div></div>');
  home().catch(fail);return;
 }
 const r=priorRender();if(UI.view==='config'&&UI.cfgTab==='receituario'&&scope())config().catch(fail);return r;
};
window.bfNfseWhatsApp=async notaId=>{
 try{
  if(!NV.sb||!cid())throw Error('Entre na clínica.');
  const r=await NV.sb.from('bf_fiscal_notas').select('id,clinica_id,paciente_ref,tomador_nome,status,chave_acesso,numero_nfse').eq('id',notaId).eq('clinica_id',cid()).single();
  if(r.error)throw r.error;const n=r.data;
  if(n.status!=='autorizada'||!n.chave_acesso||!n.numero_nfse)throw Error('Nota ainda não autorizada. Rascunhos não podem ser enviados como NFS-e.');
  const p=person(n.paciente_ref);if(!p?.celular)throw Error('Cadastre o WhatsApp do tomador na ficha.');
  const url='https://www.nfse.gov.br/consultapublica/?chave='+encodeURIComponent(n.chave_acesso)+'&tpc=1';
  const msg='Olá, '+(n.tomador_nome||p.nome)+'. Sua NFS-e nº '+n.numero_nfse+' está disponível para consulta: '+url+'\nChave: '+n.chave_acesso;
  window.open(waLink(p.celular,msg),'_blank','noopener,noreferrer');
 }catch(e){fail(e)}
};
})();
