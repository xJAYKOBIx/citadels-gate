// node why.js <file> <A> <B> <n> : n games each side; aggregate damage dealt to B's units/structs by source, and B's spend by unit, split by winner
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,A,B,n='6']=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage();
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const r=await pg.evaluate(([A,B,n])=>FA.eval(`(()=>{ const agg={}, spend={}, wins={}, caches={}, ranks={};
    const add=(o,k,v)=>{ o[k]=(o[k]||0)+v; };
    for(let i=0;i<${n};i++) for(const side of [0,1]){ const c0=side?'${B}':'${A}', c1=side?'${A}':'${B}';
      const o=FA.simulate({cmd:c0,foe:c1,diff:'regular'},{seed:20000+i*11+side,maxT:2400,log:true}); const w=o.cmds[o.winner]; add(wins,w,1);
      const bi=o.cmds.indexOf('${B}'), ai=1-bi;
      for(const [k,v] of Object.entries(o.log||{})){ const src=k.split('<-')[1], tgt=k.split('<-')[0]; const srcB=UNITS[src]?UNITS[src].race===COMMANDERS['${B}'].race:src==='inf'?null:null; add(agg,(w==='${B}'?'Bwin ':'Awin ')+k,v); }
      for(const b of o.built[bi]) add(spend,b.split(':')[1],UNITS[b.split(':')[1]].cost);
      add(caches,'${B}',o.stats[bi].caches); add(caches,'${A}',o.stats[ai].caches); add(ranks,'${B}',o.stats[bi].rank); add(ranks,'${A}',o.stats[ai].rank);
    }
    const top=(pre)=>Object.entries(agg).filter(([k])=>k.startsWith(pre)).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>k.slice(pre.length)+':'+Math.round(v));
    return { wins, caches, ranks, spendB:Object.entries(spend).sort((a,b)=>b[1]-a[1]).slice(0,8), AwinDmg:top('Awin '), BwinDmg:top('Bwin ') }; })()`),[A,B,n]);
  console.log(JSON.stringify(r,null,1)); await br.close(); })();
