/* BlackFlow 1.11.0 - módulos clínicos e fiscal. Operações respeitam RLS do Supabase. */
(function(){
"use strict";
if(typeof SEGMENTOS==='undefined')return;
SEGMENTOS.odontologia={nome:'Odontologia',pessoa:'Paciente',pessoas:'Pacientes',desc:'Prontuários, odontogramas, exames, convênios e rastreabilidade de materiais.'};
SEGMENTOS.biomedicina={nome:'Biomedicina',pessoa:'Paciente',pessoas:'Pacientes',desc:'Biomedicina Estética: procedimentos, prontuários, imagens e controle de produtos.'};
const views=['bfclinico','bfcatalogo','bfconvenios','bflotes','bffiscal'];
const clinical=()=>['odontologia','biomedicina'].includes(S.config.segmento);
const admin=()=>NV.papel==='admin'||!!NV.mestre;
const cn=()=>NV.clinicaId;
const h=s=>esc(String(s??''));
const get=id=>document.getElementById(id)?.value?.trim()||'';
const choose=(id,vals)=>'<select id="'+id+'" class="inp" style="min-width:180px;max-width:100%">'+vals.map(v=>'<option value="'+h(v[0])+'">'+h(v[1])+'</option>').join('')+'</select>';
const field=(id,label,value='',type='text')=>'<label style="display:inline-block;min-width:170px;flex:1"><small>'+h(label)+'</small><input class="inp" id="'+id+'" value="'+h(value)+'" type="'+type+'" style="width:100%"></label>';
const flex=x=>'<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:8px 0">'+x+'</div>';
const button=(title,js)=>'<button class="btn sm" onclick="'+js+'">'+h(title)+'</button>';
const note=s=>'<div class="note" style="margin:12px 0">'+s+'</div>';
const box=(title,content)=>'<div class="card" style="margin:12px 0"><h3>'+h(title)+'</h3>'+content+'</div>';
const body=s=>{const el=document.getElementById('bfcontent');if(el)el.innerHTML=s;};
const err=e=>toast('Não foi possível concluir: '+String(e?.message||e).slice(0,160));
const patientLabel=x=>S.pacientes.find(p=>String(p.id)===String(x))?.nome||String(x);
async function sel(t,cols='*',where={},order=''){
 let q=NV.sb.from(t).select(cols);Object.entries(where).forEach(([k,v])=>q=q.eq(k,v));
 if(order)q=q.order(order,{ascending:false});
 const r=await q;if(r.error)throw r.error;return r.data||[];
}
async function add(t,item){const r=await NV.sb.from(t).insert(item).select();if(r.error)throw r.error;return r.data||[];}
async function update(t,item,where){let q=NV.sb.from(t).update(item);Object.entries(where).forEach(([k,v])=>q=q.eq(k,v));const r=await q.select();if(r.error)throw r.error;return r.data||[];}
const patientOptions=()=>S.pacientes.map(p=>[p.id,p.nome||'Paciente']);
const rows=(headers,data)=>'<div style="overflow:auto"><table class="tbl"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+data.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const who=()=>NV.sessao?.user?.id;
window.bfCatalogImport=async function(){
 try{
  const l=await sel('bf_catalogo_servicos','codigo,categoria,nome',{segmento:S.config.segmento});
  const names=new Set(S.servicos.map(s=>s.nome?.toLowerCase()));
  let count=0;
  l.forEach(x=>{if(names.has(x.nome.toLowerCase()))return;
   S.servicos.push({id:uid(),nome:x.nome,categoria:x.categoria,codigoCatalogo:x.codigo,preco:0,duracao:30,ativo:true,comissao:''});
   names.add(x.nome.toLowerCase());count++;
  });
  if(count)save();
  toast(count+' procedimentos adicionados à tabela da clínica. Configure seus preços.');
  render();
 }catch(e){err(e)}
};
async function catalog(){
 if(!clinical())return body(note('Disponível para Odontologia e Biomedicina.'));
 const l=await sel('bf_catalogo_servicos','codigo,categoria,nome,observacao',{segmento:S.config.segmento});
 const groups=[...new Set(l.map(x=>x.categoria))];
 body(note('Catálogo inicial: cada serviço exige habilitação profissional e conformidade com as normas dos conselhos. Preços e tempos devem ser definidos pela clínica.')+
 box('Serviços do segmento — '+l.length,button('Incluir todos na tabela de preços','bfCatalogImport()')+
 groups.map(cat=>'<details style="border-top:1px solid #ddd;padding:8px"><summary><b>'+h(cat)+'</b> ('+l.filter(x=>x.categoria===cat).length+')</summary>'+l.filter(x=>x.categoria===cat).map(x=>'<p>'+h(x.nome)+'</p>').join('')+'</details>').join('')));
}
async function clinicalHome(){
 if(!clinical())return body(note('Disponível somente para os segmentos clínicos.'));
 const professionals=await sel('bf_profissionais','id,nome,user_id,conselho,inscricao,uf,ativo',{clinica_id:cn(),segmento:S.config.segmento});
 const active=professionals.some(p=>p.user_id===who()&&p.ativo);
 let display='';
 if(!active){
  display+=note('<b>Acesso clínico restrito.</b> Cadastre o profissional vinculado à conta antes de visualizar prontuários. O cadastro informado deve ser validado documentalmente pelo responsável da clínica.');
  if(admin())display+=box('Cadastro de profissional',flex(field('bfnome','Nome completo')+field('bfregistro','Número '+(S.config.segmento==='odontologia'?'CRO':'CRBM'))+field('bfuf','UF do conselho'))+
    field('bfhab','Habilitações registradas, separadas por vírgula')+button('Cadastrar','bfSaveProfessional()'));
  return body(display);
 }
 const l=await sel('bf_prontuarios','id,paciente_ref,segmento,atualizado_em',{clinica_id:cn(),segmento:S.config.segmento},'atualizado_em');
 display+=note('Registros clínicos são sigilosos, têm controle de acesso e histórico de alterações. Os documentos são rascunhos sujeitos à revisão do profissional.');
 display+=box('Prontuários — '+l.length,flex(choose('bfpatient',patientOptions())+button('Abrir / criar','bfOpenPatient()'))+
 rows(['Paciente','Atualizado','Ação'],l.map(p=>[h(patientLabel(p.paciente_ref)),h(new Date(p.atualizado_em).toLocaleDateString('pt-BR')),button('Abrir',"bfShowPatient('"+p.id+"')")])));
 body(display);
}
window.bfSaveProfessional=async function(){
 if(!admin())return toast('Apenas administradores.');
 try{
  const nome=get('bfnome'),inscricao=get('bfregistro'),uf=get('bfuf').toUpperCase();
  if(nome.length<4||!inscricao||!/^[A-Z]{2}$/.test(uf))return toast('Confira nome, CRM/registro e UF.');
  await add('bf_profissionais',{clinica_id:cn(),user_id:who(),segmento:S.config.segmento,nome,inscricao,uf,
    conselho:S.config.segmento==='odontologia'?'CRO':'CRBM',habilitacoes:get('bfhab').split(',').map(x=>x.trim()).filter(Boolean)});
  toast('Profissional cadastrado. Documentos de habilitação devem ser conferidos.');render();
 }catch(e){err(e)}
};
window.bfOpenPatient=async function(){
 try{
  const id=get('bfpatient');if(!id)return toast('Escolha o paciente.');
  let l=await sel('bf_prontuarios','id',{clinica_id:cn(),segmento:S.config.segmento,paciente_ref:id});
  if(!l.length)l=await add('bf_prontuarios',{clinica_id:cn(),segmento:S.config.segmento,paciente_ref:id,anamnese:{}});
  await window.bfShowPatient(l[0].id);
 }catch(e){err(e)}
};
window.bfShowPatient=async function(id){
 try{
  const p=(await sel('bf_prontuarios','id,paciente_ref,segmento,anamnese',{id,clinica_id:cn()}))[0];
  if(!p)return toast('Prontuário não encontrado.');
  const [ev,procedures,files,teeth]=await Promise.all([
   sel('bf_evolucoes','conteudo,intercorrencia,criado_em',{prontuario_id:id},'criado_em'),
   sel('bf_procedimentos_realizados','codigo_servico,descricao,realizado_em',{prontuario_id:id},'realizado_em'),
   sel('bf_anexos_clinicos','tipo,nome_arquivo,storage_path,criado_em',{prontuario_id:id},'criado_em'),
   p.segmento==='odontologia'?sel('bf_odontogramas','dentes,observacao,criado_em',{prontuario_id:id},'criado_em'):Promise.resolve([])
  ]);
  const an=p.anamnese||{};
  const catalog=await sel('bf_catalogo_servicos','codigo,nome,categoria',{segmento:p.segmento});
  let output=box(patientLabel(p.paciente_ref),button('Voltar à lista',"go('bfclinico')")+
   note('Anotações salvas são rastreáveis. Evite inserir informações clínicas em documentos fiscais.'));
  output+=box('Anamnese',flex(field('bfalergias','Alergias',an.alergias)+field('bfmeds','Medicamentos em uso',an.medicamentos))+
   '<textarea id="bfanobs" data-bf-ditado spellcheck="false" lang="pt-BR" class="inp" style="width:100%;min-height:75px" placeholder="Histórico clínico">'+h(an.historico||'')+'</textarea>'+
   button('Salvar anamnese',"bfSaveAnamnesis('"+id+"')"));
  output+=box('Evolução clínica','<textarea id="bfevol" data-bf-ditado spellcheck="false" lang="pt-BR" class="inp" style="width:100%;min-height:80px"></textarea>'+
   '<label><input id="bfintercorrencia" type="checkbox"> Intercorrência</label> '+
   button('Registrar evolução',"bfSaveEvolution('"+id+"')")+
   rows(['Data','Conteúdo'],ev.map(x=>[h(new Date(x.criado_em).toLocaleString('pt-BR')),h(x.conteudo)])));
  output+=box('Procedimentos',flex(choose('bfproc',catalog.map(x=>[x.codigo,x.nome]))+field('bfprocdesc','Descrição clínica'))+
   button('Registrar procedimento',"bfSaveProcedure('"+id+"')")+
   rows(['Data','Serviço','Observação'],procedures.map(x=>[h(new Date(x.realizado_em).toLocaleDateString('pt-BR')),
    h(catalog.find(c=>c.codigo===x.codigo_servico)?.nome||x.codigo_servico),h(x.descricao)])));
  if(p.segmento==='odontologia'){
   const teethNumbers=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
   output+=box('Odontograma — numeração FDI',flex(choose('bfdente',teethNumbers.map(n=>[n,String(n)]))+
    choose('bfcondicao',[['sem_alteracoes','Sem alteração'],['carie','Cárie'],['restauracao','Restauração'],['ausente','Ausente'],['endodontia','Endodontia'],['implante','Implante'],['protese','Prótese'],['planejado','Tratamento planejado']])+
    field('bfdenteobs','Observação'))+button('Registrar marcação',"bfSaveTooth('"+id+"')")+
    rows(['Data','Marcações'],teeth.map(x=>[h(new Date(x.criado_em).toLocaleDateString('pt-BR')),h(JSON.stringify(x.dentes))])));
  }
  output+=box('Imagens e exames — arquivos privados',flex(choose('bftipoarquivo',[['fotografia','Fotografia'],['radiografia','Radiografia'],['dicom','DICOM'],['exame','Exame'],['outro','Outro']])+
   '<input id="bfarquivo" type="file" class="inp" accept="image/*,application/pdf,.dcm,.dicom">')+
   button('Anexar arquivo',"bfUploadFile('"+id+"')")+
   rows(['Tipo','Arquivo','Ação'],files.map(x=>[h(x.tipo),h(x.nome_arquivo),
    button('Abrir',"bfOpenFile('"+x.storage_path+"')")])));
  output+=box('Documentos em rascunho — não assinados',flex(choose('bfdoctype',[['termo','Termo'],['receituario','Receituário (rascunho)'],['atestado','Atestado (rascunho)'],['encaminhamento','Encaminhamento'],['relatorio','Relatório'],['orcamento','Orçamento']])+
   field('bfdoctitle','Título'))+'<textarea id="bfdoctext" class="inp" style="width:100%;min-height:80px"></textarea>'+
   note('Prescrições e documentos profissionais exigem revisão, competência legal e assinatura apropriada.')+
   button('Guardar rascunho',"bfSaveDocument('"+id+"')"));
  body(output);
 }catch(e){err(e)}
};
window.bfSaveAnamnesis=async id=>{try{
 await update('bf_prontuarios',{anamnese:{alergias:get('bfalergias'),medicamentos:get('bfmeds'),historico:get('bfanobs')}},{id,clinica_id:cn()});
 toast('Anamnese salva.');await bfShowPatient(id);
 }catch(e){err(e)}};
window.bfSaveEvolution=async id=>{try{
 const conteudo=get('bfevol');if(!conteudo)return toast('Descreva a evolução.');
 await add('bf_evolucoes',{clinica_id:cn(),prontuario_id:id,conteudo,intercorrencia:document.getElementById('bfintercorrencia').checked});
 toast('Evolução registrada.');await bfShowPatient(id);
 }catch(e){err(e)}};
window.bfSaveProcedure=async id=>{try{
 const codigo_servico=get('bfproc');if(!codigo_servico)return toast('Escolha o procedimento.');
 await add('bf_procedimentos_realizados',{clinica_id:cn(),prontuario_id:id,codigo_servico,descricao:get('bfprocdesc'),profissional_id:who()});
 toast('Procedimento registrado.');await bfShowPatient(id);
 }catch(e){err(e)}};
window.bfSaveTooth=async id=>{try{
 const d=get('bfdente'),estado=get('bfcondicao'),observacao=get('bfdenteobs');
 await add('bf_odontogramas',{clinica_id:cn(),prontuario_id:id,dentes:{[d]:{estado,observacao}},observacao});
 toast('Marcação registrada.');await bfShowPatient(id);
 }catch(e){err(e)}};
window.bfUploadFile=async id=>{try{
 const f=document.getElementById('bfarquivo')?.files[0];if(!f)return toast('Selecione um arquivo.');
 if(f.size>20971520)return toast('Limite de 20 MB.');
 const ext=(f.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').slice(0,8);
 const path=cn()+'/'+id+'/'+crypto.randomUUID()+'.'+ext;
 const result=await NV.sb.storage.from('bf-prontuarios').upload(path,f,{upsert:false});
 if(result.error)throw result.error;
 try{await add('bf_anexos_clinicos',{clinica_id:cn(),prontuario_id:id,tipo:get('bftipoarquivo'),nome_arquivo:f.name,storage_path:path,mime_type:f.type||'application/octet-stream'})}
 catch(e){await NV.sb.storage.from('bf-prontuarios').remove([path]);throw e}
 toast('Arquivo privado anexado.');await bfShowPatient(id);
 }catch(e){err(e)}};
window.bfOpenFile=async path=>{try{
 const r=await NV.sb.storage.from('bf-prontuarios').createSignedUrl(path,60);if(r.error)throw r.error;
 window.open(r.data.signedUrl,'_blank','noopener');
 }catch(e){err(e)}};
window.bfSaveDocument=async id=>{try{
 const titulo=get('bfdoctitle'),texto=get('bfdoctext');if(!titulo||!texto)return toast('Informe título e conteúdo.');
 await add('bf_documentos_clinicos',{clinica_id:cn(),prontuario_id:id,tipo:get('bfdoctype'),titulo,conteudo:{texto},status:'rascunho'});
 toast('Rascunho salvo (não assinado).');await bfShowPatient(id);
 }catch(e){err(e)}};
async function partners(){
 const l=await sel('bf_convenios','nome,tipo,registro_ans,ativo',{clinica_id:cn()});
 body(note('Cadastros administrativos. Autorizações, elegibilidade e faturamento TISS dependem de integração específica.')+
  box('Novo convênio ou parceria',flex(field('bfpartnername','Nome')+field('bfpartnerans','Registro ANS (quando aplicável)')+
  choose('bfpartnertype',[['convenio','Convênio'],['parceria','Parceria'],['particular','Particular']]))+
  button('Cadastrar','bfSavePartner()'))+
  box('Convênios cadastrados',rows(['Nome','Tipo','ANS'],l.map(x=>[h(x.nome),h(x.tipo),h(x.registro_ans||'—')]))));
}
window.bfSavePartner=async()=>{try{
 const nome=get('bfpartnername');if(!nome)return toast('Informe o nome.');
 await add('bf_convenios',{clinica_id:cn(),nome,registro_ans:get('bfpartnerans')||null,tipo:get('bfpartnertype')});
 toast('Convênio cadastrado.');render();
 }catch(e){err(e)}};
async function lots(){
 const l=await sel('bf_lotes','produto,numero_lote,validade,saldo,unidade',{clinica_id:cn()});
 body(box('Novo lote',flex(field('bflotproduct','Produto')+field('bflotnumber','Número do lote')+field('bflotfab','Fabricante'))+
  flex(field('bflotvalid','Validade','','date')+field('bflotcount','Quantidade','0','number')+field('bflotunit','Unidade','un'))+
  button('Cadastrar','bfSaveLot()'))+
  box('Lotes cadastrados',rows(['Produto','Lote','Validade','Saldo'],l.map(x=>[h(x.produto),h(x.numero_lote),h(x.validade||'—'),h(x.saldo)+' '+h(x.unidade)]))));
}
window.bfSaveLot=async()=>{try{
 const produto=get('bflotproduct'),numero_lote=get('bflotnumber'),saldo=Number(get('bflotcount'));
 if(!produto||!numero_lote||!Number.isFinite(saldo)||saldo<0)return toast('Confira os dados.');
 await add('bf_lotes',{clinica_id:cn(),produto,numero_lote,saldo,validade:get('bflotvalid')||null,unidade:get('bflotunit')||'un',fabricante:get('bflotfab')});
 toast('Lote cadastrado.');render();
 }catch(e){err(e)}};
async function fiscal(){
 if(!admin())return body(note('Acesso reservado à administração.'));
 const c=(await sel('bf_fiscal_config','*',{clinica_id:cn()}))[0]||{};
 const notes=await sel('bf_fiscal_notas','descricao_servico,valor,status,criado_em,numero_nfse',{clinica_id:cn()},'criado_em');
 body(note('<b>Em preparação.</b> Esta versão registra dados fiscais e rascunhos. <b>Não transmite nem autoriza NFS-e</b>. Pagamentos via Pix/cartão são independentes da emissão fiscal. A nota definitiva depende de integração nacional homologada e credenciais do emitente.')+
  box('Configuração do prestador',flex(field('bffcnpj','CNPJ (14 dígitos)',c.cnpj)+field('bffim','Inscrição municipal',c.inscricao_municipal)+field('bffibge','Código IBGE municipal',c.municipio_ibge))+
   flex(field('bffregime','Regime tributário',c.regime)+field('bffcnae','CNAE',c.cnae)+field('bffserv','Código de serviço',c.codigo_servico))+
   button('Salvar cadastro fiscal','bfSaveFiscal()'))+
  box('Novo rascunho',flex(choose('bfforigem',[['atendimento','Atendimento'],['servico','Serviço'],['pacote','Pacote'],['outro','Outro']])+
    field('bffdesc','Descrição (sem diagnóstico)')+field('bffvalor','Valor (R$)','','number'))+
   flex(field('bfftomador','Nome do tomador')+field('bffdoc','CPF/CNPJ')+
    choose('bffmeio',[['Pix','Pix'],['Cartão de crédito','Cartão de crédito'],['Cartão de débito','Cartão de débito'],['Dinheiro','Dinheiro'],['Outro','Outro']]))+
   button('Salvar rascunho','bfSaveDraft()'))+
  box('Histórico de rascunhos',rows(['Data','Descrição','Valor','Status'],notes.map(x=>[h(new Date(x.criado_em).toLocaleDateString('pt-BR')),h(x.descricao_servico),money(x.valor),h(x.status)]))));
}
window.bfSaveFiscal=async()=>{try{
 const cnpj=get('bffcnpj').replace(/\D/g,''),municipio_ibge=get('bffibge');
 if(cnpj&&cnpj.length!==14)return toast('CNPJ exige 14 dígitos.');
 if(municipio_ibge&&!/^\d{7}$/.test(municipio_ibge))return toast('Município precisa de código IBGE de 7 dígitos.');
 const r=await NV.sb.from('bf_fiscal_config').upsert({clinica_id:cn(),cnpj:cnpj||null,municipio_ibge:municipio_ibge||null,
  inscricao_municipal:get('bffim')||null,regime:get('bffregime')||null,cnae:get('bffcnae')||null,codigo_servico:get('bffserv')||null},{onConflict:'clinica_id'});
 if(r.error)throw r.error;toast('Dados fiscais salvos. Emissão não habilitada.');render();
 }catch(e){err(e)}};
window.bfSaveDraft=async()=>{try{
 const descricao_servico=get('bffdesc'),valor=Number(get('bffvalor'));
 if(!descricao_servico||!Number.isFinite(valor)||valor<=0)return toast('Informe serviço e valor.');
 await add('bf_fiscal_notas',{clinica_id:cn(),origem:get('bfforigem'),descricao_servico,valor,
  tomador_nome:get('bfftomador')||null,tomador_documento:get('bffdoc')||null,meio_pagamento:get('bffmeio'),status:'rascunho'});
 toast('Rascunho salvo. Nenhuma NFS-e emitida.');render();
 }catch(e){err(e)}};
const oldMenu=menuItens;
menuItens=function(){
 const l=oldMenu();
 if(!Array.isArray(l)||UI.auth)return l;
 const out=l.filter(x=>x[0]!=='blackpay');
 if(clinical()&&!soAgenda())out.push(['bfclinico','Prontuário clínico','file'],['bfcatalogo','Catálogo clínico','report'],
  ['bfconvenios','Convênios','file'],['bflotes','Lotes e materiais','badge']);
 if(admin())out.push(['bffiscal','NFS-e / Fiscal','file']);
 return menuOrdem(out);
};
const oldRender=render;
render=function(){
 if(!views.includes(UI.view))return oldRender();
 if(NV.ativa&&UI.auth)return oldRender();
 if((!clinical()&&UI.view!=='bffiscal')||(UI.view==='bffiscal'&&!admin())||soAgenda()){UI.view='agenda';return oldRender()}
 const title={bfclinico:'Prontuário clínico',bfcatalogo:'Catálogo de procedimentos',bfconvenios:'Convênios',bflotes:'Lotes e materiais',bffiscal:'NFS-e / Fiscal'}[UI.view];
 document.getElementById('app').innerHTML=shell('<div class="page" style="max-width:1160px"><div class="phead"><div><h1>'+title+'</h1></div></div><div id="bfcontent">'+note('Carregando dados...')+'</div></div>');
 if(!NV.ativa||!NV.sb||!NV.sessao||!cn())return body(note('Entre em uma conta sincronizada para utilizar este módulo.'));
 const route={bfclinico:clinicalHome,bfcatalogo:catalog,bfconvenios:partners,bflotes:lots,bffiscal:fiscal}[UI.view];
 route().catch(e=>body(note('Erro: '+h(e.message||e))));
};
const originalSegmento=escolherSegmento;
escolherSegmento=function(k){
 const anterior=S.config.segmento;originalSegmento(k);
 if(['odontologia','biomedicina'].includes(k)&&S.config.segmento===k&&anterior!==k){
  setTimeout(()=>{if(S.config.segmento===k&&NV.ativa&&NV.sessao)window.bfCatalogImport()},2200);
 }
};
window.addEventListener('load',()=>{if(!UI.auth)render()});
})();
