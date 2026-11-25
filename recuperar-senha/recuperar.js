'use strict';
const cfg={url:'https://blszdbjpxgtloblxlusr.supabase.co',key:'sb_publishable_0Tns_mDN2N1iQmw_sEzFXw_SRMy1uXK'};
const $=x=>document.getElementById(x);
const estado=t=>{$('estado').textContent=t;};
// Só o verificador PKCE temporário atravessa abas. Sessão, tokens e senha ficam em memória.
const chave='blackflow-recovery-1492', verificador=chave+'-code-verifier';
const duracao=15*60*1000, memoria=new Map();
const storage={
 getItem(k){if(k!==verificador)return memoria.get(k)??null;
  try{const x=JSON.parse(localStorage.getItem(k)||'null');if(!x||Date.now()>=x.expira){localStorage.removeItem(k);return null;}return x.valor;}catch{return null;}},
 setItem(k,v){if(k!==verificador){memoria.set(k,v);return;}localStorage.setItem(k,JSON.stringify({valor:v,expira:Date.now()+duracao}));},
 removeItem(k){if(k!==verificador){memoria.delete(k);return;}localStorage.removeItem(k);}
};
const auth=window.supabase?.createClient(cfg.url,cfg.key,{auth:{storage,persistSession:true,detectSessionInUrl:false,autoRefreshToken:false,flowType:'pkce',storageKey:chave}})?.auth;
let sessionId=null, precisaMfa=false, mfaConfirmado=false, ocupado=false;
const authFim=async()=>{sessionId=null;precisaMfa=mfaConfirmado=false;try{await auth.signOut({scope:'local'});}catch{}};
const mostrar=qual=>{for(const x of ['pedir','autenticador','alterar'])$(x).hidden=x!==qual;};
async function preparar(){
 if(!auth){estado('Não foi possível carregar a recuperação.');return;}
 if(retornoSenha===null){mostrar('pedir');estado('Informe o e-mail cadastrado.');return;}
 if(retornoSenha===false){mostrar('pedir');estado('Link inválido ou vencido. Você pode pedir outro.');return;}
 if(!storage.getItem(verificador))throw Error();
 const r=await auth.exchangeCodeForSession(retornoSenha);
 storage.removeItem(verificador);
 if(r.error||!r.data?.session?.access_token)throw Error();
 const {data,error}=await auth.getClaims(r.data.session.access_token);
 const claims=data?.claims;
 const agora=Math.floor(Date.now()/1000);
 const fresh=claims?.amr?.some?.(x=>x?.method==='recovery'&&Number.isFinite(x.timestamp)&&x.timestamp>=agora-900&&x.timestamp<=agora+30);
 if(error||claims?.sub!==r.data.user?.id||claims?.aal!=='aal1'||!fresh||!r.data.user?.email_confirmed_at)throw Error();
 sessionId=r.data.user.id;
 const fatores=await auth.mfa.listFactors();
 if(fatores.error||!Array.isArray(fatores.data?.all))throw Error();
 precisaMfa=fatores.data.all.some(x=>x.status==='verified');
 const ativos=(fatores.data.totp||[]).filter(x=>x.status==='verified');
 if(precisaMfa){
  if(!ativos.length){await authFim();estado('Nenhum autenticador compatível está disponível. Seu acesso continua protegido.');return;}
  $('autenticador').elements.fator.replaceChildren(...ativos.map((x,i)=>new Option(x.friendly_name||'Autenticador '+(i+1),x.id)));
  mostrar('autenticador');estado('Confirme com um dos autenticadores já cadastrados.');return;
 }
 mostrar('alterar');estado('Confirme o e-mail da conta e escolha a nova senha.');
}
function acao(id,fn){$(id).addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;if(ocupado||!auth||f.hidden)return;ocupado=true;const b=f.querySelector('button');b.disabled=true;
 try{await fn(f);}catch{estado('Não foi possível concluir. Confira os dados e tente novamente.');}
 finally{ocupado=false;b.disabled=false;}
});}
acao('pedir',async f=>{
 const r=await auth.resetPasswordForEmail(f.elements.email.value.trim(),{redirectTo:location.origin+'/'});
 if(r.error)throw Error();
 f.reset();estado('Se o e-mail estiver cadastrado, você receberá um link de recuperação. Abra o link neste mesmo navegador e perfil, sem usar janela anônima.');
});
acao('autenticador',async f=>{
 if(!sessionId||!precisaMfa)return;
 const factorId=f.elements.fator.value,code=f.elements.codigo.value;f.elements.codigo.value='';
 const r=await auth.mfa.challengeAndVerify({factorId,code});
 if(r.error){estado('Código incorreto ou vencido. Tente novamente com seu autenticador.');return;}
 const a=await auth.mfa.getAuthenticatorAssuranceLevel(),u=await auth.getUser();
 if(a.error||a.data?.currentLevel!=='aal2'||u.error||u.data?.user?.id!==sessionId){await authFim();mostrar('pedir');estado('Não foi possível confirmar a autenticação. Peça outro link.');return;}
 mfaConfirmado=true;mostrar('alterar');estado('Confirme o e-mail da conta e escolha a nova senha.');
});
acao('alterar',async f=>{
 if(!sessionId||precisaMfa&&!mfaConfirmado)return;
 const mail=f.elements.email.value.trim().toLowerCase(),senha=f.elements.senha.value;
 if(senha!==f.elements.repita.value||senha.length<12||senha.length>128){estado('As senhas devem ser iguais e ter pelo menos 12 caracteres.');return;}
 const g=await auth.getUser();
 if(g.error||g.data?.user?.id!==sessionId){f.reset();mostrar('pedir');await authFim();estado('A sessão de recuperação venceu. Peça outro link.');return;}
 if(g.data.user.email?.toLowerCase()!==mail){f.elements.senha.value=f.elements.repita.value='';estado('O e-mail informado não corresponde ao link.');return;}
 if(precisaMfa){
  const a=await auth.mfa.getAuthenticatorAssuranceLevel();
  if(a.error||a.data?.currentLevel!=='aal2'){f.reset();mostrar('pedir');await authFim();estado('A sessão de recuperação venceu. Peça outro link.');return;}
 }
 const r=await auth.updateUser({password:senha});f.elements.senha.value=f.elements.repita.value='';
 if(r.error||r.data?.user?.id!==sessionId){estado('Não foi possível salvar a nova senha. Confira os requisitos e tente novamente.');return;}
 f.reset();mostrar(null);await authFim();estado('Senha atualizada. Entre novamente. No Painel Mestre, confirme com seu autenticador.');
});
preparar().catch(async()=>{await authFim();mostrar('pedir');estado('Link inválido ou vencido. Você pode pedir outro.');});
