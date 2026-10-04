// usage: node pairs.js <file> <map> <games-per-side> <cmdA,cmdB> ... -> JSON lines
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,map,n,...pairs]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.error('PAGEERROR',e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map); await pg.waitForFunction(()=>window.FA); if(process.env.PRE) await pg.evaluate(e=>FA.eval(e),process.env.PRE);
  for(const pr of pairs){ const [a,b]=pr.split(',');
    for(let side=0;side<2;side++) for(let i=0;i<+n;i++){
      const [c0,c1]=side?[b,a]:[a,b];
      const r=await pg.evaluate(([c0,c1,seed])=>{ const o=FA.simulate({ cmd:c0, foe:c1, diff:'regular' },{ seed, maxT:2400, log:true });
        return { seed, towerLog:o.towerLog, winner:o.winner, t:o.t, err:o.err, cmds:o.cmds, keeps:o.keeps, towers:o.towersLeft, stats:o.stats, built:o.built }; },[c0,c1,(+process.env.SEED||1000)+i*7+side*3]);
      console.log(JSON.stringify({pair:pr, ...r}));
    } }
  await br.close(); })();
