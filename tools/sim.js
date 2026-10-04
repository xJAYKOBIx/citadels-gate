// usage: node sim.js <file.html> <diff> <n> [map]   -> runs n AI-vs-AI games headlessly, prints times/winners
const { chromium } = require('playwright');
const path=require('path');
(async()=>{
  const [file,diff='regular',n='6',map='frostmere']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage({ viewport:{width:1200,height:800} });
  pg.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map);
  await pg.waitForFunction(()=>window.FA);
  const res=[];
  for(let i=0;i<+n;i++){
    const r=await pg.evaluate(([d,seed])=>FA.simulate({ diff:d }, { seed, maxT:2400 }),[diff,100+i]);
    res.push(r); console.log(`#${i} winner ${r.winner} t ${r.t}s (${(r.t/60).toFixed(1)} min) keeps ${r.keeps} towers ${r.towersLeft} ${r.err?'ERR '+r.err.slice(0,200):''}`);
  }
  const ts=res.filter(r=>r.winner!=null).map(r=>r.t).sort((a,b)=>a-b);
  console.log('median', ts.length?(ts[ts.length>>1]/60).toFixed(1):'-', 'min; wins team0', res.filter(r=>r.winner===0).length, 'team1', res.filter(r=>r.winner===1).length, 'none', res.filter(r=>r.winner==null).length);
  await br.close();
})();
