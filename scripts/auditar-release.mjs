/**
 * BlackFlow: release smoke checks, zero dependencies or API credentials.
 * Run with: node scripts/auditar-release.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const version=JSON.parse(read('versao.json')).versao;
const html=read('index.html'),app=read('app/index.html');
assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(html,app,'Root and /app entrypoints must match');
for(const body of [html,app]){
 assert.ok(body.includes("const VERSAO_APP='"+version+"'"),'Wrong displayed release version');
 for(const asset of ['bf-clinical','bf-fiscal-advanced','bf-receituario','bf-cadastro-fiscal','bf-context-actions','bf-integrity-audit','bf-blackpay-integrated','bf-tati-help','bf-mobile-photos']){
  assert.ok(body.includes('./'+asset+'.js?v='+version),'Outdated asset version: '+asset);
 }
 const blocks=[...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
 for(const [i,m]of blocks.entries())new vm.Script(m[1],{filename:'index.html:inline-'+i});
}
for(const name of ['bf-clinical.js','bf-fiscal-advanced.js','bf-receituario.js','bf-cadastro-fiscal.js','bf-context-actions.js','bf-integrity-audit.js','bf-blackpay-integrated.js','bf-tati-help.js','bf-mobile-photos.js','bf-documents.js']){
 const a=read(name),b=read('app/'+name);
 assert.equal(a,b,'Different root and /app copies: '+name);
 new vm.Script(a,{filename:name});
}
assert.ok(read('bf-clinical.js').includes('SEGMENTOS.medicina'),'Missing Medicine segment');
assert.ok(read('bf-receituario.js').includes("conselho:seg()==='odontologia'?'CRO':seg()==='medicina'?'CRM'"),'Missing CRM');
assert.ok(read('bf-receituario.js').includes('RASCUNHO - NAO ASSINADO'),'Missing watermark');
for(const file of ['sw.js','app/sw.js']){
 const sw=read(file);new vm.Script(sw,{filename:file});
 assert.ok(sw.includes('blackflow-v22'),'PWA cache not bumped');
 assert.ok(sw.includes("url.searchParams.has('token')"),'Sensitive query tokens may be cached');
}
assert.ok(read('bf-context-actions.js').includes('attachModalButtons(k,true)'),'Pix must display only fiscal action');
assert.ok(read('bf-integrity-audit.js').includes('bfAuditarVinculos'),'Missing cross-link audit');
assert.ok(html.includes('id="bfpay-shell"'),'BlackPay container missing');
assert.ok(html.includes("go('agenda')"),'BlackPay back to agenda missing');
assert.ok(read('bf-blackpay-integrated.js').includes('bfBlackPayMount'),'BlackPay native mount missing');
assert.ok(!html.includes('<iframe title="BlackPay'), 'Old nested iframe must be removed');
new vm.Script(read('blackpay/app.js'),{filename:'blackpay/app.js'});
assert.equal(read('sw.js'),read('app/sw.js'),'PWA scripts not synchronized');
for(const name of ['manifest.webmanifest','app/manifest.webmanifest']){
 const m=JSON.parse(read(name));assert.equal(m.name,'BlackFlow');
 assert.ok(m.description.includes('médicos'),'Medical segment missing in manifest');
}
assert.equal(read('CNAME').trim(),'blackflow.app.br');
execFileSync(process.execPath,[fileURLToPath(new URL('../blackpay/smoke.test.mjs',import.meta.url))],{stdio:'inherit'});
assert.ok(html.includes('bf-tati-help.js?v='+version),'Tati script missing');
assert.ok(html.includes('bf-mobile-photos.js?v='+version),'Camera workflow script missing');
assert.ok(html.includes('bf-documents.js?v='+version),'Orçamentos/Receituário script missing');
assert.ok(html.includes("orcamentos:()=>bfDocsView('orc')"),'Document navigation missing');
assert.ok(html.includes("'receitasDocs','combos'"),'Document cloud collection missing');
new vm.Script(read('bf-documents.js'),{filename:'bf-documents.js'});
assert.ok(html.includes('bfPhotoChoice(pid)'),'Camera continuation callback missing');
execFileSync(process.execPath,[fileURLToPath(new URL('./test-documents.mjs',import.meta.url))],{stdio:'inherit'});
console.log('BlackFlow '+version+': release smoke checks PASS');
