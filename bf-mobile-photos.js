/* BlackFlow 1.21.0 — mobile photo continuity and compact layouts.
 * Critical: do not navigate away on camera return, until save succeeds.
 */
(function(){
'use strict';
let last={view:'fotorapida',param:null,pid:null};
window.bfPhotoChoice=function(pid){
 const source=window.bfPhotoOrigin||{view:UI.view,param:UI.param,pid};
 last={view:source.view||'fotorapida',param:source.param??null,pid};
 const name=(typeof pac==='function'&&pac(pid)?.nome)||'paciente';
 const safe=typeof esc==='function'?esc(name):'paciente';
 // Open a lightweight choice with a fresh camera input each time.
 openModal('<div class="bf-photo-choice"><h3>Foto salva</h3><p class="sub">A foto de '+safe+' foi registrada. O que deseja fazer agora?</p>'+
 '<div class="bf-photo-actions"><button class="btn ghost" type="button" onclick="bfPhotoReturn()">← Voltar para a função anterior</button>'+
 '<label class="btn" style="cursor:pointer">📷 Continuar tirando foto<input id="bf-photo-again" type="file" accept="image/*" capture="environment" style="display:none" onchange="bfPhotoAgain(this)"></label></div></div>',true);
};
window.bfPhotoReturn=function(){
 closeModal();
 const origin=window.bfPhotoOrigin||last;
 window.bfPhotoOrigin=null;
 const targets=['paciente','pacientes','fotorapida','agenda','prontuarios','inicio','exames','financeiro'];
 const view=targets.includes(origin.view)?origin.view:'fotorapida';
 go(view,view==='paciente'?origin.param:null);
};
window.bfPhotoAgain=function(input){
 const pid=last.pid;
 if(!pid||!input?.files?.length)return;
 // fotoAdd reads FileList before replacing modal; stay in context.
 fotoAdd(pid,input);
};
// Ensure photo picker and modal remain within viewport across segment configurations.
const css=`
#bf-tati-root{position:fixed;right:clamp(12px,2vw,22px);bottom:calc(12px + env(safe-area-inset-bottom));z-index:85;font-family:inherit}
#bf-tati-root[hidden]{display:none!important}
.tati-fab{border:3px solid #fff;background:linear-gradient(145deg,#7b5cff,#007aff);box-shadow:0 7px 24px #1515456e;border-radius:50%;width:66px;height:66px;position:relative;display:grid;place-items:center;cursor:pointer;padding:3px}
.tati-fab img{width:100%;height:100%;object-fit:cover;border-radius:50%}.tati-fab span{position:absolute;right:-4px;top:-5px;border-radius:50%;width:23px;height:23px;display:grid;place-items:center;background:#0679fa;color:white;font-size:15px;font-weight:800;border:2px solid #fff}
.tati-dialog{position:absolute;right:0;bottom:75px;width:min(420px,calc(100vw - 24px));height:min(590px,calc(100dvh - 125px));min-height:250px;border:1px solid #c7c4e2;background:white;color:#21243b;border-radius:17px;box-shadow:0 16px 55px #0a082070;display:flex;flex-direction:column;overflow:hidden}
.tati-head{background:#0c1027;display:flex;align-items:center;gap:9px;color:white;padding:10px 12px;flex-shrink:0}.tati-head img{width:42px;height:42px;border-radius:50%;object-fit:cover}.tati-head b{font-size:15px;display:block}.tati-head small{color:#c3caf4;font-size:11px}.tati-close{margin-left:auto;color:white;background:transparent;border:0;font-size:24px;padding:4px 10px;cursor:pointer}
.tati-search{padding:13px;border-bottom:1px solid #e3e3ee;flex-shrink:0}.tati-search label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}.tati-search input{width:100%;font-size:16px;border:1px solid #c5c6df;border-radius:9px;padding:11px 12px;min-height:44px}.tati-search small{display:block;margin-top:6px;color:#5d6274;font-size:11px}
.tati-result{flex:1;overflow-y:auto;padding:12px;overscroll-behavior:contain}.tati-subhead{margin:2px 0 10px;font-weight:750;font-size:13px}.tati-list{display:grid;gap:6px}.tati-list button{background:#f7f8fd;border:1px solid #e3e4ef;text-align:left;border-radius:8px;color:#172449;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 11px;font-size:13px;cursor:pointer}.tati-list button:hover{border-color:#7b5cff}.tati-list span{color:#7b5cff;font-size:19px}.tati-answer{font-size:13.5px;line-height:1.6}.tati-answer h3{font-size:15px;margin:2px 0 8px}.tati-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tati-actions button,.tati-foot button{cursor:pointer;background:#205cf5;color:white;border:0;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:750}.tati-actions button[data-reset]{background:#eceefa;color:#242e55}.tati-foot{border-top:1px solid #e4e4ef;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;flex-shrink:0}.tati-foot a{color:#255cbd;font-size:12px;font-weight:650}.tati-unmatched{font-size:13px;color:#6a6c7e}
.bf-photo-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}.bf-photo-actions .btn{white-space:normal;min-height:44px}
.modalw,.modalw2{padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);overscroll-behavior:contain}
.modalw .modal,.modalw2 .modal{max-width:min(900px,calc(100vw - 16px))!important;max-height:calc(100dvh - 24px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}
.page{min-width:0;max-width:100%}.page .card,.pgrid,.grid,.g2,.g3,.g4,.fgrid{min-width:0}
.page img,.modal img{max-width:100%}input,select,textarea{max-width:100%;min-width:0}
.tbl,.table{font-size:12px}.tw,.tablewrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
@media(max-width:720px){.page{padding:12px 10px!important}.card{padding:12px}.phead{gap:9px}h1{font-size:20px}
.grid.g2,.grid.g3,.grid.g4,.g2,.g3,.g4,.fgrid,.pgrid{grid-template-columns:minmax(0,1fr)!important}
.tabs{max-width:100vw;overflow-x:auto}.tabs button{padding:10px 9px}.mact{flex-wrap:wrap;gap:8px}.mact .btn{white-space:normal}
.filters{gap:8px}.filters>*{max-width:100%}.btn{max-width:100%;white-space:normal}
#bf-tati-root{right:10px;bottom:calc(12px + env(safe-area-inset-bottom))}.tati-fab{width:57px;height:57px}.tati-dialog{bottom:66px;width:calc(100vw - 20px);max-height:calc(100dvh - 96px);height:min(590px,calc(100dvh - 96px))}
.bf-photo-choice .bf-photo-actions{flex-direction:column}.bf-photo-choice .bf-photo-actions .btn{justify-content:center;width:100%}
}
@media(max-width:390px){.top{padding:0 5px;gap:5px}.top .user{font-size:11px}.page{padding:9px 7px!important}.card{padding:10px}.tati-dialog{width:calc(100vw - 14px)}}`;
if(!document.getElementById('bf-mobile-styles')){
 const st=document.createElement('style');st.id='bf-mobile-styles';st.textContent=css;document.head.append(st);
}
})();