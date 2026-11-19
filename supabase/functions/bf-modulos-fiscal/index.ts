import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * BlackFlow Fiscal API 1.11.0.
 * Exposes tenant-restricted drafts, validations and payment reconciliation.
 * Does NOT submit NFS-e without certified and homologated SEFIN integration.
 */
const h = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
 "Content-Type": "application/json; charset=utf-8",
 "Cache-Control": "no-store"
};
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:h});
const uuid=(s:unknown)=>typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const str=(v:unknown,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const digits=(v:unknown)=>str(v,40).replace(/\D/g,"");
const money=(v:unknown)=>typeof v==="number"?v:Number(v);
function validCpf(input:string){
 if(!/^\d{11}$/.test(input)||/^(\d)\1{10}$/.test(input))return false;
 const check=(n:number)=>{let s=0;for(let i=0;i<n;i++)s+=Number(input[i])*(n+1-i);const z=(s*10)%11;return z===10?0:z};
 return check(9)===Number(input[9])&&check(10)===Number(input[10]);
}
function validCnpj(v:string){
 if(!/^\d{14}$/.test(v)||/^(\d)\1{13}$/.test(v))return false;
 const d=(length:number)=>{let sum=0,weight=length-7;for(let i=0;i<length;i++){sum+=Number(v[i])*weight--;if(weight<2)weight=9}const rem=sum%11;return rem<2?0:11-rem};
 return d(12)===Number(v[12])&&d(13)===Number(v[13]);
}
const validDoc=(v:string)=>v.length===11?validCpf(v):v.length===14?validCnpj(v):false;
type Data=Record<string,unknown>;
function validate(note:Data,cfg:Data){
 const errors:string[]=[],warnings:string[]=[];
 const cnpj=digits(cfg.cnpj),cpf=digits(cfg.cpf_prestador);
 if(!validCnpj(cnpj)&&!validCpf(cpf))errors.push("Prestador sem CNPJ ou CPF válido cadastrado.");
 if(!/^\d{7}$/.test(str(cfg.municipio_ibge)))errors.push("Código IBGE do município do prestador é obrigatório.");
 if(!str(cfg.regime))errors.push("Informe o regime tributário com o contador.");
 if(!str(cfg.ctrib_nacional)&&!str(cfg.codigo_servico))errors.push("Informe o código nacional de tributação/serviço adequado.");
 if(!str(note.descricao_servico,900))errors.push("Descrição fiscal do serviço está vazia.");
 if(!Number.isFinite(money(note.valor))||money(note.valor)<=0)errors.push("Valor do serviço deve ser positivo.");
 if(!str(note.tomador_nome))warnings.push("Confira se a identificação do tomador é exigida neste documento.");
 const doc=digits(note.tomador_documento);
 if(doc&&!validDoc(doc))errors.push("CPF/CNPJ do tomador informado é inválido.");
 if(!str(note.competencia))warnings.push("Competência fiscal deve ser definida antes da emissão.");
 if(!str(note.codigo_tributacao_nacional)&&!str(cfg.ctrib_nacional))
   warnings.push("Código de tributação nacional deve ser conferido pelo contador.");
 if(!cfg.simples_nacional&&cfg.simples_nacional!==false)
   warnings.push("Enquadramento no Simples Nacional ainda não está confirmado.");
 if(!cfg.habilitado||cfg.situacao_integracao!=="pronta")
   warnings.push("Integração fiscal não está homologada/habilitada. Não é possível transmitir.");
 return {valido_para_preparacao:errors.length===0,erros:errors,avisos:warnings,
         liberada_para_emissao:false,emissao:"DESABILITADA_SEM_CERTIFICADO_E_INTEGRACAO"};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 try{
 const base=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!base||!anon)return out({erro:"Serviço não configurado"},503);
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return out({erro:"Entre na sua conta."},401);
 const shared:Record<string,string>={Authorization:authorization,apikey:anon};
 const me=await fetch(base+"/auth/v1/user",{headers:shared});
 if(!me.ok)return out({erro:"Token inválido ou expirado."},401);
 const url=new URL(req.url),path=url.pathname.split("/").filter(Boolean).pop()||"";
 const raw=await (req.method==="POST"?req.text():Promise.resolve(""));
 if(raw.length>16384)return out({erro:"Solicitação muito grande."},413);
 let payload:Data={};
 if(raw){try{payload=JSON.parse(raw)}catch{return out({erro:"JSON inválido"},400)}}
 const clinic=str(payload.clinica_id||url.searchParams.get("clinica_id"),60);
 if(path==="catalogo"&&req.method==="GET"){
  const seg=url.searchParams.get("segmento");
  if(!["odontologia","biomedicina"].includes(seg||""))return out({erro:"Segmento inválido"},400);
  const q=new URLSearchParams({select:"codigo,categoria,nome,observacao",segmento:"eq."+seg,ativo:"eq.true",order:"categoria.asc,nome.asc"});
  const r=await fetch(base+"/rest/v1/bf_catalogo_servicos?"+q,{headers:shared});
  return out({data:await r.json()},r.status);
 }
 if(!uuid(clinic))return out({erro:"Identificador da clínica inválido."},400);
 async function rest(table:string,query:URLSearchParams){
  const r=await fetch(base+"/rest/v1/"+table+"?"+query,{headers:shared});
  if(!r.ok)return null;
  return await r.json();
 }
 const q=new URLSearchParams({select:"clinica_id,cnpj,cpf_prestador,municipio_ibge,inscricao_municipal,cnae,regime,codigo_servico,ctrib_nacional,ctrib_municipal,codigo_nbs,simples_nacional,integrador,ambiente,situacao_integracao,habilitado",clinica_id:"eq."+clinic,limit:"1"});
 const cfgs=await rest("bf_fiscal_config",q);
 if(!cfgs)return out({erro:"Acesso fiscal negado."},403);
 const cfg=(cfgs as Data[])[0]||{};
 if(path==="configuracao"&&req.method==="GET"){
  const cnpj=digits(cfg.cnpj);
  const itens=[
   {campo:"CNPJ",estado:validCnpj(cnpj)?"formato_valido":"pendente",detalhe:"Validade matemática não prova situação cadastral nem autorização."},
   {campo:"Município IBGE",estado:/^\d{7}$/.test(str(cfg.municipio_ibge))?"informado_nao_confirmado":"pendente",detalhe:"Confirmar município do estabelecimento no comprovante atual da Receita Federal."},
   {campo:"Regime tributário",estado:str(cfg.regime)?"declarado_nao_comprovado":"pendente",detalhe:"Conferir no Simples Nacional ou com a contabilidade."},
   {campo:"CNAE",estado:str(cfg.cnae)?"informado":"pendente",detalhe:"CNAE não determina sozinho o código fiscal do serviço."},
   {campo:"Código tributário",estado:(str(cfg.ctrib_nacional)||str(cfg.codigo_servico))?"informado_nao_confirmado":"pendente",detalhe:"Código nacional deve corresponder ao serviço específico."},
   {campo:"Inscrição municipal",estado:str(cfg.inscricao_municipal)?"informada_nao_confirmada":"verificar_exigencia",detalhe:"Verificar exigência e número oficial com o município."},
   {campo:"Integração homologada",estado:"pendente",detalhe:"Sem credenciais e prova de autorização do emissor fiscal."}
  ];
  const taboao=str(cfg.municipio_ibge)==="3552809";
  const roteiro=taboao?{
   cidade:"Taboão da Serra/SP",
   orientacao:"O código municipal já está preenchido. Desde 01/11/2026, optantes do Simples Nacional usam o Emissor Nacional; demais regimes devem conferir o emissor municipal aplicável.",
   portal_municipal:"https://nfe.etransparencia.com.br/sp.taboaodaserra/nfe/principal.aspx",
   portal_nacional:"https://www.nfse.gov.br/EmissorNacional"
  }:{
   cidade:null,
   orientacao:"Confirme a rota fiscal conforme município e regime do prestador.",
   portal_nacional:"https://www.nfse.gov.br/EmissorNacional"
  };
  return out({
   configurada:Boolean(cfgs?.length),situacao_integracao:cfg.situacao_integracao||"nao_configurada",
   emissao_automatica_disponivel:false,ambiente:cfg.ambiente||"homologacao",
   itens,roteiro,
   criterio:"Emissão não homologada. É obrigatório credenciamento no emissor aplicável e confirmação oficial. Certificado, assinatura e credenciais dependem da modalidade."
  });
 }
 if(path==="notas"&&req.method==="GET"){
  const qn=new URLSearchParams({select:"id,origem,descricao_servico,valor,status,numero_nfse,chave_acesso,motivo_rejeicao,criado_em,pagamento_externo_id",clinica_id:"eq."+clinic,order:"criado_em.desc",limit:"50"});
  const notes=await rest("bf_fiscal_notas",qn);
  if(!notes)return out({erro:"Acesso não autorizado."},403);
  return out({data:notes});
 }
 if(path==="validar"&&req.method==="POST"){
  const note_id=str(payload.nota_id,50);
  if(!uuid(note_id))return out({erro:"Nota inválida."},400);
  const qn=new URLSearchParams({select:"*",id:"eq."+note_id,clinica_id:"eq."+clinic,limit:"1"});
  const notes=await rest("bf_fiscal_notas",qn);
  if(!notes)return out({erro:"Sem permissão."},403);
  const note=(notes as Data[])[0];
  if(!note)return out({erro:"Rascunho não localizado nesta clínica."},404);
  return out({nota_id:note.id,...validate(note,cfg)});
 }
 if(path==="rascunho"&&req.method==="POST"){
  const descricao_servico=str(payload.descricao_servico,900),valor=money(payload.valor);
  const origem=str(payload.origem,30);
  if(!["atendimento","servico","pacote","outro"].includes(origem)||!descricao_servico||
      !Number.isFinite(valor)||valor<=0||valor>10000000)return out({erro:"Serviço, origem ou valor inválido."},400);
  const doc=digits(payload.tomador_documento);if(doc&&!validDoc(doc))return out({erro:"CPF/CNPJ do tomador inválido."},400);
  const dto:Data={clinica_id:clinic,origem,descricao_servico,valor,status:"rascunho",
    origem_ref:str(payload.origem_ref,160)||null,
    paciente_ref:str(payload.paciente_ref,160)||null,
    tomador_nome:str(payload.tomador_nome,200)||null,
    tomador_documento:doc||null,
    tomador_email:str(payload.tomador_email,200)||null,
    competencia:str(payload.competencia,10)||null,
    codigo_servico:str(payload.codigo_servico,70)||null,
    codigo_tributacao_nacional:str(payload.codigo_tributacao_nacional,70)||null,
    codigo_tributacao_municipal:str(payload.codigo_tributacao_municipal,70)||null,
    codigo_nbs:str(payload.codigo_nbs,70)||null,
    municipio_prestacao_ibge:str(payload.municipio_prestacao_ibge,7)||null,
    meio_pagamento:str(payload.meio_pagamento,40)||null,
    pagamento_externo_id:str(payload.pagamento_externo_id,180)||null,
    informacoes_adicionais:str(payload.informacoes_adicionais,500)||null};
  const r=await fetch(base+"/rest/v1/bf_fiscal_notas?select=id,clinica_id,status,valor,criado_em",{
    method:"POST",headers:{...shared,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(dto)});
  if(!r.ok)return out({erro:"Rascunho não foi gravado. Confira suas permissões e campos."},r.status===401||r.status===403?r.status:422);
  return out({data:await r.json(),observacao:"Rascunho salvo. Nenhuma nota foi transmitida."},201);
 }
 if(path==="emitir"&&req.method==="POST"){
  return out({erro:"Emissão automática indisponível: falta integração homologada e autorização do emissor fiscal aplicável.",
    status:"PENDENTE_DE_INTEGRACAO",
    alternativa:"https://www.nfse.gov.br/EmissorNacional"},412);
 }
 return out({erro:"Rota não localizada."},404);
 }catch(e){return out({erro:"Falha ao processar solicitação.",tipo:e instanceof Error?e.name:"erro"},500)}
});
