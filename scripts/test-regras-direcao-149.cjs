/* Exercita as funções atuais com registros inteiramente fictícios. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const index=read('index.html');
function around(a,b){const i=index.indexOf(a);const j=index.indexOf(b,i);assert.ok(i>=0&&j>i);return index.slice(i,j);}
const ctx=vm.createContext({
 S:{pacientes:[{id:'original-ficticio',codigo:'1',nome:'Pessoa Fictícia',status:'Ativo'}],anamneses:[{id:'AN-FICTICIA',pacienteId:'original-ficticio',obs:'Histórico de ensaio'}]},
 norm:s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
 str:s=>String(s??'').trim(),keyCPF:()=>'',nextCodigo:()=>'2',uid:()=> 'novo-ficticio',todayISO:()=> '2026-11-24'
});
vm.runInContext(index.match(/function splitNome\(n\)\{[^\n]+\}/)[0]+'\n'+around('function findPatient(','/* Quantos aguardam conferência'),ctx);
assert.equal(vm.runInContext("ensurePatient('Pessoa Fictícia').id",ctx),'original-ficticio');
assert.equal(ctx.S.pacientes.length,1);assert.equal(ctx.S.anamneses[0].pacienteId,'original-ficticio');
assert.equal(vm.runInContext("ensurePatient('Pessoa Fictícia','',false).id",ctx),'novo-ficticio');
assert.equal(ctx.S.pacientes.length,2);assert.equal(ctx.S.pacientes[1].conferirDuplicado,'original-ficticio');
const ag=index.slice(index.indexOf('function agForm('),index.indexOf('function agForm(')+16000);
assert.match(ag,/ensurePatient\(o\.paciente\)/);assert.match(ag,/pacienteId:pp\.id/);
assert.match(index,/findPatient\(o\.nome,o\.cpf,o\.codigo\)/);
const docs={config:{clinica:'Ensaio'},pacientes:[{id:'x',nome:'Pessoa fictícia'}],servicos:[{id:'srv',nome:'Dez sessões de teste',preco:100,sessoesPacote:10,precoPacote:600,ativo:true}]};
const fields={nome:{value:''},valor:{value:''},descricao:{value:''}},aviso={style:{}},form={innerHTML:'',elements:{namedItem:()=>null},querySelectorAll:()=>[]},id={value:''};
const document={head:{insertAdjacentHTML(){}},getElementById:id=>id==='bf-doc-form'?form:null,
 querySelector:s=>s.startsWith('select')?id:fields[s.match(/data-key="([^"]+)/)?.[1]],querySelectorAll:()=>[{querySelector:()=>aviso}]};
const c=vm.createContext({S:docs,document,confirm:()=>true,openModal(){},closeModal(){},render(){},save(){},toast(){},uid:()=>Math.random().toString()});
c.window=c;vm.runInContext(read('bf-documents.js'),c);
c.bfDocOpen('orc','x');c.bfDocTotais();assert.equal(aviso.style.display,'block');
c.bfDocNome(0,'Dez sessões de teste');assert.equal(fields.valor.value,100);assert.equal(aviso.style.display,'none');
c.bfDocChooseService(0,'srv|p');c.bfDocSubmit(false);
assert.equal(docs.orcamentos[0].items[0].quantidade,1);assert.equal(docs.orcamentos[0].items[0].valor,600);
assert.match(ag,/sincLancAg\(ag\)/);
console.log('Direção: retorno na mesma ficha e anamnese preservada; importação separa homônimos; valor digitado pelo nome, aviso zerado e pacote unitário.');
