const {chromium}=require(process.env.BF_PLAYWRIGHT||'playwright'),a=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{const u=new URL(req.url,'http://local'),p=path.resolve(dir,'.'+u.pathname);try{if(!p.startsWith(dir+'/')&&p!==dir)throw Error();const f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{let browser;try{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const home='http://127.0.0.1:'+srv.address().port;
browser=await chromium.launch({executablePath:process.env.CHROME||'/tmp/bf-chromium-release/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.route('**/*',r=>{
const u=new URL(r.request().url());
if(u.origin===home&&u.pathname.endsWith('/sw.js'))return r.fulfill({contentType:'application/javascript',body:''});
if(u.origin===home)return r.continue();
if(u.href.includes('supabase-js@2.119.2'))return r.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>{let aal2=false;return {rpc:async name=>{(window.__rpcNames??=[]).push(name);return {data:aal2&&window.__grant!==false}},auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({data:{user:{id:'fictional'}}}),signOut:async()=>{aal2=false;return {error:null}},mfa:{listFactors:async()=>({data:{totp:[{status:'verified',id:'dummy',friendly_name:'Reserva'}]}}),challengeAndVerify:async ({code})=>code==='123456'?(aal2=true,{data:true}):{error:true}}}}}};`});
return r.abort();
});
const p=await context.newPage(),errors=[],clinical=[];p.on('request',r=>{if(/supabase\.co|\/rest\/v1|\/storage\/v1/.test(r.url()))clinical.push(r.url());});p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
for(const entry of ['/','/app/']){
 await p.goto(home+entry);
 await p.getByRole('link',{name:'Painel Mestre no computador'}).click();
 // AAL2 is necessary but not sufficient.
 await p.evaluate(()=>window.__grant=false);
 await p.locator('[name=email]').fill('dummy@example.test');
 await p.locator('[name=senha]').fill('synthetic-only');
 await p.getByRole('button',{name:'Entrar',exact:true}).click();
 a(await p.locator('#painel').isHidden());
 await p.locator('[name=codigo]').fill('000000');await p.getByRole('button',{name:'Confirmar código'}).click();a(await p.locator('#painel').isHidden());
 await p.locator('[name=codigo]').fill('123456');await p.getByRole('button',{name:'Confirmar código'}).click();
 await p.getByText('Esta conta não tem acesso mestre do BlackFlow.').waitFor();
 a(await p.locator('#painel').isHidden());a.equal(await p.locator('iframe').count(),0);
 await p.evaluate(()=>window.__grant=true);
 await p.locator('[name=email]').fill('dummy@example.test');
 await p.locator('[name=senha]').fill('synthetic-only');
 await p.getByRole('button',{name:'Entrar',exact:true}).click();
 await p.locator('[name=codigo]').fill('123456');await p.getByRole('button',{name:'Confirmar código'}).click();
 await p.getByRole('button',{name:'Biomedicina'}).click();let f=p.frameLocator('iframe');
 await f.getByRole('heading',{name:'Mapa estético'}).waitFor();
 await f.locator('#bf-em-paciente').selectOption({label:'Pessoa fictícia'});
 await f.getByRole('button',{name:'Histórico intramuscular'}).click();
 await f.getByRole('heading',{name:'Histórico de aplicações intramusculares realizadas'}).waitFor();
 a.equal(await p.locator('iframe').getAttribute('sandbox'),'allow-scripts');
 const sub=p.frames().find(z=>z.url().includes('/previa.html'));a(await sub.evaluate(()=>{try{localStorage.length;return false}catch{return true}}));
 a(await sub.evaluate(()=>{try{indexedDB.open('synthetic-isolation-test');return false}catch{return true}}));
 a(await sub.evaluate(async()=>{try{await fetch('/versao.json');return false}catch{return true}}));
 await p.getByRole('button',{name:'Odontologia'}).click();f=p.frameLocator('iframe');
 await f.getByRole('heading',{name:'Odontograma interativo'}).waitFor();
 await f.locator('#bfoPaciente').selectOption({label:'Pessoa fictícia'});
 await f.getByRole('button',{name:'Ficha periodontal'}).click();
 await f.locator('#bfoDentePerio').waitFor();
 const names=await p.evaluate(()=>window.__rpcNames);
 a(names.length>=3);a(names.every(x=>x==='bf_mestre_acesso_confirmado'));
 if(entry==='/') await p.getByRole('button',{name:'Encerrar acesso'}).click();
 else await p.evaluate(()=>{window.__grant=false;document.dispatchEvent(new Event('visibilitychange'));});
 await p.locator('#login').waitFor();a.equal(await p.locator('iframe').count(),0);
}
await p.setViewportSize({width:390,height:844});await p.goto(home+'/painel-mestre/');
await p.getByText('Para usar o Painel Mestre, abra esta página no computador.').waitFor();a(await p.locator('#login').isHidden());
a(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
a.deepEqual(errors,[]);a.deepEqual(clinical,[]);console.log('PASS raiz e /app/, senha sem painel, erro do TOTP, duas prévias, sandbox sem armazenamento, revogação, celular sem acesso e sem rolagem lateral; Supabase simulado.');
}finally{if(browser)await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
