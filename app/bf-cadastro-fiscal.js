/* BlackFlow 1.47.0 — Cadastro fiscal unificado (todos os segmentos).
   Fonte de verdade: clinicas.cnpj e bf_fiscal_config no Supabase.
   Não habilita emissão automática de NFS-e. */
(function(){
"use strict";
if(typeof vConfig!=="function"||typeof CFG_ABAS==="undefined"||typeof NV==="undefined")return;
const E=v=>esc(String(v??""));
const dig=v=>String(v||"").replace(/\D/g,"");
const v=id=>document.getElementById(id)?.value?.trim()||"";
const can=()=>NV.ativa&&NV.sb&&NV.sessao&&NV.clinicaId&&NV.papel==="admin";
const b="<button class=\"btn sm\"";
const field=(id,label,value="",attrs="")=>'<label style="flex:1;min-width:180px;display:block"><small>'+E(label)+'</small><input id="'+id+'" class="inp" style="width:100%" value="'+E(value)+'" '+attrs+'></label>';
const line=x=>'<div style="display:flex;gap:12px;flex-wrap:wrap;margin:10px 0">'+x+'</div>';
let cl=null,fiscal=null,oldCnpj="",lastQuery=null;
if(!CFG_ABAS.some(x=>x[0]==="cadfiscal")) CFG_ABAS.push(["cadfiscal","Cadastro fiscal (CNPJ)"]);
const oldV=vConfig;
vConfig=function(){
 const html=oldV();
 if(UI.cfgTab!=="cadfiscal")return html;
 const content='<div class="card" id="bfcad-root" style="margin:16px 0"><h2>Cadastro fiscal e CNPJ</h2>'+
 '<p class="sub">Carregando informações fiscais da clínica...</p></div>';
 setTimeout(()=>{if(UI.view==="config"&&UI.cfgTab==="cadfiscal")window.bfcadLoad()},10);
 const end=html.lastIndexOf("</div>");
 return end<0?html+content:html.slice(0,end)+content+html.slice(end);
};
window.bfcadAbrir=function(){UI.cfgTab="cadfiscal";go("config")};
const error=e=>{const msg=String(e?.message||e||"Erro").slice(0,300);toast(msg);const slot=document.getElementById("bfcad-msg");if(slot)slot.textContent=msg;};
function status(msg,ok=false){
 const el=document.getElementById("bfcad-msg");
 if(el){el.textContent=msg||"";el.style.color=ok?"#176044":"#9d3c18";}
}
function select(id,label,choices,current){
 return '<label style="flex:1;min-width:180px;display:block"><small>'+E(label)+'</small><select id="'+id+'" class="inp" style="width:100%">'+
 choices.map(([k,t])=>'<option value="'+E(k)+'"'+(String(k)===String(current??"")?' selected':'')+'>'+E(t)+'</option>').join("")+
 '</select></label>';
}
window.bfcadLoad=async function(){
 const el=document.getElementById("bfcad-root");if(!el)return;
 if(!can()){
  el.innerHTML='<h2>Cadastro fiscal e CNPJ</h2><div class="note">Entre com o login de administrador da clínica para cadastrar ou corrigir o CNPJ fiscal.</div>';
  return;
 }
 try{
  const [cr,fr]=await Promise.all([
   NV.sb.from("clinicas").select("id,cnpj,razao_social,verificacao").eq("id",NV.clinicaId).single(),
   NV.sb.from("bf_fiscal_config").select("*").eq("clinica_id",NV.clinicaId).maybeSingle()
  ]);
  if(cr.error)throw cr.error;if(fr.error)throw fr.error;
  cl=cr.data;fiscal=fr.data||{};
  oldCnpj=dig(cl.cnpj||fiscal.cnpj||"");
  lastQuery=null;
  const dados=cl.verificacao||{},cnpj=oldCnpj||dig(S.config.cnpj||"");
  const currentReg=fiscal.regime||"";
  el.innerHTML=
   '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><h2>Cadastro fiscal e CNPJ</h2><p class="sub">Um cadastro por estabelecimento. Os dados são utilizados automaticamente no módulo NFS-e e permanecem gravados após o login.</p></div>'+
   '<button class="btn ghost sm" onclick="go(\'bffiscal\')">Abrir NFS-e</button></div>'+
   '<div class="note">O CNPJ é validado e consultado em fontes públicas. Inscrição municipal, regime tributário e códigos fiscais devem corresponder à situação real do emitente. O cadastro não substitui certificado digital nem habilita emissão de nota fiscal.</div>'+
   line(field("bfcad-cnpj","CNPJ do estabelecimento",cnpj,'inputmode="numeric" maxlength="18" onblur="bfcadConsultar(false)"')+
        '<div style="min-width:150px;align-self:end"><button class="btn ghost sm" onclick="bfcadConsultar(true)">Consultar CNPJ</button></div>')+
   '<div id="bfcad-consulta" class="sub" role="status">'+
    (cl.razao_social?"Razão social cadastrada: <b>"+E(cl.razao_social)+"</b>":"Preencha e consulte o CNPJ.")+
    (dados?.situacao?" · Situação cadastral: "+E(dados.situacao):"")+'</div>'+
   line(field("bfcad-im","Inscrição municipal",fiscal.inscricao_municipal||"")+
       field("bfcad-ibge","Código IBGE do município",fiscal.municipio_ibge||dados.ibge||"",'inputmode="numeric" maxlength="7"')+
       field("bfcad-cnae","CNAE principal",fiscal.cnae||dados.cnae||"",'inputmode="numeric" maxlength="7"'))+
   line(select("bfcad-regime","Regime tributário — confirme com a contabilidade",
      [["","Não informado"],["MEI","MEI"],["Simples Nacional","Simples Nacional"],["Lucro Presumido","Lucro Presumido"],["Lucro Real","Lucro Real"],["Outro","Outro"]],currentReg)+
      select("bfcad-sn","Optante pelo Simples Nacional?",
      [["","Não informado"],["true","Sim"],["false","Não"]],
      fiscal.simples_nacional===true?"true":fiscal.simples_nacional===false?"false":""))+
   '<details style="margin:10px 0"><summary>Dados fiscais complementares (preenchimento único)</summary>'+
    line(field("bfcad-cpf","CPF do prestador, se aplicável",fiscal.cpf_prestador||"")+
      field("bfcad-tribn","Código tributário nacional",fiscal.ctrib_nacional||fiscal.codigo_servico||"")+
      field("bfcad-tribm","Código tributário municipal",fiscal.ctrib_municipal||""))+
    line(field("bfcad-nbs","Código NBS",fiscal.codigo_nbs||"")+
      field("bfcad-serie","Série DPS",fiscal.serie_dps||1,'type="number" min="1" max="49999"')+
      select("bfcad-ambiente","Ambiente",[['homologacao','Teste / homologação'],['producao','Produção — requer habilitação']],fiscal.ambiente||"homologacao"))+
   '</details>'+
   bfcadTokenHtml()+
   '<div id="bfcad-msg" role="status" style="min-height:22px;margin:10px 0"></div>'+
   '<button class="btn" id="bfcad-save" onclick="bfcadSalvar()">Salvar e vincular à NFS-e</button>'+
   '<p class="sub" style="margin-top:10px">O CNPJ pertence à clínica, não ao navegador. Caso precise alterá-lo futuramente, somente o administrador poderá confirmar a substituição.</p>';
  bfcadTokenSituacao();
 }catch(e){el.innerHTML='<h2>Cadastro fiscal e CNPJ</h2><div class="note">Não foi possível carregar o cadastro: '+E(e.message||e)+'</div>';}
};

/* ------------------------------------------------------------------ */
/* Token do integrador fiscal, por clínica                             */
/*                                                                     */
/* A nota sai com o CNPJ desta clínica, e quem assina é o certificado  */
/* digital dela. Na Focus NFe o token que emite é o token DA EMPRESA,  */
/* criado quando aquela empresa é cadastrada lá. Por isso o token é    */
/* desta clínica e de mais ninguém: não existe token do sistema que    */
/* sirva para todas, porque a nota sairia com o CNPJ errado.           */
/*                                                                     */
/* O token é gravado por função do banco, em tabela com RLS ligada e   */
/* nenhuma política de leitura. Quem lê é apenas a função de borda que */
/* emite a nota. Para a tela voltam só os seis últimos caracteres.     */
/* ------------------------------------------------------------------ */
function bfcadTokenHtml(){
 return '<div class="note" style="margin:14px 0">'+
  '<h3 style="margin:0 0 6px;font-size:16px">Token para emitir com o CNPJ desta clínica</h3>'+
  '<p class="sub" style="margin:0 0 8px">A nota fiscal sai com o CNPJ desta clínica. No integrador, quem emite é o token da empresa, aquele que aparece depois que o CNPJ e o certificado digital A1 são cadastrados lá. Cole abaixo o token desta clínica. Ele fica guardado no servidor e nunca volta inteiro para esta tela.</p>'+
  '<div id="bfcad-tk-situacao" class="sub" role="status" style="margin:0 0 8px">Conferindo se já existe token gravado...</div>'+
  line(field("bfcad-tk","Token da empresa no integrador fiscal","",'type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="cole aqui o token"')+
       select("bfcad-tk-amb","Ambiente deste token",[['homologacao','Teste / homologação'],['producao','Produção']],"homologacao"))+
  '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
   '<button class="btn sm" onclick="bfcadTokenSalvar()">Gravar token desta clínica</button>'+
   '<button class="btn ghost sm" onclick="bfcadTokenApagar()">Apagar token gravado</button>'+
  '</div>'+
  '<div id="bfcad-tk-msg" role="status" style="min-height:22px;margin-top:8px"></div>'+
  '<p class="sub" style="margin:8px 0 0">Comece sempre pelo ambiente de teste. Só troque para produção depois que uma nota de teste for autorizada pelo município.</p>'+
 '</div>';
}
function bfcadTokenMsg(txt,ok){
 const el=document.getElementById("bfcad-tk-msg");
 if(el){el.textContent=txt||"";el.style.color=ok?"#176044":"#9d3c18";}
}
window.bfcadTokenSituacao=async function(){
 const el=document.getElementById("bfcad-tk-situacao");
 if(!el||!can())return;
 try{
  const {data,error:err}=await NV.sb.rpc("bf_fiscal_token_situacao",{p_clinica:NV.clinicaId});
  if(err)throw err;
  const d=data||{};
  if(d.tem){
   const amb=String(d.ambiente||"homologacao")==="producao"?"produção":"teste / homologação";
   el.innerHTML='Token gravado, terminado em <b>'+E(d.final||"")+'</b>, ambiente de '+E(amb)+'.'+
    (d.em?' Última gravação em '+E(new Date(d.em).toLocaleDateString("pt-BR"))+'.':'');
   el.style.color="#176044";
   const sel=document.getElementById("bfcad-tk-amb");
   if(sel)sel.value=String(d.ambiente||"homologacao");
  }else{
   el.textContent="Nenhum token gravado para esta clínica. Sem ele a nota não é emitida.";
   el.style.color="#9d3c18";
  }
 }catch(e){
  el.textContent="Não foi possível conferir o token: "+String(e.message||e).slice(0,160);
  el.style.color="#9d3c18";
 }
};
window.bfcadTokenSalvar=async function(){
 if(!can())return bfcadTokenMsg("Somente o administrador desta conta pode gravar o token.",false);
 const campo=document.getElementById("bfcad-tk");
 const tk=String(campo&&campo.value||"").trim();
 const amb=v("bfcad-tk-amb")||"homologacao";
 if(tk.length<16)return bfcadTokenMsg("Cole o token inteiro. O que foi digitado é curto demais para ser um token.",false);
 bfcadTokenMsg("Gravando...",true);
 try{
  const {data,error:err}=await NV.sb.rpc("bf_fiscal_token_gravar",
   {p_clinica:NV.clinicaId,p_token:tk,p_ambiente:amb,p_integrador:"focusnfe"});
  if(err)throw err;
  if(campo)campo.value="";
  bfcadTokenMsg("Token gravado, terminado em "+String((data&&data.final)||"")+".",true);
  bfcadTokenSituacao();
 }catch(e){bfcadTokenMsg(String(e.message||e).slice(0,240),false);}
};
window.bfcadTokenApagar=async function(){
 if(!can())return bfcadTokenMsg("Somente o administrador desta conta pode apagar o token.",false);
 if(!confirm("Apagar o token fiscal desta clínica? Enquanto não houver outro token gravado, nenhuma nota será emitida."))return;
 try{
  const {error:err}=await NV.sb.rpc("bf_fiscal_token_apagar",{p_clinica:NV.clinicaId});
  if(err)throw err;
  bfcadTokenMsg("Token apagado.",true);
  bfcadTokenSituacao();
 }catch(e){bfcadTokenMsg(String(e.message||e).slice(0,240),false);}
};
/* Consulta publica do CNPJ.
   A funcao do banco valida e guarda, mas nao sai para a internet. Quem traz
   os dados da Receita e o proprio navegador, do mesmo jeito que o cadastro
   inicial ja faz: BrasilAPI primeiro, CNPJa como reserva. Assim o municipio,
   o codigo IBGE, o CNAE e a razao social chegam sozinhos, e a pessoa so
   confere. Nada e inventado: nao vindo resposta, os campos ficam como estao e
   a tela diz que a consulta nao respondeu. */
async function bfcadBuscarPublico(doc){
 try{
  const x=await fetch('https://brasilapi.com.br/api/cnpj/v1/'+doc);
  if(x.ok){const j=await x.json();
   return {razao:j.razao_social||j.nome_fantasia||'',fantasia:j.nome_fantasia||'',
    situacao:j.descricao_situacao_cadastral||'',municipio:j.municipio||'',uf:j.uf||'',
    ibge:String(j.codigo_municipio_ibge||''),cnae:String(j.cnae_fiscal||''),
    logradouro:[j.descricao_tipo_de_logradouro,j.logradouro].filter(Boolean).join(' '),
    numero:String(j.numero||''),bairro:j.bairro||'',cep:String(j.cep||'').replace(/\D/g,''),
    simples:(j.opcao_pelo_simples===true||j.opcao_pelo_mei===true),
    fonte:'Receita Federal, via BrasilAPI'}}
  if(x.status===404)return {naoExiste:true};
 }catch(e){}
 try{
  const x=await fetch('https://open.cnpja.com/office/'+doc);
  if(x.ok){const j=await x.json();const a=j.address||{};
   return {razao:(j.company&&j.company.name)||'',fantasia:j.alias||'',
    situacao:(j.status&&j.status.text)||'',municipio:a.city||'',uf:a.state||'',
    ibge:'',cnae:String((j.mainActivity&&j.mainActivity.id)||'').replace(/\D/g,''),
    logradouro:a.street||'',numero:String(a.number||''),bairro:a.district||'',
    cep:String(a.zip||'').replace(/\D/g,''),
    simples:!!(j.company&&j.company.simples&&j.company.simples.optant),
    fonte:'consulta pública CNPJa'}}
  if(x.status===404)return {naoExiste:true};
 }catch(e){}
 return null;
}

window.bfcadConsultar=async function(manual=true){
 if(!can())return;
 const doc=dig(v("bfcad-cnpj"));
 if(!doc||!cnpjValido(doc)){if(manual)status("CNPJ inválido: confira os 14 dígitos e os dígitos verificadores.");return}
 if(lastQuery?.cnpj===doc&&lastQuery.verificado&&!manual){status("Consulta anterior reaproveitada.",true);return}
 status("Consultando a Receita Federal...");
 const el=document.getElementById("bfcad-consulta");

 /* O banco confere o CNPJ e registra a tentativa. */
 let base=null;
 try{const {data,error:err}=await NV.sb.rpc("bf_cadastro_fiscal_consultar",{p_clinica:NV.clinicaId,p_cnpj:doc});
  if(!err)base=data;}catch(e){}
 if(dig(v("bfcad-cnpj"))!==doc)return;

 const info=await bfcadBuscarPublico(doc);
 if(dig(v("bfcad-cnpj"))!==doc)return;

 if(info&&info.naoExiste){
  lastQuery={cnpj:doc,verificado:false};
  if(el)el.textContent="Este CNPJ não foi encontrado no cadastro da Receita Federal.";
  status("CNPJ não encontrado na Receita Federal.");return;
 }
 if(!info){
  lastQuery=base||{cnpj:doc,verificado:false};
  if(el)el.textContent="A consulta pública não respondeu agora. Os campos continuam como estão.";
  status("Consulta indisponível no momento. Você pode salvar e conferir depois.");return;
 }

 const por=(id,valor)=>{const e=document.getElementById(id);if(e&&valor&&(!e.value||doc!==oldCnpj))e.value=valor};
 if(/^\d{7}$/.test(String(info.ibge||'')))por("bfcad-ibge",info.ibge);
 if(/^\d{7}$/.test(String(info.cnae||'')))por("bfcad-cnae",info.cnae);
 const sn=document.getElementById("bfcad-sn");
 if(sn&&info.simples&&!v("bfcad-im"))sn.value="sim";

 lastQuery={cnpj:doc,verificado:true,consulta:info};
 window.bfcadUltimaConsulta=lastQuery;
 const endereco=[info.logradouro,info.numero,info.bairro].filter(Boolean).join(', ');
 if(el)el.innerHTML=
  "<b>"+E(info.razao||'Razão social não informada')+"</b>"+
  (info.fantasia&&info.fantasia!==info.razao?" · "+E(info.fantasia):"")+
  "<br>Situação: "+E(info.situacao||'não informada')+
  (info.municipio?" · "+E(info.municipio)+(info.uf?"/"+E(info.uf):""):"")+
  (info.ibge?" · IBGE "+E(info.ibge):"")+
  (endereco?"<br>"+E(endereco)+(info.cep?" · CEP "+E(info.cep):""):"")+
  "<br><small>Fonte: "+E(info.fonte)+". Confira antes de salvar.</small>";
 status("Dados da Receita trazidos. Confira e salve.",true);
};
window.bfcadSalvar=async function(){
 if(!can())return error("Somente o administrador pode salvar este cadastro.");
 const doc=dig(v("bfcad-cnpj"));
 if(!cnpjValido(doc))return error("CNPJ inválido. Confira os dígitos verificadores.");
 const mudou=!!oldCnpj&&oldCnpj!==doc;
 if(mudou&&!confirm("Substituir o CNPJ fiscal anterior? Os códigos e enquadramentos do antigo emitente serão desconsiderados até revisão. Essa ação ficará registrada no histórico."))return;
 const btn=document.getElementById("bfcad-save");if(btn)btn.disabled=true;
 status("Gravando o CNPJ da clínica e vinculando ao cadastro fiscal...");
 try{
  const campos=mudou?{}:{
   inscricao_municipal:v("bfcad-im"),municipio_ibge:v("bfcad-ibge"),
   cnae:v("bfcad-cnae"),regime:v("bfcad-regime"),simples_nacional:v("bfcad-sn"),
   cpf_prestador:v("bfcad-cpf"),ctrib_nacional:v("bfcad-tribn"),
   ctrib_municipal:v("bfcad-tribm"),codigo_nbs:v("bfcad-nbs"),
   serie_dps:v("bfcad-serie"),ambiente:v("bfcad-ambiente")
  };
  const {data,error:err}=await NV.sb.rpc("bf_cadastro_fiscal_salvar",{
   p_clinica:NV.clinicaId,p_cnpj:doc,p_dados:campos,p_confirmar_troca:mudou
  });
  if(err)throw err;
  if(!data?.ok)throw Error("Cadastro não confirmado pelo servidor.");
  S.config.cnpj=doc;save();
  oldCnpj=doc;
  toast("CNPJ salvo na clínica e vinculado à NFS-e.");
  await window.bfcadLoad();
  const msg=data.verificado?
   "CNPJ salvo e consultado. Você já pode abrir a NFS-e; confira a inscrição municipal e os códigos fiscais.":
   "CNPJ salvo. Consulta pública indisponível neste momento; confira os dados e tente novamente.";
  status(msg,data.verificado);
 }catch(e){error(e);}finally{const x=document.getElementById("bfcad-save");if(x)x.disabled=false;}
};
window.bfcadCadastrarDaNfse=async function(cnpj,campos){
 if(!can())throw Error("Somente administrador pode cadastrar CNPJ.");
 const doc=dig(cnpj);
 if(!cnpjValido(doc))throw Error("CNPJ inválido: confira os dígitos verificadores.");
 const [cr,fr]=await Promise.all([
   NV.sb.from("clinicas").select("cnpj").eq("id",NV.clinicaId).single(),
   NV.sb.from("bf_fiscal_config").select("cnpj").eq("clinica_id",NV.clinicaId).maybeSingle()
 ]);
 if(cr.error)throw cr.error;if(fr.error)throw fr.error;
 const old=dig(cr.data?.cnpj||fr.data?.cnpj||"");
 const mudou=!!old&&old!==doc;
 if(mudou&&!confirm("Substituir o CNPJ do emitente? Isso altera o cadastro fiscal e requer revisão dos códigos tributários."))return null;
 const {data,error:err}=await NV.sb.rpc("bf_cadastro_fiscal_salvar",{
  p_clinica:NV.clinicaId,p_cnpj:doc,
  p_dados:mudou?{}:campos||{},
  p_confirmar_troca:mudou
 });
 if(err)throw err;
 if(!data?.ok)throw Error("CNPJ não foi gravado.");
 S.config.cnpj=doc;save();
 return data;
};
})();
