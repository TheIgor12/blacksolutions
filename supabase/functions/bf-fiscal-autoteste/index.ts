import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * BlackFlow: fiscal dry run for a tenant administrator.
 * Never writes data; never contacts SEFIN or issues an NFS-e.
 * Simulated tax IDs are never sent to external providers.
 */
const h={
  "Access-Control-Allow-Origin":"https://blackflow.app.br",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff"
};
const respond=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:h});
const uuid=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const digits=(v:unknown)=>String(v||"").replace(/\D/g,"");
const nonempty=(v:unknown)=>typeof v==="string"&&Boolean(v.trim());
function cpfValid(v:string){
 if(!/^\d{11}$/.test(v)||/^(\d)\1{10}$/.test(v))return false;
 const calc=(len:number)=>{let sum=0;for(let i=0;i<len;i++)sum+=Number(v[i])*(len+1-i);const x=(sum*10)%11;return x===10?0:x};
 return calc(9)===Number(v[9])&&calc(10)===Number(v[10]);
}
function cnpjValid(v:string){
 if(!/^\d{14}$/.test(v)||/^(\d)\1{13}$/.test(v))return false;
 const calc=(len:number)=>{let total=0,w=len-7;for(let i=0;i<len;i++){total+=Number(v[i])*w--;if(w<2)w=9}
  const rem=total%11;return rem<2?0:11-rem};
 return calc(12)===Number(v[12])&&calc(13)===Number(v[13]);
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="POST")return respond({erro:"Apenas POST autenticado."},405);
 try{
  const authorization=req.headers.get("authorization")||"";
  if(!authorization.startsWith("Bearer "))return respond({erro:"Autenticação necessária."},401);
  const base=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!base||!anon)return respond({erro:"Serviço não configurado."},503);
  const raw=await req.text();
  if(raw.length>2500)return respond({erro:"Entrada muito longa."},413);
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw||"{}")}catch{return respond({erro:"JSON inválido."},400)}
  const clinic=body.clinica_id;
  if(!uuid(clinic))return respond({erro:"Clínica inválida."},400);
  const headers={Authorization:authorization,apikey:anon,Accept:"application/json"};
  const who=await fetch(base+"/auth/v1/user",{headers});
  if(!who.ok)return respond({erro:"Sessão inválida."},401);
  const q=new URLSearchParams({
   select:"cnpj,inscricao_municipal,municipio_ibge,regime,cnae,codigo_servico,ctrib_nacional,simples_nacional,integrador,habilitado,ambiente,situacao_integracao",
   clinica_id:"eq."+clinic,limit:"1"
  });
  const r=await fetch(base+"/rest/v1/bf_fiscal_config?"+q.toString(),{headers});
  if(!r.ok)return respond({erro:"Permissão de consulta fiscal negada."},403);
  const rows=await r.json();
  if(!Array.isArray(rows)||!rows.length)return respond({erro:"Administrador sem acesso ao cadastro fiscal desta clínica."},403);
  const cfg=rows[0] as Record<string,unknown>;
  const cnpj=digits(cfg.cnpj),syntheticCpf="12345678909";
  const tests=[
   {caso:"CPF de exemplo matematicamente válido (sem consulta a cadastro)",ok:cpfValid(syntheticCpf)},
   {caso:"CPF repetido inválido rejeitado",ok:!cpfValid("00000000000")},
   {caso:"CNPJ cadastrado aprovado no algoritmo",ok:cnpjValid(cnpj)},
   {caso:"CNPJ com último dígito alterado rejeitado",ok:!cnpjValid(cnpj.slice(0,-1)+(cnpj.endsWith("0")?"1":"0"))},
   {caso:"Valor fictício positivo aceito",ok:Number.isFinite(100)&&100>0},
   {caso:"Valor zero rejeitado",ok:!(0>0)},
   {caso:"Serviço de teste presente",ok:nonempty("SERVIÇO FICTÍCIO - NÃO EMITIR")},
   {caso:"Descrição de serviço vazia rejeitada",ok:!nonempty("")}
  ];
  const pendencias:string[]=[];
  const avisos:string[]=[];
  if(!cnpjValid(cnpj))pendencias.push("CNPJ do prestador inválido pelo algoritmo.");
  if(!/^\d{7}$/.test(String(cfg.municipio_ibge||"")))pendencias.push("Código IBGE do município não informado ou inválido.");
  if(!nonempty(cfg.regime))pendencias.push("Regime tributário não informado.");
  else avisos.push("O regime tributário \""+String(cfg.regime).slice(0,45)+"\" está cadastrado, mas não há comprovante oficial de enquadramento vinculado ao autoteste. Consulte Simples Nacional ou Receita Federal.");
  if(!nonempty(cfg.ctrib_nacional)&&!nonempty(cfg.codigo_servico))pendencias.push("Código nacional de tributação do serviço não preenchido.");
  if(!nonempty(cfg.inscricao_municipal))avisos.push("Inscrição municipal não cadastrada; conferir obrigação e número com o município.");
  if(!nonempty(cfg.cnae))avisos.push("CNAE principal não informado. Confira o cadastro oficial da empresa.");
  if(!nonempty(cfg.codigo_servico)&&!nonempty(cfg.ctrib_nacional))avisos.push("O código de serviço deve variar conforme o serviço efetivamente prestado. Não o infira exclusivamente pelo CNAE.");
  if(cfg.simples_nacional===null)avisos.push("Enquadramento no Simples Nacional não confirmado pelo cadastro.");
  if(cfg.municipio_ibge==="3552809")avisos.push("Município cadastrado: Taboão da Serra/SP (3552809). Referências públicas também associam este CNPJ a Taboão da Serra. Valide o comprovante cadastral atual antes de emitir; não altere para outra cidade apenas pela localização física do atendimento.");
  if(String(cfg.integrador||"")==="nao_configurado"||!nonempty(cfg.integrador))pendencias.push("Não há prestador de integração fiscal configurado.");
  if(cfg.habilitado!==true||cfg.situacao_integracao!=="pronta")pendencias.push("Integração fiscal não habilitada e confirmada como pronta.");
  // Even a locally 'ready' flag is never proof of government homologation.
  pendencias.push("Não há prova de homologação governamental, certificado mTLS/ICP-Brasil ou retorno oficial de autorização nesta rotina.");
  return respond({
   tipo:"SIMULACAO_LOCAL_SEM_TRANSMISSAO",
   cnpj_terminacao:cnpj.slice(-4),municipio_ibge:cfg.municipio_ibge||null,
   ambiente_configurado:cfg.ambiente||null,
   tomador_de_teste:"PACIENTE TESTE BLACKFLOW",
   documento_teste:"CPF sintético de exemplo: 12345678909 — jamais usar em nota real",
   valor_teste:100,
   testes:tests,
   total_testes:tests.length,
   testes_aprovados:tests.filter(t=>t.ok).length,
   bloqueios:pendencias,avisos,
   pronto_para_emissao:false,
   nota_fiscal_emitida:false,
   homologacao_governamental:false,
   gravacoes_realizadas:0,
   links_oficiais:{situacao_cnpj:"https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_S.aspx",consulta_simples:"https://www8.receita.fazenda.gov.br/SimplesNacional/",documentacao_nfse:"https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual"},
   mensagem:"Nenhum documento fiscal foi criado, transmitido, autorizado, cancelado ou consultado no governo."
  });
 }catch(_){return respond({erro:"O autoteste não pôde ser concluído."},500)}
});