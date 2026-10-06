// node air.js <file>   flyers ordered onto stationary targets: how much damage lands in 40 s?
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const cases=[['human_flyer','human_aa'],['human_flyer','human_caster'],['moonhawk','dwarf_line'],['dreadWyvern','human_aa'],['human_flyer','tower'],['moonhawk','tower'],['human_flyer','human_flyer'],['elf_flyer','human_line']];
  for(const [A,B] of cases){
    const r=await pg.evaluate(([A,B])=>FA.eval(`(()=>{ const saved=S; headless=true; const out=[];
      for(let sd=0;sd<4;sd++){
        newMatch({...DEFAULT_SETUP},{seed:50+sd}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
        let t;
        if('${B}'==='tower'){ t=S.ents.find(e=>e.kind==='tower' && e.team===1); }
        else { t=spawnUnit(1,'${B}',1530,330); t.home={x:t.x,y:t.y}; t.still=99; if(t.def.air){ t.x=1530; t.y=330; } }
        const hp0=t.hp;
        const a=spawnUnit(0,'${A}',1200+sd*20,330+sd*30); a.home={x:a.x,y:a.y}; a.quick=false;
        orderAttack(a,t); a.delay=0;
        let shots=0, minD=1e9, maxD=0, first=-1;
        for(let i=0;i<30*40 && !a.dead && !t.dead;i++){ step(STEP); const dd=Math.hypot(a.x-t.x,a.y-t.y); if(i>30*6){ minD=Math.min(minD,dd); maxD=Math.max(maxD,dd); } if(a.atkAt===S.t){ shots++; if(first<0) first=i; } }
        out.push({dmg:Math.round(hp0-Math.max(0,t.hp)), shots, first:first<0?null:+(first/30).toFixed(1), band:[Math.round(minD),Math.round(maxD)], aDead:a.dead, tDead:t.dead});
      }
      S=saved; headless=false; return out; })()`),[A,B]);
    console.log(A.padEnd(12)+'-> '+B.padEnd(9), r.map(o=>`dmg${o.dmg} shots${o.shots} first${o.first} d[${o.band}]${o.tDead?' KILL':''}${o.aDead?' lost':''}`).join(' | '));
  }
  await br.close(); })();
