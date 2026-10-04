const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,map='sylvan']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map); await pg.waitForFunction(()=>window.FA);
  const out=await pg.evaluate(()=>FA.eval(`(()=>{ const saved=S; headless=true; const res=[];
   for(const team of [0,1]) for(const lane of LANE_IDS) for(const type of ['human_line','human_caster','human_spawner','human_flyer']){
    newMatch({...DEFAULT_SETUP},{seed:3}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.teams[team].gold=999; S.teams[team].rank=4; S.spawnTimer=[1e9,1e9];
    const L=LANES[team][lane], edge=ZONE_EDGE[team][lane]; const p=clampZone(team,...Object.values(lanePointAt(L,edge-8)).slice(0,2));
    const k=MAP.keeps[team]; const u=deploy(team,type,p.x,p.y); if(!u){ res.push({team,lane,type,fail:true}); continue; }
    const g={x:Math.round(u.x),y:Math.round(u.y)}; let tOut=null;
    for(let t=0;t<30*30;t++){ step(STEP); if(tOut==null && !inZone(team,u.x,u.y)) tOut=+(t/30).toFixed(1); }
    res.push({team,lane,type,gate:g,dg:Math.round(Math.hypot(g.x-k.x,g.y-k.y)),tOut,s:Math.round(laneProject(L,u.x,u.y).s),lm:u.laneMode,path:!!u.path});
   }
   S=saved; headless=false; return res; })()`));
  for(const o of out) console.log(JSON.stringify(o)); if(errs.length) console.log(errs); await br.close(); })();
