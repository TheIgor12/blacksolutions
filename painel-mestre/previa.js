/* Prévia local: reaproveita os módulos oficiais sem iniciar o BlackFlow ou Auth. */
'use strict';
const odonto=location.hash==='#odonto';
const segmento=odonto?'odontologia':'biomedicina';
const clinica='00000000-0000-4000-8000-000000000001',usuario='00000000-0000-4000-8000-000000000002',ficha='00000000-0000-4000-8000-000000000003';
const S={config:{segmento},pacientes:[{id:'PESSOA-FICTICIA',nome:'Pessoa fictícia'}]};
const UI={auth:null,view:odonto?'odontomapa':'estetmapa'};
const exemplos=Object.freeze({
 bf_profissionais:[{id:usuario}],bf_prontuarios:[{id:ficha,paciente_ref:'PESSOA-FICTICIA'}],
 bf_odontogramas:[{id:'registro-ficticio',dentes:{16:{estado:'restauracao',face:'c'}},criado_em:'2026-11-25T14:00:00Z'}],
 bf_estetmapa_registros:[{id:'registro-ficticio',sessao_id:'sessao-ficticia',sessao_data:'2026-11-25',vista:'frontal',regiao:'malar',lado:'direito',produto:'Produto fictício',quantidade:1,unidade:'unidade',lote:'LOTE FICTÍCIO',validade:'2027-11-25',criado_em:'2026-11-25T14:00:00Z'}]
});
const semEscrita=()=>Promise.resolve({error:{message:'A prévia não grava registros.'},data:null});
const NV={ativa:true,offline:false,papel:'admin',clinicaId:clinica,sessao:{user:{id:usuario}},
 sb:Object.freeze({rpc:semEscrita,from(nome){
  const encerrado={select(){return encerrado;},eq(){return encerrado;},in(){return encerrado;},not(){return encerrado;},order(){return encerrado;},range(){return encerrado;},limit(){return encerrado;},
   insert:semEscrita,update:semEscrita,delete:semEscrita,upsert:semEscrita,
   then(resolve,reject){return Promise.resolve({data:structuredClone(exemplos[nome]||[]),error:null}).then(resolve,reject);}};
  return encerrado;
 }})};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const soAgenda=()=>false,podeTela=t=>t!=='orcamentos',pode=()=>true,shell=text=>text,menuOrdem=x=>x;
const br=x=>String(x||'').slice(0,10).split('-').reverse().join('/');
const pac=id=>S.pacientes.find(p=>p.id===id);
const todayISO=()=>new Date().toISOString().slice(0,10);
function menuItens(){return [];}
function render(){}
function go(t){if(t===(odonto?'odontomapa':'estetmapa')){UI.view=t;render();}}
document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
document.addEventListener('click',e=>{
 if(e.target.closest('a,input[type=file],[data-bfo-arquivo-btn],[data-bfo-foto],[data-bfo-confirmar],[data-bfo-orc],[data-nota]')){e.preventDefault();e.stopImmediatePropagation();}
},true);
