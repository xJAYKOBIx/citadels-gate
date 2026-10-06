// node snd.js  render every cue offline: peak, RMS, length; flags silence / clipping / NaN
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message)); pg.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE',m.text()); });
  const src=fs.readFileSync(path.resolve('sfx.js'),'utf8');
  await pg.setContent('<html><body></body></html>');
  const r=await pg.evaluate(async(src)=>{
    const out=[];
    for(const name of eval(src+';SFX.names()')){
      window.AudioContext=function(){ return new OfflineAudioContext(2,48000*5,48000); };
      const S=eval(src+';SFX'); const ac=S._ac(); Object.defineProperty(ac,'state',{value:'running'});
      S.play(name,{vol:1});
      const buf=await ac.startRendering();
      const L=buf.getChannelData(0), Rr=buf.getChannelData(1); let peak=0, sum=0, nan=0, lastAudible=0;
      for(let i=0;i<L.length;i++){ const v=Math.max(Math.abs(L[i]),Math.abs(Rr[i])); if(Number.isNaN(v)){ nan++; continue; } if(v>peak) peak=v; sum+=v*v; if(v>0.01) lastAudible=i; }
      out.push({name, peak:+peak.toFixed(2), rms:+Math.sqrt(sum/L.length).toFixed(3), len:+(lastAudible/48000).toFixed(2), nan});
    }
    return out; }, src);
  for(const o of r) console.log(o.name.padEnd(12), 'peak',o.peak, 'rms',o.rms, 'len',o.len+'s', o.nan?'NaN!':'', o.peak>0.99?'CLIP':'', o.peak<0.05?'QUIET':'');
  await br.close(); })();
