/* ---------- v18 multiplayer core: commands, snapshots, checksums ----------
   Every player action is a command (plain JSON). Single player applies it at once; in a networked match the
   room schedules it for a tick on both sides (see NET, phase 3). The sim must stay deterministic: it only ever
   draws randomness from S.rnd (seeded, state in S.rs), never from Math.random or the clock. */
let NET=null;                                            // set by the networking layer when a networked match is running
function makeRng(st){ return ()=>{ st.rs=(st.rs|0)+0x6D2B79F5|0; let t=Math.imul(st.rs^st.rs>>>15,1|st.rs); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function entById(id){ if(id==null) return null; for(const e of S.ents) if(e.id===id) return e; return null; }
function issueCmd(c){
  c.team=c.team??0;
  if(NET && NET.active){ NET.issue(c); return null; }
  return applyCmd(c);
}
// returns the unit a deploy created (or null); other commands return true when they applied
function applyCmd(c){
  const team=c.team|0, me=team===0 && !headless;
  switch(c.k){
    case 'deploy': {
      if(S.phase!=='play' || buyCheck(team,c.type)) return null;
      const u=deploy(team,c.type,c.sx,c.sy); if(!u) return null;
      if(c.mode==='lane') joinLaneId(u,c.lane);
      else if(c.mode==='hidden'){ const L=HIDDEN[c.hp].byTeam[team]; orderPath(u,L.pts.map(([x,y])=>({x,y})),false); u.delay=0; }
      else if(c.mode==='fly'){ orderPath(u,[{x:c.tx,y:c.ty}],false); u.delay=0; }
      else if(c.mode==='walk'||c.mode==='post'){ orderPath(u,[{x:c.tx,y:c.ty}],false); u.delay=0; u.park=true; }
      if(me && c.sel){ S.selected=u; u.tagUntil=performance.now()+2600; }
      return u;
    }
    case 'route': { const u=entById(c.u); if(!u||u.dead||u.team!==team||u.kind!=='unit') return false; return setRoute(u,c.pts.map(p=>({x:p.x,y:p.y})),!!c.loop); }
    case 'extend': { const u=entById(c.u); if(!u||u.dead||u.team!==team||!u.path) return false; u.path=u.path.concat(c.pts.map(p=>({x:p.x,y:p.y}))); return true; }
    case 'attack': { const u=entById(c.u), t=entById(c.t); if(!u||u.dead||u.team!==team||!t||!isTargetable(t)||t.team===team) return false; orderAttack(u,t); return true; }
    case 'hold': { const u=entById(c.u); if(!u||u.dead||u.team!==team) return false; orderHold(u); return true; }
    case 'lane': { const u=entById(c.u); if(!u||u.dead||u.team!==team) return false; return orderLane(u); }
    case 'seal': return buySeal(team);
    case 'super': return fireSuper(team,c.x,c.y);
    case 'surrender': { if(S.phase!=='play') return false; S.phase='over'; S.winner=1-team; S.surrendered=team===ME; S.endTime=S.t; S.overAt=performance.now()-2000; return true; }
  }
  return false;
}
// ---- snapshots: the whole simulation as JSON. Entity references become {$e:id}, unit defs {$d:key}, caches {$c:i}. ----
const SNAP_SKIP=new Set(['fx','corpses','shake','selected','armed','armedSuper','overAt','endShown','debug','paused','speed','hiddenFlash','laneFlash','dmgLog','rnd','teams','ents','keeps','towers','caches','_camDone','_chipFor','selAt']);
const ENT_SKIP=new Set(['tagUntil','_pf','_bank','_atkSeen','_cyc','showT','gait']);
function defKey(d){ if(!d||!d.id) return null; if(UNITS[d.id]===d) return 'U:'+d.id; if(INF[d.id]===d) return 'I:'+d.id; return null; }
function defOf(k){ return k[0]==='U'?UNITS[k.slice(2)]:INF[k.slice(2)]; }
let PACK_SEEN=null;   // entities referenced while packing (some may already have left S.ents: a bolt still flying at a fallen target)
function packVal(v,depth=0){
  if(v==null || typeof v!=='object') return typeof v==='function'?undefined:v;
  if(depth>12) return undefined;
  if(v.kind && v.id!=null && (v.kind==='unit'||v.kind==='inf'||v.kind==='keep'||v.kind==='tower')){ if(PACK_SEEN) PACK_SEEN.set(v.id,v); return {$e:v.id}; }
  const dk=defKey(v); if(dk) return {$d:dk};
  const ci=S.caches.indexOf(v); if(ci>=0) return {$c:ci};
  if(Array.isArray(v)) return v.map(x=>packVal(x,depth+1)).map(x=>x===undefined?null:x);
  const o={}; for(const [k,x] of Object.entries(v)){ if(k[0]==='_') continue; const p=packVal(x,depth+1); if(p!==undefined) o[k]=p; } return o;
}
function packEnt(e){ const o={}; for(const [k,v] of Object.entries(e)){ if(ENT_SKIP.has(k)||k[0]==='_') continue; if(k==='def'){ o.def=defKey(v); continue; } const p=packVal(v,1); if(p!==undefined) o[k]=p; } return o; }
function serializeState(){
  PACK_SEEN=new Map();
  const out={ v:1, map:MAP_ID, setup:S.setup, seed:S.seed, rs:S.rs|0 };
  for(const [k,v] of Object.entries(S)){ if(SNAP_SKIP.has(k)||k[0]==='_') continue; const p=packVal(v); if(p!==undefined) out[k]=p; }
  out.teams=S.teams.map(T=>{ const o={}; for(const [k,v] of Object.entries(T)){ if(['cmd','faction','pal','roster','inf','race','ai'].includes(k)) continue; o[k]=packVal(v); } if(T.ai){ const a={}; for(const [k,v] of Object.entries(T.ai)){ if(k==='diff'||k==='spots') continue; a[k]=packVal(v); } o.ai=a; } return o; });
  out.ents=S.ents.map(packEnt);
  out.caches=S.caches.map(c=>{ const o={}; for(const [k,v] of Object.entries(c)) o[k]=packVal(v); return o; });
  // v18.1: entities still referenced but no longer on the field travel along, so a restored copy steps exactly like the original
  const inEnts=new Set(S.ents.map(e=>e.id)), ghosts=[], done=new Set();
  for(let more=true; more;){ more=false; for(const [id,e] of [...PACK_SEEN]){ if(inEnts.has(id)||done.has(id)) continue; done.add(id); ghosts.push(packEnt(e)); more=true; } }
  if(ghosts.length) out.ghosts=ghosts;
  PACK_SEEN=null;
  return out;
}
function unpackVal(v,byId){
  if(v==null || typeof v!=='object') return v;
  if(v.$e!=null) return byId.get(v.$e)||null;
  if(v.$d) return defOf(v.$d);
  if(v.$c!=null) return S.caches[v.$c]||null;
  if(Array.isArray(v)){ const a=v.map(x=>unpackVal(x,byId)); return v.some(x=>x&&x.$e!=null)?a.filter(x=>x!==null):a; }   // refs to units that have since died drop out
  const o={}; for(const [k,x] of Object.entries(v)) o[k]=unpackVal(x,byId); return o;
}
function restoreState(snap,opts={}){
  if(snap.map!==MAP_ID) throw new Error('snapshot is for map '+snap.map);
  newMatch(snap.setup,{ seed:snap.seed, foe:snap.teams[1].cmdKey, aiBoth:!!snap.teams[0].ai, noAI:opts.noAI });
  S.rs=snap.rs|0;
  // entities first (refs resolve in a second pass), caches before refs to them
  S.caches=snap.caches.map(c=>({...c}));
  const byId=new Map(), mk=e=>{ const o={}; for(const [k,v] of Object.entries(e)) o[k]=k==='def'?defOf(v):v; byId.set(o.id,o); return o; };
  const raw=snap.ents.map(mk), ghosts=(snap.ghosts||[]).map(mk);
  for(const o of raw.concat(ghosts)) for(const k of Object.keys(o)){ if(k==='def') continue; o[k]=unpackVal(o[k],byId); }
  for(const c of S.caches) for(const k of Object.keys(c)) c[k]=unpackVal(c[k],byId);
  S.ents=raw; S.keeps=raw.filter(e=>e.kind==='keep'); S.towers=raw.filter(e=>e.kind==='tower');
  // v18.1: match-level state (projectiles in flight, the spawn queue…) resolves its entity refs only now that the entities exist
  for(const [k,v] of Object.entries(snap)){ if(['v','map','setup','seed','rs','teams','ents','caches','ghosts'].includes(k)) continue; S[k]=unpackVal(v,byId); }
  snap.teams.forEach((t,i)=>{ const T=S.teams[i]; for(const [k,v] of Object.entries(t)){ if(k==='ai') continue; T[k]=unpackVal(v,byId); }
    if(t.ai && !opts.noAI){ if(!T.ai) T.ai=makeAI(i,t.diffKey||S.setup.diff); for(const [k,v] of Object.entries(t.ai)) T.ai[k]=unpackVal(v,byId); } else if(opts.noAI) T.ai=null; });
  S.fx=[]; S.corpses=[]; S.selected=null; S.armed=null; S.armedSuper=false; S.paused=false; S.speed=1;
  if(typeof structFor!=='undefined') structFor=null;   // the renderer rebuilds structure meshes against the new entity objects
  return S;
}
// ---- checksum: a cheap digest of what matters, for desync detection ----
function fnv(h,s){ for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h; }
function stateHash(){
  let h=2166136261>>>0; const r=v=>Math.round(v*100);
  h=fnv(h,`${S.t.toFixed(3)}|${S.rs|0}|${S.nextId}|${S.phase}|${S.caches.length}|${S.projs.length}|${S.queue.length}`);
  for(const T of S.teams) h=fnv(h,`|${T.gold}|${r(T.goldAcc)}|${T.rank}|${r(T.superCd)}|${T.stats.kills}|${T.stats.built}`);
  for(const e of S.ents){ if(e.dead) continue; h=fnv(h,`|${e.id}${e.kind[0]}${e.team}:${r(e.x)},${r(e.y)},${r(e.hp)},${e.target?e.target.id:0},${e.path?e.pathI:-1}`); }
  return h>>>0;
}
