/* BlackFlow: odontograma interativo odontomapa e ficha periodontal.
   Usa o prontuário e o histórico de odontogramas existentes. Registra os achados
   da profissional. Não diagnostica, não sugere conduta, dose ou técnica, não
   interpreta exames nem prevê resultado. */
(function(){
'use strict';
if(window.__bfOdonto149)return;
window.__bfOdonto149=true;
const TELA='odontomapa';
const ORDEM={p:[[18,17,16,15,14,13,12,11],[21,22,23,24,25,26,27,28],[48,47,46,45,44,43,42,41],[31,32,33,34,35,36,37,38]],d:[[55,54,53,52,51],[61,62,63,64,65],[85,84,83,82,81],[71,72,73,74,75]]};
const TODOS=new Set([...ORDEM.p.flat(),...ORDEM.d.flat()]);
const FACE=['v','m','c','d','l'];
const SITIOS=[['mv','Mesiovestibular'],['v','Vestibular'],['dv','Distovestibular'],['mi','Mesial interna'],['i','Interna'],['di','Distal interna']];
const ACHADOS={
 carie:{n:'Cárie',s:'planejado',nivel:'face'},
 restauracao:{n:'Restauração existente',s:'realizado',nivel:'face'},
 restauracao_planejada:{n:'Restauração a fazer',s:'planejado',nivel:'face',orc:/restauraç/i},
 ausente:{n:'Ausência do dente',s:'ausente',nivel:'dente'},
 extracao_planejada:{n:'Extração indicada',s:'planejado',nivel:'dente',orc:/exodontia/i},
 endodontia:{n:'Tratamento de canal feito',s:'realizado',nivel:'dente'},
 endodontia_planejada:{n:'Tratamento de canal indicado',s:'planejado',nivel:'dente',orc:/endodôntico/i},
 coroa:{n:'Coroa',s:'realizado',nivel:'dente'},
 implante:{n:'Implante',s:'realizado',nivel:'dente'},
 fratura:{n:'Fratura',s:'achado',nivel:'ambos'},
 mobilidade:{n:'Mobilidade',s:'achado',nivel:'dente'},
 lesao_periapical:{n:'Lesão periapical',s:'achado',nivel:'dente'}
};
const LEGADOS={planejado:{n:'Tratamento planejado',s:'planejado'},protese:{n:'Prótese',s:'realizado'},sem_alteracoes:{n:'Sem alteração',s:'neutro'}};
const rotFace=(f,n)=>({v:'Vestibular',m:'Mesial',c:+n%10<=3?'Incisal':'Oclusal',d:'Distal',l:[1,2,5,6].includes(Math.floor(+n/10))?'Palatina':'Lingual','*':'Dente inteiro'})[f]||'Face não informada';
const h=s=>esc(String(s??''));
const $id=s=>document.getElementById(s);
const S0=()=>({cid:'',uid:'',pid:'',id:'',modo:'p',aba:'arcada',dente:0,face:'',buscando:false,dados:[],foto:null,v:0,busy:false});
let M=S0();
const mensagem=s=>{const e=$id('bfoMensagem');if(e)e.textContent=s;};
const uiReady=()=>typeof S!=='undefined'&&typeof UI!=='undefined'&&typeof NV!=='undefined';
const cabe=()=>uiReady()&&S.config?.segmento==='odontologia'&&!soAgenda()&&!UI.auth&&podeTela(TELA)&&pode('clinico');
const online=()=>cabe()&&NV.ativa&&NV.sb&&NV.sessao?.user?.id&&NV.clinicaId&&!NV.offline;
const mostra=()=>cabe()&&UI.view===TELA;
const identidade=()=>[String(NV.clinicaId||''),String(NV.sessao?.user?.id||'')];
const vigente=(v)=>M===v&&mostra()&&online()&&identidade()[0]===v.cid&&identidade()[1]===v.uid;
function fotoLimpar(v=M){if(v.foto?.url)URL.revokeObjectURL(v.foto.url);v.foto=null}
function limpar(){fotoLimpar();M=S0()}
const historico=(data)=>Array.isArray(data)?data:[];
const entradas=(row)=>Object.entries(row?.dentes||{}).filter(([n,obj])=>TODOS.has(+n)&&obj&&typeof obj==='object');
function mapear(data){
 const recentes=new Map(),perio=new Map();
 // As linhas chegam da mais antiga à mais recente, sem sobrescrever registros.
 for(const row of historico(data))for(const [n,o] of entradas(row)){
  if(o.estado==='periodontal'&&o.sitios){perio.set(+n,o.sitios);continue}
  const f=FACE.includes(o.face)?o.face:'*';
  recentes.set(n+':'+f,o);
 }
 return {recentes,perio};
}
function acoesOrc(data){
 // Uma sugestão nunca escolhe tratamento: só surgirá de um item marcado pela profissional.
 const {recentes}=mapear(data);
 const cat=window.BF_CATALOGOS?.odontologia?.procedimentos||[];
 return [...recentes].flatMap(([k,o])=>{
  const a=ACHADOS[o.estado];
  const n=k.split(':')[0];
  if(!a?.orc || recentes.get(n+':*')?.estado==='ausente')return [];
  const op=cat.filter(x=>typeof x.n==='string'&&a.orc.test(x.n)).map(x=>x.n);
  return op.length?[{titulo:a.n,local:'Dente '+n+' · '+rotFace(o.face||'*',n),op}]:[];
 });
}
function indices(perio){
 let b=0,p=0,nb=0,np=0;
 for(const sites of perio.values())for(const [key] of SITIOS){
  const s=sites?.[key];
  if(typeof s?.sangramento==='boolean'){nb++;if(s.sangramento)b++}
  if(typeof s?.placa==='boolean'){np++;if(s.placa)p++}
 }
 return {sangramento:nb?100*b/nb:null,placa:np?100*p/np:null,b,nb,p,np};
}
function descricao(row){
 return entradas(row).map(([n,o])=>o.estado==='periodontal'?'Dente '+n+': ficha periodontal, '+SITIOS.filter(([key])=>o.sitios?.[key]).length+' ponto(s)':
  'Dente '+n+(FACE.includes(o.face)?' · '+rotFace(o.face,n):'')+': '+((ACHADOS[o.estado]||LEGADOS[o.estado])?.n||String(o.estado||'Marcação'))+
  (o.observacao?' · '+o.observacao:'')).join(' / ')||'Marcação sem identificação';
}
window.bfOdontoHistorico=rows=>historico(rows).map(row=>[h(row.criado_em?new Date(row.criado_em).toLocaleDateString('pt-BR'):''),h(descricao(row))]);
async function select(sb,t,cols,filters,colsOrder=[],limit=1000,start=0){
 let q=sb.from(t).select(cols);
 for(const [key,value] of Object.entries(filters))q=q.eq(key,value);
 for(const col of colsOrder)q=q.order(col,{ascending:true});
 const r=await q.range(start,start+limit-1);
 if(r.error)throw r.error;
 return r.data||[];
}
async function mesmasLinhas(v){
 const filtros={clinica_id:v.cid,prontuario_id:v.id};
 const linhas=[];
 for(let i=0;i<100;i++){
  const lote=await select(v.sb,'bf_odontogramas','id,dentes,observacao,criado_em',filtros,['criado_em','id'],500,i*500);
  linhas.push(...lote);
  if(!vigente(v)||lote.length<500)return linhas;
 }
 throw new Error('Volume de marcações acima do limite de leitura.');
}
async function carregar(pid,existente){
 if(!online()||!S.pacientes.some(p=>String(p.id)===pid))return;
 const [cid,uid]=identidade();
 fotoLimpar();
 const v=M=Object.assign(S0(),{cid,uid,pid,modo:M.modo,buscando:true,sb:NV.sb});
 render();
 try{
  const ativos=await select(v.sb,'bf_profissionais','id',{clinica_id:cid,segmento:'odontologia',ativo:true,user_id:uid},[],1);
  if(!vigente(v))return;
  if(!ativos.length)throw new Error('Não foi possível confirmar seu vínculo clínico.');
  const filtros={clinica_id:cid,segmento:'odontologia',paciente_ref:pid};
  let linhas=await select(v.sb,'bf_prontuarios','id',filtros,[],2);
  if(!vigente(v))return;
  if(linhas.length>1)throw new Error('Há mais de um prontuário para este cadastro. Confira na lista clínica antes de prosseguir.');
  if(!linhas.length&&existente)throw new Error('Prontuário não encontrado.');
  if(!linhas.length){
   const r=await v.sb.from('bf_prontuarios').insert({...filtros,anamnese:{}}).select('id');
   if(r.error)throw r.error;
   linhas=r.data||[];
  }
  if(!vigente(v))return;
  if(linhas.length!==1)throw new Error('Não foi possível confirmar o prontuário.');
  const id=linhas[0].id;
  if(typeof window.bfAuditarAberturaProntuario==='function'&&!(await window.bfAuditarAberturaProntuario(id,TELA))){
   throw new Error('O registro de abertura do prontuário não foi confirmado.');
  }
  if(!vigente(v))return;
  v.id=id;
  v.dados=await mesmasLinhas(v);
  if(vigente(v)){v.buscando=false;render()}
 }catch(e){if(vigente(v)){v.id='';v.buscando=false;render();mensagem(e.message==='Não foi possível confirmar seu vínculo clínico.'||(e.message?.startsWith('Há mais de um')||e.message==='O registro de abertura do prontuário não foi confirmado.')?e.message:'Não foi possível abrir o prontuário. Nenhuma marcação foi alterada.')}}
}
window.bfOdontoAbrir=pid=>{if(cabe()){go(TELA);if(pid)carregar(String(pid),true)}};
async function gravar(v,dente,obj){
 if(!vigente(v)||!v.id||!TODOS.has(dente)||v.busy)return;
 v.busy=true;
 const b=$id('bfoSalvar'); if(b)b.disabled=true;
 try{
  const q=await v.sb.from('bf_odontogramas').insert({clinica_id:v.cid,prontuario_id:v.id,dentes:{[dente]:obj},observacao:obj.observacao||''}).select('id,dentes,observacao,criado_em');
  if(q.error)throw q.error;
  if(!vigente(v))return;
  if(q.data?.length!==1){mensagem('A gravação não foi confirmada. Atualize o prontuário antes de tentar de novo.');return}
  v.dados.push(q.data[0]);v.face='';
  render();mensagem('Registro guardado no prontuário.');
 }catch(e){if(vigente(v)){mensagem('Não foi possível confirmar o registro. Confira o histórico antes de repetir.');if(b)b.disabled=false}}
 finally{v.busy=false}
}
const percent=(n)=>n===null?'Sem registro':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n)+'%';
const classes=(o)=>o?((ACHADOS[o.estado]||LEGADOS[o.estado])?.s||'achado'):'neutro';
const svg=(n)=>`<svg viewBox="0 0 46 46" aria-hidden="true" focusable="false"><path d="${n%10<=3?'M10 7Q23 1 36 7L38 28Q36 43 23 44Q10 43 8 28Z':'M7 11Q10 5 17 7Q24 2 31 7Q42 6 42 18Q44 24 39 31Q37 40 31 40Q22 46 14 41Q4 41 5 30Q0 22 7 11Z'}" fill="currentColor"/><path d="M13 17Q23 12 33 17M13 30Q23 35 33 30" fill="none" stroke="#b4c9d3" stroke-width="1.5" opacity=".85"/></svg>`;
function painelArcada(v,dados){
 return `<div class="bfoToolbar"><button class="btn ${v.modo==='p'?'':'ghost'}" data-bfo-modo="p" aria-pressed="${v.modo==='p'}">Permanente</button><button class="btn ${v.modo==='d'?'':'ghost'}" data-bfo-modo="d" aria-pressed="${v.modo==='d'}">Decídua</button></div>
 <div class="bfoArcada" style="--bfoColunas:${v.modo==='p'?8:5}">${ORDEM[v.modo].map((q,i)=>`<div class="bfoQuadrante" aria-label="${['Superior direita','Superior esquerda','Inferior direita','Inferior esquerda'][i]}">${q.map(n=>{
  const geral=dados.recentes.get(n+':*');
  const todas=FACE.map(f=>dados.recentes.get(n+':'+f));
  const estado=classes(geral)==='ausente'?geral:[geral,...todas].find(o=>classes(o)==='planejado')||[geral,...todas].find(o=>classes(o)!=='neutro')||geral;
  return `<button type="button" class="bfoDente ${classes(estado)}" data-bfo-dente="${n}" aria-pressed="${v.dente===n}" aria-label="Dente ${n}${estado?', '+h((ACHADOS[estado.estado]||LEGADOS[estado.estado])?.n||estado.estado):''}">${svg(n)}<b>${n}</b></button>`;
 }).join('')}</div>`).join('')}</div>
 <p class="sub bfoLegenda"><span class="planejado">Planejado</span><span class="realizado">Realizado</span><span class="ausente">Ausente</span><span class="achado">Outros achados</span></p>
 ${v.dente?`<div class="bfoSelecionado"><h3>Dente ${v.dente}</h3><p class="sub">Selecione a face ou o dente inteiro.</p>
 <div class="bfoFaces ${[1,4,5,8].includes(Math.floor(v.dente/10))?'bfoLadoDireito':'bfoLadoEsquerdo'}" role="group" aria-label="Faces do dente">${FACE.map(f=>{const o=dados.recentes.get(v.dente+':'+f);return `<button class="bfoFace ${classes(o)}" type="button" data-bfo-face="${f}" aria-label="${rotFace(f,v.dente)}${o?', '+h((ACHADOS[o.estado]||LEGADOS[o.estado])?.n||o.estado):''}">${rotFace(f,v.dente)}</button>`}).join('')}</div>
 <button type="button" class="btn ghost" data-bfo-face="*">Registrar no dente inteiro</button></div>`:'<p class="sub">Escolha um dente para marcar suas cinco faces.</p>'}
 ${v.face?editorFace(v):''}`;
}
function editorFace(v){
 const ops=Object.entries(ACHADOS).filter(([,x])=>x.nivel==='ambos'||(v.face==='*'?x.nivel==='dente':x.nivel==='face'));
 return `<fieldset class="bfoEdicao"><legend>Dente ${v.dente} · ${rotFace(v.face,v.dente)}</legend><label>Achado
 <select id="bfoAchado" class="inp"><option value="">Escolha o achado registrado pela profissional</option>${ops.map(([k,o])=>`<option value="${k}">${h(o.n)}</option>`).join('')}</select></label>
 <label>Observação <textarea id="bfoObs" class="inp" maxlength="1000" rows="2"></textarea></label>
 <p>Guardar esta marcação no prontuário?</p><div class="bfoToolbar">
 <button class="btn ghost" type="button" data-bfo-cancelar="face">Não</button><button class="btn" id="bfoSalvar" type="button" data-bfo-confirmar="face">Sim, guardar</button></div></fieldset>`;
}
function painelPerio(v,d){
 const i=indices(d.perio);
 const status=`<div class="bfoMetricas"><div><small>Sangramento à sondagem</small><b>${percent(i.sangramento)}</b><span>${i.b} de ${i.nb} pontos informados</span></div>
 <div><small>Placa</small><b>${percent(i.placa)}</b><span>${i.p} de ${i.np} pontos informados</span></div></div>`;
 const linha=SITIOS.map(([k,label])=>{
  const o=d.perio.get(v.dente)?.[k]||{};
  const trit=(name,val)=>`<select name="${name}-${k}" class="inp"><option value="">Não medido</option><option value="sim" ${val===true?'selected':''}>Sim</option><option value="nao" ${val===false?'selected':''}>Não</option></select>`;
  return `<fieldset class="bfoSito"><legend>${label}</legend><label>Profundidade em milímetros<input name="prof-${k}" type="number" min="0" step="0.1" inputmode="decimal" class="inp" value="${h(o.profundidade??'')}"></label>
  <label>Retração em milímetros<input name="ret-${k}" type="number" min="0" step="0.1" inputmode="decimal" class="inp" value="${h(o.retracao??'')}"></label>
  <label>Sangramento${trit('sg',o.sangramento)}</label><label>Placa${trit('pl',o.placa)}</label></fieldset>`;
 }).join('');
 return status+`<p class="sub">Os índices usam apenas os pontos avaliados em cada medida. “Não medido” não entra no cálculo.</p>
 <label>Dente <select id="bfoDentePerio" class="inp"><option value="">Selecione</option>
 ${[...ORDEM.p.flat(),...ORDEM.d.flat()].map(n=>`<option value="${n}"${v.dente===n?' selected':''}>${n}${d.perio.has(n)?' · registrado':''}</option>`).join('')}</select></label>
 ${v.dente?`<form class="bfoPerio" id="bfoPerioForm">${linha}<p>Guardar as medições deste dente?</p>
 <div class="bfoToolbar"><button type="button" class="btn ghost" data-bfo-cancelar="perio">Não</button><button type="submit" class="btn" id="bfoSalvar">Sim, guardar</button></div></form>`:''}`;
}
function painelFoto(v){
 return `<h3>Foto do sorriso ou intraoral</h3><p class="sub">A foto original e a cópia anotada, quando confirmadas, ficam separadas nos arquivos privados do prontuário.</p>
 <label>Tipo de foto <select id="bfoTipoFoto" class="inp"><option value="sorriso">Sorriso</option><option value="intraoral">Intraoral</option></select></label>
 <div class="bfoToolbar"><button type="button" class="btn ghost" data-bfo-arquivo-btn="bfoCamera">Tirar foto</button><input id="bfoCamera" type="file" hidden accept="image/jpeg,image/png,image/webp" capture="environment" data-bfo-arquivo>
 <button type="button" class="btn ghost" data-bfo-arquivo-btn="bfoArquivo">Escolher foto</button><input id="bfoArquivo" type="file" hidden accept="image/jpeg,image/png,image/webp" data-bfo-arquivo></div>
 ${!v.foto?'':`<p class="sub">Toque na cópia para marcar. A foto original não será editada.</p><canvas id="bfoCanvas" tabindex="0" aria-label="Cópia para anotar a foto"></canvas>
 <div class="bfoToolbar"><button class="btn ghost" type="button" data-bfo-foto="centro">Marcar o centro</button><button class="btn ghost" type="button" data-bfo-foto="desfazer">Desfazer última marca</button>
 <button class="btn ghost" type="button" data-bfo-foto="cancelar">Não anexar</button><button class="btn" type="button" data-bfo-foto="guardar">Sim, anexar</button></div>`}`;
}
function desenhar(v){
 const cv=$id('bfoCanvas');if(!cv||!v.foto)return;
 const {imagem,marcas}=v.foto;
 const scale=Math.min(1,1600/Math.max(imagem.naturalWidth,imagem.naturalHeight));cv.width=Math.round(imagem.naturalWidth*scale);cv.height=Math.round(imagem.naturalHeight*scale);
 const c=cv.getContext('2d');c.drawImage(imagem,0,0,cv.width,cv.height);
 for(const [x,y] of marcas){const r=Math.max(5,Math.min(cv.width,cv.height)*.025);c.lineWidth=Math.max(2,r*.19);c.beginPath();c.arc(x*cv.width,y*cv.height,r,0,Math.PI*2);c.strokeStyle='#fff';c.stroke();c.beginPath();c.arc(x*cv.width,y*cv.height,r*.73,0,Math.PI*2);c.strokeStyle='#2836b3';c.stroke()}
 cv.onclick=e=>{if(!vigente(v)||v.busy)return;const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;ponto(v,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)};
}
function ponto(v,x,y){
 if(v.foto&&v.foto.marcas.length<30&&[x,y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)){v.foto.marcas.push([x,y]);desenhar(v)}
}
async function prepararFoto(v,input){
 const f=input.files?.[0];if(!f||!vigente(v)||v.busy)return;
 const tipo=$id('bfoTipoFoto')?.value==='intraoral'?'intraoral':'sorriso';
 if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>20*1024*1024||!f.size){mensagem('Use uma imagem em formato JPEG, PNG ou WebP de até 20 megabytes.');input.value='';return}
 // A URL só existe na sessão deste paciente. Não salvar imagem no aparelho.
 const url=URL.createObjectURL(f),imagem=new Image();
 imagem.src=url;
 const seq=++v.v;
 try{
  await imagem.decode();
  if(!vigente(v)||v.v!==seq||v.aba!=='foto'){URL.revokeObjectURL(url);return}
  if(imagem.naturalWidth*imagem.naturalHeight>35000000)throw Error('Imagem grande.');
  fotoLimpar(v);v.foto={f,url,imagem,marcas:[],tipo};render();desenhar(v);mensagem('Confira a foto antes de anexar.');
 }catch(e){URL.revokeObjectURL(url);if(vigente(v)&&v.v===seq){mensagem('Não foi possível abrir a imagem. Escolha outra foto.');input.value=''}}
}
async function anexar(v){
 if(!vigente(v)||!v.id||!v.foto||v.busy||!$id('bfoCanvas'))return;
 v.busy=true;const foto=v.foto,canvas=$id('bfoCanvas');
 const bt=document.querySelector('[data-bfo-foto="guardar"]');if(bt)bt.disabled=true;
 const arquivos=[{f:foto.f,ext:{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[foto.f.type],n:'foto-'+foto.tipo+'-original'}];
 const enviados=[];let fase='preparação';
 try{
  if(foto.marcas.length){
   const copia=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!copia||copia.size>20*1024*1024)throw Error('Cópia não disponível.');
   arquivos.push({f:copia,ext:'png',n:'foto-'+foto.tipo+'-com-marcacoes'});
  }
  if(!vigente(v)||v.foto!==foto)return;
  const lote=crypto.randomUUID();
  fase='envio';
  for(const a of arquivos){
   if(!vigente(v))throw Error('Sessão mudou.');
   a.path=v.cid+'/'+v.id+'/'+lote+'-'+a.n+'.'+a.ext;
   const q=await v.sb.storage.from('bf-prontuarios').upload(a.path,a.f,{upsert:false,contentType:a.f.type});
   if(q.error)throw q.error;
   enviados.push(a);
  }
  if(!vigente(v))throw Error('Sessão mudou.');
  fase='gravação';
  const q=await v.sb.from('bf_anexos_clinicos').insert(enviados.map(a=>({clinica_id:v.cid,prontuario_id:v.id,tipo:'fotografia',nome_arquivo:a.n+'-'+lote.slice(0,8)+'.'+a.ext,storage_path:a.path,mime_type:a.f.type})));
  if(q.error){if(q.status>=400&&q.status<500)fase='envio';throw q.error}
  if(vigente(v)){fotoLimpar(v);render();mensagem('Foto anexada ao prontuário sem alterar o original.')}
 }catch(e){
  // Só limpar os objetos desta operação se a inserção definitivamente não ocorreu.
  // Se a rede caiu após enviar o registro, preservar os objetos até conferir.
  if(fase==='envio'&&enviados.length)try{await v.sb.storage.from('bf-prontuarios').remove(enviados.map(x=>x.path))}catch(_){}
  if(vigente(v)){mensagem(fase==='gravação'?'Envio não confirmado. Verifique os anexos do prontuário antes de repetir.':'Não foi possível anexar a foto.');if(bt&&fase!=='gravação')bt.disabled=false}
 }finally{v.busy=false}
}
function painelOrc(v){
 const lista=acoesOrc(v.dados);
 return `<h3>Sugestões para orçamento</h3><p class="sub">Apenas registros do plano feitos pela profissional. Revise os itens e confirme os valores no orçamento. Nada é lançado aqui.</p>
 ${lista.length?lista.map((o,i)=>`<div class="bfoSugestao"><b>${h(o.titulo)} · ${h(o.local)}</b><label>Serviço do catálogo <select class="inp" id="bfoOrc${i}"><option value="">Selecione</option>${o.op.map((n,j)=>`<option value="${j}">${h(n)}</option>`).join('')}</select></label><button class="btn ghost" type="button" data-bfo-orc="${i}">Confirmar item e revisar orçamento</button></div>`).join(''):'<p class="sub">Não há itens do plano com correspondência no catálogo.</p>'}`;
}
function abrirOrc(v,i){
 if(!vigente(v)||!podeTela('orcamentos'))return mensagem('Seu acesso não inclui orçamentos.');
 const opcao=$id('bfoOrc'+i)?.value;
 const o=acoesOrc(v.dados)[i],nome=opcao!==''&&opcaoSegura(opcao)?o?.op?.[Number(opcao)]:null;
 if(!nome||typeof window.bfDocOpen!=='function')return mensagem('Escolha um serviço para revisar.');
 window.bfDocOpen('orc',v.pid);
 if(vigente(v)&&$id('bf-doc-form')&&typeof window.bfDocNome==='function'){
  // Reaproveita a lógica de preço do orçamento existente, sem salvar nem enviar.
  const campo=$id('bf-doc-form').querySelector('input[data-index="0"][data-key="nome"]');
  if(campo){campo.value=nome;window.bfDocNome(0,nome)}
 }
}
function opcaoSegura(s){return typeof s==='string'&&/^\d+$/.test(s)}
function dom(v){
 const d=mapear(v.dados);
 const nomes=Array.isArray(S.pacientes)?S.pacientes:[];
 const seletores=[['arcada','Odontograma'],['perio','Ficha periodontal'],['foto','Foto do atendimento'],...(podeTela('orcamentos')?[['orc','Orçamento']]:[])];
 return `<div class="page bfoPage"><div class="phead"><div><h1>Odontograma interativo</h1><p class="sub">Registro clínico de odontologia. O sistema não diagnostica, não interpreta exames e não orienta tratamentos.</p></div></div>
 ${online()?`<div class="card bfoCard"><label>Paciente <select class="inp" id="bfoPaciente"><option value="">Selecione o paciente</option>${[...nomes].sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR')).map(p=>`<option value="${h(p.id)}"${String(p.id)===v.pid?' selected':''}>${h(p.nome||'Paciente')}</option>`).join('')}</select></label>
 <p role="status" aria-live="polite" id="bfoMensagem">${v.buscando?'Abrindo prontuário.':''}</p>
 ${!v.id?'':`<div class="bfoToolbar" aria-label="Seções do atendimento">${seletores.map(([k,n])=>`<button class="btn ${v.aba===k?'':'ghost'}" data-bfo-aba="${k}" type="button" aria-pressed="${v.aba===k}">${n}</button>`).join('')}</div>${v.aba==='perio'?painelPerio(v,d):v.aba==='foto'?painelFoto(v):v.aba==='orc'?painelOrc(v):painelArcada(v,d)}
 ${v.dados.length?`<details class="bfoHist"><summary>Histórico do prontuário</summary>${window.bfOdontoHistorico(v.dados.slice(-30).reverse()).map(row=>`<p><small>${row[0]}</small><br>${row[1]}</p>`).join('')}<p class="sub">As marcações guardadas também aparecem no prontuário clínico.</p></details>`:''}`}</div>`:'<div class="card">Conecte-se ao Supabase da clínica para usar o odontograma. O registro não é salvo fora da nuvem.</div>'}
 </div>`;
}
function bind(v){
 const el=$id('bfoPaciente');
 if(el)el.onchange=()=>{if(!el.value){limpar();render();return}carregar(el.value,false)};
 const deps=document.querySelector('.bfoPage');if(!deps||!v.id)return;
 const input=$id('bfoDentePerio');
 if(input)input.onchange=()=>{if(vigente(v)&&!v.busy){v.dente=TODOS.has(+input.value)?+input.value:0;render();$id('bfoDentePerio')?.focus()}};
 for(const f of deps.querySelectorAll('[data-bfo-arquivo]'))f.onchange=()=>prepararFoto(v,f);
 const form=$id('bfoPerioForm');
 if(form)form.onsubmit=e=>{
  e.preventDefault();if(!vigente(v)||!form.reportValidity())return;
  const fd=new FormData(form),sitios={};
  const num=x=>String(x||'')===''?null:Number(x);
  for(const [k] of SITIOS){
   const sg=fd.get('sg-'+k),pl=fd.get('pl-'+k),p=num(fd.get('prof-'+k)),r=num(fd.get('ret-'+k));
   if([p,r].some(x=>x!==null&&(!Number.isFinite(x)||x<0)))return mensagem('Confira as medidas em milímetros.');
   if(p!==null||r!==null||sg||pl)sitios[k]={profundidade:p,retracao:r,sangramento:sg?sg==='sim':null,placa:pl?pl==='sim':null};
  }
  if(!Object.keys(sitios).length)return mensagem('Registre ao menos uma medida ou observação nos seis pontos.');
  gravar(v,v.dente,{estado:'periodontal',observacao:'Ficha periodontal',sitios});
 };
 deps.onclick=e=>{
  const bt=e.target.closest('button');if(!bt||!vigente(v)||v.busy)return;
  const b=bt.dataset;
  if(b.bfoAba&&['arcada','perio','foto','orc'].includes(b.bfoAba)){if(v.aba==='foto'&&b.bfoAba!=='foto'){v.v++;fotoLimpar(v)}v.aba=b.bfoAba;v.face='';render();document.querySelector('[data-bfo-aba="'+v.aba+'"]')?.focus();return}
  if(b.bfoModo&&ORDEM[b.bfoModo]){v.modo=b.bfoModo;v.dente=0;v.face='';render();document.querySelector('[data-bfo-modo="'+v.modo+'"]')?.focus();return}
  if(TODOS.has(+b.bfoDente)){v.dente=+b.bfoDente;v.face='';render();document.querySelector('[data-bfo-dente="'+v.dente+'"]')?.focus();return}
  if((FACE.includes(b.bfoFace)||b.bfoFace==='*')&&TODOS.has(v.dente)){v.face=b.bfoFace;render();$id('bfoAchado')?.focus();return}
  if(b.bfoCancelar){v.face='';if(b.bfoCancelar==='perio')v.dente=0;render();mensagem('Nenhuma alteração foi guardada.');return}
  if(b.bfoConfirmar==='face'){
   const estado=$id('bfoAchado')?.value, a=ACHADOS[estado],lim=v.face==='*'?'dente':'face';
   if(!a||![lim,'ambos'].includes(a.nivel))return mensagem('Escolha o achado que deseja guardar.');
   gravar(v,v.dente,{estado,face:v.face,observacao:($id('bfoObs')?.value||'').trim().slice(0,1000)});return;
  }
  if(b.bfoOrc!==undefined){abrirOrc(v,+b.bfoOrc);return}
  if(b.bfoArquivoBtn){$id(b.bfoArquivoBtn)?.click();return}
  if(b.bfoFoto==='guardar'){anexar(v);return}
  if(b.bfoFoto==='cancelar'){v.v++;fotoLimpar(v);render();mensagem('Nenhuma foto foi anexada.');return}
  if(b.bfoFoto==='centro')ponto(v,.5,.5);
  if(b.bfoFoto==='desfazer'&&v.foto){v.foto.marcas.pop();desenhar(v)}
 };
 if(v.foto&&v.aba==='foto'){const opt=$id('bfoTipoFoto');if(opt)opt.value=v.foto.tipo;desenhar(v)}
}
const css=`<style>
.bfoPage{min-width:0;max-width:1080px!important}.bfoPage h3{margin:12px 0 8px}.bfoCard label{display:block;min-width:0}.bfoCard .inp{display:block;width:100%;min-height:46px;font-size:16px;margin-top:4px}.bfoCard .btn,.bfoCard .bfoFace{min-height:44px;white-space:normal}.bfoToolbar,.bfoLegenda{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0;align-items:center}.bfoDente svg,.bfoDente b{display:block;margin:auto}.bfoDente svg{height:32px;max-width:100%}.bfoDente{font:inherit;cursor:pointer;min-height:44px;min-width:0;border:1px solid var(--line,#e2e7ed);border-radius:8px;background:var(--card,#fff);color:#396477;padding:2px}.bfoDente b{font-size:11px}.bfoDente[aria-pressed=true]{outline:2px solid #6852c7;outline-offset:-2px}.bfoArcada{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.bfoQuadrante{display:grid;grid-template-columns:repeat(var(--bfoColunas),minmax(0,1fr));gap:3px}.bfoPage .planejado{background:#fde5e9;color:#a01735}.bfoPage .realizado{background:#e4efff;color:#154b9b}.bfoPage .ausente{background:#e8ebed;color:#525a63;text-decoration:line-through}.bfoPage .achado{background:#fbecd7;color:#783e00}.bfoLegenda span{border-radius:8px;padding:2px 8px}.bfoFaces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px auto 13px;max-width:400px;grid-template-areas:'. v .' 'd c m' '. l .';padding:8px;border-radius:32% 32% 29% 29%;background:var(--soft,#f0f3f9)}.bfoFaces.bfoLadoEsquerdo{grid-template-areas:'. v .' 'm c d' '. l .'}.bfoFaces [data-bfo-face=v]{grid-area:v}.bfoFaces [data-bfo-face=m]{grid-area:m}.bfoFaces [data-bfo-face=c]{grid-area:c}.bfoFaces [data-bfo-face=d]{grid-area:d}.bfoFaces [data-bfo-face=l]{grid-area:l}.bfoFace{border:1px solid var(--line,#e2e7ed);border-radius:8px;cursor:pointer;padding:5px;overflow-wrap:anywhere;font:inherit}.bfoPage .neutro{background:var(--soft,#f5f8fb);color:var(--ink,#263455)}.bfoSelecionado,.bfoEdicao,.bfoHist,.bfoSugestao{margin-top:12px;border:1px solid var(--line,#e2e7ed);border-radius:10px;padding:9px;min-width:0;overflow-wrap:anywhere}.bfoPerio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.bfoPerio>p,.bfoPerio>.bfoToolbar{grid-column:1/-1}.bfoSito{min-width:0;padding:8px;border-radius:8px;border:1px solid var(--line,#e2e7ed)}.bfoSito>label,.bfoSugestao>label{margin-top:7px}.bfoMetricas{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.bfoMetricas>div{border:1px solid var(--line,#e2e7ed);border-radius:8px;padding:8px}.bfoMetricas b,.bfoMetricas span{display:block}.bfoMetricas b{font-size:1.1rem}.bfoMetricas span{font-size:12px}.bfoHist p{margin:6px 0}#bfoCanvas{display:block;max-width:100%;max-height:55vh;cursor:crosshair}.bfoCard #bfoMensagem{min-height:1.3em;margin:4px 0;font-weight:600}.bfoToolbar input[hidden]{display:none!important}@media(max-width:660px){.bfoArcada{grid-template-columns:minmax(0,1fr);gap:5px}.bfoPerio{grid-template-columns:repeat(2,minmax(0,1fr))}.bfoFace{font-size:13px}}@media(max-width:340px){.bfoPerio{grid-template-columns:minmax(0,1fr)}}
</style>`;
if(typeof menuItens==='function'&&typeof render==='function'){
 const antesMenu=menuItens;
 menuItens=function(){const lista=antesMenu();return Array.isArray(lista)&&cabe()&&!lista.some(x=>x[0]===TELA)?menuOrdem([...lista,[TELA,'Odontograma','file']]):lista};
 const antesRender=render;
 render=function(){
  if(UI.view!==TELA){if(M.pid)limpar();return antesRender()}
  if(!cabe()){limpar();if(!UI.auth)UI.view='agenda';return antesRender()}
  const [cid,uid]=identidade();if((M.cid&&M.cid!==cid)||(M.uid&&M.uid!==uid)||M.pid&&!online())limpar();
  document.getElementById('app').innerHTML=shell(css+dom(M));
  if(typeof fonteAplicar==='function')fonteAplicar();
  bind(M);
 };
}
})();
