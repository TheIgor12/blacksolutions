// O texto viaja apenas da página ao seu próprio Worker, no aparelho.
let worker, next=0;
const pedidos=new Map();
function limpar(erro){
  if(worker) worker.terminate();
  worker=undefined;
  pedidos.forEach(p=>{clearTimeout(p.timer);p.reject(erro);});
  pedidos.clear();
}
function abrir(){
  if(worker) return worker;
  const w=worker=new Worker(new URL('worker-pt-br.js',import.meta.url),{name:'ortografia-pt-BR'});
  w.onmessage=({data:m})=>{
    const p=pedidos.get(m?.id);
    if(!p) return;
    clearTimeout(p.timer); pedidos.delete(m.id);
    if(Array.isArray(m.itens)) p.resolve(m.itens);
    else {
      const erro=new Error('Corretor local indisponível');
      p.reject(erro); limpar(erro);
    }
  };
  w.onerror=()=>limpar(new Error('Corretor local indisponível'));
  w.onmessageerror=w.onerror;
  return w;
}
export function sugerir(texto){
  return new Promise((resolve,reject)=>{
    const w=abrir(), id=++next;
    const timer=setTimeout(()=>limpar(new Error('Tempo limite do corretor local')),25000);
    pedidos.set(id,{resolve,reject,timer});
    w.postMessage({id,texto:String(texto).slice(0,20000)});
  });
}
