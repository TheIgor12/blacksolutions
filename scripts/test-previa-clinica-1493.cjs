const {chromium}=require('playwright'),a=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),expected='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{const u=new URL(req.url,'http://local'),p=path.resolve(dir,'.'+u.pathname);try{if(!p.startsWith(dir+'/')&&p!==dir)throw Error();const f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const login=async(p,fixture)=>{await p.evaluate(f=>window.fixture=f,fixture);await p.locator('#au_email').fill('synthetic@example.test');await p.locator('#au_senha').fill('SyntheticPass12');await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.locator('.top').waitFor();};
(async()=>{let browser;try{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const home='http://127.0.0.1:'+srv.address().port;
browser=await chromium.launch({executablePath:process.env.CHROME||'/tmp/bf-chromium-release/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],external=[];
page.setDefaultTimeout(6000);
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{
 const u=new URL(r.request().url());if(u.origin===home&&u.pathname.endsWith('/sw.js'))return r.fulfill({contentType:'application/javascript',body:''});if(u.origin===home)return r.continue();
 if(u.hostname==='cdn.jsdelivr.net'&&u.href.includes('supabase-js@2.119.2'))return r.fulfill({contentType:'application/javascript',body:`
window.supabase={createClient:()=>{
 const session={user:{id:'fixture-user',email:'synthetic@example.test',user_metadata:{}}};let authListener;
 const row=(id,papel)=>({clinica_id:id,papel,clinicas:{nome:'Clínica fictícia',ativa:true,plano:'cortesia',segmento:'podologia'}});
 const sdk={auth:{
  getSession:async()=>({data:{session:null}}),onAuthStateChange:cb=>{authListener=cb;return {data:{subscription:{unsubscribe(){}}}}},
  signInWithPassword:async()=>({data:{session}}),signOut:async()=>{authListener?.('SIGNED_OUT',null);return {}}
 },rpc:async(name,args)=>{
  (window.rpcLog??=[]).push([name,args]);
  if(name==='bf_previa_clinica_autorizada'){
   if(window.deniedError)throw Error('erro fictício');
   return {data:!window.revoked&&window.fixture.role==='admin'&&args.p_clinica==='${expected}'};
  }
  return {data:null};
 },from(t){let q={select(){return q},eq(){return q},not(){return q},gt(){return q},order(){return q},limit(){return q},single(){return q},upsert(){return q},
  then(resolve,reject){return Promise.resolve({data:t==='membros'?[row(window.fixture.id,window.fixture.role),...(window.fixture.multi?[row('${other}','admin')]:[])]:t==='clinicas'?{segmento:'podologia',plano:'cortesia'}:[],error:null}).then(resolve,reject)}};return q}};
 return sdk;
}};
`});
 if(/supabase\.co|\/rest\/v1|\/storage\/v1/.test(u.href))external.push(u.href);
 return r.abort();
});
for(const entry of ['/','/app/']){
 await page.goto(home+entry);await login(page,{id:expected,role:'admin'});
 const button=page.locator('[data-bf-previa-clinica]');await button.waitFor({state:'attached'});
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await button.click();await page.getByRole('dialog').waitFor();
 a.equal(await page.evaluate(()=>S.config.segmento),'podologia');a.equal(await page.evaluate(()=>NV.plano),'cortesia');
 await page.getByRole('button',{name:'Biomedicina',exact:true}).click();
 let f=page.frameLocator('dialog iframe');await f.getByRole('heading',{name:'Mapa estético'}).waitFor();
 await f.locator('#bf-em-paciente').selectOption({label:'Pessoa fictícia'});
 await f.getByRole('button',{name:'Histórico intramuscular'}).click();
 await f.getByRole('heading',{name:'Histórico de aplicações intramusculares realizadas'}).waitFor();
 a.equal(await page.locator('dialog iframe').getAttribute('sandbox'),'allow-scripts');
 const sub=page.frames().find(x=>x.url().includes('/previa.html'));
 a(await sub.evaluate(()=>{try{localStorage.length;return false}catch{return true}}));
 a(await sub.evaluate(()=>{try{indexedDB.open('isolamento');return false}catch{return true}}));
 a(await sub.evaluate(async()=>{try{await fetch('/versao.json');return false}catch{return true}}));
 await page.getByRole('button',{name:'Odontologia',exact:true}).click();
 f=page.frameLocator('dialog iframe');await f.getByRole('heading',{name:'Odontograma interativo'}).waitFor();
 await f.locator('#bfoPaciente').selectOption({label:'Pessoa fictícia'});
 await f.getByRole('button',{name:'Ficha periodontal'}).click();await f.locator('#bfoDentePerio').waitFor();
 const rpc=await page.evaluate(()=>window.rpcLog.filter(x=>x[0]==='bf_previa_clinica_autorizada'));
 a(rpc.length>=4);a(rpc.every(x=>x[1].p_clinica===expected));
 if(entry==='/')await page.evaluate(()=>{window.revoked=true;document.dispatchEvent(new Event('visibilitychange'));});
 else await page.getByRole('button',{name:'Biomedicina',exact:true}).evaluate(b=>{window.deniedError=true;b.click();});
 await page.getByRole('dialog').waitFor({state:'detached'});a.equal(await page.locator('dialog iframe').count(),0);a.equal(await page.evaluate(()=>NV.segmento),'podologia');
}
for(const fixture of [{id:expected,role:'usuario'},{id:other,role:'admin'}]){
 await page.goto(home+'/');await login(page,fixture);await page.getByRole('button',{name:'Menu',exact:true}).click();
 if(fixture.role==='admin')await page.waitForFunction(()=>window.rpcLog.some(x=>x[0]==='bf_previa_clinica_autorizada'));
 a.equal(await page.locator('[data-bf-previa-clinica]').count(),0);a.equal(await page.locator('dialog iframe').count(),0);
}
await page.goto(home+'/');await login(page,{id:expected,role:'admin'});
await page.locator('[data-bf-previa-clinica]').waitFor({state:'attached'});await page.getByRole('button',{name:'Menu',exact:true}).click();
await page.locator('[data-bf-previa-clinica]').click();await page.getByRole('button',{name:'Odontologia',exact:true}).click();
await page.locator('dialog iframe').waitFor();await page.evaluate(()=>sair());await page.getByRole('dialog').waitFor({state:'detached'});await page.locator('#au_email').waitFor();
await page.goto(home+'/');await login(page,{id:expected,role:'admin',multi:true});
await page.locator('[data-bf-previa-clinica]').waitFor({state:'attached'});await page.getByRole('button',{name:'Menu',exact:true}).click();
await page.locator('[data-bf-previa-clinica]').click();await page.getByRole('button',{name:'Odontologia',exact:true}).click();
await page.locator('dialog iframe').waitFor();
await page.evaluate(id=>{void abrirOutraClinica(id);},other);await page.getByRole('dialog').waitFor({state:'detached'});await page.locator('#au_email').waitFor();
await login(page,{id:expected,role:'admin',multi:true});a.equal(await page.evaluate(()=>NV.clinicaId),other);a.equal(await page.locator('[data-bf-previa-clinica]').count(),0);
await page.goto(home+'/');await page.setViewportSize({width:390,height:844});await login(page,{id:expected,role:'admin'});
await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Outros painéis: abra no computador'}).click();
await page.getByText('Abra no computador para conferir Biomedicina e Odontologia.').waitFor();
a.equal(await page.locator('dialog iframe').count(),0);a(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
a.deepEqual(errors,[]);a.deepEqual(external,[]);
console.log('PASS: login comum nas duas portas, admin autorizado, membro comum e outro admin negados, todos os módulos fictícios, logout, troca de clínica, revogação, erro do RPC, desktop e celular sem overflow, sandbox sem acesso a rede ou storage.');
}finally{if(browser)await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
