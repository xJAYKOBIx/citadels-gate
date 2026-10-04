// node drop.js <file> <type> <x> <y> [secs]: the player's flow — planDrop + tryDeploy at (x,y), then watch the unit
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,type,x,y,secs='60']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },'sylvan');
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const out=await pg.evaluate(([type,x,y,secs])=>FA.eval(`(()=>{ const saved=S; headless=true;
    newMatch({...DEFAULT_SETUP},{seed:3}); S.phase='play'; S.teams[1].ai=null; S.teams[0].gold=999; S.teams[0].rank=4; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
    const plan=planDrop(0,'${type}',${x},${y}); const u=tryDeploy('${type}',${x},${y}); const log=[];
    if(!u){ S=saved; headless=false; return {plan}; }
    const uu=S.ents.find(e=>e.kind==='unit'&&e.team===0);
    for(let t=0;t<30*${secs};t++){ step(STEP); if(t%30===0) log.push(Math.round(uu.x)+','+Math.round(uu.y)+(uu.path?' p'+uu.pathI+'/'+uu.path.length:'')+(uu.laneMode?' L':'')+(uu.detourUntil>S.t?' det':'')); }
    const o={plan:{...plan}, end:[Math.round(uu.x),Math.round(uu.y)], dist:Math.round(Math.hypot(uu.x-${x},uu.y-${y})), log}; S=saved; headless=false; return o; })()`),[type,x,y,secs]);
  console.log(JSON.stringify(out.plan)); console.log('end',out.end,'dist',out.dist); console.log((out.log||[]).join(' | ')); if(errs.length) console.log(errs); await br.close(); })();
