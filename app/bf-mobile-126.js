/* BlackFlow 1.26.0: progressive mobile enhancements. Read-only DOM transformations. */
(function(){
 'use strict';
 function labelTables(){
   document.querySelectorAll('table.tbl:not(.bf-mobile-cards)').forEach(table=>{
     const first=[...table.rows].find(tr=>tr.querySelector(':scope > th'));
     if(!first)return;
     const heads=[...first.children].filter(el=>el.tagName==='TH').map((th,i)=>{
       const txt=(th.textContent||'').replace(/\s+/g,' ').trim();
       return txt||'Ações';
     });
     if(heads.length<2)return;
     table.classList.add('bf-mobile-cards');
     first.classList.add('bf-table-head');
     [...table.rows].forEach(row=>{
       if(row===first||row.querySelector(':scope > th')){if(row!==first)row.classList.add('bf-table-head');return}
       [...row.children].forEach((cell,i)=>{
         if(cell.tagName!=='TD'||cell.hasAttribute('colspan'))return;
         cell.setAttribute('data-bf-label',heads[i]||'Ações');
       });
     });
   });
 }
 function addCloseButtons(){
   document.body.classList.toggle('bf-modal-open',!!document.querySelector('#modalRoot .modalw, #modalRoot2 .modalw'));
   for(const [rootId,closeName] of [['modalRoot','closeModal'],['modalRoot2','fecha2']]){
     const root=document.getElementById(rootId);
     const pane=root&&root.querySelector('.modalw > .modal');
     if(!pane||pane.querySelector(':scope > .bf-modal-close'))continue;
     const btn=document.createElement('button');
     btn.type='button';btn.className='bf-modal-close';
     btn.setAttribute('aria-label','Fechar janela');
     btn.setAttribute('title','Fechar janela');
     btn.textContent='×';
     btn.addEventListener('click',event=>{
       event.preventDefault();
       event.stopPropagation();
       if(typeof window[closeName]==='function')window[closeName]();
       else if(closeName==='fecha2'&&typeof fecha2==='function')fecha2();
       else if(closeName==='closeModal'&&typeof closeModal==='function')closeModal();
     });
     pane.insertBefore(btn,pane.firstChild);
   }
 }
 function makeScrollableTables(){
   document.querySelectorAll('table:not(.tbl):not([data-bf-table-checked])').forEach(table=>{
     if(table.closest('.modalw')||table.closest('.page')){
       table.dataset.bfTableChecked='1';
       if(!table.parentElement.classList.contains('bf-table-scroll')){
         const holder=document.createElement('div');holder.className='bf-table-scroll';
         table.parentNode.insertBefore(holder,table);holder.appendChild(table);
       }
     }
   });
 }
 let scheduled=false;
 function enhance(){
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{
     scheduled=false;
     try{addCloseButtons();labelTables();makeScrollableTables()}catch(e){console.warn('Ajuste de layout móvel',e)}
   });
 }
 document.addEventListener('keydown',e=>{
   if(e.key!=='Escape'||e.defaultPrevented)return;
   if(document.querySelector('#modalRoot2 .modalw > .modal')){
     e.preventDefault();if(typeof fecha2==='function')fecha2();return;
   }
   if(document.querySelector('#modalRoot .modalw > .modal')){
     e.preventDefault();if(typeof closeModal==='function')closeModal();
   }
 });
 const start=()=>{
   enhance();
   new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});
   window.addEventListener('resize',enhance,{passive:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();