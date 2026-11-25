'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const pw=require(process.env.PW_DIR||'playwright');
const code=fs.readFileSync(path.join(__dirname,'..','bf-odontomapa-149.js'),'utf8');
(async()=>{
 const driver=process.env.CHROME_PACKAGE?((await import(pathToFileURL(process.env.CHROME_PACKAGE))).default):null;
 const b=await pw.chromium.launch(driver?{executablePath:await driver.executablePath(),args:driver.args,headless:true}:{headless:true});
 try{
  const page=await b.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route("http://localhost:8099/odontologia-teste", r=>r.fulfill({status:200,contentType:"text/html",body:'<html lang="pt-BR"><head><meta name="viewport" content="width=device-width"></head><body><main id="app"></main></body></html>'}));
  await page.goto("http://localhost:8099/odontologia-teste");
  await page.addScriptTag({content:`
 const windowRef=window;
 const S={config:{segmento:'odontologia'},pacientes:[{id:'F1',nome:'Paciente fictício'}]};
 const UI={view:'odontomapa',auth:null};
 const chart='ficticio';
 window.lin={bf_profissionais:[{id:'F-Prof',clinica_id:'F-Clinic',user_id:'F-User',ativo:true,segmento:'odontologia'}],bf_prontuarios:[{id:chart,clinica_id:'F-Clinic',paciente_ref:'F1',segmento:'odontologia'}],bf_odontogramas:[{id:'F-Antigo',clinica_id:'F-Clinic',prontuario_id:chart,dentes:{11:{estado:'carie',observacao:'Registro anterior'}},criado_em:'2026-01-01T00:00:00Z'}],bf_anexos_clinicos:[]};
 window.files=[];window.authOk=true;window.access=true;window.audits=[];
 window.bfAuditarAberturaProntuario=async(id,tela)=>{window.audits.push([id,tela]);return window.authOk};
 const makeQuery=t=>{
   let filters=[],pending=null,limit=[0,999];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},range(a,b){limit=[a,b];return q},order(){return q},insert(x){pending=Array.isArray(x)?x:[x];return q},then(resolve){const l=window.lin[t];if(pending){pending.forEach(x=>Object.assign(x,{id:'F'+l.length,criado_em:'2026-11-25T00:00:00Z'}));l.push(...pending);resolve({data:pending})}else resolve({data:l.filter(x=>filters.every(([k,v])=>x[k]===v)).slice(limit[0],limit[1]+1)})}};
   return q;
 };
 const NV={ativa:true,sessao:{user:{id:'F-User'}},clinicaId:'F-Clinic',sb:{from:makeQuery,storage:{from:()=>({upload:async(p,blob)=>{window.files.push([p,blob.size,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('')]);return {error:null}}})}}};
 const go=(v)=>{UI.view=v;render()};const soAgenda=()=>false;const pode=()=>window.access;const podeTela=()=>window.access;const shell=s=>s;const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
 const menuOrdem=s=>s;let render=function(){document.getElementById('app').textContent=UI.view};let menuItens=()=>[];
 window.BF_CATALOGOS={odontologia:{procedimentos:[{n:'Restauração em resina, uma face'}]}};
 window.bfDocOpen=(kind,pid)=>{window.lastBudget=[kind,pid];document.body.insertAdjacentHTML('beforeend','<form id="bf-doc-form"><input data-index="0" data-key="nome"></form>')};
 window.bfDocNome=(i,n)=>{window.lastBudget.push(n)};
 `});
  await page.addScriptTag({content:code});await page.evaluate(()=>render());
  await page.selectOption('#bfoPaciente','F1');await page.locator('[data-bfo-dente]').first().waitFor();assert.equal(await page.locator('[data-bfo-dente]').count(),32);
  await page.getByRole('button',{name:'Decídua'}).click();assert.equal(await page.locator('[data-bfo-dente]').count(),20);
  await page.locator('[data-bfo-dente="55"]').click();assert.equal(await page.locator('[data-bfo-face]:not([data-bfo-face="*"])').count(),5);
  await page.locator('[data-bfo-face="l"]').click();await page.selectOption('#bfoAchado','restauracao_planejada');
  await page.getByRole('button',{name:'Não',exact:true}).click();assert.equal(await page.evaluate(()=>lin.bf_odontogramas.length),1);
  await page.locator('[data-bfo-face="l"]').click();await page.selectOption('#bfoAchado','restauracao_planejada');await page.locator('#bfoObs').fill('Registro de teste.');
  await page.getByRole('button',{name:'Sim, guardar',exact:true}).click();
  await page.getByText('Registro guardado no prontuário.').waitFor();assert.equal(await page.evaluate(()=>lin.bf_odontogramas[1].dentes[55].face),'l');assert.ok(await page.locator('[data-bfo-face="l"]').evaluate(e=>e.classList.contains('planejado')));
  await page.getByRole('button',{name:'Orçamento',exact:true}).click();await page.selectOption('#bfoOrc0','0');await page.getByRole('button',{name:'Confirmar item e revisar orçamento'}).click();
  assert.deepEqual(await page.evaluate(()=>lastBudget),['orc','F1','Restauração em resina, uma face']);
  await page.getByRole('button',{name:'Ficha periodontal',exact:true}).click();await page.selectOption('#bfoDentePerio','11');
  assert.equal(await page.locator('.bfoSito').count(),6);
  await page.locator('[name="prof-mv"]').fill('2.1');await page.locator('[name="sg-mv"]').selectOption('sim');await page.locator('[name="sg-v"]').selectOption('nao');await page.locator('[name="pl-mv"]').selectOption('sim');
  await page.getByRole('button',{name:'Sim, guardar',exact:true}).click();await page.getByText('Registro guardado no prontuário.').waitFor();
  assert.match(await page.locator('.bfoMetricas').innerText(),/50%.*1 de 2/s);
  await page.getByRole('button',{name:'Foto do atendimento',exact:true}).click();
  if(process.env.BF_TEST_PHOTO){
   await page.locator('#bfoArquivo').setInputFiles(process.env.BF_TEST_PHOTO);
   await page.locator('#bfoCanvas').waitFor();await page.getByRole('button',{name:'Marcar o centro'}).click();await page.getByRole('button',{name:'Sim, anexar'}).click();await page.getByText('Foto anexada ao prontuário sem alterar o original.').waitFor();
   assert.equal(await page.evaluate(()=>lin.bf_anexos_clinicos.length),2);
   assert.equal(await page.evaluate(()=>files[0][1]),fs.statSync(process.env.BF_TEST_PHOTO).size);
   assert.equal(await page.evaluate(()=>files[0][2]),createHash('sha256').update(fs.readFileSync(process.env.BF_TEST_PHOTO)).digest('hex'));
   assert.notEqual(await page.evaluate(()=>files[0][2]),await page.evaluate(()=>files[1][2]));
   assert.notEqual(await page.evaluate(()=>files[0][0]),await page.evaluate(()=>files[1][0]));
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.setViewportSize({width:1440,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1440);
  await page.evaluate(()=>{window.access=false;render()});assert.equal(await page.locator('#app').innerText(),'agenda');
  await page.evaluate(()=>{window.access=true;window.authOk=false;go('odontomapa')});
  await page.selectOption('#bfoPaciente','F1');await page.getByText('O registro de abertura do prontuário não foi confirmado.').waitFor();assert.equal(await page.locator('[data-bfo-dente]').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Odontologia: navegador isolado com nuvem fictícia, 390/1440, guardar e cancelar, orçamento sem lançar, periodontal, anexação privada, bloqueios e nenhuma exceção.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
