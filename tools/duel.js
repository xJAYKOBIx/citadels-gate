// node duel.js <file> "A:B" ...  equal-gold fights in the North Glade, 6 seeds each
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file,...pairs]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  for(const pr of pairs){ const [A,B]=pr.split(':'); const G=+(process.env.G||48);
    const r=await pg.evaluate(([A,B,G])=>FA.eval(`(()=>{ const saved=S; headless=true; const out={w:[0,0,0],hp:[]};
      for(let sd=0;sd<6;sd++){
        newMatch({...DEFAULT_SETUP},{seed:50+sd}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
        const mk=(team,type,cx)=>{ const d=UNITS[type], n=Math.max(1,Math.round(${G}/d.cost)), us=[]; for(let i=0;i<n;i++){ const u=spawnUnit(team,type,cx+(team?1:-1)*(i%2)*14,330+i*18); u.home={x:u.x,y:u.y}; us.push(u); if(!d.air && d.role!=='caster' && !d.stationary){ orderPath(u,[{x:team?1330:1470,y:380}],false); u.delay=0; } } return us; };
        const a=mk(0,'${A}',1270), b=mk(1,'${B}',1530); const all=()=>[a,b].map(g=>g.filter(u=>!u.dead).length);
        let t=0; for(;t<30*90;t++){ step(STEP); const c=all(); if(!c[0]||!c[1]) break; }
        const c=all(); const hp=g=>g.reduce((s,u)=>s+(u.dead?0:u.hp),0)/g.reduce((s,u)=>s+u.maxHp,0);
        out.w[!c[1]&&c[0]?0:!c[0]&&c[1]?1:2]++; out.hp.push([Math.round(hp(a)*100),Math.round(hp(b)*100),Math.round(t/30)]);
        out.n=[a.length,b.length];
      }
      S=saved; headless=false; return out; })()`),[A,B,G]);
    console.log(`${pr.padEnd(34)} n${r.n.join('v')}  wins ${r.w[0]}-${r.w[1]} draw ${r.w[2]}  hp% ${r.hp.map(h=>h.join('/')).join(' ')}`);
  }
  await br.close(); })();
