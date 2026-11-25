import {novoConvite} from './bf-convite-149.mjs';
const form=document.querySelector('#senha'),state=document.querySelector('#estado'),nova=document.querySelector('#nova'),repita=document.querySelector('#repita');
const invalid='Convite inválido ou vencido. Solicite um novo convite.';
const client=(...args)=>window.supabase.createClient(...args);
const cfg={url:'https://blszdbjpxgtloblxlusr.supabase.co',key:'sb_publishable_0Tns_mDN2N1iQmw_sEzFXw_SRMy1uXK'};
const invitation=novoConvite({...cfg,createClient:client,search:location.search,fragment:location.hash,
 clearURL:()=>history.replaceState(null,'',location.pathname)});
if(!invitation.canSubmit()){state.textContent=invalid;}
else if(!window.supabase?.createClient || cfg.key.startsWith('__')){state.textContent='Não foi possível carregar o serviço de convite.';}
else{state.textContent='Use pelo menos 12 caracteres para criar sua senha.';form.hidden=false;}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button');button.disabled=true;
 try{
  const result=await invitation.setPassword(nova.value,repita.value);
  if(result==='password'){state.textContent='As senhas devem ser iguais e ter pelo menos 12 caracteres.';return;}
  nova.value=repita.value='';form.hidden=true;
  state.textContent=result==='success'?'Senha criada. Entre no BlackFlow com seu e-mail e a nova senha.':result==='invalid'?invalid:'Não foi possível confirmar a criação da senha. Use a recuperação de senha ou solicite um novo convite.';
 }finally{button.disabled=false;}
});
