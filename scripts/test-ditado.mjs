/* Teste sem microfone real, sessão, prontuário ou rede. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = (path) => fs.readFileSync(new URL('../'+path, import.meta.url));
const src=read('bf-ditado-146.js').toString();
class E {
  constructor(tag){this.tagName=tag?.toUpperCase(); this.value=''; this.dataset={}; this.nodes=[]; this.attrs={}; this.events={};this.isConnected=true; this.hidden=false;}
  addEventListener(k,fn){this.events[k]=fn;}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k]??null;}
  append(...xs){for(const x of xs)if(typeof x==="string")this.textContent=(this.textContent||"")+x;else this.nodes.push(x);}
  after(x){this.next=x;}
  replaceChildren(){this.nodes=[];}
  focus(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
  remove(){this.isConnected=false;this.parent?.nodes.splice(this.parent.nodes.indexOf(this),1);}
  dispatchEvent(e){this.events[e.type]?.(e);}
}
let estado = 'available', capturas = 0, installs = 0, last, inputs = 0;
class Local {
  processLocally=false;
  static async available(o){assert.equal(o.langs[0],'pt-BR');assert.equal(o.processLocally,true);assert.equal(o.quality,'dictation');return estado;}
  static async install(o){assert.equal(o.langs[0],'pt-BR'); assert.equal(o.processLocally,true); installs++; estado='available';return true;}
  start(){assert.equal(this.lang,'pt-BR');assert.equal(this.processLocally,true); capturas++; last=this; this.onstart?.();}
  stop(){this.onend?.();}
  abort(){this.abortado=true;}
}
class Remoto {start(){throw new Error('A captura não pode cair para um serviço remoto.')}}
const doc = {c:[], hidden:false, events:{}, head:{insertAdjacentHTML(){}},body:new E('body'), currentScript:{src:'https://blackflow.example/bf-ditado-146.js'},
  addEventListener(k,fn){this.events[k]=fn;},createElement:tag=>new E(tag),createTextNode:s=>s,querySelectorAll(){return this.c.filter(x=>x.isConnected);}};
doc.body.append=function(x){x.parent=this;this.nodes.push(x)};
const conta = {clinicaId:'clinic-fake'}, ui={view:'pesmapa',ana:null};
let observer;
const ctx={document:doc, SpeechRecognition:Local, webkitSpeechRecognition:Remoto, isSecureContext:true,
  MutationObserver:class {constructor(fn){observer=fn;}observe(){}}, addEventListener(){}, Event,URL, setTimeout,clearTimeout,
  NV:conta,UI:ui,S:{},console};
ctx.window=ctx;
function campo(tag,inicial,auto=false){
  const c=new E(tag);c.value=inicial;c.dataset.bfDitado=auto?'auto':'';
  c.addEventListener('input',()=>inputs++);doc.c.push(c);observer?.();return c;
}
const map=campo('textarea','Nota existente.',true); map.setAttribute('data-bf-ditado-limite','1200');
const outro=campo('textarea','Outra ficha.');
vm.runInNewContext(src,ctx);
const espera=()=>new Promise(r=>setTimeout(r,1));
const abrir=(c)=>c.next.nodes[0].events.click({preventDefault(){},stopPropagation(){}});
const dlg=()=>doc.body.nodes.at(-1);
const texto=()=>dlg().nodes.find(x=>x.className==='bfdf-texto');
const botao=(t)=>dlg().nodes.at(-1).nodes.find(x=>x.textContent===t);
const trecho=(text,isFinal=true)=>Object.assign([{transcript:text}],{isFinal});
const loc=()=>last;
abrir(map);await espera();
assert.equal(capturas,1); assert.equal(map.spellcheck,false);
assert.match(dlg().nodes[1].textContent,/salvamento automático/);
const fala='Sem dor no hálux direito. Fissura de 2,5 milímetros no calcâneo esquerdo.';
loc().onresult({resultIndex:0,results:[trecho(fala)]});
loc().onresult({resultIndex:0,results:[trecho(fala),trecho('ainda falando',false)]});
assert.equal(texto().value,fala);assert.equal(map.value,'Nota existente.');assert.equal(inputs,0);
botao('Parar microfone').events.click();botao('Usar texto').events.click();
assert.ok(map.value.endsWith(fala));assert.equal(outro.value,'Outra ficha.');assert.equal(inputs,1);
abrir(map);await espera();const stale=loc();
map.isConnected=false;conta.clinicaId='outra-clinica-fake';observer();
assert.equal(stale.abortado,true);stale.onresult({resultIndex:0,results:[trecho('Texto para descartar')]});
assert.equal(outro.value,'Outra ficha.');assert.equal(inputs,1);
estado='downloadable'; abrir(outro);await espera();
assert.equal(botao('Instalar pacote pt-BR').hidden,false);assert.equal(capturas,2);
botao('Instalar pacote pt-BR').events.click();await espera();assert.equal(installs,1);
assert.equal(capturas,2,'a instalação não abre o microfone');
botao('Iniciar').events.click();await espera();assert.equal(capturas,3);
loc().onerror({error:'not-allowed'});assert.match(dlg().nodes.find(x=>x.className==='bfdf-status').textContent,/não autorizado/);
botao('Cancelar').events.click();
delete ctx.SpeechRecognition;abrir(outro);await espera();assert.equal(capturas,3);
assert.match(dlg().nodes.find(x=>x.className==='bfdf-status').textContent,/ditado privado não está disponível/);
botao('Cancelar').events.click();
const html=read('index.html').toString(), pes=read('bf-pes-141.js').toString();
assert.match(html,/<script src="\.\/bf-ditado-146\.js\?v=\d+"|<script src="\.\/bf-ditado-146\.js\?v=[\d.]+"/);
assert.match(html, /k:'texto',l:'Descrição do atendimento',type:'textarea',rows:8,ditado:true/);
assert.match(html, /data-bf-ditado spellcheck="false" lang="pt-BR" placeholder="Resposta"/);
assert.match(pes, /data-bf-ditado="auto" data-bf-ditado-limite="1200"/);
assert.equal(read('app/index.html').toString(),html);
assert.equal(read('app/bf-ditado-146.js').toString(),src);
console.log('Ditado clínico: pt-BR local, rascunho, não duplicação, isolamento, permissões e espelhos passaram.');

const dictionary=new Set(['pt-br.aff.gz','pt-br.dic.gz.00','pt-br.dic.gz.01','pt-br.dic.gz.02']);
const workerSrc=read('ditado/worker-pt-br.js').toString();
const host = {
  URL, Blob, Response, DecompressionStream, WebAssembly, TextDecoder, TextEncoder, crypto,
  setTimeout, clearTimeout, atob, Uint8Array,console, importScripts(){},
  location:{href:'https://blackflow.example/ditado/worker-pt-br.js'},
  async fetch(url,opts){
    const t=new URL(url); const p=t.pathname.split('/').at(-1);
    assert.equal(t.origin,'https://blackflow.example'); assert.ok(dictionary.has(p)); assert.equal(t.search,'');
    assert.equal(opts.credentials,'omit'); return new Response(read('ditado/'+p));
  },
};
host.self=host;
host.global=host;
vm.runInNewContext(workerSrc,host);
const resultado=await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(new Error('Worker indisponível')),10000);
  host.postMessage=(v)=>{clearTimeout(t);resolve(v);};
  host.onmessage({data:{id:1,texto:'Sem dor no halux direito. Fissura de 2,5 milímetros no calcaneo esquerdo. evolussão e tratamneto; medicação e onicocriptose, fisssura.'}});
});
assert.equal(resultado.erro,undefined);
for (const [de,para] of Object.entries({halux:'hálux',calcaneo:'calcâneo',fisssura:'fissura','evolussão':'evolução',tratamneto:'tratamento'})) {
  assert.ok(resultado.itens?.some(x=>x.word===de&&x.options.includes(para)),JSON.stringify(resultado));
}
assert.ok(resultado.itens.every(x=>!['sem','dor','direito','esquerdo','milímetros','onicocriptose','2','5','medicação'].includes(x.word)));
console.log('Corretor local: WebAssembly, arquivos pt-BR e sugestões testados; preserva lado, medida e negação.');
