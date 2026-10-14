/* Shared content IDs connect recordings, downloads and reading positions. */
let narrationAudio=null, speechToken=0, activeParagraph=null, offlineWorker=null;
const nativeStopSpeech=stopSpeech;
stopSpeech=function(){
 speechToken++;
 nativeStopSpeech();
 activeParagraph=null;
 if(narrationAudio){narrationAudio.pause();narrationAudio=null;}
 document.querySelectorAll('.speaking').forEach(p=>p.classList.remove('speaking'));
};
function highlightParagraph(id){
 if(activeParagraph===id)return;
 document.querySelectorAll('.speaking').forEach(p=>p.classList.remove('speaking'));
 activeParagraph=id;
 const node=id&&document.getElementById(id);
 if(node){node.classList.add('speaking');if(document.querySelector('#followNarration')?.checked)node.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
}
toggleSpeech=function(){
 if(!current)return;
 if(current.audio){
  const panel=document.querySelector('#audioPanel');panel.hidden=!panel.hidden;
  if(!panel.hidden){panel.querySelector('audio').focus();}
  return;
 }
 if(narrating){stopSpeech();return;}
 if(!('speechSynthesis' in window))return;
 const paragraphs=current.chapters.flatMap(c=>c.paragraphs.map((text,i)=>({text,id:c.paragraphIDs[i]})));
 const token=++speechToken;
 narrating=true;
 $('#readAloud').innerHTML='■ <span>Stop reading</span>';
 $('#readAloud').setAttribute('aria-pressed','true');
 function speak(index){
  if(token!==speechToken)return;
  if(index===paragraphs.length){stopSpeech();return;}
  speech=new SpeechSynthesisUtterance(paragraphs[index].text);
  speech.lang=current.language==='hu'?'hu-HU':'en-GB';speech.rate=.86;
  speech.onstart=()=>highlightParagraph(paragraphs[index].id);
  speech.onend=()=>speak(index+1);
  speech.onerror=e=>{if(token!==speechToken)return;stopSpeech();if(!['interrupted','canceled'].includes(e.error))notify('Device read-aloud is unavailable. You can still read the whole story.');};
  speechSynthesis.speak(speech);
 }
 speak(0);
};
function workerRequest(action,story){
 return new Promise((resolve,reject)=>{
  const worker=navigator.serviceWorker?.controller||offlineWorker;
  if(!worker||worker.state==='redundant'){reject(new Error('Offline storage is starting. Please try again in a moment.'));return;}
  const channel=new MessageChannel();
  const timer=setTimeout(()=>reject(new Error('Download timed out. Please try again.')),180000);
  channel.port1.onmessage=e=>{clearTimeout(timer);e.data.error?reject(new Error(e.data.error)):resolve(e.data);};
  worker.postMessage({action,story},[channel.port2]);
 });
}
const baseRenderReader=renderReader;
renderReader=function(story){
 baseRenderReader(story);
 const tools=document.createElement('div');tools.className='content-actions';
 tools.innerHTML='<button id="downloadStory">↓ Download for offline reading</button><button id="removeOffline" hidden>Remove download</button><button id="resumeReading" hidden>Resume reading</button><span id="downloadStatus" role="status"></span>';
 $('.story-article').prepend(tools);
 const audioPanel=document.createElement('section');audioPanel.id='audioPanel';audioPanel.className='audio-panel';audioPanel.hidden=true;
 if(story.audio){
  audioPanel.innerHTML='<h2>Listen to this story</h2><audio controls preload="metadata" aria-label="Story narration"></audio><label><input type="checkbox" id="followNarration"> Follow the narration</label>';
  const audio=audioPanel.querySelector('audio');audio.src=story.audio.url;
  audio.addEventListener('play',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();narrationAudio=audio;});
  audio.addEventListener('timeupdate',()=>highlightParagraph(story.audio.cues.find(c=>c.start<=audio.currentTime&&audio.currentTime<c.end)?.paragraphID));
  audio.addEventListener('ended',()=>highlightParagraph(null));
  audio.addEventListener('error',()=>notify('The recording could not be loaded. Try downloading again when online.'));
  $('.story-article').prepend(audioPanel);
  $('#readAloud').innerHTML='▷ <span>Listen</span>';
 }else{
  const status=document.createElement('p');status.className='voice-note';status.textContent='Device read-aloud · A recorded narration has not been added yet.';tools.after(status);
  $('#readAloud').innerHTML='▷ <span>Device read-aloud</span>';
 }
 const position=readStore('little-wonders-position-'+story.contentID,null);
 if(position?.version===story.version&&document.getElementById(position.paragraphID)){
  $('#resumeReading').hidden=false;
  $('#resumeReading').onclick=()=>document.getElementById(position.paragraphID).scrollIntoView({block:'start'});
 }
 $('#downloadStory').onclick=async()=>{
  const button=$('#downloadStory');button.disabled=true;$('#downloadStatus').textContent='Downloading story, cover'+(story.audio?' and audio':'')+'…';
  try{await workerRequest('download',story);if(current?.id===story.id){$('#downloadStatus').textContent='Available offline in this browser.';$('#removeOffline').hidden=false;}}
  catch(e){if(current?.id===story.id)$('#downloadStatus').textContent=e.message;}
  finally{if(current?.id===story.id)button.disabled=false;}
 };
 $('#removeOffline').onclick=async()=>{
  try{await workerRequest('remove',story);if(current?.id===story.id){$('#downloadStatus').textContent='Download removed. Your bookmark is kept.';$('#removeOffline').hidden=true;}}
  catch(e){notify(e.message);}
 };
 workerRequest('status',story).then(result=>{if(current?.id===story.id&&result.downloaded){$('#downloadStatus').textContent='Available offline in this browser.';$('#removeOffline').hidden=false;}}).catch(()=>{});
};
let positionTimer;
window.addEventListener('scroll',()=>{
 clearTimeout(positionTimer);positionTimer=setTimeout(()=>{
  if(!current)return;
  const paragraphs=[...document.querySelectorAll('[data-paragraph]')];
  const paragraph=paragraphs.find(p=>p.getBoundingClientRect().bottom>150);
  if(paragraph)writeStore('little-wonders-position-'+current.contentID,{version:current.version,paragraphID:paragraph.id});
 },250);
},{passive:true});
if('serviceWorker' in navigator&&window.isSecureContext){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{offlineWorker=navigator.serviceWorker.controller;});
 navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(async reg=>{
  offlineWorker=reg.active;
  const story=current;if(!story)return;
  const result=await workerRequest('status',story);
  if(current?.id===story.id&&result.downloaded){$('#downloadStatus').textContent='Available offline in this browser.';$('#removeOffline').hidden=false;}
 }).catch(()=>{});
}
// library.js performs its first route before these extensions are loaded.
if(current)renderReader(current);
