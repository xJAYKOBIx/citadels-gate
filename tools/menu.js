const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,w,h,out,hash='']=process.argv.slice(2);
  const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:+w,height:+h}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.resolve(file)+'#'+hash); await pg.waitForFunction(()=>window.FA); await pg.waitForTimeout(600);
  console.log(await pg.evaluate(()=>document.getElementById('menu').innerText.slice(0,3000)));
  await pg.screenshot({path:out, fullPage:true}); console.log(errs); await br.close(); })();
