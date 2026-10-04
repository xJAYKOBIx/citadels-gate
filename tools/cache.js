const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,map='sylvan']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map); await pg.waitForFunction(()=>window.FA);
  if(process.env.PRE) await pg.evaluate(e=>FA.eval(e),process.env.PRE);
  const out=await pg.evaluate(()=>FA.eval(`(()=>{ const saved=S; headless=true; const res=[];
   for(const c of MAP.caches) for(const team of [0,1]){
    newMatch({...DEFAULT_SETUP},{seed:3}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.teams[team].gold=999; S.teams[team].rank=4; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
    const st=S.teams[team].roster.find(k=>UNITS[k].scout); const z=clampZone(team,c.x,c.y); const u=deploy(team,st,z.x,z.y); orderPath(u,[{x:c.x,y:c.y}],false);
    let tt=null; for(let t=0;t<30*60;t++){ step(STEP); if(Math.hypot(u.x-c.x,u.y-c.y)<CONFIG.cache.pickup+u.r){ tt=+(t/30).toFixed(1); break; } }
    res.push([c.name,team,tt]);
   }
   S=saved; headless=false; return res; })()`));
  for(const o of out) console.log(JSON.stringify(o)); if(errs.length) console.log(errs); await br.close(); })();
