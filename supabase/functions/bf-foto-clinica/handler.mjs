import {verifyPng,sha256,maxPngBytes} from './png.mjs';

const UID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const SHA=/^[0-9a-f]{64}$/;
const VIEWS=new Set(['frontal','perfil_direito','perfil_esquerdo','obliqua_direita','obliqua_esquerda']);
const EXPRESSIONS=new Set(['repouso','contracao']);
const allowed=['authorization','apikey','x-client-info','content-type','x-bf-clinica','x-bf-ficha','x-bf-paciente','x-bf-vista','x-bf-expressao','x-bf-fonte-sha'];
async function read(req){
 const n=Number(req.headers.get('Content-Length'));
 if(n>maxPngBytes||!req.body)throw Error('Tamanho');
 const r=req.body.getReader(), parts=[];let total=0;
 try{for(;;){const k=await r.read();if(k.done)break;
   if((total+=k.value.length)>maxPngBytes)throw Error('Tamanho');
   parts.push(k.value);
 }}finally{await r.cancel().catch(()=>{});}
 const blob=new Uint8Array(total);let i=0;for(const x of parts){blob.set(x,i);i+=x.length;}return blob;
}

export function photoHandler({base,anon,secret,origin='https://blackflow.app.br',fetcher=fetch}){
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin'
 }});
 const srv={apikey:secret,Authorization:'Bearer '+secret};
 const rpc=(name,body)=>fetcher(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{...srv,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 return async req=>{
  if(req.headers.has('Origin')&&req.headers.get('Origin')!==origin)return json({erro:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':allowed.join(', '),'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
  if(req.method!=='POST')return json({erro:'Método não permitido.'},405);
  if(!base||!anon||!secret)return json({erro:'Serviço temporariamente indisponível.'},503);
  const bearer=req.headers.get('Authorization')||'';
  if(!/^Bearer [^ ]+$/.test(bearer))return json({erro:'Inicie sessão.'},401);
  const c=req.headers.get('x-bf-clinica'),p=req.headers.get('x-bf-ficha'),v=req.headers.get('x-bf-vista');
  const r=req.headers.get('x-bf-paciente');
  const e=req.headers.get('x-bf-expressao')||null,o=req.headers.get('x-bf-fonte-sha');
  if(!UID.test(c||'')||!UID.test(p||'')||!/^[A-Za-z0-9_-]{1,100}$/.test(r||'')||!VIEWS.has(v)||(v==='frontal'?!EXPRESSIONS.has(e):e!==null)||!SHA.test(o||'')||req.headers.get('Content-Type')!=='image/png')
    return json({erro:'Confira a ficha, a vista e o arquivo de origem.'},400);
  let storage, uploading=false;
  try{
   const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:bearer},signal:AbortSignal.timeout(8000)});
   if(!auth.ok)return json({erro:'Sessão não confirmada.'},401);
   const u=(await auth.json()).id;
   if(!UID.test(u||''))return json({erro:'Sessão não confirmada.'},401);
   const allowed=await rpc('bf_foto_clinica_pode_gravar',{c,p,u,r});
   if(!allowed.ok)return json({erro:'Não foi possível conferir a permissão.'},503);
   if(await allowed.json()!==true)return json({erro:'Acesso clínico não autorizado para esta ficha.'},403);
   let bytes,dim;
   try{bytes=await read(req);dim=await verifyPng(bytes);}catch(_){return json({erro:'A imagem não é um PNG normalizado válido.'},400);}
   const f=crypto.randomUUID(),path=c+'/'+p+'/foto-clinica/'+f+'.png';
   storage=base+'/storage/v1/object/bf-prontuarios/'+path;
   // Nenhum caminho, nome de arquivo, autor ou MIME do registro vem do cliente.
   const ack=await fetcher(storage,{method:'POST',headers:{...srv,'Content-Type':'image/png','x-upsert':'false','cache-control':'0'},body:bytes,signal:AbortSignal.timeout(15000)});
   if(!ack.ok)return json({erro:'Não foi possível guardar a foto clínica.'},503);
   uploading=true;
   const registro=await rpc('bf_foto_clinica_registrada',{c,p,u,r,f,v,e,o,h:await sha256(bytes),w:dim.w,a:dim.h});
   if(!registro.ok){
    // Resposta definitiva de SQL, não apague em timeout/5xx: a gravação pode ter concluído.
    if([400,401,403,409].includes(registro.status)){
      await fetcher(base+'/storage/v1/object/bf-prontuarios',{method:'DELETE',headers:{...srv,'Content-Type':'application/json'},
        body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(8000)}).catch(()=>{});
    }
    return json({erro:'Gravação clínica não confirmada. Confira os anexos antes de tentar novamente.'},503);
   }
   if(await registro.json()!==f)return json({erro:'Gravação não confirmada. Confira os anexos antes de tentar de novo.'},503);
   return json({id:f},201);
  }catch(_){return json({erro:uploading?'Resultado não confirmado. Confira os anexos antes de tentar de novo.':'Não foi possível concluir a gravação.'},503);}
 };
}
