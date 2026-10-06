/* Citadel's Gate v19 — the title screen.
   Spliced into index.html in three places:
   1. TITLE camera / dusk / sky (this first block) sits right before `function updateCamera(dt){`.
      updateCamera starts with: if(TITLE.on && S && S.demo && camera && !labOpen){ ...titleCam(dt); return; } and restores cam.fov after.
      todMode() returns 'title' in the same case; updateDayNight() then uses TITLE_L, NIGHT=TITLE.night and shows the sky + mountain ring.
   2. The menu logic (second block) sits right before `applyHash(); applyViewHash();` at the end of the main script.
   3. toMenu(scr) shows the given screen ('home', 'p-skirmish', 'p-online', ...). Markup: src/title-menu.html, styles: src/title.css. */

/* ---------- title screen camera: a slow cinematic drift over the live demo battle ---------- */
const TITLE={ on:true, t:0, night:.62, over:null, fov:38, sky:null };
// the title screen's own dusk: a low ember sun behind the enemy's woods, cool blue shadows, torches lit
const TITLE_L={ sky:0x5a6aa8, ground:0x1c1820, hi:.62, sun:0xff9750, si:1.25, pos:[1900,380,-500], clear:0x0b0d16, water:0x34506c, fire:1.5, snow:.55,
  fog:0x3a3247, fogNear:700, fogFar:3300, fill:0x4a58a0, fi:.32, grade:'' };
function titleSky(){
  if(!renderer) return;
  if(!TITLE.sky){
    const geo=new THREE.SphereGeometry(9000,32,16);
    const mat=new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false,
      uniforms:{ sunDir:{value:new THREE.Vector3(1,.08,-.25).normalize()}, hor:{value:new THREE.Color(0x3a3247)}, zen:{value:new THREE.Color(0x0a0e1e)}, ember:{value:new THREE.Color(0xff8a3c)}, gold:{value:new THREE.Color(0xffd08a)} },
      vertexShader:'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:'uniform vec3 sunDir,hor,zen,ember,gold; varying vec3 vD; void main(){ float h=vD.y; vec3 c=mix(hor,zen,smoothstep(-.02,.55,h)); float s=max(dot(normalize(vD),sunDir),0.0); float band=exp(-abs(h-.02)*9.0); c+=ember*pow(s,6.0)*band*.85+gold*pow(s,60.0)*.6+ember*.12*band; gl_FragColor=vec4(c,1.0); }' });
    TITLE.sky=new THREE.Mesh(geo,mat); TITLE.sky.renderOrder=-10; TITLE.sky.frustumCulled=false; scene.add(TITLE.sky);
    // a ring of dark hills and treeline beyond the board's edge, so the low shots meet a horizon instead of the table
    const R=mulberryTitle(7), cone=new THREE.ConeGeometry(1,1,7); cone.translate(0,.5,0);
    const m2=new THREE.MeshLambertMaterial({ color:0x1b1d26, flatShading:true });
    const N=90, ring=new THREE.InstancedMesh(cone,m2,N), dm=new THREE.Object3D();
    for(let i=0;i<N;i++){ const far=true, a=(i/N)*TAU+R()*.05, dd=1900+R()*1300, rx=MW/2+dd, ry=MH/2+dd;
      const h=far?300+R()*520:110+R()*160, w=far?Math.min(dd*.85,h*(.9+R()*.4)):h*.35;
      dm.position.set(CX+Math.cos(a)*rx,-10,CY+Math.sin(a)*ry); dm.scale.set(w,h,w); dm.rotation.set(0,R()*6,0); dm.updateMatrix(); ring.setMatrixAt(i,dm.matrix); }
    TITLE.ring=ring; scene.add(ring);
  }
  TITLE.sky.visible=true; TITLE.ring.visible=true;
}
function mulberryTitle(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
window.__TITLE=TITLE;
// three slow shots, each a gentle dolly; a dip to dark between them. Landscape keeps the subject right of the menu.
const TITLE_SHOTS=[
  { p0:[-70,1200,205], p1:[-70,1020,220], t0:[760,1110,95], t1:[760,1090,100], fov:38 },          // our keep against the sunset, the enemy spire on the horizon
  { p0:[780,1270,128], p1:[700,1215,112], t0:[330,1095,78], t1:[330,1090,74], fov:40 },         // the gate itself, lit by the low sun, troops marching out
  { p0:[560,1330,330], p1:[760,1280,300], t0:[2470,1100,70], t1:[2470,1100,60], fov:34 },       // over the woods toward their citadel
];
const TITLE_DUR=17, TITLE_FADE=1.3;
function titleCam(dt){
  TITLE.t+=dt||0;
  let v=TITLE.over;
  if(v && typeof v==='function') v=v(TITLE.t);
  if(!v){
    const n=TITLE_SHOTS.length, k=Math.floor(TITLE.t/TITLE_DUR), u=(TITLE.t%TITLE_DUR)/TITLE_DUR, sh=TITLE_SHOTS[k%n], e=u*u*(3-2*u)*.6+u*.4;
    const L=(a,b)=>a.map((x,i)=>x+(b[i]-x)*e), p=L(sh.p0,sh.p1), t=L(sh.t0,sh.t1);
    const land=view.w>view.h*1.15;
    if(land){ const fx=t[0]-p[0], fy=t[1]-p[1], fl=Math.hypot(fx,fy)||1, d=Math.hypot(fx,fy), k2=d*.26; t[0]-=(-fy/fl)*k2; t[1]-=(fx/fl)*k2; }  // swing the view so the subject sits right of the menu
    v={ p, t, fov:sh.fov+(land?0:8) };
    const fe=$('tFade'); if(fe){ const tt=TITLE.t%TITLE_DUR, a=tt<TITLE_FADE?1-tt/TITLE_FADE:tt>TITLE_DUR-TITLE_FADE?(tt-(TITLE_DUR-TITLE_FADE))/TITLE_FADE:0; fe.style.opacity=(TITLE.t<TITLE_FADE?1-TITLE.t/TITLE_FADE:a).toFixed(3); }
  }
  camera.fov=v.fov||TITLE.fov; camera.updateProjectionMatrix();
  camera.position.set(v.p[0],v.p[2],v.p[1]); camera.lookAt(v.t[0],v.t[2],v.t[1]);
  if(TITLE.sky) TITLE.sky.position.copy(camera.position);
  cam.x=v.t[0]; cam.y=v.t[1]; camera.updateMatrixWorld();
}

/* ---------- v19 title screen ---------- */
const TSC={ el:$('menu'), screen:'splash', entered:false };
function tsShow(scr){
  TSC.screen=scr; TSC.el.dataset.screen=scr;
  for(const p of TSC.el.querySelectorAll('.t-panel')) p.hidden=('p-'+p.dataset.panel)!==scr;
  if(scr==='home'){ const rs=$('mResume'), f=(rs && !rs.hidden)?rs:TSC.el.querySelector('.t-item[data-go="'+(TSC.last||'skirmish')+'"]'); if(f && !TOUCHUI) setTimeout(()=>f.focus({preventScroll:true}),60); }
  else if(scr.startsWith('p-')){ const p=TSC.el.querySelector('.t-panel:not([hidden]) .t-pb'); if(p) p.scrollTop=0; const b=TSC.el.querySelector('.t-panel:not([hidden]) .t-back'); if(b && !TOUCHUI) setTimeout(()=>b.focus({preventScroll:true}),60); }
}
function tsEnter(){ if(TSC.entered) return; TSC.entered=true; try{ SFX.unlock&&SFX.unlock(); }catch(_){} tsShow('home'); }
function tsGo(k){
  TSC.last=k;
  if(k==='library'){ openLab(); return; }
  if(k==='skirmish') renderMenu();
  if(k==='online') mpRefreshMenu();
  if(k==='settings') tsSettings();
  tsShow('p-'+k);
}
function tsSettings(){
  const cur=(()=>{ try{ return localStorage.getItem('cc-snd')||'full'; }catch(_){ return 'full'; } })();
  segButtons($('tSndSeg'),[['full','Full'],['low','Low'],['off','Off']],cur,v=>{ applySnd(v); tsSndIcon(); },tsSettings);
  segButtons($('tTodSeg'),[['cycle','Cycle'],['day','Day'],['golden','Golden hour'],['moon','Moonlit']],STYLE.tod,v=>{ STYLE.tod=v; saveStyle(); },tsSettings);
  segButtons($('tTorchSeg'),[[true,'On'],[false,'Off']],STYLE.torches!==false,v=>{ STYLE.torches=v; saveStyle(); },tsSettings);
  segButtons($('mGfx'),[[true,'High'],[false,'Low']],GFX.high,v=>{ setGfx(v); },tsSettings);
  segButtons($('tFpsSeg'),[[30,'30 per second'],[60,'60 per second']],FPS_CAP,v=>{ setFpsCap(v); },tsSettings);
}
function tsSndIcon(){ const v=(()=>{ try{ return localStorage.getItem('cc-snd')||'full'; }catch(_){ return 'full'; } })(); const b=$('tSnd'); b.dataset.v=v; b.setAttribute('aria-label','Sound: '+v); }
function tsWho(){
  const w=$('tWho'), sub=$('tOnlineSub'); if(!w) return;
  if(MP.platform && MP.user){ w.innerHTML=`<span class="dot"></span>Signed in as <b>${mpEsc(MP.user.displayName||MP.user.handle||'you')}</b>`; if(sub) sub.textContent='Online, with a room code'; }
  else if(MP.platform){ w.innerHTML=`<a href="/account" target="_top">Sign in</a> to play a friend online`; if(sub) sub.textContent='Sign in on JAYKOBI GAMES to play online'; }
  else { w.textContent=''; if(sub) sub.textContent='Online on JAYKOBI GAMES'; }
}
{ const _r=mpRefreshMenu; mpRefreshMenu=async function(){ await _r(); tsWho(); }; }
$('tEnterTxt').textContent=TOUCHUI?'Tap to begin':'Press any key';
{ const mv=document.querySelector('meta[name="cg-version"]'); if(mv) $('tVer').textContent=mv.content; }
$('tEnter').onclick=tsEnter;
TSC.el.addEventListener('pointerdown',e=>{ if(TSC.screen==='splash'){ e.preventDefault(); tsEnter(); } });
for(const b of TSC.el.querySelectorAll('.t-item[data-go]')) b.onclick=()=>tsGo(b.dataset.go);
for(const b of TSC.el.querySelectorAll('.t-back')) b.onclick=()=>tsShow('home');
$('tSnd').onclick=()=>{ cycleSnd(); tsSndIcon(); if(TSC.screen==='p-settings') tsSettings(); };
// keyboard: any key opens, arrows walk the menu, Escape steps back
document.addEventListener('keydown',e=>{
  if(menu.hidden) return;
  if(TSC.screen==='splash'){ if(!e.metaKey && !e.ctrlKey && !e.altKey){ e.preventDefault(); tsEnter(); } return; }
  if(e.key==='Escape' && TSC.screen.startsWith('p-')){ e.preventDefault(); tsShow('home'); return; }
  if(TSC.screen==='home' && (e.key==='ArrowDown'||e.key==='ArrowUp')){
    const items=[...TSC.el.querySelectorAll('.t-item:not(:disabled):not([hidden])')], i=items.indexOf(document.activeElement);
    const n=i<0?0:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length; items[n].focus(); e.preventDefault(); }
},true);
tsSndIcon();
// an invite link goes straight to the online panel; a return from a battle skips the opening card
{ let code=''; try{ code=new URLSearchParams(location.search).get('join')||sessionStorage.getItem('cc-mp-room')||''; }catch(_){}
  if(mpCleanCode(code).length===5){ TSC.entered=true; tsGo('online'); } }
