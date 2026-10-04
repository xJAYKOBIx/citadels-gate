// usage: node dom.js <file.html> <hash> [w h]  -> loads headless (no 3D), reports errors and a few UI facts
const { chromium, devices } = require('playwright');
const path=require('path');
(async()=>{
  const [file,hash='battle',w='844',h='390']=process.argv.slice(2);
  const br=await chromium.launch();
  const ctx=await br.newContext({ viewport:{width:+w,height:+h}, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
  const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,200)); });
  await pg.goto('file://'+path.resolve(file)+'#'+hash);
  await pg.waitForFunction(()=>window.FA); await pg.waitForTimeout(800);
  const out=await pg.evaluate(()=>FA.eval(`({ touch:TOUCHUI, facing, portrait, W, H, mini:[miniW,miniH], fsHidden:$('fs').hidden, mFsHidden:$('mFs').hidden, title:document.title, h1:document.querySelector('h1').textContent,
    phase:S.phase, demo:S.demo, pace:CONFIG.pace, goldEvery:CONFIG.gold.every, wavesEvery:CONFIG.waves.every, keepHp:CONFIG.keep.hp, towerHp:CONFIG.tower.hp, towerInt:CONFIG.tower.interval, warderSpd:UNITS.human_line.speed, scoutSpd:UNITS.human_scout.speed, militia:INF.levy.speed, lanes:LANES[0].map(L=>Math.round(L.len)), spdWord:speedWord(UNITS.human_line.speed) })`));
  console.log(JSON.stringify(out));
  console.log('errors:',errs.filter(e=>!/three|THREE|cdnjs|ERR_|Failed to load/.test(e)));
  await br.close();
})();
