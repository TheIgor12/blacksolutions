/* Executa antes da biblioteca Auth. Remove o comprovante da barra de endereço. */
'use strict';
const retornoSenha=(()=>{
 const fragment=location.hash,query=location.search;
 if(fragment||query)history.replaceState(null,'',location.pathname);
 if(!fragment&&!query)return null;
 // Um fragmento implícito não prova o tipo de recuperação. Peça novo link.
 if(fragment&&query)return false;
 const p=new URLSearchParams(fragment?fragment.slice(1):query),lista=p.getAll('code');
 if(lista.length!==1||[...p.keys()].length!==1||!/^[-\w]{16,200}$/.test(lista[0]))return false;
 return lista[0];
})();
