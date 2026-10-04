// usage: node hud.js <file> <w> <h> <out.png> [hash]  -> loads as a touch phone, starts a battle, selects a unit, screenshots the HUD
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,w,h,out,hash='sylvan-battle']=process.argv.slice(2);
  const br=await chromium.launch(); const ctx=await br.newContext({ viewport:{width:+w,height:+h}, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#'+hash); await pg.waitForFunction(()=>window.FA); await pg.waitForTimeout(3600);
  const r=await pg.evaluate(()=>FA.eval(`(()=>{ const T=S.teams[0]; T.gold=30; const u=deploy(0,T.roster[1],MAP.keeps[0].x+60,MAP.keeps[0].y); S.selected=u; hudTick();
    const R=id=>{ const e=document.getElementById(id); if(!e||e.hidden) return null; const b=e.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]; };
    return { cls:document.documentElement.className, view:[view.x,view.y,view.w,view.h], hud:R('hudTop'), grim:R('grim'), chip:R('chip'), hint:R('hint'), mini:R('mini'), miniTog:R('miniTog'), fs:R('fs') }; })()`));
  await pg.waitForTimeout(200); await pg.screenshot({ path:out });
  console.log(JSON.stringify(r)); if(errs.length) console.log('ERR',errs); await br.close(); })();
