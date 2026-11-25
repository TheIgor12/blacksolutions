/* Ensaio dos pontos de entrada reais com autenticação e arquivos fictícios. */
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.BF_PLAYWRIGHT || 'playwright');
const base=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'), url=decodeURIComponent(u.pathname);
 let p=path.resolve(base,'.'+url);if(!p.startsWith(base+path.sep)&&p!==base){res.writeHead(403).end();return}
 try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 const f=fs.readFileSync(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(f);
 }catch(_){res.writeHead(404).end()}
});
const set=(page,segment,screen)=>page.evaluate(({segment,screen})=>{
 const review={clinic:'20000000-0000-0000-0000-000000000001',user:'10000000-0000-0000-0000-000000000001',chart:'30000000-0000-0000-0000-000000000001'};
 const rows={bf_prontuarios:[{id:review.chart,clinica_id:review.clinic,paciente_ref:'P1',segmento:segment,anamnese:{}}],
 bf_profissionais:[{id:'40000000-0000-0000-0000-000000000001',user_id:review.user,clinica_id:review.clinic,ativo:true,segmento:segment}],
 bf_odontogramas:[],bf_estetmapa_registros:segment==='biomedicina'?[{id:'50000000-0000-0000-0000-000000000001',clinica_id:review.clinic,prontuario_id:review.chart,sessao_id:'60000000-0000-0000-0000-000000000001',sessao_data:'2026-11-21',criado_em:'2026-11-21T18:00:00Z',vista:'frontal',regiao:'fronte',lado:'central',produto:'Produto fictício anterior',quantidade:1,unidade:'ml',lote:'LOTE-A',validade:'2027-12-31',observacoes:''}]:[],bf_acessos_prontuario:[]};
 window.__testRows=rows;
 function query(t){
 let ids=[],w=null,selSingle=false,max=Infinity,start=0;const q={select(){return q},eq(k,v){ids.push([k,v]);return q},order(){return q},
 limit(n){max=n;return q},range(a,b){start=a;max=b-a+1;return q},not(){return q},in(){return q},lte(){return q},gte(){return q},
 insert(a){w=Array.isArray(a)?a:[a];return q},maybeSingle(){selSingle=true;return q},single(){selSingle=true;return q},
 then(ok,fail){return Promise.resolve().then(()=>{
 if(w){const out=w.map(x=>({...x,id:x.id||crypto.randomUUID(),criado_em:new Date().toISOString()}));(rows[t]??=[]).push(...out);return {data:selSingle?out[0]:out,error:null}}
 const hit=(rows[t]||[]).filter(x=>ids.every(([k,v])=>x[k]===v)).slice(start,start+max);return {data:selSingle?(hit[0]||null):hit,error:null};
 }).then(ok,fail)}};
 return q;
 }
 S=defaultState();S.config.clinica='Clínica de ensaio';S.config.segmento=segment;
 S.pacientes=[{id:'P1',nome:'Paciente fictício A',telefone:''},{id:'P2',nome:'Paciente fictício B',telefone:''}];
 UI.auth=null;NV.ativa=true;NV.offline=false;NV.papel='admin';NV.clinicaId=review.clinic;NV.segmento=segment;NV.sessao={user:{id:review.user,email:'ensaio@example.test'}};
 NV.sb={from:query,rpc:async(name,p)=>{
 if(name==='bf_registrar_abertura_prontuario'){
 rows.bf_acessos_prontuario.push({clinica_id:review.clinic,prontuario_id:p.p_prontuario,paciente_ref:'P1',usuario_id:review.user,tela:p.p_tela,aberto_em:new Date().toISOString()});
 return {data:true,error:null};
 }
 return {data:null,error:null};
 }};
 window.bfTalDetetar=false;
 go(screen);
},{segment,screen});
(async()=>{
 let b,p;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 let args=['--no-sandbox'],executablePath=process.env.BF_CHROMIUM;
 if(process.env.BF_SPARTICUZ){
 const h=(await import(pathToFileURL(process.env.BF_SPARTICUZ).href)).default;
 executablePath=await h.executablePath();args=h.args;
 }
 b=await chromium.launch({headless:true,executablePath,args});
 p=await b.newPage({serviceWorkers:'block'});
 await p.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 const errors=[];p.on('pageerror',x=>errors.push(String(x)));
 for(const [segment,screen,heading] of [['odontologia','odontomapa','Odontograma'],['biomedicina','estetmapa','Mapa estético']]){
  for(const [width,entry] of [[390,'/app/'],[1440,'/']]){
   await p.setViewportSize({width,height:930});
   await p.goto(url+entry,{waitUntil:'load'});await set(p,segment,screen);
   const app=p.locator('#app');assert.match(await app.innerText(),new RegExp(heading,'i'));
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,segment+': rolagem lateral '+width);
   assert.equal(await p.evaluate(()=>menuItens().some(x=>x[0]==='odontomapa')),segment==='odontologia');
   assert.equal(await p.evaluate(()=>menuItens().some(x=>x[0]==='estetmapa')),segment==='biomedicina');
   if(segment==='odontologia'){
    await p.locator('#bfoPaciente').selectOption('P1');
    await p.locator('[data-bfo-dente="11"]').click();
    await p.locator('[data-bfo-face="v"]').click();
    await p.locator('#bfoAchado').selectOption('carie');await p.locator('#bfoObs').fill('Nota fictícia de validação.');
    await p.locator('[data-bfo-cancelar="face"]').click();
    assert.equal(await p.evaluate(()=>window.__testRows.bf_odontogramas.length),0);
    await p.locator('[data-bfo-face="v"]').click();await p.locator('#bfoAchado').selectOption('carie');await p.locator('#bfoSalvar').click();
    await p.waitForFunction(()=>window.__testRows.bf_odontogramas.length===1);
    assert.equal(await p.evaluate(()=>window.__testRows.bf_odontogramas[0].dentes['11'].face),'v');
    await p.locator('[data-bfo-modo="d"]').click();assert.equal(await p.locator('[data-bfo-dente]').count(),20);
    await p.locator('[data-bfo-aba="perio"]').click();
    assert.match(await app.innerText(),/Sangramento à sondagem/);
   }else{
    await p.locator('#bf-em-paciente').selectOption('30000000-0000-0000-0000-000000000001');
    const map=p.locator('#bf-em-figura');await map.waitFor();
    await p.waitForFunction(()=>document.querySelector('#bf-em-figura')?.naturalWidth>0);
    await map.scrollIntoViewIfNeeded();const box=await map.boundingBox();
    await p.mouse.click(box.x+box.width*.497,box.y+box.height*.218);
    await p.locator('#bf-em-sim').waitFor();assert.equal(await p.locator('#bf-em-regiao').inputValue(),'fronte');
    await p.locator('#bf-em-sim').click();
    const product=await p.locator('#bf-em-produtos option').first().getAttribute('value');assert.ok(product);
    await p.locator('#bf-em-produto').fill('Polimetilmetacrilato');
    assert.match(await p.locator('#bf-em-ajuda-produto').innerText(),/bloque|não permit|não autoriz|exclui/i);
    await p.locator('#bf-em-produto').fill(product);
    await p.locator('#bf-em-lado').selectOption('central');await p.locator('#bf-em-quantidade').fill('1,5');
    await p.locator('#bf-em-unidade').selectOption('ml');
    await p.locator('#bf-em-lote').fill('LOTE-FICTICIO');
    await p.locator('#bf-em-validade').fill('2028-11-24');
    await p.getByRole('button',{name:'Guardar registro',exact:true}).click();
    await p.waitForFunction(()=>window.__testRows.bf_estetmapa_registros.length===2);
    const rec=await p.evaluate(()=>window.__testRows.bf_estetmapa_registros.at(-1));assert.equal(rec.lote,'LOTE-FICTICIO');assert.equal(rec.quantidade,1.5);
    assert.match(await app.innerText(),/Anterior \| 21\/11\/2026/i);
   }
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,segment+': rolagem após abrir o prontuário '+width);
   if(width===390){
     const field=segment==='odontologia'?p.locator('#bfoPaciente'):p.locator('#bf-em-paciente');
     assert.ok((await field.boundingBox()).height>=46);
     assert.equal(await field.evaluate(e=>getComputedStyle(e).fontSize),'16px');
     assert.equal(await p.evaluate(()=>window.bfPes3dCabe()),false);
   }
   assert.equal(await p.evaluate(()=>window.__testRows.bf_acessos_prontuario.at(-1).tela),screen);
   if(process.env.BF_QA_SHOTS)await p.screenshot({path:path.join(process.env.BF_QA_SHOTS,segment+'-'+width+'.png'),fullPage:true});
   await p.evaluate(()=>{
     NV.papel='membro';S.config.acessos={'ensaio@example.test':'recepcao'};
     S.config.perfis=[{id:'recepcao',nome:'Recepção',telas:['pacientes'],extras:{clinico:false}}];render();
   });
   assert.equal(await p.evaluate(()=>menuItens().some(x=>['odontomapa','estetmapa','acessosprontuario'].includes(x[0]))),false);
  }
 }
 assert.deepEqual(errors,[]);console.log('Playwright: raiz e /app/, 390 e 1440 pixels, módulos separados, recepção bloqueada, sem erros JavaScript.');
 }finally{if(b)await b.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
