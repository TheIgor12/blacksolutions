// BlackPay smoke tests (node >= 20), no real-money dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){}});return elements.get(id)};
const document={getElementById:el,querySelectorAll:()=>[],addEventListener(){}};
const context=vm.createContext({document,location:{search:''},URLSearchParams,crypto:webcrypto,TextEncoder,Date,Number,String,Array,Object,Set,Map,Promise,Math,console,Intl,setTimeout,clearTimeout,confirm:()=>true});
vm.runInContext(source,context);
function testExpr(s){return vm.runInContext(s,context)}
assert.equal(testExpr('accounts.length'),2);
assert.equal(testExpr('balance("ACC-A")'),750000);
assert.equal(testExpr('balance("ACC-B")'),0);
assert.equal(testExpr('entries.reduce((s,x)=>s+x.amount,0)'),0,'Double entry');
testExpr('post("transferencia",[{account:"ACC-A",amount:-12000},{account:"ACC-B",amount:12000}],{},"idempotent-test-111")');
assert.equal(testExpr('balance("ACC-A")'),738000);
assert.equal(testExpr('balance("ACC-B")'),12000);
assert.throws(()=>testExpr('post("transferencia",[{account:"ACC-A",amount:-12000},{account:"ACC-B",amount:12000}],{},"idempotent-test-111")'),/repetida/);
assert.throws(()=>testExpr('post("transferencia",[{account:"ACC-A",amount:-1000000},{account:"ACC-B",amount:1000000}])'),/insuficiente/);
assert.throws(()=>testExpr('post("transferencia",[{account:"ACC-A",amount:-100},{account:"ACC-B",amount:99}])'),/fecham/);
testExpr('account("ACC-A").status="blocked"');
assert.throws(()=>testExpr('post("transferencia",[{account:"ACC-A",amount:-10},{account:"ACC-B",amount:10}])'),/bloqueada/);
testExpr('account("ACC-A").status="active"');
assert.equal(testExpr('entries.reduce((s,x)=>s+x.amount,0)'),0);
await testExpr('auditBusy');
assert.equal(testExpr('audit.length'),2);
const hashes=await testExpr('(async()=>{const out=[];let prev="GENESIS";for(const e of audit){const {hash,...item}=e;out.push(e.prev===prev && hash===await digest(JSON.stringify(item)));prev=hash}return out})()');
assert.ok(hashes.every(Boolean));
assert.equal(testExpr('charges.length'),0); // no live gateway wired
console.log('BLACKPAY TESTS OK: balances, double entry, idempotency, insufficient funds, block, hash chain');
