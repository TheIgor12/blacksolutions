// Novo termo de ciência. O mesmo desenho em canvas do BlackFlow, sem fallback
// para os endpoints antigos. O consentimento não autoriza nenhum procedimento.
const $=x=>document.getElementById(x);
let client, proof, receipt, busy=false, strokes=0, start=null, total=0, generation=0;
const cv=$('cv'), ink=cv.getContext('2d');
const status=(s)=>{$('estado').textContent=s;};
const code=()=>$('codigo').value.trim().toLowerCase();
const valid=/^[a-f0-9]{64}$/, uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const accepts=()=>!!client&&!!proof&&proof.code===code()&&$('ciencia').checked&&strokes>0&&total>12&&!busy;
function update(){$('buscar-recibo').disabled=busy||!client;$('assinar').disabled=!accepts();$('abrir').disabled=busy||!client;}
function clearPad(){ink.fillStyle='#fff';ink.fillRect(0,0,cv.width,cv.height);strokes=0;total=0;start=null;update();}
function reset(){proof=null;$('documento').hidden=true;$('texto').textContent='';$('ciencia').checked=false;clearPad();}
export function attach(authorizedClient){clearSession();client=authorizedClient&&typeof authorizedClient.rpc==='function'?authorizedClient:null;reset();status(client?'':'Entre na conta confirmada antes de abrir o termo.');update();}
cv.width=640;cv.height=240;ink.strokeStyle='#252038';ink.lineWidth=3.5;ink.lineJoin='round';ink.lineCap='round';
function pt(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];}
cv.onpointerdown=e=>{if(!proof||busy||start)return;cv.setPointerCapture(e.pointerId);start={id:e.pointerId,p:pt(e)};};
cv.onpointermove=e=>{if(start?.id!==e.pointerId)return;const pos=pt(e),d=Math.hypot(pos[0]-start.p[0],pos[1]-start.p[1]);if(d<1)return;
 ink.beginPath();ink.moveTo(...start.p);ink.lineTo(...pos);ink.stroke();start.p=pos;total+=d;strokes++;update();};
cv.onpointerup=cv.onpointercancel=cv.onlostpointercapture=()=>{start=null;};
$('limpar').onclick=clearPad;$('ciencia').onchange=update;$('codigo').oninput=()=>{reset();status('');};
$('abrir').onclick=async()=>{
 if(!client||busy)return;
 hideReceipt();
 if(!valid.test(code()))return status('Confira o código recebido na clínica.');
 const entered=code(),epoch=generation;reset();busy=true;update();
 try{
 const {data,error}=await client.rpc('bf_ciencia_ler',{p_codigo:entered});
 if(epoch!==generation||entered!==code())return;
 if(error||!data||data.versao!=='bf-ciencia-simulacao-ilustrativa-v1'||!valid.test(data.hash)||typeof data.texto!=='string')
  return status('Termo indisponível. Confira a conta e peça um novo código à clínica, se necessário.');
 proof={code:entered,hash:data.hash};
 $('texto').textContent=data.texto;$('documento').hidden=false;status('');
 }catch(_){if(epoch===generation)status('Não foi possível consultar o termo.');}
 finally{if(epoch===generation){busy=false;update();}}
};
$('assinar').onclick=async()=>{
 if(!accepts())return;
 const pending=proof,epoch=generation;
 busy=true;update();$('codigo').disabled=true;
 try{
 const {data,error}=await client.rpc('bf_ciencia_assinar',{p_codigo:pending.code,p_hash_texto:pending.hash,p_png:cv.toDataURL('image/png').split(',')[1]});
 if(epoch!==generation)return;
 if(error||!uuid.test(data??''))return status('A assinatura não foi confirmada. Confira o termo com a clínica antes de tentar de novo.');
 showReceipt(data,'vigente');
 }catch(_){if(epoch===generation)status('Não foi possível confirmar a assinatura com a clínica.');}
 finally{if(epoch===generation){busy=false;$('codigo').disabled=false;update();}}
};
function hideReceipt(){receipt=null;$('recibo').textContent='';$('confirmado').hidden=true;$('confirmar-revogacao').hidden=true;$('revogar').hidden=true;}
function showReceipt(id,situation){
 receipt=id;$('recibo').textContent=id;$('confirmado').hidden=false;
 $('confirmar-revogacao').hidden=true;$('revogar').hidden=situation!=='vigente';
 reset();$('codigo').value='';$('numero-recibo').value='';status(situation==='revogado'?'A autorização para novas simulações já foi revogada.':'');
}
$('numero-recibo').oninput=()=>{hideReceipt();status('');};
$('buscar-recibo').onclick=async()=>{
 if(!client||busy)return;
 const ref=$('numero-recibo').value.trim().toLowerCase(),epoch=generation;
 if(!uuid.test(ref))return status('Confira o número do recibo.');
 hideReceipt();busy=true;update();
 try{
  const {data,error}=await client.rpc('bf_ciencia_consultar_recibo',{p_recibo:ref});
  if(epoch!==generation||$('numero-recibo').value.trim().toLowerCase()!==ref)return;
  if(error||!['vigente','revogado'].includes(data))return status('Não foi possível consultar este recibo. Confira o número e a conta usada para assinar.');
  showReceipt(ref,data);
 }catch(_){if(epoch===generation)status('Não foi possível consultar este recibo.');}
 finally{if(epoch===generation){busy=false;update();}}
};
$('revogar').onclick=()=>{$('confirmar-revogacao').hidden=false;};
$('confirmar-revogacao').onclick=async()=>{
 if(!receipt||busy)return;const pending=receipt,epoch=generation;busy=true;update();
 try{
 const {data,error}=await client.rpc('bf_ciencia_revogar',{p_recibo:pending});
 if(epoch!==generation||receipt!==pending)return;
 if(error||data!==true)return status('Não foi possível confirmar a revogação. Fale com a clínica.');
 $('confirmar-revogacao').hidden=true;$('revogar').hidden=true;
 status('A autorização para novas simulações foi revogada.');
 }catch(_){if(epoch===generation)status('Não foi possível confirmar a revogação. Fale com a clínica.');}
 finally{if(epoch===generation){busy=false;update();}}
};
function clearSession(){generation++;busy=false;hideReceipt();reset();$('codigo').value='';$('numero-recibo').value='';$('codigo').disabled=false;status('');update();}
attach(null);
