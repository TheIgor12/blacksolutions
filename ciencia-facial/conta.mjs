// Sessão exclusiva do signatário, apenas em memória. Não lê ou altera a sessão da clínica.
import {attach} from './interface.mjs';
const URL_AUTH='https://blszdbjpxgtloblxlusr.supabase.co';
const KEY='sb_publishable_0Tns_mDN2N1iQmw_sEzFXw_SRMy1uXK';
const allowed=new Set(['bf_ciencia_ler','bf_ciencia_assinar','bf_ciencia_consultar_recibo','bf_ciencia_revogar']);
const $=x=>document.getElementById(x);
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
let session=null, epoch=0, ttl;
async function request(path,{method='GET',value,token}={}){
 return fetch(URL_AUTH+path,{method,mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
  headers:{apikey:KEY,...(token?{Authorization:'Bearer '+token}:{}),...(value?{'Content-Type':'application/json'}:{})},
  ...(value?{body:JSON.stringify(value)}:{})});
}
function clear(reason=''){
 epoch++;session=null;clearTimeout(ttl);
 $('fluxo').hidden=true;$('conta').hidden=true;$('ref-conta').textContent='';$('acesso').hidden=false;
 $('entrar').reset();$('sessao-estado').textContent=reason;attach(null);
 $('entrar').querySelector('button').disabled=!window.isSecureContext;
}
$('entrar').onsubmit=async e=>{
 e.preventDefault();if(session||!window.isSecureContext)return;
 const step=++epoch,button=e.currentTarget.querySelector('button');
 button.disabled=true;$('sessao-estado').textContent='Conferindo a conta…';
 const values={email:$('email').value.trim(),password:$('senha').value};$('senha').value='';
 try{
  const response=await request('/auth/v1/token?grant_type=password',{method:'POST',value:values});
  values.password='';if(!response.ok)throw Error('login');
  const u=await response.json();if(!u.access_token||!Number.isFinite(u.expires_in)||u.expires_in<1)throw Error('token');
  const responseUser=await request('/auth/v1/user',{token:u.access_token});
  if(!responseUser.ok)throw Error('conta');
  const confirmed=await responseUser.json();
  if(!uuid.test(confirmed.id)||!confirmed.email_confirmed_at||confirmed.is_anonymous)throw Error('verificação');
  if(epoch!==step)return;
  session=u.access_token;
  attach({rpc:async (name,value)=>{
   if(!session||epoch!==step||!allowed.has(name))return {error:true};
   const r=await request('/rest/v1/rpc/'+name,{method:'POST',value,token:session});
   if(epoch!==step)return {error:true};
   if(r.status===401){clear('Sua sessão terminou. Entre novamente.');return {error:true};}
   return r.ok?{data:await r.json()}:{error:true};
  }});
  $('ref-conta').textContent=confirmed.id;$('acesso').hidden=true;$('conta').hidden=false;$('fluxo').hidden=false;
  $('sessao-estado').textContent='Conta confirmada.';$('email').value='';
  ttl=setTimeout(()=>clear('Sua sessão terminou. Entre novamente.'),Math.min(2147483647,u.expires_in*1000));
 }catch(_){if(epoch===step)clear('Não foi possível entrar. Confira a conta e se o e-mail foi confirmado.');}
 finally{values.password='';if(epoch===step)button.disabled=false;}
};
$('sair').onclick=async()=>{
 const token=session;clear('Você saiu desta página.');
 if(token){try{await request('/auth/v1/logout?scope=local',{method:'POST',token});}catch(_){}}
};
addEventListener('pagehide',()=>clear());
clear(window.isSecureContext?'':'Abra a página por uma conexão segura.');
