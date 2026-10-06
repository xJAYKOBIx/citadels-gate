// node nest.js <file>   draw a rough line toward each nest with a caster; does it end up posted on the nest?
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [file]=process.argv.slice(2);
  const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('cc-map','sylvan'); }catch(_){} });
  await pg.goto('file://'+path.resolve(file)+'#sylvan'); await pg.waitForFunction(()=>window.FA);
  const r=await pg.evaluate(()=>FA.eval(`(()=>{ const saved=S; headless=true; const out=[];
    newMatch({...DEFAULT_SETUP},{seed:7}); S.phase='play'; S.teams[0].ai=null; S.teams[1].ai=null; S.spawnTimer=[1e9,1e9]; S.cacheTimer=1e9;
    const k=MAP.keeps[0];
    for(const n of NESTS.filter(n=>n.team===0)){
      for(const [ox,oy] of [[45,0],[-40,30],[0,-50],[55,55]]){            // sloppy end points around the nest
        const u=spawnUnit(0,'human_caster',k.x+150,k.y); u.quick=false;
        const ex=n.x+ox, ey=n.y+oy, pts=[{x:u.x,y:u.y}]; for(let i=1;i<=8;i++) pts.push({x:u.x+(ex-u.x)*i/8+(i%2?18:-18), y:u.y+(ey-u.y)*i/8});
        const g={type:'draw',u,pts,moved:true,extend:false,closing:false,hover:null,nest:nestAt(0,ex,ey)};
        finishDraw(g);
        let t=0; for(;t<30*120;t++){ step(STEP); if(!u.path && !u.laneMode) break; }
        const d=Math.hypot(u.x-n.x,u.y-n.y);
        out.push({nest:n.name, off:[ox,oy], hit:!!g.nest, dist:Math.round(d), elev:Math.round(u.elev||0), nestElev:Math.round(heightAt(n.x,n.y)), t:Math.round(t/30), pathLeft:u.path?u.path.length-u.pathI:0});
        u.dead=true; u.hp=0;
      }
    }
    S=saved; headless=false; return out; })()`));
  for(const o of r) console.log(o.nest.padEnd(18), String(o.off).padEnd(8), 'hit',o.hit, 'dist',o.dist, 'elev',o.elev+'/'+o.nestElev, 't',o.t+'s', o.pathLeft?'UNFINISHED '+o.pathLeft:'');
  await br.close(); })();
