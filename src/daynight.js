/* ---------- v17.3 day / night (visual only: no effect on sight, stats or the simulation) ----------
   STYLE.tod: 'cycle' (default) or a fixed 'day' | 'golden' | 'moon'. In a match the cycle runs on the match clock:
   daylight → golden hour ~6 min → night by ~10 min → dawn ~18 min → day at 20, then repeats.
   Torchlight is faked: additive glow points (flame core + halo) and soft warm pools on the ground; no real lights. */
const TOD_KEYS=[ // minute, weights [day, golden, moon]
  [0,[1,0,0]],[4.5,[1,0,0]],[6.5,[0,1,0]],[8.5,[0,.5,.5]],[10.5,[0,0,1]],[16,[0,0,1]],[18,[0,1,0]],[20,[1,0,0]] ];
const TOD_DARK=[0,.35,1];                 // how dark each preset counts for torches
let NIGHT=0, TOD_W=[1,0,0], CUR_L=null;
function presetL(k){ const L=LIGHTS[k]||LIGHTS.day, o=BIOME_LIGHT[BIOME]; return o&&o[k]?{...L,...o[k]}:L; }
function todWeights(min){
  const m=min%20; for(let i=1;i<TOD_KEYS.length;i++){ const [t1,w1]=TOD_KEYS[i], [t0,w0]=TOD_KEYS[i-1];
    if(m<=t1){ const k=(m-t0)/Math.max(1e-6,t1-t0), e=k*k*(3-2*k); return w0.map((v,j)=>v+(w1[j]-v)*e); } }
  return [1,0,0];
}
const _mixC=(cs,w)=>{ let r=0,g=0,b=0; cs.forEach((c,i)=>{ r+=((c>>16)&255)*w[i]; g+=((c>>8)&255)*w[i]; b+=(c&255)*w[i]; }); return (Math.round(r)<<16)|(Math.round(g)<<8)|Math.round(b); };
function blendLights(w){
  const P=['day','golden','moon'].map(presetL), out={ ...P[w.indexOf(Math.max(...w))] };
  for(const k of ['sky','ground','sun','clear','water','fog','fill']) out[k]=_mixC(P.map(p=>p[k]),w);
  for(const k of ['hi','si','fire','snow','fogNear','fogFar','fi']) out[k]=P.reduce((a,p,i)=>a+p[k]*w[i],0);
  out.pos=[0,1,2].map(j=>P.reduce((a,p,i)=>a+p.pos[j]*w[i],0));
  return out;
}
function todMode(){ return (S && !S.demo && !labOpen && STYLE.tod==='cycle')?'cycle':(STYLE.tod==='cycle'?'day':STYLE.tod); }
function LK(){ const i=TOD_W.indexOf(Math.max(...TOD_W)); return ['day','golden','moon'][i]; }   // nearest preset, for the discrete look switches
let _todLast=-1;
function updateDayNight(){
  const mode=todMode();
  TOD_W=mode==='cycle'?todWeights((S.t||0)/60):mode==='golden'?[0,1,0]:mode==='moon'?[0,0,1]:[1,0,0];
  NIGHT=TOD_W.reduce((a,v,i)=>a+v*TOD_DARK[i],0);
  const sig=TOD_W.map(v=>v.toFixed(3)).join();
  if(sig===_todLast) return; _todLast=sig;             // only touch the lights when the blend moved
  CUR_L=blendLights(TOD_W); applyWorldLight();
}
// ---- torchlight ----
let GLOW=null, POOLS=null;
function initGlow(){
  GLOW=makePoints(900,true); GLOW.p.renderOrder=5;
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'), g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,255,255,.45)'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(0,0,64,64);
  const tex=new THREE.CanvasTexture(cv), geo=new THREE.PlaneGeometry(1,1); geo.rotateX(-Math.PI/2);
  const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffffff, opacity:0, fog:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  POOLS=new THREE.InstancedMesh(geo,mat,260); POOLS.count=0; POOLS.frustumCulled=false; POOLS.renderOrder=3;
  POOLS.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(260*3),3); POOLS.instanceColor.setUsage(THREE.DynamicDrawUsage); POOLS.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(POOLS);
}
const TORCH=[1.0,.62,.25], LANTERN=[1.0,.78,.42], STAFF_C=[.78,.72,1.0], STAFF_F=[.62,1.0,.75], GRAVE=[.6,1.0,.72];
function glowPush(x,h,y,col,size,alpha){
  const G=GLOW; if(G.n>=G.cap) return; const i=G.n++, pa=G.g.attributes;
  pa.position.array[i*3]=x; pa.position.array[i*3+1]=h; pa.position.array[i*3+2]=y;
  pa.color.array[i*3]=col[0]; pa.color.array[i*3+1]=col[1]; pa.color.array[i*3+2]=col[2];
  pa.psize.array[i]=size; pa.palpha.array[i]=alpha;
}
function poolPush(x,y,r,col,k){
  if(POOLS.count>=260) return; const i=POOLS.count++;
  dummy.position.set(x,heightAt(clamp(x,0,MW),clamp(y,0,MH))+1.2,y); dummy.rotation.set(0,0,0); dummy.scale.set(r*2,1,r*2); dummy.updateMatrix(); POOLS.setMatrixAt(i,dummy.matrix);
  POOLS.instanceColor.array[i*3]=col[0]*k; POOLS.instanceColor.array[i*3+1]=col[1]*k; POOLS.instanceColor.array[i*3+2]=col[2]*k;
}
// a torch: hot core + soft halo above the bearer's hand, and a pool of light on the ground once it gets dark
function torchAt(x,h,y,s,col,id,t,kind){
  const fl=.82+.18*Math.sin(t*11+id*1.7)*Math.sin(t*6.3+id*.9), day=1-NIGHT;
  glowPush(x,h,y,col,s*(kind==='staff'?.42:.32),(.55+.45*NIGHT)*fl);                        // flame core, visible by day too
  glowPush(x,h,y,col,s*(kind==='staff'?1.5:1.9)*(.6+.4*NIGHT),(.06*day+.42*NIGHT)*fl);      // halo grows after dusk
  if(NIGHT>.15) poolPush(x,y,s*(kind==='lantern'?1.7:1.35),col,.55*NIGHT*fl);
}
function syncGlow(alpha,now){
  if(!GLOW) initGlow();
  GLOW.n=0; POOLS.count=0;
  if(STYLE.torches===false){ GLOW.p.geometry.setDrawRange(0,0); return; }
  const t=now/1000;
  for(const e of S.ents){
    if(e.dead || e.hidden || (e.kind!=='inf' && e.kind!=='unit')) continue;
    if(e.kind==='unit' && isAir(e)) continue;                     // flyers stay dark against the sky
    const x=e.px+(e.x-e.px)*alpha, y=e.py+(e.y-e.py)*alpha, s=visR(e), h0=groundH(e,x,y), fk=S.teams[e.team].faction.key;
    if(e.kind==='inf'){
      if(e.id%3) continue;                                        // one torch-bearer in three
      const side=e.face-Math.PI/2;                                 // held out to the right
      torchAt(x+Math.cos(side)*s*.42+Math.cos(e.face)*s*.1,h0+s*1.55,y+Math.sin(side)*s*.42+Math.sin(e.face)*s*.1,s,fk==='forsaken'&&e.def.race==='skeletal'?GRAVE:TORCH,e.id,t,'torch');
    } else {
      const d=e.def, m=modelOf(e.type);
      if(d.role==='caster') torchAt(x+Math.cos(e.face-1.2)*s*.35,h0+s*1.45,y+Math.sin(e.face-1.2)*s*.35,s*.8,fk==='forsaken'?STAFF_F:STAFF_C,e.id,t,'staff');
      else if(d.spawns || /cart|wagon|caravan/i.test(m)) torchAt(x+Math.cos(e.face)*s*.55,h0+s*.95,y+Math.sin(e.face)*s*.55,s*.75,LANTERN,e.id,t,'lantern');
    }
  }
  // structures: tower tops, keep windows and campfires glow brighter after dark
  if(NIGHT>.05){
    for(const e of S.ents){
      if(e.kind==='tower' && !e.ruin){ const s=e.r*1.3, fk=S.teams[e.team].faction.key; glowPush(e.x,heightAt(e.x,e.y)+s*(fk==='forsaken'?2.4:1.3),e.y,fk==='forsaken'?GRAVE:LANTERN,s*1.4,.5*NIGHT); poolPush(e.x,e.y,s*1.6,fk==='forsaken'?GRAVE:LANTERN,.32*NIGHT); }
      else if(e.kind==='keep' && !e.dead){ const s=e.r*1.25, fk=S.teams[e.team].faction.key, col=fk==='forsaken'?GRAVE:LANTERN;
        for(let i=0;i<4;i++){ const a=i*TAU/4+.78; glowPush(e.x+Math.cos(a)*s*.85,heightAt(e.x,e.y)+s*(fk==='forsaken'?1.35:1.25),e.y+Math.sin(a)*s*.85,col,s*.9,.45*NIGHT); }
        poolPush(e.x,e.y,s*2.4,col,.28*NIGHT); }
    }
    for(const em of EMITTERS) if(em.kind==='fire') poolPush(em.x,em.y,60,TORCH,.75*NIGHT);
  }
  const G=GLOW, a=G.g.attributes; for(const k of ['position','color','psize','palpha']) a[k].needsUpdate=true; G.g.setDrawRange(0,G.n);
  POOLS.material.opacity=1; POOLS.instanceMatrix.needsUpdate=true; POOLS.instanceColor.needsUpdate=true;
}
