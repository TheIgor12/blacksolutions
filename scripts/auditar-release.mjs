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
const raiz=new URL('../',import.meta.url);
const arquivos=fs.readdirSync(raiz).filter(n=>/^bf-.*\.js$/.test(n)).sort();
const referencias=[...new Set([...html.matchAll(/['"]\.\/(bf-[\w-]+\.(?:js|css)\?v=[\d.]+)['"]/g)].map(m=>m[1]))];
assert.ok(referencias.length>=arquivos.length);
const sufixo=version.split('.').slice(1).join('');
assert.ok(html.includes("const NOVIDADES={versao:'"+version+"'"));
assert.ok(read('DIRETRIZES.md').includes('Regras invioláveis'));
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
for(const name of arquivos){
 const a=read(name),b=read('app/'+name);
 assert.equal(a,b,'Different root and /app copies: '+name);
 assert.ok(referencias.includes(name+'?v='+version),'Falta a referência exata de '+name);
 new vm.Script(a,{filename:name});
}
execFileSync(process.execPath,[fileURLToPath(new URL('./test-ditado.mjs',import.meta.url))],{stdio:'inherit'});
for(const segmento of ['odontologia','biomedicina']) assert.ok(read('bf-clinical.js').includes('SEGMENTOS.'+segmento),'Segmento clínico ausente '+segmento);
assert.ok(html.includes('2.119.2'),'A versão pregada do Supabase é obrigatória');
assert.ok(read('bf-receituario.js').includes('RASCUNHO - NAO ASSINADO'),'Missing watermark');
for(const file of ['sw.js','app/sw.js']){
 const sw=read(file);new vm.Script(sw,{filename:file});
 assert.match(sw,new RegExp("const CACHE='blackflow-v"+sufixo+"-"),'Cache da publicação não acompanha a versão');
 const base=sw.split("self.addEventListener('install'",1)[0];
 for(const asset of referencias) assert.ok(base.includes("'"+asset+"'"),'Cache sem referência exata: '+asset);
 assert.doesNotMatch(base,/three\.module|minimo-anatomico|modelo-anatomico-1/,'Biblioteca ou malha tridimensional em pré-cache');
 assert.ok(sw.includes("url.searchParams.has('token')"),'Sensitive query tokens may be cached');
}
assert.ok(read('bf-context-actions.js').includes('attachModalButtons(k,true)'),'Pix must display only fiscal action');
assert.ok(read('bf-integrity-audit.js').includes('bfAuditarVinculos'),'Missing cross-link audit');
assert.ok(html.includes('id="bfpay-shell"'),'BlackPay container missing');
assert.ok(html.includes("go('agenda')"),'BlackPay back to agenda missing');
assert.ok(read('bf-blackpay-integrated.js').includes('bfBlackPayMount'),'BlackPay native mount missing');
assert.ok(!html.includes('<iframe title="BlackPay'), 'Old nested iframe must be removed');
new vm.Script(read('blackpay/app.js'),{filename:'blackpay/app.js'});
assert.ok(read('sw.js').includes('network-first')&&read('app/sw.js').includes('network-first'),'PWA offline policy missing');
for(const name of ['manifest.webmanifest','app/manifest.webmanifest']){
 const m=JSON.parse(read(name));assert.equal(m.name,'BlackFlow');
 assert.equal(m.description,JSON.parse(read('manifest.webmanifest')).description);
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
execFileSync(process.execPath,[fileURLToPath(new URL('./test-segmento-onboarding.mjs',import.meta.url))],{stdio:'inherit'});
for(const teste of ['test-regras-direcao-149.cjs','odonto-unit-149.cjs','bio-unit-149.cjs']){
 execFileSync(process.execPath,[fileURLToPath(new URL('./'+teste,import.meta.url))],{stdio:'inherit'});
}
console.log('BlackFlow '+version+': verificações de integridade, regressão e cache passaram.');
