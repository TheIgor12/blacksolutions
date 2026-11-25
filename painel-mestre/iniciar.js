/* Executado depois dos dois módulos existentes, sem iniciar o aplicativo de clínicas. */
'use strict';
render();
const app=document.getElementById('app');
const limites=()=>{for(const el of app.querySelectorAll('input[type=file],[data-bfo-arquivo-btn],[data-bfo-foto],[data-bfo-confirmar],[data-bfo-orc],[data-nota],button[type=submit]'))if(!el.disabled)el.disabled=true;};
new MutationObserver(limites).observe(app,{childList:true,subtree:true});limites();
