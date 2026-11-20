/* BlackFlow 1.27.0: network-first, no patient/token caching, safe offline handling */
const CACHE='blackflow-v270-20261120';
const BASE=['./','index.html','manifest.webmanifest','icone-192.png','icone-512.png'];
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
