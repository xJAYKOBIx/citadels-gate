// node det.js <file>   determinism proofs for multiplayer:
//  A) two fresh sims, same seed, same scripted command stream (both teams, no AI) -> identical hashes every second for 8 min
//  B) snapshot at 3 min, restore into a fresh sim, continue both with the same commands -> identical hashes
//  C) AI game: snapshot/restore mid-game with AI state -> identical hashes (host saves of single-player)
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const r=await pg.evaluate(()=>FA.eval(`(()=>{
    const saved=S; headless=true; const out={};
    const setup={ ...DEFAULT_SETUP, cmd:'kyndrili', foe:'grom' };
    // a scripted two-player match: both sides deploy and order units on a schedule (ids are deterministic)
    const script=[]; const r=mulberry32(99);
    const core=t=>['scout','line','spawner','flyer','caster','aa'].map(s=>COMMANDERS[t?'grom':'kyndrili'].race+'_'+s);
    for(let tick=60;tick<30*480;tick+=45){ const team=(tick/45)%2|0, list=core(team), type=list[Math.floor(r()*list.length)];
      const k=MAP.keeps[team], a=(r()-.5)*2.4, d=120+r()*300; script.push({ tick, c:{ k:'deploy', team, type, sx:k.x+Math.cos(a)*(team?-1:1)*60, sy:k.y+Math.sin(a)*60, mode:r()<.5?'lane':'walk', lane:r()<.5?0:1, tx:k.x+Math.cos(a)*(team?-1:1)*d, ty:k.y+Math.sin(a)*d } });
      if(tick%900===0) script.push({ tick:tick+1, c:{ k:'seal', team } });
      if(tick%600===300) script.push({ tick:tick+2, c:{ k:'hold', team, u:5+Math.floor(r()*40) } });
      if(tick%600===450) script.push({ tick:tick+2, c:{ k:'route', team, u:5+Math.floor(r()*40), pts:[{x:MW/2+(r()-.5)*600,y:MH/2+(r()-.5)*400}], loop:false } });
      if(tick%1800===900) script.push({ tick:tick+3, c:{ k:'super', team, x:MW/2, y:MH/2 } }); }
    const run=(S0,from,to,log)=>{ S=S0; let si=0; while(si<script.length && script[si].tick<from) si++;
      for(let tk=from;tk<to;tk++){ while(si<script.length && script[si].tick===tk){ applyCmd(JSON.parse(JSON.stringify(script[si].c))); si++; } step(STEP); if(tk%30===0) log.push(stateHash()); } return S; };
    const fresh=()=>{ const s0=newMatch(setup,{ seed:4242, noAI:true }); s0.phase='play'; return s0; };
    // A
    const h1=[], h2=[]; run(fresh(),0,30*480,h1); run(fresh(),0,30*480,h2);
    out.A={ same:h1.length===h2.length && h1.every((h,i)=>h===h2[i]), n:h1.length, firstDiff:h1.findIndex((h,i)=>h!==h2[i]) };
    // B
    const hb1=[], hb2=[]; const sA=run(fresh(),0,30*180,hb1); const snap=JSON.parse(JSON.stringify(serializeState()));
    const bytes=JSON.stringify(snap).length, ents=snap.ents.length;
    run(sA,30*180,30*480,hb1);
    const sB=restoreState(snap,{noAI:true}); const hb0=stateHash(); run(sB,30*180,30*480,hb2);
    out.B={ same:hb2.every((h,i)=>h===hb1[i+hb1.length-hb2.length]), restoredHashMatches:hb0===hb1[Math.floor(180*30/30)-1+1]||hb0===hb1[179], bytes, ents, n:hb2.length, firstDiff:hb2.findIndex((h,i)=>h!==hb1[i+hb1.length-hb2.length]) };
    // C (AI both sides)
    const freshAI=()=>{ const s0=newMatch(setup,{ seed:777, aiBoth:true }); s0.phase='play'; return s0; };
    const hc1=[], hc2=[]; const sC=freshAI(); S=sC; for(let tk=0;tk<30*240;tk++){ step(STEP); if(tk%30===0) hc1.push(stateHash()); }
    const snapC=JSON.parse(JSON.stringify(serializeState())); for(let tk=30*240;tk<30*420;tk++){ step(STEP); if(tk%30===0) hc1.push(stateHash()); }
    const sD=restoreState(snapC); S=sD; for(let tk=30*240;tk<30*420;tk++){ step(STEP); if(tk%30===0) hc2.push(stateHash()); }
    out.C={ same:hc2.every((h,i)=>h===hc1[i+hc1.length-hc2.length]), n:hc2.length, firstDiff:hc2.findIndex((h,i)=>h!==hc1[i+hc1.length-hc2.length]), bytes:JSON.stringify(snapC).length };
    S=saved; headless=false; return out; })()`));
  console.log(JSON.stringify(r,null,1)); await br.close(); })();
