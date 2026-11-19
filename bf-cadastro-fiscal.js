/* BlackFlow 1.14.0 — Cadastro fiscal unificado (todos os segmentos).
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
   '<div id="bfcad-msg" role="status" style="min-height:22px;margin:10px 0"></div>'+
   '<button class="btn" id="bfcad-save" onclick="bfcadSalvar()">Salvar e vincular à NFS-e</button>'+
   '<p class="sub" style="margin-top:10px">O CNPJ pertence à clínica, não ao navegador. Caso precise alterá-lo futuramente, somente o administrador poderá confirmar a substituição.</p>';
 }catch(e){el.innerHTML='<h2>Cadastro fiscal e CNPJ</h2><div class="note">Não foi possível carregar o cadastro: '+E(e.message||e)+'</div>';}
};
window.bfcadConsultar=async function(manual=true){
 if(!can())return;
 const doc=dig(v("bfcad-cnpj"));
 if(!doc||!cnpjValido(doc)){if(manual)status("CNPJ inválido: confira os 14 dígitos e os dígitos verificadores.");return}
 if(lastQuery?.cnpj===doc&&lastQuery.verificado){
  if(manual)status("Consulta anterior reaproveitada.",true);return;
 }
 status("Consultando dados cadastrais públicos...");
 const el=document.getElementById("bfcad-consulta");
 try{
  const {data,error:err}=await NV.sb.rpc("bf_cadastro_fiscal_consultar",{p_clinica:NV.clinicaId,p_cnpj:doc});
  if(err)throw err;
  if(dig(v("bfcad-cnpj"))!==doc)return;
  lastQuery=data;
  const info=data?.consulta||{};
  if(info.ibge&&/^\d{7}$/.test(String(info.ibge))&&(!v("bfcad-ibge")||doc!==oldCnpj))document.getElementById("bfcad-ibge").value=info.ibge;
  if(info.cnae&&/^\d{7}$/.test(String(info.cnae))&&(!v("bfcad-cnae")||doc!==oldCnpj))document.getElementById("bfcad-cnae").value=info.cnae;
  if(el)el.textContent=data.verificado?
   "Razão social: "+(info.razao||"não informada")+" · Situação: "+(info.situacao||"não informada")+" · Fonte: "+(info.fonte||"consulta pública"):
   data.aviso||"Consulta pública indisponível";
  status(data.verificado?"Dados consultados. Confira os campos antes de salvar.":(data.aviso||"Consulta indisponível."),data.verificado);
 }catch(e){status("Não foi possível consultar agora. Você ainda pode salvar um CNPJ válido e conferir os dados depois.");}
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
