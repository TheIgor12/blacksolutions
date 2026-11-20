import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const slice=(a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i,'Marcadores ausentes: '+a);return s.slice(i,j)};
const mk=(mods={})=>{
 let opens=0;
 const ctx={
  NV:{ativa:true,clinicaId:'clinica-a',mestre:false,segmento:'podologia',plano:'cortesia',offline:false,...mods.NV},
  S:{config:{segmento:'',plano:'completo',clinica:'HappyFEET'},pacientes:[],agendamentos:[],lancamentos:[],comandas:[],...mods.S},
  UI:{auth:null,segPerguntado:false,planoPerguntado:false,...mods.UI},
  CAD:null,SEGMENTOS:{podologia:{nome:'Podologia'},estetica:{nome:'Estética'}},
  openModal:()=>{opens++},segCards:()=>'',save:()=>{},setTimeout:()=>{},
  $:()=>({innerHTML:''}),render:()=>{},perguntarPlano:()=>{},
  closeModal:()=>{},segmentoBloqueado:()=>{opens++},toast:()=>{},
  segmentoRegistrar:async()=>({segmento:'podologia'}),segmentoMestre:async()=>true
 };
 return {ctx,opens:()=>opens};
};
const modal=slice('function perguntarSegmento()','/* ---- Trava do ramo ----');
const travado=slice('function segmentoTravado()','async function segmentoRegistrar(k)');
const choose=slice('async function escolherSegmento(k)','function planoCards(acao)');
for(const tests of ['modal','travado','choose'])assert.ok(s.includes('function '+(tests==='modal'?'perguntarSegmento':tests==='travado'?'segmentoTravado':'escolherSegmento')));
// A clínica já configurada no servidor nunca recebe a janela de segmento.
{const o=mk();vm.runInNewContext(modal+';perguntarSegmento()',o.ctx);assert.equal(o.opens(),0)}
// Até com cache local sem ramo, a trava respeita a decisão do servidor.
{const o=mk();const yes=vm.runInNewContext(travado+';segmentoTravado()',o.ctx);assert.equal(yes,true)}
// O ramo preexistente localmente fica protegido mesmo em fase de teste.
{const o=mk({NV:{segmento:'',plano:'teste'},S:{config:{segmento:'estetica',plano:'completo'}}});assert.equal(vm.runInNewContext(travado+';segmentoTravado()',o.ctx),true)}
// Abertura inicial legítima de nova clínica pode oferecer a escolha.
{const o=mk({NV:{segmento:''}});vm.runInNewContext(modal+';perguntarSegmento()',o.ctx);assert.equal(o.opens(),1)}
// A seleção posterior é bloqueada e não grava o novo segmento.
{const o=mk();vm.runInNewContext(travado+';'+choose+';globalThis.run=escolherSegmento',o.ctx);await o.ctx.run('estetica');assert.equal(o.ctx.S.config.segmento,'');assert.equal(o.opens(),1)}
// O método correto usa a clínica explícita e o registro remoto precede atualização local.
assert.ok(s.includes("rpc('bs_segmento_definir_para',{p_clinica:NV.clinicaId,p_segmento:k})"));
assert.ok(s.includes("if(SEGMENTOS[NV.segmento])S.config.segmento=NV.segmento;"));
assert.ok(!s.includes("if(S.pacientes.length||S.agendamentos.length){S.config.segmento='podologia';save()}"));
const login=slice('async function entrar(sessao)','async function carregarCache()');
assert.ok(!login.includes("S.config.segmento=NV.segmento;save()"),'Login não deve escrever antes de carregar cache');
const loaded=slice('async function abrirClinica()','async function abrirOffline()');
assert.ok(loaded.indexOf('await carregarCache()')<loaded.indexOf('if(SEGMENTOS[NV.segmento])S.config.segmento=NV.segmento'));
assert.ok(loaded.indexOf('await puxar()')<loaded.lastIndexOf('S.config.segmento=NV.segmento'));
console.log('BlackFlow: testes de regressão do onboarding e trava de segmento PASS');
