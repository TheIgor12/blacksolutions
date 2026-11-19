import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * BlackFlow: national tenant-safe routing and coverage simulation for NFS-e.
 * No fiscal document is issued, no third-party credential is handled.
 * NATIONAL emitter versus municipal issuer is decided per establishment.
 */
const HEADERS={
 "Access-Control-Allow-Origin":"https://blackflow.app.br",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff"
};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const validUUID=x=>typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
const onlyDigits=x=>String(x??"").replace(/\D/g,"");
const ufPorPrefixo={
 "11":"RO","12":"AC","13":"AM","14":"RR","15":"PA","16":"AP","17":"TO",
 "21":"MA","22":"PI","23":"CE","24":"RN","25":"PB","26":"PE","27":"AL",
 "28":"SE","29":"BA","31":"MG","32":"ES","33":"RJ","35":"SP",
 "41":"PR","42":"SC","43":"RS","50":"MS","51":"MT","52":"GO","53":"DF"
};
const CAPITAIS_DE_TESTE=[
 ["RO","1100205"],["AC","1200401"],["AM","1302603"],["RR","1400100"],
 ["PA","1501402"],["AP","1600303"],["TO","1721000"],["MA","2111300"],
 ["PI","2211001"],["CE","2304400"],["RN","2408102"],["PB","2507507"],
 ["PE","2611606"],["AL","2704302"],["SE","2800308"],["BA","2927408"],
 ["MG","3106200"],["ES","3205309"],["RJ","3304557"],["SP","3550308"],
 ["PR","4106902"],["SC","4205407"],["RS","4314902"],["MS","5002704"],
 ["MT","5103403"],["GO","5208707"],["DF","5300108"]
];
const docs={
 nacional:"https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual",
 api:"https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao",
 anvisa:"https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr",
 conselho:"https://validar.iti.gov.br/"
};
function ufForMunicipio(municipio){
 const s=onlyDigits(municipio);
 return /^\d{7}$/.test(s)?ufPorPrefixo[s.slice(0,2)]||null:null;
}
function isCnpjValid(v){
 v=onlyDigits(v);
 if(!/^\d{14}$/.test(v)||/^(\d)\1{13}$/.test(v))return false;
 const d=n=>{let sum=0,w=n-7;for(let i=0;i<n;i++){sum+=Number(v[i])*w--;if(w<2)w=9}const r=sum%11;return r<2?0:11-r};
 return d(12)===Number(v[12])&&d(13)===Number(v[13]);
}
function norm(t){return String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function selecionarRota(cfg){
 const municipio=onlyDigits(cfg.municipio_ibge),uf=ufForMunicipio(municipio);
 const regime=norm(cfg.regime);
 const mei=regime==="mei"||regime.includes("microempreendedor individual");
 const simples=cfg.simples_nacional===true||regime.includes("simples nacional");
 const outraForma=cfg.simples_nacional===false||regime.includes("lucro presumido")||regime.includes("lucro real");
 const conflito=simples&&(cfg.simples_nacional===false||regime.includes("lucro presumido")||regime.includes("lucro real"));
 const rota={
  municipio_ibge:municipio||null,uf,
  regime_declarado:String(cfg.regime||"")||null,
  cnpj_validacao_matematica:cfg.cnpj?isCnpjValid(cfg.cnpj):null,
  emissor_indicado:null,alternativas:[],classificacao:null,
  status_autorizacao:"NAO_VERIFICADA",
  integracao_configurada:cfg.habilitado===true&&cfg.situacao_integracao==="pronta",
  notas_reais_autorizadas_por_esta_funcao:0,
  itens_verificar:[]
 };
 if(!uf){rota.classificacao="municipio_nao_identificado";rota.itens_verificar.push("Código IBGE válido do estabelecimento");return rota}
 if(conflito){rota.classificacao="regime_contraditorio";rota.itens_verificar.push("Corrigir divergência entre regime e campo Simples Nacional");return rota}
 if(mei||simples){
  rota.classificacao="emissor_nacional_obrigatorio";
  rota.emissor_indicado="sefin_nacional";
  rota.alternativas=["Emissor Público Nacional via API ou portal"];
 }else if(outraForma){
  rota.classificacao="emissor_dependente_da_opcao_municipal";
  rota.emissor_indicado="consultar_parametros_e_habilitacao";
  rota.alternativas=["sefin_nacional_se_habilitado","emissor_municipal_integrado_ao_ADN"];
  rota.itens_verificar.push("Consultar opção do município, convênio e credenciamento para o regime do prestador");
 }else{
  rota.classificacao="enquadramento_pendente";
  rota.emissor_indicado="consultar_enquadramento";
  rota.alternativas=["sefin_nacional","emissor_municipal"];
  rota.itens_verificar.push("Confirmar o regime do estabelecimento; sem supor Simples ou Lucro Presumido");
 }
 if(rota.cnpj_validacao_matematica===false)rota.itens_verificar.push("Conferir dígitos verificadores do CNPJ");
 if(!rota.integracao_configurada)rota.itens_verificar.push("Configurar credencial autorizada e conector correspondente APENAS neste estabelecimento");
 rota.itens_verificar.push("Selecionar cTribNac por serviço, com parâmetros municipais e IBS/CBS conforme leiaute vigente");
 return rota;
}
function simularCobertura(){
 const cenarios=CAPITAIS_DE_TESTE.map(([uf,municipio])=>{
  const s=selecionarRota({municipio_ibge:municipio,regime:"Simples Nacional",simples_nacional:true});
  const l=selecionarRota({municipio_ibge:municipio,regime:"Lucro Presumido",simples_nacional:false});
  return {uf,ibge_exemplo:municipio,
   simples:{classificacao:s.classificacao,canal:s.emissor_indicado},
   lucro:{classificacao:l.classificacao,canal:l.emissor_indicado},
   passou:s.uf===uf&&l.uf===uf&&s.emissor_indicado==="sefin_nacional"&&l.classificacao==="emissor_dependente_da_opcao_municipal"};
 });
 const erros=[
  {caso:"Município IBGE inexistente como UF",passou:selecionarRota({municipio_ibge:"9900000",regime:"MEI"}).classificacao==="municipio_nao_identificado"},
  {caso:"Regime desconhecido não classificado automaticamente",passou:selecionarRota({municipio_ibge:"3550308",regime:""}).classificacao==="enquadramento_pendente"},
  {caso:"Simples contraditório não libera emissão",passou:selecionarRota({municipio_ibge:"3550308",regime:"Lucro Presumido",simples_nacional:true}).classificacao==="regime_contraditorio"},
  {caso:"CNPJ inválido não aprovado",passou:selecionarRota({municipio_ibge:"3550308",regime:"MEI",cnpj:"34160123000102"}).cnpj_validacao_matematica===false},
  {caso:"Cliente SC não depende de SP",passou:selecionarRota({municipio_ibge:"4208906",regime:"Simples Nacional",simples_nacional:true}).uf==="SC"},
  {caso:"Cliente PR não depende de SP",passou:selecionarRota({municipio_ibge:"4106902",regime:"Simples Nacional",simples_nacional:true}).uf==="PR"}
 ];
 return {ufs_exercitadas:cenarios.length,cenarios_de_roteamento:cenarios.length*2+erros.length,
   aprovados:cenarios.filter(x=>x.passou).length*2+erros.filter(x=>x.passou).length,
   regioes:cenarios,negativos:erros};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return reply({erro:"Utilize POST autenticado."},405);
 try{
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))return reply({erro:"Sessão obrigatória"},401);
  const base=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!base||!anon)return reply({erro:"Serviço não configurado."},503);
  const raw=await req.text();
  if(raw.length>2048)return reply({erro:"Dados excessivos."},413);
  let body;
  try{body=JSON.parse(raw||"{}")}catch{return reply({erro:"JSON inválido."},400)}
  if(!validUUID(body.clinica_id))return reply({erro:"ID da clínica inválido."},400);
  const headers={Authorization:auth,apikey:anon,Accept:"application/json"};
  const session=await fetch(base+"/auth/v1/user",{headers});
  if(!session.ok)return reply({erro:"Sessão inválida."},401);
  const params=new URLSearchParams({
   select:"clinica_id,cnpj,municipio_ibge,regime,simples_nacional,integrador,habilitado,situacao_integracao,ctrib_nacional,cnae",
   clinica_id:"eq."+body.clinica_id,limit:"1"
  });
  const response=await fetch(base+"/rest/v1/bf_fiscal_config?"+params,{headers});
  if(!response.ok)return reply({erro:"Consulta negada por permissões da clínica."},403);
  const list=await response.json();
  if(!Array.isArray(list)||!list.length)return reply({erro:"Cadastro fiscal indisponível para esta clínica."},403);
  const cfg=list[0];
  const rota=selecionarRota(cfg);
  const cobertura=simularCobertura();
  return reply({
   versao:"2026-11-19",
   escopo:"ROTEAMENTO_NACIONAL_POR_CLINICA",
   isolado_por_clinica:true,
   clinica_id:body.clinica_id,
   cnpj_final:onlyDigits(cfg.cnpj).slice(-4),
   rota_da_clinica:rota,
   cobertura_simulada:cobertura,
   homologado_pelo_governo:false,
   emissao_fiscal_real:false,
   conformidade_sncr_automatica:false,
   aviso:"O teste verifica o roteamento nacional por UF/regime. Não demonstra credenciamento, cobertura efetiva de conectores municipais, XML assinado, retorno fiscal autorizado ou assinatura jurídica de receitas.",
   fontes:docs
  });
 }catch(_){return reply({erro:"Não foi possível conferir cobertura nacional."},500)}
});
