const HTS=10;
const hclamp=(v,a,b)=>v<a?a:v>b?b:v;
function hash2(i,j,s){ let h=Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,1442695041); h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vnoise(x,y,s=0){
  const i=Math.floor(x), j=Math.floor(y), u=x-i, v=y-j, su=u*u*(3-2*u), sv=v*v*(3-2*v);
  const a=hash2(i,j,s), b=hash2(i+1,j,s), c=hash2(i,j+1,s), d=hash2(i+1,j+1,s);
  return (a+(b-a)*su)+((c+(d-c)*su)-(a+(b-a)*su))*sv;
}
function fbm(x,y,oct=4,s=0){ let a=0, amp=.5, f=1, n=0; for(let o=0;o<oct;o++){ a+=amp*(vnoise(x*f,y*f,s+o*17)*2-1); n+=amp; amp*=.5; f*=2.03; } return a/n; }
function ridged(x,y,oct=3,s=0){ let a=0, amp=.5, f=1, n=0; for(let o=0;o<oct;o++){ const v=1-Math.abs(vnoise(x*f,y*f,s+o*31)*2-1); a+=amp*v*v; n+=amp; amp*=.5; f*=2.1; } return a/n; }
const sstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// nearest point on a polyline: distance and arc length along it
function polyNear(px,py,pts,cum){
  let best=1e9, bs=0;
  for(let i=0;i<pts.length-1;i++){
    const ax=pts[i][0], ay=pts[i][1], dx=pts[i+1][0]-ax, dy=pts[i+1][1]-ay, l2=dx*dx+dy*dy;
    let t=l2?((px-ax)*dx+(py-ay)*dy)/l2:0; t=t<0?0:t>1?1:t;
    const qx=ax+dx*t-px, qy=ay+dy*t-py, d=qx*qx+qy*qy;
    if(d<best){ best=d; bs=cum[i]+t*Math.sqrt(l2); }
  }
  return { d:Math.sqrt(best), s:bs };
}
function cumOf(pts){ const c=[0]; for(let i=1;i<pts.length;i++) c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])); return c; }
// Catmull-Rom through control points, sampled every `step`; remembers which sample each control point landed on
function splineSample(ctrl,step){
  const P=[ctrl[0],...ctrl,ctrl[ctrl.length-1]], out=[], at=[0];
  for(let i=1;i<P.length-2;i++){
    const p0=P[i-1], p1=P[i], p2=P[i+1], p3=P[i+2], L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]), m=Math.max(1,Math.ceil(L/step));
    for(let k=0;k<m;k++){ const t=k/m, t2=t*t, t3=t2*t;
      const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]); }
    at.push(out.length);
  }
  out.push([ctrl[ctrl.length-1][0],ctrl[ctrl.length-1][1]]); at[at.length-1]=out.length-1;
  return { pts:out, at };
}
function resamplePoly(pts,step){
  const cum=cumOf(pts), L=cum[cum.length-1], n=Math.max(1,Math.round(L/step)), out=[]; let i=0;
  for(let k=0;k<=n;k++){ const s=L*k/n; while(i<pts.length-2 && cum[i+1]<s) i++; const t=(s-cum[i])/((cum[i+1]-cum[i])||1);
    out.push([Math.round(pts[i][0]+(pts[i+1][0]-pts[i][0])*t), Math.round(pts[i][1]+(pts[i+1][1]-pts[i][1])*t)]); }
  return out;
}
// road = pieces of control points [x,y,pinnedHeight?]; a gap between pieces is a link (bridge) that is not carved
function roadPieces(road){ return road.pieces.map(ctrl=>{ const sp=splineSample(ctrl,6); sp.ctrl=ctrl; return sp; }); }
function roadPolyline(road,step=40){ // the lane the simulation walks: every piece resampled, joined straight across link gaps
  const out=[]; for(const sp of roadPieces(road)){ const r=resamplePoly(sp.pts,step); if(out.length) r[0]=r[0]; out.push(...r); } return out;
}

function generateHF(def){
  const TW=Math.round(def.w/HTS)+1, TH=Math.round(def.h/HTS)+1, N=TW*TH, hf=new Float32Array(N), rough=new Uint8Array(N);   // rough = mountain ground nobody walks
  const ranges=def.ranges.map(r=>({...r, cum:cumOf(r.pts), len:0})); for(const r of ranges) r.len=r.cum[r.cum.length-1];
  const mesas=def.mesas.map(m=>({...m, cum:cumOf(m.pts)}));
  const rv=def.river, riverAt=y=>def.w/2+(y-def.h/2)*(rv.tilt||0)+rv.amp*Math.sin((y-def.h/2)/rv.period);   // v11: tilt lets the river run diagonally
  const bedAt=y=>{ for(const f of (def.fords||[])) if(y>=f[0]&&y<=f[1]) return f[2]??-9; return def.gorge.bed; };   // v11: fords have a shallow gravel bed
  const S=def.seed||7;
  // ---- natural terrain ----
  for(let j=0;j<TH;j++) for(let i=0;i<TW;i++){
    const x=i*HTS, y=j*HTS;
    let h=def.base+fbm(x/420,y/420,4,S)*def.roll+fbm(x/95,y/95,2,S+5)*def.bump;
    // domain warp so ranges and hills don't look drawn with a ruler
    const wx=x+fbm(x/300,y/300,3,S+9)*95, wy=y+fbm(x/300+40,y/300,3,S+11)*95;
    let m=h;
    for(const r of ranges){
      const q=polyNear(wx,wy,r.pts,r.cum), W2=r.w*1.9; if(q.d>=W2) continue;
      const rw=r.w*(0.74+0.5*vnoise(q.s/260,r.pts[0][1]*0.011,S+71));               // the range bulges and narrows along its length
      const apron=r.H*0.09*sstep(1-q.d/W2);                                           // foothills well out from the range
      if(q.d>=rw){ m=Math.max(m,h+apron); continue; }
      const t=1-q.d/rw, mask=sstep(t), crest=Math.pow(t,r.p||1.6);
      if(t>(r.walk??0.3)) rough[j*TW+i]=1;
      const along=0.68+0.6*vnoise(q.s/(r.lump||230),r.pts[0][0]*0.013+r.pts[0][1]*0.007,S+21);   // summits and saddles along the crest
      const R=ridged(x/(r.crag||200),y/(r.crag||200),4,S+33);                          // branching spurs and gullies
      const top=r.H*along*(0.46*crest+0.62*Math.pow(mask,1.25)*R);
      m=Math.max(m,h+apron+top);
    }
    for(const k of def.hills){ const d=Math.hypot(wx-k.x,wy-k.y); if(d>=k.r) continue; const prof=sstep(1-d/k.r); m=Math.max(m,h+k.H*prof*(0.9+0.2*ridged(x/120,y/120,2,S+41))); }
    for(const me of mesas){ // flat-topped lookout ridges with steep sides
      const q=polyNear(x+(wx-x)*.45,y+(wy-y)*.45,me.pts,me.cum), mw=me.w*(0.8+0.45*vnoise(q.s/70,me.pts[0][0]*.01,S+57)); if(q.d>=mw+me.edge) continue;
      const top=me.top+fbm(x/60,y/60,2,S+51)*2.5;
      const v=q.d<=mw?top:h+(top-h)*Math.pow(sstep(1-(q.d-mw)/me.edge),0.7)*(0.92+0.16*vnoise(x/40,y/40,S+53));
      m=Math.max(m,v);
    }
    // the gorge: a flat floor either side of the river, then steep jagged walls
    const dr=Math.abs(x-riverAt(y)), g=def.gorge;
    const wall=g.floor+Math.max(0,dr-g.fw)*g.slope*(0.75+0.5*vnoise(x/50,y/50,S+61));
    if(wall<m){ if(dr>g.fw+2 && m-wall>4) rough[j*TW+i]=1; m=wall; }   // gorge walls are cliffs
    if(dr<rv.half+4){ const t=sstep((rv.half+4-dr)/10); m=m+(bedAt(y)-m)*t; }
    hf[j*TW+i]=m;
  }
  const sym=()=>{ for(let k=0;k<N/2;k++){ hf[N-1-k]=hf[k]; rough[N-1-k]=rough[k]; } };
  sym();                                  // symmetric ground first, so mirrored roads get mirrored profiles
  const H=(x,y)=>{ const fx=hclamp(x/HTS,0,TW-1.001), fy=hclamp(y/HTS,0,TH-1.001), i=fx|0, j=fy|0, u=fx-i, v=fy-j, k=j*TW+i; return hf[k]*(1-u)*(1-v)+hf[k+1]*u*(1-v)+hf[k+TW]*(1-u)*v+hf[k+TW+1]*u*v; };
  // ---- flat pads (keep bastions, tower plinths, camps) ----
  const pad=p=>{ const h0=p.h??H(p.x,p.y), R=p.r+(p.edge??24);
    for(let j=Math.max(0,Math.floor((p.y-R)/HTS));j<=Math.min(TH-1,Math.ceil((p.y+R)/HTS));j++) for(let i=Math.max(0,Math.floor((p.x-R)/HTS));i<=Math.min(TW-1,Math.ceil((p.x+R)/HTS));i++){
      const d=Math.hypot(i*HTS-p.x,j*HTS-p.y); if(d>=R) continue; const k=j*TW+i; if(d<p.r+4) rough[k]=0; const t=d<=p.r?0:sstep((d-p.r)/(p.edge??24)); hf[k]=h0+(hf[k]-h0)*t; } };
  for(const p of def.pads.filter(p=>p.early)) pad(p);
  sym();
  // ---- roads: grade-limited profiles carved into the ground ----
  const roadsOut=[], lock=new Uint8Array(N), lockNext=[];
  for(const road of def.roads){
    const pieces=roadPieces(road), w=road.w, sh=road.sh??26, g=road.grade??0.24, samples=[];
    for(const sp of pieces){
      const pts=sp.pts, n=pts.length, cum=cumOf(pts), nat=pts.map(([x,y])=>H(x,y));
      const pins=new Map(); sp.ctrl.forEach((c,ci)=>{ if(c[2]!=null) pins.set(sp.at[ci],c[2]); });
      if(road.pinEnds!==false){ if(!pins.has(0)) pins.set(0,nat[0]); if(!pins.has(n-1)) pins.set(n-1,nat[n-1]); }
      let p=nat.map((_,k)=>{ let a=0,c=0; for(let d=-5;d<=5;d++){ const q=k+d; if(q<0||q>=n) continue; a+=nat[q]; c++; } return a/c; });
      for(let it=0;it<60;it++){
        for(const [k,v] of pins) p[k]=v;
        for(let k=1;k<n;k++){ if(pins.has(k)) continue; const lim=g*(cum[k]-cum[k-1]); p[k]=hclamp(p[k],p[k-1]-lim,p[k-1]+lim); }
        for(const [k,v] of pins) p[k]=v;
        for(let k=n-2;k>=0;k--){ if(pins.has(k)) continue; const lim=g*(cum[k+1]-cum[k]); p[k]=hclamp(p[k],p[k+1]-lim,p[k+1]+lim); }
      }
      for(const [k,v] of pins) p[k]=v;
      // gentle smoothing of the final profile, keeping the grade
      for(let it=0;it<3;it++){ const q=p.slice(); for(let k=1;k<n-1;k++) if(!pins.has(k)) q[k]=(p[k-1]+2*p[k]+p[k+1])/4; p=q; }
      pts.forEach(([x,y],k)=>samples.push({x,y,h:p[k]}));
      roadsOut.push({ name:road.name, kind:road.kind, pts, h:p, w });
    }
    // spatial hash of the samples, then carve every vertex near the road
    const C=32, grid=new Map(), key=(a,b)=>a*100003+b;
    for(const s of samples){ const k=key(Math.floor(s.x/C),Math.floor(s.y/C)); if(!grid.has(k)) grid.set(k,[]); grid.get(k).push(s); }
    const R=w+sh, rc=Math.ceil(R/C);
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const s of samples){ x0=Math.min(x0,s.x); y0=Math.min(y0,s.y); x1=Math.max(x1,s.x); y1=Math.max(y1,s.y); }
    const upd=[];
    for(let j=Math.max(0,Math.floor((y0-R)/HTS));j<=Math.min(TH-1,Math.ceil((y1+R)/HTS));j++) for(let i=Math.max(0,Math.floor((x0-R)/HTS));i<=Math.min(TW-1,Math.ceil((x1+R)/HTS));i++){
      const x=i*HTS, y=j*HTS, gx=Math.floor(x/C), gy=Math.floor(y/C); let bd=R*R, bs=null;
      for(let a=-rc;a<=rc;a++) for(let b=-rc;b<=rc;b++){ const l=grid.get(key(gx+a,gy+b)); if(!l) continue; for(const s of l){ const d=(s.x-x)**2+(s.y-y)**2; if(d<bd){ bd=d; bs=s; } } }
      if(!bs) continue;
      const d=Math.sqrt(bd), k=j*TW+i, t=d<=w?0:sstep((d-w)/sh); if(d<w+8) rough[k]=0;
      if(lock[k]) continue;                                 // a trail never reshapes the lane it joins
      upd.push(k, bs.h+(hf[k]-bs.h)*t); if(road.kind==='lane' && d<=w+2) lockNext.push(k);
    }
    for(let q=0;q<upd.length;q+=2) hf[upd[q]]=upd[q+1];
    for(const k of lockNext) lock[k]=1; lockNext.length=0;
  }
  for(const p of def.pads.filter(p=>!p.early)) pad(p);
  // the river channel is cut last so no road or pad fills it in (bridges carry units over)
  for(let j=0;j<TH;j++) for(let i=0;i<TW;i++){ const x=i*HTS, y=j*HTS, dr=Math.abs(x-riverAt(y)); if(dr<rv.half+4){ const k=j*TW+i, t=sstep((rv.half+4-dr)/10); hf[k]=Math.min(hf[k],hf[k]+(bedAt(y)-hf[k])*t); } }
  sym();                                  // exact point symmetry: copy the first half onto the second
  return { hf, rough, TW, TH, roads:roadsOut, H };
}

