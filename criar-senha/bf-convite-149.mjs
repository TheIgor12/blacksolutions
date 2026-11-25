// Apenas ativação privada de convite; não abre cadastro, clínica ou painel.
export function novoConvite({createClient,url,key,search,fragment='',clearURL}) {
  const params=new URLSearchParams(fragment.replace(/^#/,''));
  const proof=params.getAll('token_hash');
  const type=params.getAll('type');
  let token=proof.length===1 && /^[a-f0-9]{32,256}$/i.test(proof[0]) &&
    type.length===1 && type[0]==='invite' && [...params.keys()].length===2 && !search ? proof[0] : null;
  clearURL();
  let busy=false;
  return Object.freeze({
    canSubmit:()=>Boolean(token) && !busy,
    async setPassword(password,confirmation) {
      if (!token || busy) return 'invalid';
      if (typeof password!=='string' || password.length<12 || password.length>128 || password!==confirmation) return 'password';
      const isolated=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'blackflow-private-invite-v1'}});
      const evidence=token;token=null;busy=true;
      let proven=false;
      try {
        const {data,error}=await isolated.auth.verifyOtp({token_hash:evidence,type:'invite'});
        if(error || !data?.session?.user?.id || data.session.user.id!==data.user?.id || !data.user.email_confirmed_at) return 'invalid';
        proven=true;
        const result=await isolated.auth.updateUser({password});
        return !result.error && result.data?.user?.id===data.user.id?'success':'failed';
      } catch { return 'failed'; }
      finally {busy=false;if(proven)try{await isolated.auth.signOut({scope:'local'});}catch{}}
    }
  });
}
