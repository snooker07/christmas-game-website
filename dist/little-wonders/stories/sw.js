const SHELL='little-wonders-shell-fundelits-samples-v8';
const CORE=['./','index.html','library.css?v=5','experience.css?v=1','content-tools.css?v=1','stories.js','library.js?v=6','content-tools.js?v=1','experience.js?v=1','assets/star.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('little-wonders-shell-')&&key!==SHELL)await caches.delete(key);
 await self.clients.claim();
})()));
function name(story){return 'little-wonders-story-'+story.contentID+'-v'+story.version;}
self.addEventListener('message',event=>event.waitUntil((async()=>{
 const reply=event.ports[0];
 try{
  const {action,story}=event.data;
  if(!/^[a-z0-9_-]+$/.test(story.contentID)||!Number.isInteger(story.version))throw Error('Invalid story.');
  const key=name(story);
  const marker=new URL('content/_complete/'+story.contentID+'/v'+story.version,self.registration.scope).href;
  if(action==='status'){reply.postMessage({downloaded:!!(await caches.match(marker,{cacheName:key}))});return;}
  if(action==='remove'){await caches.delete(key);reply.postMessage({ok:true});return;}
  if(action!=='download')throw Error('Unknown request.');
  const urls=[story.coverURL,`content/${story.contentID}/v${story.version}/story.json`,...(story.audio?[story.audio.url]:[])];
  // Fetch and validate all files before publishing the new offline package.
  const responses=await Promise.all(urls.map(async url=>{
   const resolved=new URL(url,self.registration.scope);if(resolved.origin!==self.location.origin)throw Error('Invalid asset origin.');
   const response=await fetch(resolved);if(!response.ok||response.redirected||response.headers.get('content-type')?.includes('text/html'))throw Error('A download failed. Your previous copy is kept.');
   if(story.audio&&url===story.audio.url){
    const data=await response.clone().arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
    if(data.byteLength!==story.audio.bytes||digest!==story.audio.sha256)throw Error('The recording failed verification.');
   }
   return [resolved.href,response];
  }));
  if(!await caches.match(marker,{cacheName:key})){
   try{
    await caches.delete(key);
    const cache=await caches.open(key);for(const [url,response] of responses)await cache.put(url,response);
    await cache.put(marker,new Response('complete'));
   }
   catch(e){await caches.delete(key);throw e;}
  }
  reply.postMessage({ok:true});
 }catch(e){reply.postMessage({error:e.message||'Download failed. Check available browser storage.'});}
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  if(request.mode==='navigate'){try{return await fetch(request);}catch{return await caches.match('index.html')||Response.error();}}
  const cached=await caches.match(request.url);
  if(cached&&request.headers.has('range')){
   const data=await cached.arrayBuffer(),match=request.headers.get('range').match(/^bytes=(\d+)-(\d*)$/);
   if(!match)return new Response(null,{status:416});
   const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),data.byteLength-1):data.byteLength-1;
   if(start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.byteLength}`}});
   return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'audio/mp4','Content-Range':`bytes ${start}-${end}/${data.byteLength}`,'Accept-Ranges':'bytes','Content-Length':String(end-start+1)}});
  }
  return cached||fetch(request);
 })());
});
