// node walk.js <file> <map> [type] : from each team's gate, walk a unit to every overwatch spot, cache and plateau; report arrival
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,map='sylvan',type='human_line']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map); await pg.waitForFunction(()=>window.FA);
  const out=await pg.evaluate((type)=>FA.eval(`(()=>{ const saved=S; headless=true; const res=[];
    const spots=[]; for(const t of [0,1]) for(const l of LANE_IDS) for(const p of MAP.overwatch[t][l]) spots.push({name:'ow t'+t+' l'+l,x:p.x,y:p.y});
    for(const c of MAP.caches) spots.push({name:'cache '+c.name,x:c.x,y:c.y});
    for(const pl of MAP.plateaus||[]){ const c=plateauCenter(pl); spots.push({name:'plateau '+pl.name,x:c.x,y:c.y}); }
    for(const sp of spots) for(const team of [0,1]){
      newMatch({...DEFAULT_SETUP},{seed:3}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.teams[team].gold=999; S.teams[team].rank=4; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
      const z=clampZone(team,sp.x,sp.y); const u=deploy(team,'${type}',z.x,z.y); if(!u){ res.push([sp.name,team,'no deploy']); continue; }
      const ok=orderPath(u,[{x:sp.x,y:sp.y}],false); u.delay=0; u.park=true;
      let tt=null, last=null, still=0; for(let t=0;t<30*150;t++){ step(STEP); const d=Math.hypot(u.x-sp.x,u.y-sp.y); if(d<14){ tt=+(t/30).toFixed(1); break; } if(last && Math.hypot(u.x-last.x,u.y-last.y)<0.05) still++; else still=0; last={x:u.x,y:u.y}; if(still>30*8) break; }
      res.push([sp.name,team,ok?(tt??('STUCK at '+Math.round(u.x)+','+Math.round(u.y)+' d='+Math.round(Math.hypot(u.x-sp.x,u.y-sp.y)))):'no route']);
    }
    S=saved; headless=false; return res; })()`),type);
  for(const o of out) console.log(JSON.stringify(o)); if(errs.length) console.log(errs); await br.close(); })();
