/* BlackFlow 1.28.0: network-first, sem guardar paciente nem token, offline seguro.
   Os modulos externos entram ja na instalacao: sem eles o sistema abre sem
   receituario, sem orcamento, sem fiscal e sem a navegacao entre janelas. */
const CACHE='blackflow-v490-modulos-clinicos-convite';
const BASE=['./','index.html','manifest.webmanifest','icone-192.png','icone-512.png',
 'bf-assinante-135.js?v=1.49.0',
 'bf-barbearia-129.js?v=1.49.0',
 'bf-blackpay-integrated.js?v=1.49.0',
 'bf-cadastro-fiscal.js?v=1.49.0',
 'bf-catalogos-130.js?v=1.49.0',
 'bf-foto-clinica-149.js?v=1.49.0',
 'bf-clinical.js?v=1.49.0',
 'bf-acessos-prontuario-149.js?v=1.49.0',
 'bf-odontomapa-149.js?v=1.49.0',
 'bf-ciencia-facial-149.js?v=1.49.0',
 'bf-estetmapa-149.js?v=1.49.0',
 'bf-ditado-146.js?v=1.49.0',
 'bf-sincronia-138.js?v=1.49.0',
 'bf-cobranca-138.js?v=1.49.0',
 'bf-assinante-138.js?v=1.49.0',
 'bf-context-actions.js?v=1.49.0',
 'bf-documentos-137.js?v=1.49.0',
 'bf-documents.js?v=1.49.0',
 'bf-fiscal-advanced.js?v=1.49.0',
 'bf-nfse-139.js?v=1.49.0',
 'bf-pe-malha.js?v=1.49.0',
 'bf-pe-vistas.js?v=1.49.0',
 'pes/dorsal.webp',
 'pes/plantar.webp',
 'pes/lateral.webp',
 'pes/medial.webp',
 'pes/dedos.webp',
 'pes/calcanhar.webp',
 'pes/mapa-dorsal.png',
 'pes/mapa-plantar.png',
 'pes/mapa-lateral.png',
 'pes/mapa-medial.png',
 'pes/mapa-dedos.png',
 'pes/mapa-calcanhar.png',
 'bf-pes-141.js?v=1.49.0',
 'bf-pes3d-141.js?v=1.49.0',
 'bf-integrity-audit.js?v=1.49.0',
 'bf-mobile-126.js?v=1.49.0',
 'bf-mobile-photos.js?v=1.49.0',
 'bf-navegacao-128.js?v=1.49.0',
 'bf-receituario.js?v=1.49.0',
 'bf-tati-help.js?v=1.49.0',
 'bf-tutorial-136.js?v=1.49.0',
 'bf-workflow-123.js?v=1.49.0',
 'bf-workflow-124.js?v=1.49.0',
 'bf-assinante-135.css?v=1.49.0',
 'bf-assinante-138.css?v=1.49.0',
 'bf-mobile-126.css?v=1.49.0',
 'bf-navegacao-128.css?v=1.49.0'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE)
  .then(cache=>Promise.allSettled(BASE.map(path=>cache.add(path))))
  .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys()
  .then(keys=>Promise.all(keys.filter(k=>k.startsWith('blackflow-v')&&k!==CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim()));
});
const STATIC=/\.(?:js|css|html|webmanifest|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i;
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.searchParams.has('token')||url.pathname.includes('/validar/'))return;
 // A criação de senha nunca usa o HTML ou o cache de uma sessão anterior.
 if(url.pathname==='/criar-senha'||url.pathname.startsWith('/criar-senha/'))return;
 // A entrada do signatário nunca é restaurada do cache do app.
 if(/^(?:\/app)?\/(?:ciencia-facial|laboratorio-facial)(?:\/|$)/.test(url.pathname))return;
 const navigation=request.mode==='navigate';
 // Apenas esta malha pública pode entrar no cache, não as APIs ou JSONs clínicos.
 const malha=url.pathname===new URL('pes/modelo-anatomico-1.json',self.registration.scope).pathname;
 const arquivoDitado=['pt-br.aff.gz','pt-br.dic.gz.00','pt-br.dic.gz.01','pt-br.dic.gz.02'].some(
  p=>url.pathname===new URL('ditado/'+p,self.registration.scope).pathname);
 if(!navigation&&!STATIC.test(url.pathname)&&!malha&&!arquivoDitado)return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
   }
   return response;
  }catch(_){
   const cached=await caches.match(request);
   if(cached)return cached;
   if(navigation){
    const fallback=await caches.match(new URL('index.html',self.registration.scope).href);
    if(fallback)return fallback;
    return new Response('BlackFlow temporariamente offline. Reconecte-se para atualizar.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
   }
   return Response.error(); // Never serve HTML instead of a JavaScript asset
  }
 })());
});
