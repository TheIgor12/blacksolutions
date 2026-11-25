/* Entrada separada; nenhuma clínica é consultada. */
'use strict';
const cfg={url:'https://blszdbjpxgtloblxlusr.supabase.co',key:'sb_publishable_0Tns_mDN2N1iQmw_sEzFXw_SRMy1uXK'};
const $=id=>document.getElementById(id), tela=matchMedia('(min-width:1024px) and (pointer:fine)');
const auth=window.supabase?.createClient(cfg.url,cfg.key,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false,storageKey:'blackflow-painel-mestre-1491'}});
let etapa='login', ocupado=false, epoch=0;
const msg=t=>{$('estado').textContent=t;};
const limpar=()=>{$('visor').replaceChildren();};
function mostrar(next){etapa=next;for(const x of ['login','mfa','painel','restrito'])$(x).hidden=x!==next;$('sair').hidden=!['mfa','painel'].includes(next);}
async function encerrar(next=tela.matches?'login':'restrito'){
 ++epoch;limpar();$('login').reset();$('mfa').reset();mostrar(next);
 if(auth){try{await auth.auth.signOut({scope:'local'});}catch{}}
}
function acao(id,t,fn){$(id).addEventListener(t,async e=>{e.preventDefault();if(ocupado||!auth||!tela.matches)return;ocupado=true;
 try{await fn(e.currentTarget,epoch);}catch{msg('Não foi possível confirmar o acesso. Confira os dados e tente novamente.');}finally{ocupado=false;}
});}
async function autorizado(){const r=await auth.rpc('bf_mestre_acesso_confirmado');return r.error==null&&r.data===true;}
acao('login','submit',async(f,token)=>{
 if(etapa!=='login')return;
 const email=f.elements.email.value.trim(), password=f.elements.senha.value;f.elements.senha.value='';
 const r=await auth.auth.signInWithPassword({email,password});if(r.error||!r.data?.user)throw Error();
 if(token!==epoch||!tela.matches){await encerrar();return;}
 const fatores=await auth.auth.mfa.listFactors();if(token!==epoch||!tela.matches)return;
 if(fatores.error)throw Error();
 const ativos=(fatores.data?.totp||[]).filter(x=>x.status==='verified');
 if(!ativos.length){await encerrar();msg('Sem autenticador ativo. Use o procedimento de recuperação do Painel Mestre.');return;}
 const select=$('mfa').elements.fator;select.replaceChildren(...ativos.map((x,i)=>new Option(x.friendly_name||'Autenticador '+(i+1),x.id)));
 mostrar('mfa');msg('Confirme com um autenticador já cadastrado.');
});
acao('mfa','submit',async(f,token)=>{
 if(etapa!=='mfa')return;
 const factorId=f.elements.fator.value,code=f.elements.codigo.value;f.elements.codigo.value='';
 const r=await auth.auth.mfa.challengeAndVerify({factorId,code});if(r.error)throw Error();
 if(token!==epoch||!tela.matches){await encerrar();return;}
 if(!await autorizado()){await encerrar();msg('Esta conta não tem acesso mestre do BlackFlow.');return;}
 if(token!==epoch||!tela.matches){await encerrar();return;}
 mostrar('painel');msg('Acesso mestre confirmado. Escolha um módulo.');
});
async function abrir(tipo,token){
 if(etapa!=='painel')return;
 limpar();if(!await autorizado()){await encerrar();msg('A sessão mestre terminou. Entre novamente.');return;}
 if(token!==epoch||!tela.matches)return;
 const view=document.createElement('iframe');view.title=tipo==='bio'?'Prévia de Biomedicina':'Prévia de Odontologia';
 view.setAttribute('sandbox','allow-scripts');view.referrerPolicy='no-referrer';view.src='previa.html#'+tipo;$('visor').append(view);
}
acao('bio','click',(_,t)=>abrir('bio',t));acao('odonto','click',(_,t)=>abrir('odonto',t));
$('sair').addEventListener('click',()=>{encerrar();msg('Acesso encerrado.');});
tela.addEventListener('change',()=>{encerrar();msg(tela.matches?'Entre com sua conta mestre.':'Abra no computador.');});
mostrar(tela.matches&&auth?'login':'restrito');msg(!auth?'Não foi possível carregar o serviço de autenticação.':tela.matches?'Entre com sua conta mestre.':'Acesso pelo computador.');
async function conferirSessao(){
 if(etapa!=='painel'||ocupado)return;
 const t=epoch;ocupado=true;
 try{if(!await autorizado()&&t===epoch){await encerrar();msg('A sessão mestre terminou. Entre novamente.');}}
 catch{if(t===epoch){await encerrar();msg('Não foi possível validar a sessão mestre.');}}
 finally{ocupado=false;}
}
setInterval(conferirSessao,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)conferirSessao();});
