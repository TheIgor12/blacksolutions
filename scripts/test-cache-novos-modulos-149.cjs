/* Ensaio local do service worker: sem autenticação nem fonte remota. */
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.BF_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
const newNames=['bf-acessos-prontuario-149.js','bf-odontomapa-149.js','bf-estetmapa-149.js'];
const views=['frontal','obliqua_direita','obliqua_esquerda','perfil_direito','perfil_esquerdo','corpo_frente','corpo_costas'];
const art=views.flatMap(v=>['estetmapa/'+v+'.webp','estetmapa/mapa-'+v+'.png']);
const types={'.js':'application/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(/\/(app\/)?__auditoria_cache$/.test(url.pathname))return res.writeHead(200,{'Content-Type':'text/html'}).end('<!DOCTYPE html><title>Auditoria local</title>');
 let p=path.resolve(root,'.'+url.pathname);
 if(!p.startsWith(root+path.sep)&&p!==root)return res.writeHead(403).end();
 try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 return res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'}).end(fs.readFileSync(p));}
 catch(_){return res.writeHead(404).end();}
});
(async()=>{
 let browser;
 try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let executablePath=process.env.BF_CHROMIUM,args=['--no-sandbox'];
 if(process.env.BF_SPARTICUZ){const h=(await import(pathToFileURL(process.env.BF_SPARTICUZ).href)).default;executablePath=await h.executablePath();args=h.args;}
 browser=await chromium.launch({executablePath,args});
 let failed=false;
 for(const scope of ['/','/app/']){
  const ctx=await browser.newContext({serviceWorkers:'allow'});
  const page=await ctx.newPage();
  const html=fs.readFileSync(path.join(root,scope,'index.html'),'utf8');
  const assets=newNames.map(n=>{const hit=html.match(new RegExp('src="\\./('+n.replaceAll('.', '\\.')+'\\?v=[^"]+)"'));assert.ok(hit,n);return hit[1]});
  await page.goto(origin+scope+'__auditoria_cache');
  await page.evaluate(async()=>{
   await navigator.serviceWorker.register('./sw.js');
   await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
  });
  // Sem abrir o HTML do aplicativo; só os itens de instalação foram cacheados.
  const resident=await page.evaluate(async paths=>Promise.all(paths.map(async n=>!!await caches.match(new URL(n,location.href)))),assets);
  const inherited=await page.evaluate(async()=>!!await caches.match(new URL('bf-clinical.js?v=1.49.0',location.href)));
  console.log(scope+' scripts no cache de instalação: '+resident.join(', ')+'; legado versionado: '+inherited);
  if(resident.some(v=>!v))failed=true;
  await ctx.setOffline(true);
  const fetched=await page.evaluate(async paths=>Promise.all(paths.map(async n=>{try{return (await fetch(n)).ok}catch(_){return false}})),assets);
  if(fetched.some(v=>!v))failed=true;
  console.log(scope+' scripts servidos sem rede antes de aquecer: '+fetched.join(', '));
  await ctx.setOffline(false);
  const visual=await page.evaluate(async paths=>Promise.all(paths.map(async n=>{const r=await fetch(n);return r.ok&&(await r.arrayBuffer()).byteLength>0})),art);
  assert.equal(visual.filter(Boolean).length,art.length);
  await page.waitForFunction(async paths=>(await Promise.all(paths.map(n=>caches.match(new URL(n,location.href)).then(Boolean)))).every(Boolean),art);
  await ctx.setOffline(true);
  const stored=await page.evaluate(async paths=>Promise.all(paths.map(n=>fetch(n).then(r=>r.ok))),art);
  assert.equal(stored.filter(Boolean).length,art.length);
  console.log(scope+' pacote visual: '+art.length+' recursos carregados sob demanda e encontrados no cache após uso.');
  if(scope==='/'){
   await assert.rejects(()=>page.goto(origin+'/criar-senha/'),/ERR_INTERNET_DISCONNECTED|ERR_FAILED/);
   console.log('Criar senha offline: navegador não recebeu a página inicial em cache.');
  }
  await ctx.close();
 }
 if(failed)process.exitCode=1;
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
