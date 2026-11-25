/* Atalho de conferência visual autorizado pelo servidor, sem mudar o segmento,
   o plano ou as permissões da clínica. Única janela: a prévia fictícia isolada
   usada também pelo Painel Mestre, sem autenticação ou registros no iframe. */
(function(){
'use strict';
if(window.__bfPreviaClinica)return;
window.__bfPreviaClinica=true;
const computador=matchMedia('(min-width:1024px) and (pointer:fine)');
const alvo='/painel-mestre/previa.html#';
let encerrado=null,clinica=null,usuario=null,cliente=null,permitido=false,geracao=0,tarefa=null,janela=null,visor=null,acao=0;
const perfil=()=>!UI.auth&&NV.ativa&&!NV.offline&&NV.papel==='admin'&&NV.sb&&NV.clinicaId&&NV.sessao!==encerrado&&NV.sessao?.user?.id;
function fechar(){++acao;if(janela){janela.remove();janela=visor=null;}}
function botao(){const el=document.querySelector('[data-bf-previa-clinica]');if(el)el.hidden=!permitido;}
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
 const texto=computador.matches?'Prévia de outros painéis':'Outros painéis: abra no computador';
 return html.replace('<div class="mfoot menu">','<div class="mfoot menu"><button type="button" data-bf-previa-clinica>'+texto+'</button>');
};
function abrirDialogo(){
 const d=document.createElement('dialog');janela=d;
 d.setAttribute('aria-labelledby','bf-previa-clinica-titulo');
 d.style.cssText='box-sizing:border-box;width:min(1260px,calc(100% - 32px));max-width:none;max-height:calc(100% - 24px);overflow:auto;padding:18px;border:1px solid var(--line,#aaa);border-radius:14px;color:var(--tx,#171327);background:var(--card,#fff)';
 d.innerHTML='<h2 id="bf-previa-clinica-titulo">Prévia de outros painéis</h2><p>Exemplos fictícios. Nada é salvo e o plano, o segmento e os dados da sua clínica continuam iguais.</p><div class="mact" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="btn" data-bf-previa-modulo="bio">Biomedicina</button> <button type="button" class="btn" data-bf-previa-modulo="odonto">Odontologia</button> <button type="button" class="btn ghost" data-bf-previa-fechar>Fechar prévia</button></div><div data-bf-previa-visor></div>';
 visor=d.querySelector('[data-bf-previa-visor]');
 d.addEventListener('cancel',e=>{e.preventDefault();fechar();});
 document.body.append(d);d.showModal();
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-bf-previa-clinica],[data-bf-previa-modulo],[data-bf-previa-fechar]');
 if(!b)return;
 if(b.hasAttribute('data-bf-previa-fechar')){fechar();return;}
 if(!computador.matches){fechar();toast('Abra no computador para conferir Biomedicina e Odontologia.');return;}
 const vez=++acao;
 if(visor)visor.replaceChildren();
 if(!await validar()){
  fechar();toast('Não foi possível confirmar o acesso à prévia desta clínica.');return;
 }
 if(vez!==acao||!computador.matches)return;
 const tipo=b.dataset.bfPreviaModulo;
 if(!janela){abrirDialogo();return;}
 if(tipo!=='bio'&&tipo!=='odonto')return;
 const iframe=document.createElement('iframe');
 iframe.title=tipo==='bio'?'Prévia de Biomedicina':'Prévia de Odontologia';
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
