// node lib.js <file> <w> <h> <out.png> [cmd] [unit]   Library DOM without 3D: list, stat panel for every unit, customise panel
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,w,h,out,cmd='holts',unit='']=process.argv.slice(2);
  const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:+w,height:+h}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const r=await pg.evaluate(([cmd,unit])=>FA.eval(`(()=>{ const bad=[];
    menu.hidden=true; $('lab').hidden=false; labOpen=false;
    for(const k of Object.keys(COMMANDERS)){ labFaction=k; for(const id of labAllIds()){ try{ const h=unitStatsHTML(id); if(/undefined|NaN/.test(h)) bad.push(k+':'+id+' '+(h.match(/.{30}(undefined|NaN).{20}/)||[''])[0]); }catch(e){ bad.push(k+':'+id+' THROW '+e.message); } } }
    labFaction='${cmd}'; labSel='${unit}'||'cmd'; renderLabUI(); buildLabList(); renderLabInfo();
    const st=$('labStage').getBoundingClientRect(), li=$('labInfo').getBoundingClientRect(), ls=document.querySelector('.lab-list').getBoundingClientRect();
    return { bad, stage:[st.x,st.y,st.width,st.height].map(Math.round), info:[li.x,li.y,li.width,li.height].map(Math.round), list:[ls.x,ls.y,ls.width,ls.height].map(Math.round), units:$('labUnits').children.length, swatches:$('lScheme').children.length };
  })()`),[cmd,unit]);
  await pg.screenshot({path:out}); console.log(JSON.stringify(r)); if(errs.length) console.log('ERRORS',errs);
  await br.close(); })();
