/* ---------- v17.2 Library: a still display. Army list | one model on a stage | every stat + customisation ----------
   The 3D model renders only inside #labStage (viewport + scissor on the shared WebGL canvas). Nothing moves unless you drag it. */
let labSel='cmd', labRot=0, labTilt=0.42, labZoom=1, labPose='still', labPoseT=0;
function initLabWorld(){
  const w={ scene:new THREE.Scene(), camera:new THREE.PerspectiveCamera(30,1,1,4000), fig:null, group:new THREE.Group() };
  w.hemi=new THREE.HemisphereLight(0xe6eefa,0x5d5249,.72); w.scene.add(w.hemi);
  w.sun=new THREE.DirectionalLight(0xfff0d8,.82); w.sun.position.set(-160,320,-110); w.sun.castShadow=true; w.sun.shadow.mapSize.set(1024,1024);
  const sc=w.sun.shadow.camera; sc.left=-140; sc.right=140; sc.top=140; sc.bottom=-140; sc.near=10; sc.far=1400; w.sun.shadow.bias=-0.0006; w.sun.shadow.normalBias=0.4;
  w.scene.add(w.sun); w.scene.add(w.sun.target);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(70,76,14,64),new THREE.MeshPhongMaterial({ color:0x5a3e2b, shininess:40 })); plinth.position.y=-7; plinth.receiveShadow=true; w.scene.add(plinth);
  const felt=new THREE.Mesh(new THREE.CylinderGeometry(66,66,1,64),new THREE.MeshLambertMaterial({ color:0x55606b })); felt.position.y=.5; felt.receiveShadow=true; w.scene.add(felt);
  const trim=new THREE.Mesh(new THREE.TorusGeometry(68,1.4,6,96),new THREE.MeshPhongMaterial({ color:0xc9a15a, shininess:80 })); trim.rotation.x=Math.PI/2; trim.position.y=1; w.scene.add(trim);
  w.plinth=[plinth,felt,trim];
  w.rod=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,1,8),new THREE.MeshPhongMaterial({ color:0xdfefff, transparent:true, opacity:.35, shininess:100 })); w.scene.add(w.rod);
  w.scene.add(w.group);
  labWorld=w; applyWorldLight();
}
function labIds(){ const {inf,units}=labRoster(labFaction); return { inf, core:units.filter(id=>!UNITS[id].commander), uniq:units.filter(id=>UNITS[id].commander) }; }
function labAllIds(){ const g=labIds(); return [...g.inf,...g.core,...g.uniq]; }
function labStageId(){ if(labSel!=='cmd') return labSel; const u=labIds().uniq; return u[u.length-1]; }   // the commander's own finisher stands in for them
function buildLabFigures(){            // (name kept: applyStyle/refreshModels call it) rebuild the model on the stage and the list thumbnails
  if(!labWorld) return; buildLabFigure(); buildLabList();
}
function buildLabFigure(){
  const w=labWorld; while(w.group.children.length) w.group.remove(w.group.children[0]);
  const id=labStageId(); if(!id) return;
  const f=COMMANDERS[labFaction].faction, geo=modelGeo(id,f), air=AIR_MODELS.has(modelOf(id));
  geo.computeBoundingBox(); const bb=geo.boundingBox, sz=bb.getSize(new THREE.Vector3());
  const s=100/Math.max(sz.x,sz.y*1.2,sz.z), obj=new THREE.Group(), mesh=new THREE.InstancedMesh(geo,figMat,1);
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array([0,0,9]),3); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.setMatrixAt(0,new THREE.Matrix4()); mesh.castShadow=true; mesh.receiveShadow=true; obj.add(mesh);
  if(STYLE.outline){ const ol=new THREE.InstancedMesh(geo,outlineMat,1); ol.instanceMatrix=mesh.instanceMatrix; ol.instanceColor=mesh.instanceColor; obj.add(ol); }
  obj.scale.setScalar(s);
  const lift=air?Math.max(30,sz.y*s*0.55):0; obj.position.set(-(bb.min.x+bb.max.x)/2*s, lift-bb.min.y*s+1, -(bb.min.z+bb.max.z)/2*s);
  const pivot=new THREE.Group(); pivot.add(obj); w.group.add(pivot);
  w.rod.visible=air; if(air){ w.rod.scale.set(1,lift,1); w.rod.position.set(0,lift/2,0); }
  const R=Math.max(40,Math.max(sz.x,sz.z)*s*0.62); for(const m of w.plinth) m.scale.set(R/68,1,R/68);
  w.fig={ id, air, mesh, pivot, h:sz.y*s+lift, R, cyc:0, gait:0 };
}
function labThumb(id,wd,ht){ return thumbURL(id,COMMANDERS[labFaction].faction,wd,ht); }
function buildLabList(){
  const el=$('labUnits'); if(!el) return; el.innerHTML='';
  const c=COMMANDERS[labFaction], g=labIds();
  const cb=document.createElement('button'); cb.type='button'; cb.className='lab-cmdbtn'+(labSel==='cmd'?' on':'');
  cb.innerHTML=`${portraitImg(labFaction,c.faction)}<span><b>${c.short}</b><small>${c.arch} commander</small></span>`; cb.onclick=()=>labSelect('cmd'); el.appendChild(cb);
  for(const [title,list] of [['Infantry',g.inf],['Core',g.core],[c.short+'’s own',g.uniq]]){
    const h=document.createElement('div'); h.className='grp'; h.textContent=title; el.appendChild(h);
    for(const id of list){
      const d=UNITS[id]||INF[id], b=document.createElement('button'); b.type='button'; b.dataset.id=id; b.className=labSel===id?'on':''; b.title=d.name;
      const u=labThumb(id,120,76);
      b.innerHTML=(u?`<img src="${u}" alt="">`:'')+`<span>${UNITS[id]?d.short||d.name:d.name}</span>`+(UNITS[id]?`<i class="rk">${ROMAN[d.rank]}</i><i class="gc">${d.cost}</i>`:'');
      b.onclick=()=>labSelect(id); el.appendChild(b);
    }
  }
}
function labSelect(id){
  labSel=id; labZoom=1; labPoseT=performance.now()/1000;
  for(const b of $('labUnits').querySelectorAll('button')) b.classList.toggle('on',(b.dataset.id||'cmd')===id);
  const on=$('labUnits').querySelector('button.on'); if(on) on.scrollIntoView({block:'nearest',inline:'nearest'});
  buildLabFigure(); renderLabInfo();
}
function labStep(k){ const ids=labAllIds(); let i=ids.indexOf(labSel); i=i<0?(k>0?0:ids.length-1):(i+k+ids.length)%ids.length; labSelect(ids[i]); }
const fmt=(v,dp=1)=>(Math.round(v*10**dp)/10**dp).toString();
const CLS_LONG={ inf:'Infantry', light:'Light units', heavy:'Heavy armour', air:'Flyers', struct:'Towers and keeps' };
function unitStatsHTML(id){
  const inf=!UNITS[id], d=inf?INF[id]:UNITS[id], o=unitInfo(id), rows=[], row=(k,v,n)=>rows.push(`<tr><th>${k}</th><td>${v}${n?`<small>${n}</small>`:''}</td></tr>`);
  const spd=d.speed/CONFIG.speedMult;
  row('Health',d.hp);
  row('Speed',Math.round(spd),speedWord(d.speed));
  if(d.bomber){ row('Breath damage',fmt(d.bomber.dmg),`every ${d.bomber.every} s, ${d.bomber.radius} wide`); row('Damage / s',fmt(d.bomber.dmg/d.bomber.every)); }
  else if(d.diver){ row('Dive damage',fmt(d.diver.dmg),d.diver.every?`every ${d.diver.every} s`:''); }
  else if(d.dmg){ row('Damage',fmt(d.dmg),`per ${d.multi?'bolt':d.melee?'blow':'shot'}`); row('Attack every',fmt(d.interval,2)+' s'); row('Damage / s',fmt(o.dps)); }
  if(d.range && !d.bomber) row('Range',d.range<=45?'Melee':d.range,d.minRange?`nothing closer than ${d.minRange}`:'');
  if(inf && d.aggro) row('Sight',d.aggro,'how far it notices enemies');
  if(!inf) row('Targets',o.hits==='Both'?'Ground and air':o.hits==='None'?'Can’t attack':o.hits);
  if(d.splash) row('Splash',d.splash,'radius');
  if(d.multi) row('Targets at once',d.multi);
  if(d.flame) row('Flame cone','yes','burns everything in front');
  if(d.arc) row('Firing arc','±'+d.arc+'°','must face its target');
  if(d.spawns){ const t=INF[d.spawns.type]; row('Raises',`${d.spawns.n} ${d.spawns.n>1?infPlural(t.name):t.name}`,`every ${d.spawns.every} s`); }
  if(d.stationary) row('Set-up',CONFIG.castSetup+' s','must stand still before firing');
  if(d.noLOS) row('Line of sight','not needed','fires over cliffs');
  if(d.hunter) row('Hunts',d.hunter.map(c=>CLS_LONG[c]||c).join(', '),'picks these targets on its own');
  if(inf && d.sb) row('Vs structures','×'+d.sb,'siege bonus');
  const mods=[];
  for(const [c,m] of Object.entries(d.vs||{})) if(m!==1) mods.push(`<span class="chip ${m>1?'good':'bad'}">${CLS_LONG[c]||c} ×${m}</span>`);
  if(d.keepMult) mods.push(`<span class="chip bad">Keep ×${d.keepMult}</span>`);
  const takes=[]; for(const [c,m] of Object.entries(d.takes||{})) takes.push(`<span class="chip bad">${m}× from ${c==='caster'?'casters':c==='tower'?'towers':c==='at'?'anti-armour':c==='super'?'strikes':c}</span>`);
  const chip=(l,c)=>l.map(t=>`<span class="chip ${c}">${t}</span>`).join('');
  return `<div class="ls-head"><div><div class="eyebrow">${inf?'Infantry · marches on its own':`${o.cls} · Rank ${ROMAN[o.rank]}${d.commander?` · ${COMMANDERS[d.commander].short}’s own`:' · Core'}`}</div><h3>${d.name}</h3></div>${inf?'':`<div class="ls-cost"><b>${d.cost}</b><small>gold</small></div>`}</div>
    <p>${o.text}</p>
    <table class="ls-stats">${rows.join('')}</table>
    ${mods.length?`<div class="uvs"><b>Damage modifiers</b>${mods.join('')}</div>`:''}
    ${takes.length?`<div class="uvs"><b>Takes extra</b>${takes.join('')}</div>`:''}
    ${o.strong.length?`<div class="uvs"><b>Strong vs</b>${chip(o.strong,'good')}</div>`:''}
    ${o.weak.length?`<div class="uvs"><b>Weak vs</b>${chip(o.weak,'bad')}</div>`:''}
    ${o.notes.length?`<div class="unote">${o.notes.join(' · ')}</div>`:''}`;
}
function labCmdHTML(){
  const k=labFaction, c=COMMANDERS[k], L=LORE[k];
  return `<div class="eyebrow">${FACTIONS[c.faction].name} · ${c.army} · ${c.arch}</div>
    <div class="lab-cmd">${portraitImg(k,c.faction)}<h3>${c.name}</h3><div class="tt">${c.title}${L?`<br><i>${L.line}</i>`:''}</div></div>
    ${L?`<ul class="barks">${L.barks.map(t=>`<li>${t}</li>`).join('')}</ul>`:''}
    <p>${c.blurb}</p>
    <div class="uvs"><b>Own units</b>${c.units.map(u=>`<span class="chip">${UNITS[u].name} (${ROMAN[UNITS[u].rank]})</span>`).join('')}</div>
    <div class="uvs"><b>Commander strike</b><span class="chip">${FACTIONS[c.faction].super.name}: ${FACTIONS[c.faction].super.dmg} damage, ${FACTIONS[c.faction].super.radius} wide</span></div>`;
}
function renderLabInfo(){
  const box=$('labCard'); if(!box) return;
  box.innerHTML=(labSel==='cmd'?labCmdHTML():unitStatsHTML(labSel))+
    `<div class="btns ls-nav"><button class="btn" id="labPrev" aria-label="Previous">‹ Prev</button><button class="btn" id="labNext" aria-label="Next">Next ›</button></div>`;
  $('labPrev').onclick=()=>labStep(-1); $('labNext').onclick=()=>labStep(1);
  const nm=$('labStageName'), id=labStageId(), d=UNITS[id]||INF[id];
  if(nm) nm.textContent=labSel==='cmd'?`${COMMANDERS[labFaction].short}’s finest: ${d?d.name:''}`:(d?d.name:'');
  $('labInfo').scrollTop=0;
}
function renderLabUI(){
  segButtons($('labFac'),Object.entries(COMMANDERS).map(([k,c])=>[k,c.short]),labFaction,v=>{ labFaction=v; labSel='cmd'; buildLabFigures(); renderLabInfo(); },renderLabUI);
  segButtons($('labPose'),[['still','Still'],['march','March'],['attack','Attack']],labPose,v=>{ labPose=v; labPoseT=performance.now()/1000; },renderLabUI);
  segButtons($('lBase'),[['none','None'],['subtle','Subtle'],['team','Team colour']],STYLE.base,v=>{ STYLE.base=v; applyStyle(); },renderLabUI);
  segButtons($('lPaint'),[['toy','Toy gloss'],['painted','Painted'],['heroic','Heroic']],STYLE.paint,v=>{ STYLE.paint=v; applyStyle(); },renderLabUI);
  segButtons($('lOutline'),[[true,'On'],[false,'Off']],STYLE.outline,v=>{ STYLE.outline=v; applyStyle(); },renderLabUI);
  segButtons($('lLight'),[['day','Day'],['golden','Golden hour'],['moon','Moonlit']],STYLE.light,v=>{ STYLE.light=v; applyStyle(); },renderLabUI);
  // army colours for the commander on show
  const c=COMMANDERS[labFaction], cur=schemeOf(labFaction).id, box=$('lScheme'); box.innerHTML='';
  $('lSchemeFor').textContent=c.army;
  for(const sc of SCHEMES[c.faction]){
    const P=sc.id==='default'?PAL3[c.race]:{ ...PAL3[c.race], ...sc }, b=document.createElement('button'); b.type='button'; b.className='swatch'; b.setAttribute('aria-pressed',String(sc.id===cur));
    b.innerHTML=`<span class="sw"><i style="background:${P.body}"></i><i style="background:${P.dark}"></i><i style="background:${sc.rim||P.rim}"></i></span>${sc.name}`;
    b.onclick=()=>{ if(sc.id==='default') delete SCHEME_PICK[labFaction]; else SCHEME_PICK[labFaction]=sc.id; try{ localStorage.setItem('cc-schemes',JSON.stringify(SCHEME_PICK)); }catch(_){}
      setActiveSchemes(labSchemes()); renderLabUI(); };
    box.appendChild(b);
  }
}
function labSchemes(){ const out={}; for(const k of Object.keys(COMMANDERS)){ const sc=schemeOf(k); if(sc.id!=='default') out[COMMANDERS[k].race]=sc; } return out; }
function openLab(){
  if(!renderer) return;
  if(!labWorld) initLabWorld();
  labOpen=true; labSel='cmd'; labPose='still'; labRot=0; labTilt=.42; labZoom=1;
  menu.hidden=true; $('lab').hidden=false;
  labFaction=COMMANDERS[setup.cmd]?setup.cmd:labFaction;
  setActiveSchemes(labSchemes());
  const st=$('labStyle'); if(st) st.open=innerWidth>innerHeight;
  renderLabUI(); layout(); buildLabFigures(); renderLabInfo();
}
function closeLab(){
  labOpen=false; $('lab').hidden=true; menu.hidden=false;
  if(renderer){ renderer.setScissorTest(false); renderer.setViewport(0,0,view.w,view.h); }
  if(S && S.demo) setActiveSchemes({});
  renderMenu(); layout();
}
let labDrag=null;
function labPointerDown(e){ labDrag={x:e.clientX,y:e.clientY,pinch:null}; }
function labPointerMove(e){
  if(!labDrag) return;
  if(pointers.size>=2){ const p=pinchInfo(); if(labDrag.pinch) labZoom=clamp(labZoom*p.d/labDrag.pinch,.6,2.2); labDrag.pinch=p.d; return; }
  const dx=e.clientX-labDrag.x, dy=e.clientY-labDrag.y;
  labRot+=dx*0.012; labTilt=clamp(labTilt+dy*0.006,.05,1.0);
  labDrag.x=e.clientX; labDrag.y=e.clientY;
}
function labPointerUp(e){ labDrag=null; }
function labWheel(e){ labZoom=clamp(labZoom*Math.exp(-e.deltaY*0.0012),.6,2.2); }
function renderLab(dt){
  const w=labWorld, st=$('labStage'), gl=renderer.domElement.getBoundingClientRect();
  ctx.setTransform(odpr,0,0,odpr,0,0); ctx.clearRect(0,0,W,H);
  const prevC=renderer.getClearColor(new THREE.Color()), prevA=renderer.getClearAlpha();
  renderer.setScissorTest(false); renderer.setViewport(0,0,gl.width,gl.height); renderer.setClearColor(0x0c0f14,1); renderer.clear();
  if(!st || !w.fig){ renderer.setClearColor(prevC,prevA); return; }
  const r=st.getBoundingClientRect(), x=r.left-gl.left, y=gl.bottom-r.bottom, rw=Math.max(1,r.width), rh=Math.max(1,r.height);
  renderer.setViewport(x,y,rw,rh); renderer.setScissor(x,y,rw,rh); renderer.setScissorTest(true); renderer.setClearColor(0x1a2029,1);
  const cam3=w.camera, f=w.fig; cam3.aspect=rw/rh; cam3.clearViewOffset();
  // frame the model: fit its height and the plinth width into the stage, then zoom
  const H0=Math.max(f.h,40), fitH=H0*1.35/(2*Math.tan(cam3.fov*Math.PI/360)), fitW=f.R*2.5/(2*Math.tan(cam3.fov*Math.PI/360)*cam3.aspect);
  const dist=Math.max(fitH,fitW)/labZoom, ty=H0*0.45;
  cam3.position.set(Math.sin(.6)*Math.cos(labTilt)*dist, ty+Math.sin(labTilt)*dist, Math.cos(.6)*Math.cos(labTilt)*dist); cam3.lookAt(0,ty,0);
  cam3.near=Math.max(1,dist*0.05); cam3.far=dist*6; cam3.updateProjectionMatrix();
  f.pivot.rotation.y=labRot;
  const t=performance.now()/1000, a=f.mesh.instanceColor.array; U_TIME.value=t;
  if(f.air){ a[0]=t*7; a[1]=1; a[2]=9; f.pivot.position.y=labPose==='still'?0:Math.sin(t*1.6)*3; }
  else {
    const walk=labPose==='march', ph=(t-labPoseT)%1.6;
    f.gait+=((walk?1:0)-f.gait)*Math.min(1,dt*8); f.cyc+=dt*9*f.gait; a[0]=f.cyc; a[1]=f.gait;
    a[2]=labPose==='attack'&&ph<0.6?ph/0.6:9;
  }
  f.mesh.instanceColor.needsUpdate=true;
  renderer.render(w.scene,cam3);
  renderer.setScissorTest(false); renderer.setViewport(0,0,gl.width,gl.height); renderer.setClearColor(prevC,prevA);
}
