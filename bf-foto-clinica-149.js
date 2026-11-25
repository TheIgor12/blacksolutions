/* BlackFlow 1.49.0: guarda foto de evolução sem metadados no prontuário de Biomedicina.
   Não recebe simulação, não prevê resultado e não altera anexos anteriores. */
(function(){
 'use strict';
 if(window.__bfFotoClinica149)return;
 window.__bfFotoClinica149=true;
 let previous;
 async function open(section,who,reopen){
  if(previous)previous();
  if(!section||!who())return;
  try {
   const m=await import('/foto-clinica/ui/bf-foto-clinica-149.mjs');
   if(!section.isConnected||!who())return;
   let handler;
   const done=()=>{observer.disconnect();if(handler){handler();handler=null;}};
   previous=done;
   const observer=new MutationObserver(()=>{if(!section.isConnected||!who())done();});
   observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
   handler=m.montarFotoClinica(section,{contexto:who,enviar:(c,x,v,e,h)=>m.enviarFotoClinica(c.sb,c,x,v,e,h),concluiu:()=>{if(who())reopen();}});
  }catch(_){if(section.isConnected)section.textContent='O envio da foto de evolução não está disponível.';}
 }
 window.BFFotoClinica149=Object.freeze({open});
})();
