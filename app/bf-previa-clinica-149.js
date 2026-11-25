/* Atalho de conferência visual autorizado pelo servidor, sem mudar o segmento,
   o plano ou as permissões da clínica. Única janela: a prévia fictícia isolada
   usada também pelo Painel Mestre, sem autenticação ou registros no iframe. */
(function(){
'use strict';
if(window.__bfPreviaClinica)return;
window.__bfPreviaClinica=true;
const computador=matchMedia('(min-width:1024px) and (pointer:fine)');
const alvo='/painel-mestre/previa.html#';
const modulos=Object.freeze({bio:'Biomedicina',odonto:'Odontologia'});
let encerrado=null,clinica=null,usuario=null,cliente=null,permitido=false,geracao=0,tarefa=null,janela=null,visor=null,acao=0;
const perfil=()=>!UI.auth&&NV.ativa&&!NV.offline&&NV.papel==='admin'&&NV.sb&&NV.clinicaId&&NV.sessao!==encerrado&&NV.sessao?.user?.id;
function fechar(){++acao;if(janela){janela.remove();janela=visor=null;}}
function botao(){for(const el of document.querySelectorAll('[data-bf-previa-clinica]'))el.hidden=!permitido;}
function invalidar(){
 ++geracao;clinica=usuario=cliente=null;tarefa=null;permitido=false;fechar();botao();
}
function contexto(){
 const u=perfil();
 if(!u){if(usuario)invalidar();return false;}
 if(u!==usuario||clinica!==NV.clinicaId||cliente!==NV.sb){
  invalidar();usuario=u;clinica=NV.clinicaId;cliente=NV.sb;
 }
 return true;
}
async function validar(){
 if(!contexto())return false;
 if(tarefa)return tarefa;
 const ticket=geracao, anterior=permitido;
 const p=(async()=>{
  try{
   const r=await cliente.rpc('bf_previa_clinica_autorizada',{p_clinica:clinica});
   if(!contexto()||ticket!==geracao)return false;
   permitido=!r.error&&r.data===true;
  }catch{if(ticket!==geracao)return false;permitido=false;}
  if(!permitido)fechar();if(anterior!==permitido)render();else botao();return permitido;
 })();
 tarefa=p;
 try{return await p;}finally{if(tarefa===p)tarefa=null;}
}
const baseShell=shell;
shell=function(conteudo){
 const tinha=!!usuario, ticket=geracao;
 if(contexto()&&(!tinha||ticket!==geracao))void validar();
 const html=baseShell.apply(this,arguments);
 if(!permitido)return html;
 // A ordem e a visibilidade do módulo Pés interativos continuam sendo controladas pelo próprio app.
 const inicio=html.indexOf(`onclick="go('pesmapa')"`), fim=inicio<0?-1:html.indexOf('</button>',inicio);
 if(fim<0)return html;
 const itens=computador.matches
  ? Object.entries(modulos).map(([tipo,nome])=>`<button type="button" data-bf-previa-clinica="${tipo}">${ico('file',18)} ${nome}</button>`).join('')
  : '<button type="button" data-bf-previa-clinica="computador">Outros painéis: abra no computador</button>';
 const pos=fim+'</button>'.length;
 return html.slice(0,pos)+itens+html.slice(pos);
};
function abrirDialogo(tipo){
 const d=document.createElement('dialog');janela=d;
 d.setAttribute('aria-labelledby','bf-previa-clinica-titulo');
 d.style.cssText='box-sizing:border-box;width:min(1260px,calc(100% - 32px));max-width:none;max-height:calc(100% - 24px);overflow:auto;padding:18px;border:1px solid var(--line,#aaa);border-radius:14px;color:var(--tx,#171327);background:var(--card,#fff)';
 d.innerHTML=`<h2 id="bf-previa-clinica-titulo">${modulos[tipo]}</h2><p>Prévia com exemplos fictícios. Nada é salvo e o plano, o segmento e os dados da sua clínica continuam iguais.</p><div class="mact" style="justify-content:flex-start"><button type="button" class="btn ghost" data-bf-previa-fechar>Fechar prévia</button></div><div data-bf-previa-visor></div>`;
 visor=d.querySelector('[data-bf-previa-visor]');
 d.addEventListener('cancel',e=>{e.preventDefault();fechar();});
 document.body.append(d);d.showModal();
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-bf-previa-clinica],[data-bf-previa-fechar]');
 if(!b)return;
 if(b.hasAttribute('data-bf-previa-fechar')){fechar();return;}
 if(!computador.matches){fechar();toast('Abra no computador para conferir Biomedicina e Odontologia.');return;}
 const tipo=b.dataset.bfPreviaClinica;
 if(tipo!=='bio'&&tipo!=='odonto')return;
 const vez=++acao;
 if(!await validar()){
  fechar();toast('Não foi possível confirmar o acesso à prévia desta clínica.');return;
 }
 if(vez!==acao||!computador.matches)return;
 fechar();abrirDialogo(tipo);
 const iframe=document.createElement('iframe');
 iframe.title='Prévia de '+modulos[tipo];
 iframe.setAttribute('sandbox','allow-scripts');iframe.referrerPolicy='no-referrer';
 iframe.style.cssText='display:block;width:100%;height:65vh;border:0;margin-top:12px';
 iframe.src=alvo+tipo;visor.append(iframe);
});
for(const n of ['sair','abrirOutraClinica']){
 const base=window[n];window[n]=function(){if(n==='sair')encerrado=NV.sessao;invalidar();return base.apply(this,arguments);};
}
computador.addEventListener('change',()=>{fechar();if(permitido)render();});
window.addEventListener('bf-clinica-sessao-encerrada',()=>{encerrado=NV.sessao;invalidar();});
window.addEventListener('offline',invalidar);
window.addEventListener('online',()=>{if(contexto())void validar();});
window.addEventListener('pagehide',invalidar);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&contexto())void validar();});
setInterval(()=>{if(contexto())void validar();},30000);
})();
