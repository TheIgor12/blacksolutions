/**
 * BlackFlow: release smoke checks, zero dependencies or API credentials.
 * Run with: node scripts/auditar-release.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const version=JSON.parse(read('versao.json')).versao;
const html=read('index.html'),app=read('app/index.html');
assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(html,app,'Root and /app entrypoints must match');
for(const body of [html,app]){
 assert.ok(body.includes("const VERSAO_APP='"+version+"'"),'Wrong displayed release version');
 for(const asset of ['bf-clinical','bf-fiscal-advanced','bf-receituario','bf-cadastro-fiscal','bf-context-actions','bf-integrity-audit']){
  assert.ok(body.includes('./'+asset+'.js?v='+version),'Outdated asset version: '+asset);
 }
 const blocks=[...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
 for(const [i,m]of blocks.entries())new vm.Script(m[1],{filename:'index.html:inline-'+i});
}
for(const name of ['bf-clinical.js','bf-fiscal-advanced.js','bf-receituario.js','bf-cadastro-fiscal.js','bf-context-actions.js','bf-integrity-audit.js']){
 const a=read(name),b=read('app/'+name);
 assert.equal(a,b,'Different root and /app copies: '+name);
 new vm.Script(a,{filename:name});
}
assert.ok(read('bf-clinical.js').includes('SEGMENTOS.medicina'),'Missing Medicine segment');
assert.ok(read('bf-receituario.js').includes("conselho:seg()==='odontologia'?'CRO':seg()==='medicina'?'CRM'"),'Missing CRM');
assert.ok(read('bf-receituario.js').includes('RASCUNHO - NAO ASSINADO'),'Missing watermark');
for(const file of ['sw.js','app/sw.js']){
 const sw=read(file);new vm.Script(sw,{filename:file});
 assert.ok(sw.includes('blackflow-v19'),'PWA cache not bumped');
 assert.ok(sw.includes("url.searchParams.has('token')"),'Sensitive query tokens may be cached');
}
assert.ok(read('bf-context-actions.js').includes('attachModalButtons(k,true)'),'Pix must display only fiscal action');
assert.ok(read('bf-integrity-audit.js').includes('bfAuditarVinculos'),'Missing cross-link audit');
assert.ok(html.includes('src="/blackpay/?embedded=1&v=0.1.1"'),'BlackPay preview missing');
assert.ok(html.includes('bpPreferenciaFutura'),'BlackPay future preference missing');
assert.ok(read('blackpay/app.js').includes('embeddedReadOnly'),'BlackPay client preview must be read only');
new vm.Script(read('blackpay/app.js'),{filename:'blackpay/app.js'});
assert.equal(read('sw.js'),read('app/sw.js'),'PWA scripts not synchronized');
for(const name of ['manifest.webmanifest','app/manifest.webmanifest']){
 const m=JSON.parse(read(name));assert.equal(m.name,'BlackFlow');
 assert.ok(m.description.includes('médicos'),'Medical segment missing in manifest');
}
assert.equal(read('CNAME').trim(),'blackflow.app.br');
console.log('BlackFlow '+version+': release smoke checks PASS');
