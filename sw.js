/* BlackFlow 1.28.0: network-first, sem guardar paciente nem token, offline seguro.
   Os modulos externos entram ja na instalacao: sem eles o sistema abre sem
   receituario, sem orcamento, sem fiscal e sem a navegacao entre janelas. */
const CACHE='blackflow-v430-20261124';
const BASE=['./','index.html','manifest.webmanifest','icone-192.png','icone-512.png',
 'bf-assinante-135.js',
 'bf-barbearia-129.js',
 'bf-blackpay-integrated.js',
 'bf-cadastro-fiscal.js',
 'bf-catalogos-130.js',
 'bf-clinical.js',
 'bf-sincronia-138.js',
 'bf-cobranca-138.js',
 'bf-assinante-138.js',
 'bf-context-actions.js',
 'bf-documentos-137.js',
 'bf-documents.js',
 'bf-fiscal-advanced.js',
 'bf-nfse-139.js',
 'bf-pes-141.js',
 'bf-pes3d-141.js',
 'bf-integrity-audit.js',
 'bf-mobile-126.js',
 'bf-mobile-photos.js',
 'bf-navegacao-128.js',
 'bf-receituario.js',
 'bf-tati-help.js',
 'bf-tutorial-136.js',
 'bf-workflow-123.js',
 'bf-workflow-124.js',
 'bf-assinante-135.css',
 'bf-assinante-138.css',
 'bf-mobile-126.css',
 'bf-navegacao-128.css'];
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
 const navigation=request.mode==='navigate';
 if(!navigation&&!STATIC.test(url.pathname))return;
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
