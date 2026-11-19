import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Public registry lookup for BlackFlow PDF QR Codes.
 * This does NOT validate an ICP-Brasil signature, professional license or ANVISA/SNCR prescription.
 * Only a random 256-bit bearer token is accepted. No patient data or PDF is returned.
 */
const HEADERS:Record<string,string>={
 "Content-Type":"application/json; charset=utf-8",
 "Access-Control-Allow-Origin":"https://blackflow.app.br",
 "Access-Control-Allow-Methods":"GET, OPTIONS",
 "Access-Control-Allow-Headers":"content-type",
 "Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff"
};
const send=(json:unknown,status=200)=>new Response(JSON.stringify(json),{status,headers:HEADERS});
function shaHex(b:ArrayBuffer){return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="GET")return send({erro:"Método não permitido."},405);
 try{
  const {searchParams}=new URL(req.url),token=searchParams.get("token")||"";
  if(!/^[0-9a-f]{64}$/.test(token))return send({encontrado:false,erro:"Código QR inválido."},400);
  const base=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!secret)return send({erro:"Serviço temporariamente indisponível."},503);
  const hash=shaHex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));
  const q=new URLSearchParams({
   select:"tipo,status,criado_em,pdf_rascunho_sha256,pdf_assinado_sha256",
   verificacao_token_hash:"eq."+hash,limit:"1"
  });
  const response=await fetch(base+"/rest/v1/bf_receituario_documentos?"+q.toString(),{
   method:"GET",headers:{apikey:secret,Authorization:"Bearer "+secret,Accept:"application/json"},
   signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)return send({erro:"Falha ao consultar o registro."},503);
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length===0)return send({encontrado:false,erro:"Registro não localizado."},404);
  const doc=rows[0];
  const signed=Boolean(doc.pdf_assinado_sha256&&doc.status==="assinado_externo_nao_validado");
  return send({
   encontrado:true,
   tipo:typeof doc.tipo==="string"?doc.tipo:"documento",
   criado_em:doc.criado_em,
   situacao:signed?"Arquivo assinado anexado pelo profissional; assinatura não verificada pelo BlackFlow.":"Rascunho registrado, sem assinatura digital validada.",
   assinatura_validada:false,
   validade_juridica_atestada:false,
   sha256_rascunho:doc.pdf_rascunho_sha256||null,
   sha256_assinado:doc.pdf_assinado_sha256||null,
   aviso:"A coincidência do hash confirma apenas que o arquivo corresponde ao registro. Valide separadamente assinatura e requisitos profissionais. Receitas controladas exigem fluxo oficial da Anvisa."
  });
 }catch(_){return send({erro:"Não foi possível concluir a consulta."},503);}
});