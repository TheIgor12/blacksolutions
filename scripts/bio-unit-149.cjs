/* Validação local do módulo, com dados fictícios. node scripts/bio-unit-149.cjs */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
let t;
const C={
 window:{__bfEstetMapaTestHook:x=>{t=x;}},
 document:{addEventListener(){},head:{insertAdjacentHTML(){}}},
 S:{config:{segmento:'biomedicina'}},
 UI:{auth:null,view:'inicio'}, NV:{},
 podeTela:()=>true,soAgenda:()=>false,menuItens:()=>[],menuOrdem:m=>m,render(){},
 esc:x=>String(x)
};
vm.createContext(C);
const src=fs.readFileSync(path.join(root,'bf-estetmapa-149.js'),'utf8');
vm.runInContext(src,C);
const catalogSrc=fs.readFileSync(path.join(root,'bf-catalogos-130.js'),'utf8');
const catalog=JSON.parse(catalogSrc.match(/var CAT = (.*);/)[1]).biomedicina;
C.window.BF_CATALOGOS={biomedicina:catalog};
assert.equal(t.cabe(),true);
assert.equal(C.menuItens()[0][0],'estetmapa');
C.S.config.segmento='odontologia';assert.equal(C.menuItens().length,0);
C.S.config.segmento='biomedicina';C.podeTela=()=>false;assert.equal(t.cabe(),false);
assert.ok(t.bloqueio(catalog,'P.M.M.A'));
assert.ok(t.bloqueio(catalog,'POLIMETILMETACRILATO'));
const produtos=t.produtos(catalog);
assert.ok([...produtos.values()].some(x=>x.includes('reticulado')));
assert.ok(![...produtos.values()].some(x=>/Toxina|PMMA|sachê|Protetor solar/.test(x)));
assert.equal(t.microunidades('1,155'),1155000);
assert.equal(t.microunidades('0'),null);
assert.equal(t.microunidades('1e2'),null);
assert.equal(t.microunidades('0,0000001'),null);
assert.equal(t.iso('2025-02-29'),false);
assert.equal(t.iso('2024-02-29'),true);
assert.equal(t.corRegiao([1,91,167,255]),'fronte');
assert.equal(t.corRegiao([2,91,167,249]),'');
assert.equal(t.corRegiao([2,91,168,255]),'');
assert.equal(t.corRegiao([24,91,167,255]),'');
const registro={sessao_id:'a',sessao_data:'2026-01-12',criado_em:'2026-01-12T14:00Z',regiao:'fronte',unidade:'ml',quantidade:'.25'};
const x=t.totalizar([
 {...registro,quantidade:'0.2'},{...registro,quantidade:'0.1'},{...registro,quantidade:15,unidade:'unidade'},
 {...registro,quantidade:'0.001',unidade:'outra',unidade_descricao:'Ampola'},
 {...registro,quantidade:'0.002',unidade:'outra',unidade_descricao:'ampola'},
 {...registro,quantidade:50,sessao_data:'2025-12-20'}
],'2026-01-01','2026-01-30');
assert.equal(x.length,3);
assert.equal(x.find(r=>r.unidade==='ml').total,300000);
assert.equal(x.find(r=>r.unidade==='unidade').total,15000000);
assert.equal(x.find(r=>r.unidade==='outra').total,3000);
assert.equal(t.sessoes([registro,{...registro,sessao_id:'b',criado_em:'2026-01-12T16:00Z'}])[0].id,'b');
const p={vista:'frontal',regiao:'fronte',data:'2026-01-12',form:{produto:[...produtos.values()][0],quantidade:'1,2',unidade:'ml',lado:'central',lote:'TESTE',validade:'2027-01-12'}};
assert.equal(t.validar(p).reg.quantidade,1.2);
assert.match(t.validar({...p,form:{...p.form,lote:''}}).erro,/lote/);
assert.match(t.validar({...p,form:{...p.form,validade:''}}).erro,/validade/);
assert.match(t.validar({...p,form:{...p.form,produto:'P.M.M.A'}}).erro,/PMMA/i);
assert.match(t.validar({...p,form:{...p.form,unidade:'outra'}}).erro,/unidade/);
console.log('Biomedicina: segmentação clínica, produtos e motivos, quantidades, cor exata, comparação, período e campos obrigatórios conferidos.');
const im={...p,modo:'intramuscular_realizada',form:{produto:'  Produto fictício sem catálogo  ',lote:'L-TESTE',validade:'2027-01-12',realizada:true,observacoes:'Nota fictícia.',quantidade:'1',lado:'central'}};
const vIm=t.validar(im).reg;
assert.equal(vIm.tipo_registro,'intramuscular_realizada');
assert.equal(vIm.produto,'Produto fictício sem catálogo');
assert.ok(!('lado' in vIm)&&!('quantidade' in vIm)&&!('vista' in vIm));
assert.match(t.validar({...im,form:{...im.form,realizada:false}}).erro,/Confirme/);
assert.match(t.validar({...im,form:{...im.form,produto:' '}}).erro,/nome/i);
assert.match(t.validar({...im,form:{...im.form,produto:'P.M.M.A.'}}).erro,/disponível/i);
assert.match(t.validar({...im,modo:'mapa',form:{...im.form,unidade:'ml'}}).erro,/catálogo/i);
assert.equal(t.rascunhoIM({...vIm,sessao_data:'2026-01-12'}),'Aplicação intramuscular já realizada em 12/01/2026: Produto fictício sem catálogo. Lote: L-TESTE. Validade: 12/01/2027. Observações: Nota fictícia.');
console.log('Histórico intramuscular: nome livre, confirmação, bloqueio, ausência de campos do mapa e texto para rascunho conferidos.');
