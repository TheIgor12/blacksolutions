const {chromium}=require('playwright'),a=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..'), good='11111111-1111-4111-8111-111111111111',bad='22222222-2222-4222-8222-222222222222',ordinary='33333333-3333-4333-8333-333333333333';
const srv=http.createServer((req,res)=>{const p=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname);try{if(!p.startsWith(dir+'/')&&p!==dir)throw Error();const f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end()}});
(async()=>{let b;try{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const home='http://127.0.0.1:'+srv.address().port;
b=await chromium.launch({executablePath:process.env.CHROME||'/tmp/bf-chromium-release/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const c=await b.newContext({serviceWorkers:'block'});
await c.route('**/*',r=>r.request().url().startsWith(home+'/')?r.continue():r.request().url().includes('supabase-js@2.119.2')?r.fulfill({contentType:'application/javascript',body:`
window.supabase={createClient:(_u,_k,{auth:o})=>{
 const scoped=o.storageKey==='blackflow-recovery-1492', key=o.storageKey+'-code-verifier', user={id:'new',email:'fixture@example.test',email_confirmed_at:'yes'};let codeUsed,verified=false;
 if(!scoped)return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){},resetPasswordForEmail:async()=>({})}};
 if(o.detectSessionInUrl||o.autoRefreshToken||o.flowType!=='pkce')throw Error('isolation absent');
 return {auth:{resetPasswordForEmail:async(_mail,opts)=>{if(opts.redirectTo!=='${home}/')throw Error('wrong callback');o.storage.setItem(key,'fictional-pkce');return {};},exchangeCodeForSession:async code=>{
 if(o.storage.getItem(key)!=='fictional-pkce')throw Error('proof unavailable');codeUsed=code;
 o.storage.setItem(o.storageKey,'fictional app token');return {data:{session:{access_token:'fictional bearer'},user}};
 },getClaims:async()=>({data:{claims:{sub:'new',aal:'aal1',amr:[{method:codeUsed==='${bad}'?'otp':'recovery',timestamp:Math.floor(Date.now()/1000)}]}}}),
 mfa:{listFactors:async()=>{const totp=codeUsed==='${ordinary}'?[]:[{id:'f1',friendly_name:'Principal',status:'verified'},{id:'f2',friendly_name:'Reserva',status:'verified'}];return {data:{all:totp,totp}}},challengeAndVerify:async ({factorId,code})=>((window.mfaAttempts??= []).push(factorId),factorId==='f2'&&code==='123456'?(verified=true,{data:true}):{error:true}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:verified?'aal2':'aal1'}})},
 getUser:async()=>window.expireRecovery?{error:{code:'session_expired'}}:({data:{user}}),updateUser:async({password})=>{if(codeUsed!=='${ordinary}'&&!verified)throw Error('MFA required');if(password==='UnchangedPass12')return {error:{code:'same_password'}};if(password==='GenericError12')return {error:{code:'unexpected_error'}};if((codeUsed!=='${ordinary}'&&!verified)||password!=='SyntheticPass12')throw Error('invalid target');(window.updates??=[]).push(user.id);return {data:{user}}},signOut:async()=>{window.closedRecovery=true;}
 }}}};
 `}):r.abort());
const request=c.pages()[0]||await c.newPage();
await request.goto(home+'/painel-mestre/');await request.getByRole('link',{name:'Esqueci minha senha'}).click();
await request.locator('#pedir [name=email]').fill('fixture@example.test');await request.getByRole('button',{name:'Enviar link por e-mail'}).click();await request.getByText(/mesmo navegador e perfil/).waitFor();
await request.evaluate(()=>localStorage.setItem('old-auth','unchanged'));
const recovered=await c.newPage();await recovered.goto(home+'/?code='+good);await recovered.locator('#autenticador').waitFor();a.equal(await recovered.locator('#autenticador option').count(),2);
await recovered.locator('[name=fator]').selectOption('f2');await recovered.locator('[name=codigo]').fill('000000');
await recovered.getByRole('button',{name:'Confirmar autenticador'}).click();await recovered.getByText(/Código incorreto/).waitFor();a(await recovered.locator('#alterar').isHidden());
await recovered.locator('[name=codigo]').fill('123456');await recovered.getByRole('button',{name:'Confirmar autenticador'}).click();await recovered.locator('#alterar').waitFor();
a.equal(new URL(recovered.url()).pathname,'/recuperar-senha/');a.equal(new URL(recovered.url()).hash+new URL(recovered.url()).search,'');
a.equal(await recovered.evaluate(()=>localStorage.getItem('blackflow-recovery-1492')),null);
async function fill(page,email,password='SyntheticPass12'){await page.locator('#alterar [name=email]').fill(email);await page.locator('[name=senha]').fill(password);await page.locator('[name=repita]').fill(password);await page.getByRole('button',{name:'Salvar nova senha'}).click();}
await fill(recovered,'wrong@example.test');await recovered.getByText(/não corresponde ao link/).waitFor();a.equal(await recovered.evaluate(()=>window.updates),undefined);
await fill(recovered,'fixture@example.test','GenericError12');await recovered.getByText(/Não foi possível salvar a nova senha/).waitFor();
await fill(recovered,'fixture@example.test','UnchangedPass12');await recovered.getByText('A nova senha precisa ser diferente da atual.').waitFor();
a(await recovered.locator('#alterar').isVisible());a(await recovered.locator('#autenticador').isHidden());a(await recovered.locator('#pedir').isHidden());
a.equal(await recovered.locator('[name=senha]').inputValue(),'');a.equal(await recovered.locator('[name=repita]').inputValue(),'');
a.equal(await recovered.locator('#alterar [name=email]').inputValue(),'fixture@example.test');a.equal(await recovered.evaluate(()=>window.closedRecovery),undefined);
a.equal(await recovered.evaluate(()=>window.updates),undefined);
await fill(recovered,'fixture@example.test');await recovered.getByText(/Senha atualizada/).waitFor();a.deepEqual(await recovered.evaluate(()=>window.mfaAttempts),['f2','f2']);a.deepEqual(await recovered.evaluate(()=>window.updates),['new']);a.equal(await recovered.evaluate(()=>localStorage.getItem('old-auth')),'unchanged');a.equal(await recovered.evaluate(()=>window.closedRecovery),true);
await recovered.goto(home+'/app/#access_token=fictive.to.ken&refresh_token=oldsynthetic&type=recovery');await recovered.getByText(/Link inválido/).waitFor();a(await recovered.locator('#alterar').isHidden());
await recovered.evaluate(()=>localStorage.setItem('blackflow-recovery-1492-code-verifier',JSON.stringify({valor:'fictional-pkce',expira:Date.now()+10000})));
await recovered.goto(home+'/app/?code='+bad);await recovered.getByText(/Link inválido/).waitFor();a(await recovered.locator('#alterar').isHidden());
await recovered.evaluate(()=>localStorage.setItem('blackflow-recovery-1492-code-verifier',JSON.stringify({valor:'fictional-pkce',expira:Date.now()+10000})));
await recovered.goto(home+'/app/?code='+ordinary);await recovered.locator('#alterar').waitFor();a(await recovered.locator('#autenticador').isHidden());
await fill(recovered,'fixture@example.test');await recovered.getByText(/Senha atualizada/).waitFor();
await recovered.evaluate(()=>localStorage.setItem('blackflow-recovery-1492-code-verifier',JSON.stringify({valor:'fictional-pkce',expira:Date.now()+10000})));
await recovered.goto(home+'/?code='+good);await recovered.locator('#autenticador').waitFor();
await recovered.locator('[name=fator]').selectOption('f2');await recovered.locator('[name=codigo]').fill('123456');await recovered.getByRole('button',{name:'Confirmar autenticador'}).click();await recovered.locator('#alterar').waitFor();
await recovered.evaluate(()=>{window.expireRecovery=true;});
await fill(recovered,'fixture@example.test');await recovered.getByText('A sessão de recuperação venceu. Peça outro link.').waitFor();
a(await recovered.locator('#alterar').isHidden());a(await recovered.locator('#pedir').isVisible());a.equal(await recovered.evaluate(()=>window.updates),undefined);a.equal(await recovered.evaluate(()=>window.closedRecovery),true);
await recovered.setViewportSize({width:390,height:844});a(await recovered.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
console.log('PASS: route from Painel Mestre; new browser tab; root and app recovery handoff; no persistent Auth token; wrong email and non-recovery proof denied; legacy rejected; original session storage intact; same-password retry without re-link/MFA; generic fallback; expired session denied; 390px.');
}finally{if(b)await b.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
