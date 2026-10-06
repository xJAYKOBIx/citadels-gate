const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///home/claude/cg/v17.html#sylvan');await p.waitForFunction(()=>window.FA);
const r=await p.evaluate(()=>FA.eval(`[0,5,6.5,7.5,8.5,9.5,10.5,14,17,18,19,20,25].map(m=>{ const w=todWeights(m), L=blendLights(w), n=w.reduce((a,v,i)=>a+v*TOD_DARK[i],0); return m+'m w='+w.map(v=>v.toFixed(2))+' night='+n.toFixed(2)+' sun='+L.sun.toString(16)+' si='+L.si.toFixed(2)+' fog='+L.fog.toString(16)+' pos='+L.pos.map(Math.round); }).join('\\n')`));
console.log(r); await b.close();})();
