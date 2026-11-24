// Teste sem login, sem rede e sem dados reais. Usa geometria, câmera e raycasting reais.
// O renderer é substituído para rodar também em CI sem GPU.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as Three from '../vendor/three.module.min.js';
const read = (p) => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index = read('index.html');
const ficha = index.slice(index.indexOf('function pesFicha(pid){'),index.indexOf('function anaUltima(pid){'));
const model = JSON.parse(read('pes/modelo-anatomico-1.json'));
assert.equal(read('app/pes/modelo-anatomico-1.json'),read('pes/modelo-anatomico-1.json'));
for (const f of ['bf-pes-141.js','bf-pes3d-141.js']) assert.equal(read('app/'+f), read(f));

class Element {
  constructor() {
    this.isConnected=true; this.clientWidth=440; this.style={}; this.nodes=[]; this.fns={};
  }
  setAttribute() {}
  setPointerCapture() {}
  getBoundingClientRect(){return {left:0,top:0,width:440,height:436}}
  appendChild(x){this.nodes.push(x)}
  replaceChildren(...xs){this.nodes=xs}
  addEventListener(k,f){this.fns[k]=f}
  getContext(){return {getExtension:()=>null}}
  fire(k,e){this.fns[k]({ type:k,pointerId:1,button:0,buttons:1,preventDefault(){},...e });}
}
let box;
const canvas = () => box.nodes[0];
let draw;
class Renderer {
  domElement=new Element();
  render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld();camera.updateMatrixWorld();draw=this;}
  setSize(){} setPixelRatio(){} dispose(){} forceContextLoss(){}
}
const appElem={set innerHTML(v){if(box) box.isConnected=false;box=v.includes('id="bfp-3d"')?new Element():null;this.html=v;}};
const els={'app':appElem,'bfp-tipo':{value:'Calo'},'bfp-nota':{value:'anotação sintética A'}};
const document={currentScript:{src:'https://example.test/bf-pes3d-141.js'},head:{insertAdjacentHTML(){}},
  getElementById:id=>id==='bfp-3d'?box:els[id],
  createElement:()=>new Element(), querySelectorAll:()=>[]};
const S={config:{segmento:'podologia',responsavel:'Teste'},pacientes:[{id:'p1',nome:'Mesmo nome'},{id:'p2',nome:'Mesmo nome'}],
  pesMapas:[{id:'old',pacienteId:'p1',obs:'antiga',pontos:[{id:'legacy',v:2,pe:'D',vista:'3d',x:5,y:4,z:12,regiao:'calc',nota:'intacta'}]}],
  evolucoes:[]};
const legacy=JSON.stringify(S.pesMapas[0].pontos[0]);
let modal='', toast='', yes, saves=0, count=0;
const callbacks=new Map();
const scope={
  document, S, URL, console, atob, NV:{ativa:true,clinicaId:'fixture-A'}, UI:{view:'pesmapa',auth:false}, THREE:{...Three, WebGLRenderer:Renderer},
  render(){}, menuItens:()=>[], soAgenda:()=>false, podeTela:()=>true, menuOrdem:x=>x, fonteAplicar(){}, shell:x=>x,firstName:x=>x,
  esc:x=>String(x??'').replaceAll('<','&lt;').replaceAll('>','&gt;'),str:x=>x||'', nomeUsuario:()=>'Teste', todayISO:()=>'2026-11-24', br:x=>x,
  uid:()=>String(++count), save:()=>{saves++}, toast:x=>{toast=x}, openModal:x=>{modal=x}, closeModal:()=>{modal=''},
  confirmModal:(x,f)=>{modal=x;yes=()=>{f();scope.closeModal();scope.save();scope.render();};}, setTimeout, clearTimeout, AbortController,
  Image:class {}, ResizeObserver:class {observe(){} disconnect(){}},
  requestAnimationFrame:f=>{const id=++count;callbacks.set(id,f);return id;}, cancelAnimationFrame:id=>callbacks.delete(id),
  fetch: async url=>{assert.equal(String(url),'https://example.test/pes/modelo-anatomico-1.json');return {ok:true,json:async()=>model};}
};
scope.window=scope;
const cx=vm.createContext(scope);
const js3d=read('bf-pes3d-141.js');
const importSource="import(new URL('vendor/three.module.min.js', base).href)";
assert.ok(js3d.includes(importSource));
vm.runInContext(js3d.replace(importSource,'Promise.resolve(THREE)'),cx);
vm.runInContext(ficha+read('bf-pe-vistas.js')+read('bf-pes-141.js'),cx);
const wait=async()=>{await new Promise(r=>setTimeout(r,25)); for(const [id,f] of callbacks){callbacks.delete(id);f();}};
function view(v){scope.bfPesAngulo(v); for(const [id,f] of callbacks){callbacks.delete(id);f();}}
function select(id){scope.bfPesPaciente(id);}
function clickXYZ(x,y,z) {
  const p=new Three.Vector3(x,y,z).project(draw.camera);
  const el=canvas(), rect=el.getBoundingClientRect();
  const e={clientX:(p.x+1)*rect.width/2,clientY:(1-p.y)*rect.height/2};
  el.fire('pointerdown',e);el.fire('pointerup',e);
}
function salvar() {
  const item=modal.match(/onclick="(bfPesSalvarPonto\([^"]+\))"/);
  assert.ok(item,modal);
  vm.runInContext(item[1],cx);
}
select('p1');
await wait();
assert.ok(canvas(),'3D deve ser o padrão quando WebGL funciona');
const labels=box.nodes[1].nodes;
assert.equal(labels.map(x=>x.textContent).join(''),'12345');
assert.ok(labels.every(x=>!x.hidden),'Os cinco números aparecem no dorso');
for (let i=0;i<5;i++) {
  const l=labels[i], r=canvas().getBoundingClientRect();
  const e={clientX:parseFloat(l.style.left)*r.width/100,clientY:parseFloat(l.style.top)*r.height/100};
  canvas().fire('pointerdown',e); canvas().fire('pointerup',e);
  assert.match(modal,new RegExp('unha do '+(i+1)+'º'),modal); scope.closeModal();
}
const before=draw.camera.position.clone();
canvas().fire('pointerdown',{clientX:120,clientY:80});
canvas().fire('pointermove',{clientX:420,clientY:-65});
canvas().fire('pointerup',{clientX:420,clientY:-65});
await wait(); assert.ok(before.distanceTo(draw.camera.position)>40); assert.equal(modal,'');
view('dorsal'); clickXYZ(27,18,207);
assert.match(modal,/Pé direito, unha do 1º.*Mesmo nome/);
salvar(); await wait();
assert.equal(S.pesMapas[0].pontos[1].malha,'anatomico-1');
assert.equal(S.pesMapas[0].pontos[1].regiao,'u1');
assert.equal(JSON.stringify(S.pesMapas[0].pontos[0]),legacy);
assert.match(scope.pesFicha('p1'),/anotação sintética A/);
assert.doesNotMatch(scope.pesFicha('p2'),/anotação sintética A/);
scope.bfPesParaEvolucao();yes();await wait();
assert.equal(S.evolucoes[0].pacienteId,'p1');assert.match(S.evolucoes[0].texto,/anotação sintética A/);
view('plantar'); clickXYZ(-8,3,110); assert.match(modal,/arco plantar|bordo lateral/); scope.closeModal();
view('calcanhar'); clickXYZ(0,20,-17); assert.match(modal,/calcâneo posterior|borda do calcanhar|calcâneo/); scope.closeModal();
view('dorsal'); clickXYZ(0,50,116); assert.match(modal,/dorso do médio-pé/);
select('p2'); salvar(); assert.match(toast,/ficha mudou/); await wait();
assert.equal(S.pesMapas.length,1);
scope.bfPesPe('E'); await wait(); view('dorsal');
clickXYZ(-27,18,207); assert.match(modal,/Pé esquerdo, unha do 1º/);
els['bfp-nota'].value='anotação sintética B';
salvar(); await wait();
assert.equal(S.pesMapas[1].pacienteId,'p2'); assert.equal(S.pesMapas[1].pontos[0].pe,'E');
assert.match(scope.pesFicha('p2'),/anotação sintética B/);assert.doesNotMatch(scope.pesFicha('p1'),/anotação sintética B/);
assert.equal(JSON.parse(JSON.stringify(S)).pesMapas[1].pontos[0].malha,'anatomico-1');
assert.ok(saves>=3);
scope.bfPesVista('dorsal'); assert.match(appElem.html,/Pintar área/);
scope.bfPes3dCabe=()=>false; select('p1'); assert.equal(box,null); assert.match(appElem.html,/Peito do pé/);
console.log('Pés Interativos: anatomia, raycast dos cinco dedos, giro, sola, calcanhar, lateralidade, fallback e vínculo passaram.');
