const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,map,expr]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(m=>{ try{ localStorage.setItem('cc-map',m); }catch(_){} },map);
  await pg.goto('file://'+path.resolve(file)+'#'+map); await pg.waitForFunction(()=>window.FA);
  console.log(JSON.stringify(await pg.evaluate(e=>FA.eval(e),expr))); if(errs.length) console.log(errs); await br.close(); })();
