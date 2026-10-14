/* Original scroll-driven particle sculpture. No remote rendering dependencies. */
(() => {
 const journey=document.querySelector('#journey'),stage=journey.querySelector('.world-stage');
 const panels=[...document.querySelectorAll('.journey-panel')],images=[...document.querySelectorAll('.world-image')];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const labels=['00 / A WORLD BETWEEN THE PAGES','01 / A MOUNTAIN OF SMALL IDEAS','02 / A SMALL STEP INTO THE UNKNOWN','03 / THE LIGHT THAT LIFE MAKES'];
 let progress=0,target=0,paused=false,visible=true,frame=0,previous=0,ambientTime=0,lastScene=-1,pointerX=0,pointerY=0;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=x=>x*x*(3-2*x);
 function scrollProgress(){target=clamp(-journey.getBoundingClientRect().top/(journey.offsetHeight-innerHeight))*3;}
 function jump(index){if(current){location.hash='library';}if(reduced.matches){panels[index].scrollIntoView({behavior:'instant'});return;}const top=journey.getBoundingClientRect().top+scrollY+(journey.offsetHeight-innerHeight)*index/3;window.scrollTo({top,behavior:paused?'instant':'smooth'});}
 document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>jump(Number(b.dataset.jump))));
 window.addEventListener('scroll',scrollProgress,{passive:true});
 stage.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){pointerX=(e.clientX/innerWidth-.5)*.12;pointerY=(e.clientY/innerHeight-.5)*.08;}});
 stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
 const motion=document.querySelector('#motionToggle');motion.addEventListener('click',()=>{paused=!paused;motion.textContent=paused?'▷':'Ⅱ';motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0});observer.observe(journey);
 function compose(){
  if(reduced.matches){panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden');});return;}
  const scene=Math.round(progress);
  panels.forEach((panel,i)=>{const distance=Math.abs(progress-i);const alpha=clamp(1-distance*2.05);panel.style.opacity=alpha;panel.style.transform=`translateY(${(i-progress)*40}px)`;panel.style.pointerEvents=alpha>.65?'auto':'none';panel.inert=alpha<=.65;panel.setAttribute('aria-hidden',String(i!==scene));});
  images.forEach((img,i)=>{const alpha=clamp(1-Math.abs(progress-i)*1.22);img.style.opacity=alpha;img.style.transform=`scale(${1.03+Math.abs(progress-i)*.045}) translateY(${(i-progress)*1.8}%)`;});
  if(scene!==lastScene){lastScene=scene;document.querySelector('#sculptureLabel').textContent=labels[scene];document.querySelectorAll('.scene-navigation button').forEach((b,i)=>{b.classList.toggle('active',i===scene);if(i===scene)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
 }
 const canvas=document.querySelector('#worldParticles');
 let gl=null,program=null,uniforms={},width=0,height=0,count=0;
 function random(seed){const n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n);}
 function makeShapes(n){
  const book=[],pyramid=[],moon=[],forest=[],seeds=[];
  const corners=[[-1.1,-.85,-1.1],[1.1,-.85,-1.1],[1.1,-.85,1.1],[-1.1,-.85,1.1]],tip=[0,1.1,0];
  for(let i=0;i<n;i++){
   const u=random(i+2),v=random(i+982),w=random(i+1953),a=u*Math.PI*2;
   const bx=(u*2-1)*1.35;book.push(bx,-.3+.34*Math.pow(Math.abs(bx),1.4)+.055*Math.sin(v*25), (v-.5)*1.65);
   const face=i%4,A=corners[face],B=corners[(face+1)%4],r=Math.sqrt(u),s=v;
   pyramid.push((1-r)*tip[0]+r*(1-s)*A[0]+r*s*B[0],(1-r)*tip[1]+r*(1-s)*A[1]+r*s*B[1],(1-r)*tip[2]+r*(1-s)*A[2]+r*s*B[2]);
   const my=1-2*v,mr=Math.sqrt(1-my*my),radius=1+.016*Math.sin(a*13)*Math.cos(v*31);moon.push(Math.cos(a)*mr*radius,my*radius,Math.sin(a)*mr*radius);
   if(i%9===0){forest.push(.025*Math.sin(v*8),v*2.4-1.2,.03*Math.cos(v*8));}else{const row=Math.floor(v*17)/17;const wing=(i%2?1:-1)*u*Math.sin(Math.PI*row)*.9;forest.push(wing,row*2.4-1.2+u*.26,Math.sin(u*Math.PI)*.14+(w-.5)*.1);}
   seeds.push(u,v,w);
  }return{book,pyramid,moon,forest,seeds};
 }
 const vertex=`
 precision highp float;
 attribute vec3 a_book,a_pyramid,a_moon,a_forest,a_seed;
 uniform float u_progress,u_time,u_aspect,u_mobile,u_dpr,u_pointerX,u_pointerY;
 varying float v_alpha,v_color;
 vec3 shape(float s){if(s<.5)return a_book;if(s<1.5)return a_pyramid;if(s<2.5)return a_moon;return a_forest;}
 void main(){
  float f=floor(min(u_progress,2.9999)),t=u_progress-f;t=smoothstep(.17,.83,t);
  vec3 p=mix(shape(f),shape(f+1.),t);
  float scatter=sin(t*3.14159265);p+=(a_seed-.5)*scatter*2.8;
  float angle=-.48+u_progress*.93+u_time*.11+u_pointerX;
  float c=cos(angle),s=sin(angle);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
  float tilt=.32+u_pointerY; c=cos(tilt);s=sin(tilt);p=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);
  float perspective=3.9/(3.9+p.z);float scale=mix(.45,.31,u_mobile);
  float centerX=mix(.40,0.,u_mobile),centerY=mix(.04,.29,u_mobile);
  gl_Position=vec4(centerX+p.x*perspective*scale/u_aspect,centerY+p.y*perspective*scale,0.,1.);
  gl_PointSize=(1.4+a_seed.z*1.55)*u_dpr*perspective;
  v_alpha=(.5+.5*(p.z+1.5)/3.)*(.75+.25*sin(u_time*.65+a_seed.x*24.));
  v_color=u_progress;
 }`;
 const fragment=`precision mediump float;varying float v_alpha,v_color;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 color=mix(vec3(.98,.79,.47),vec3(.55,.87,1.),smoothstep(1.3,2.1,v_color));color=mix(color,vec3(.64,1.,.71),smoothstep(2.35,3.,v_color));gl_FragColor=vec4(color,v_alpha*smoothstep(.5,.03,d)*.8);}`;
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Particle shader unavailable');}return shader;}
 function initialize(){
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!gl)return;
   program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Particle renderer unavailable');gl.useProgram(program);
   count=innerWidth<650?3500:7500;const data=makeShapes(count);
   Object.entries(data).forEach(([name,array])=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(array),gl.STATIC_DRAW);const attribute=gl.getAttribLocation(program,'a_'+(name==='seeds'?'seed':name));gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,0,0);});
   ['progress','time','aspect','mobile','dpr','pointerX','pointerY'].forEach(name=>uniforms[name]=gl.getUniformLocation(program,'u_'+name));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);resize();
  }catch{gl=null;canvas.hidden=true;}
 }
 function resize(){width=innerWidth;height=innerHeight;if(gl){const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(uniforms.aspect,width/height);gl.uniform1f(uniforms.mobile,width<650?1:0);gl.uniform1f(uniforms.dpr,dpr);}scrollProgress();}
 function render(time){
  if(!visible||document.hidden||current||reduced.matches){frame=0;return;}
  frame=requestAnimationFrame(render);if(time-previous<30)return;if(!paused)ambientTime+=Math.min((time-previous)/1000,.08);previous=time;
  progress+= (target-progress)*.14;if(Math.abs(target-progress)<.001)progress=target;compose();
  if(gl){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(uniforms.progress,progress);gl.uniform1f(uniforms.time,ambientTime);gl.uniform1f(uniforms.pointerX,paused?0:pointerX);gl.uniform1f(uniforms.pointerY,paused?0:pointerY);gl.drawArrays(gl.POINTS,0,count);canvas.dataset.renderer='webgl';canvas.dataset.particles=count;}
 }
 function wake(){if(!frame&&!current&&!document.hidden&&!reduced.matches&&visible)frame=requestAnimationFrame(render);}
 const wakeObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();},{threshold:0});wakeObserver.observe(journey);
 window.addEventListener('resize',()=>{resize();wake();});window.addEventListener('hashchange',()=>{if(!current){scrollProgress();wake();}});document.addEventListener('visibilitychange',wake);
 reduced.addEventListener('change',()=>{panels.forEach(p=>p.inert=false);if(!reduced.matches&&!gl)initialize();scrollProgress();compose();wake();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;canvas.hidden=true;});
 scrollProgress();progress=target;if(!reduced.matches)initialize();compose();wake();
 // Search is one tap away on phones; the immersive journey remains uninterrupted.
 const discovery=document.querySelector('#quickDiscovery'),input=document.querySelector('#quickSearch'),results=document.querySelector('#quickResults');
 function quickResults(){const query=input.value.trim().toLowerCase();const matches=orderedStories.filter(s=>`${s.plainTitle} ${s.label} ${s.place} ${s.description} ${s.category}`.toLowerCase().includes(query));results.innerHTML=matches.length?matches.map(s=>`<a class="quick-result" href="#story/${s.id}">${COVER[s.id]?`<img src="${COVER[s.id]}" alt="">`:`<span class="quick-glyph">${glyph[s.id]}</span>`}<span><strong>${s.plainTitle}</strong><small>${s.label} · ${s.minutes} MIN READ</small></span><span aria-hidden="true">↗</span></a>`).join(''):'<p class="quick-empty">No stories found. Try Moon, Egypt, a shadow, or fireflies.</p>';}
 function openDiscovery(){input.value='';quickResults();discovery.showModal();input.focus();}
 document.querySelector('#openSearch').addEventListener('click',openDiscovery);document.querySelector('#mobileSearch').addEventListener('click',openDiscovery);document.querySelector('#closeDiscovery').addEventListener('click',()=>discovery.close());input.addEventListener('input',quickResults);results.addEventListener('click',e=>{if(e.target.closest('a'))discovery.close();});
 discovery.addEventListener('click',e=>{if(e.target===discovery){const r=discovery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)discovery.close();}});
 document.querySelector('#mobileShelf').addEventListener('click',()=>{world='saved';document.querySelector('#search').value='';renderLibrary();document.querySelector('#collection').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});});
 document.querySelector('#footerAbout').addEventListener('click',()=>document.querySelector('#about').showModal());
 document.querySelectorAll('a[href="#collection"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#collection').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}));
 document.querySelectorAll('.experience-brand').forEach(a=>a.addEventListener('click',()=>jump(0)));
})();
