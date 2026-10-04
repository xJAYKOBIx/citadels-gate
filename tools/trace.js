const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,team,cx,cy,type='scout']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },'sylvan');
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  if(process.env.PRE) await pg.evaluate(e=>FA.eval(e),process.env.PRE);
  const out=await pg.evaluate(([team,cx,cy])=>FA.eval(`(()=>{ const saved=S; headless=true; const team=${team}, c={x:${cx},y:${cy}};
    newMatch({...DEFAULT_SETUP},{seed:3}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.teams[team].gold=999; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
    const st=S.teams[team].roster.find(k=>UNITS[k].scout); const z=clampZone(team,c.x,c.y); const u=deploy(team,st,z.x,z.y); const ok=orderPath(u,[{x:c.x,y:c.y}],false);
    const log=[ok, u.path&&u.path.map(p=>Math.round(p.x)+','+Math.round(p.y)).join(' ')]; for(let t=0;t<30*30;t++){ step(STEP); if(t%30===0) log.push(Math.round(u.x)+','+Math.round(u.y)+(u.path?' p'+u.pathI:'')+(u.laneMode?' L':'')); }
    S=saved; headless=false; return log; })()`),[team,cx,cy]);
  console.log(out.join('\n')); if(errs.length) console.log(errs); await br.close(); })();
