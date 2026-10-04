// ===== v16 art pass: one look per army =====================================================================
// Human Knights: plate, tabards, kettle helms, horses, gold trim.      Elves: slim, pale green/silver, hoods, antlers, stags, crystal.
// Dwarves: short and wide, beards, bronze and rivets, rams, steam.     Orcs: green skin, tusks, crude iron, boars, red paint.
// Skeletal: bone, tattered purple, green grave-light, bone horses.    Trolls: hunched grey-green giants, moss, stone, goblins, bats.
const RACE_FX={ elfGlow:'#a8ffe0', dwarfBrass:'#c9963c', dwarfIron:'#8a8f96', orcIron:'#4a4d50', orcPaint:'#c8302a', boneLight:'#9dffc0', trollMoss:'#5d7a46', trollStone:'#8a8f86' };

// ---- race body helpers (all built on hum() so the walk/attack rig fits) ----
function dwarfHum(b,P,o={}){ hum(b,P,{ k:(o.k??1)*.82, beard:o.beard??P.hair, hair:o.hair??P.hair, skin:P.skin, pants:P.pants, boots:P.leather, ...o, k:(o.k??1)*.82 });
  const k=(o.k??1)*.82, X=o.x??0, y0=o.y0??baseY();   // a wider beard and a nose guard make the dwarf read at range
  add(b,GEO.box,o.beard??P.hair,X+.1*k,y0+1.1*k,0,.14*k,.3*k,.28*k); }
function orcHum(b,P,o={}){ const k=(o.k??1)*1.08, X=o.x??0, y0=o.y0??baseY();
  hum(b,P,{ skin:P.skin, eyes:P.eye, tabard:false, pants:P.pants, boots:P.leather, hair:null, ...o, k });
  for(const s of [-1,1]) add(b,GEO.cone6,C.bone,X+.17*k,y0+1.3*k,s*.06*k,.025*k,.1*k,.025*k,0,0,0);   // tusks
  add(b,GEO.box,RACE_FX.orcPaint,X+.17*k,y0+1.37*k,0,.01*k,.02*k,.2*k);                                  // war paint across the eyes
  if(!o.helm) add(b,GEO.cone,P.hair,X-.03*k,y0+1.56*k,0,.06*k,.22*k,.06*k,0,0,.3);                       // topknot
}
function goblinHum(b,P,o={}){ const k=(o.k??1)*.6, X=o.x??0, y0=o.y0??baseY();
  hum(b,P,{ skin:'#8aa44a', eyes:'#ffe27a', tabard:false, pants:'#4a3a28', boots:'#3a2a1e', hair:null, ...o, k });
  for(const s of [-1,1]) add(b,GEO.cone4,'#8aa44a',X-.02*k,y0+1.38*k,s*.24*k,.04*k,.22*k,.1*k,s*1.2,0,0);   // big ears
  add(b,GEO.cone,'#8aa44a',X+.2*k,y0+1.3*k,0,.03*k,.14*k,.03*k,0,0,-Math.PI/2-.3);                            // long nose
}
function skeletonHum(b,P,o={}){ const k=o.k??1, X=o.x??0, y0=o.y0??baseY(), bn=C.bone;
  hum(b,P,{ skin:bn, eyes:RACE_FX.boneLight, tabard:false, tunic:bn, pants:'#2e2636', boots:bn, gloves:bn, hair:null, noEyes:false, ...o, k });
  for(let i=0;i<3;i++) add(b,GEO.torus,'#2e2636',X+.02*k,y0+(.98-i*.1)*k,0,.2*k,.16*k,.2*k,Math.PI/2,0,0);        // dark gaps between the ribs
  add(b,GEO.box,'#3a2f44',X+.1*k,y0+.46*k,0,.3*k,.3*k,.36*k);                                                  // tattered skirt
  for(const s of [-1,1]) add(b,GEO.box,'#15121a',X+.17*k,y0+1.36*k,s*.055*k,.02*k,.05*k,.05*k);                   // hollow sockets
}
// hunched troll: big torso, long arms, short legs, underbite. k≈1 is a cave troll (≈1.6× a man); parts are tagged for the rig.
function trollBody(b,P,o={}){
  const k=o.k??1, X=o.x??0, y0=o.y0??baseY(), skin=o.skin??P.skin, dark=shade(skin,.78), moss=RACE_FX.trollMoss;
  const A=(geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(b,geo,col,X+x*k,y0+y*k,z*k,sx*k,sy*k,sz*k,rx,ry,rz), p=(x,y,z)=>V(X+x*k,y0+y*k,z*k);
  let i0;
  for(const s of [-1,1]){ i0=b.length; seg(b,GEO.cyl6,dark,p(0,.78,s*.2),p(.05,.42,s*.24),.13*k); A(GEO.sph6,dark,.05,.42,s*.24,.12,.12,.12); seg(b,GEO.cyl6,dark,p(.05,.42,s*.24),p(.02,.1,s*.24),.11*k);
    A(GEO.box,dark,.1,.07,s*.24,.36,.12,.24); for(const t of [-1,0,1]) A(GEO.cone6,C.bone,.29,.08,s*.24+t*.07,.03,.08,.03,0,0,-Math.PI/2); tag(b,i0,s<0?PART.LEGL:PART.LEGR,X,y0+.78*k,s*.2*k); }
  A(GEO.box,o.loin??P.leather,.0,.72,0,.42,.22,.52); A(GEO.box,shade(o.loin??P.leather,.8),.2,.6,0,.05,.3,.28);
  A(GEO.sph,skin,-.05,1.2,0,.46,.5,.44); A(GEO.sph,shade(skin,1.08),.1,1.06,0,.4,.34,.38);                     // torso, belly
  A(GEO.sph,moss,-.32,1.45,0,.26,.12,.34); A(GEO.sph,moss,-.22,1.55,.16,.1,.07,.12);                           // moss on the back
  if(o.harness){ A(GEO.box,o.harness,0,1.3,0,.5,.08,.6); A(GEO.box,o.harness,0,1.12,0,.48,.06,.58); for(const s of [-1,1]) A(GEO.box,C.iron,.26,1.21,s*.26,.06,.14,.06); }
  for(const s of [-1,1]){ i0=b.length; A(GEO.sph,skin,-.05,1.5,s*.46,.17,.15,.17); seg(b,GEO.cyl6,skin,p(-.05,1.5,s*.46),p(.15,1.1,s*.58),.1*k); A(GEO.sph6,skin,.15,1.1,s*.58,.1,.1,.1);
    seg(b,GEO.cyl6,skin,p(.15,1.1,s*.58),p(.36,.72,s*.56),.09*k); A(GEO.box,dark,.4,.66,s*.56,.18,.14,.16); for(const t of [-1,0,1]) A(GEO.cone6,C.bone,.5,.62,s*.56+t*.05,.02,.07,.02,0,0,-Math.PI/2);
    tag(b,i0,s<0?PART.ARML:PART.ARMR,X-.05*k,y0+1.5*k,s*.46*k); }
  i0=b.length; A(GEO.cyl6,skin,.12,1.6,0,.12,.12,.12); A(GEO.sph,skin,.22,1.74,0,.27,.24,.25); A(GEO.box,shade(skin,.92),.34,1.6,0,.26,.1,.28);   // neck, head, jaw (underbite)
  for(const s of [-1,1]){ A(GEO.cone6,C.bone,.44,1.68,s*.09,.025,.09,.025); A(GEO.box,P.eye,.46,1.78,s*.08,.03,.03,.03); A(GEO.cone4,skin,.06,1.84,s*.24,.05,.16,.08,s*.9,0,0); }
  A(GEO.cone,skin,.49,1.74,0,.04,.1,.04,0,0,-Math.PI/2-.3); A(GEO.sph6,moss,.12,1.95,0,.12,.06,.12);
  if(o.helm==='iron'){ A(GEO.sph,RACE_FX.orcIron,.2,1.84,0,.28,.16,.27); for(let i=0;i<4;i++) A(GEO.box,C.iron,.2+Math.cos(i*1.57)*.25,1.84,Math.sin(i*1.57)*.25,.05,.05,.05); }
  tag(b,i0,PART.HEAD,X+.15*k,y0+1.58*k,0);
}
// mounts
function stag(b,P,o={}){ const i0=b.length, k=o.k??1, y0=o.y0??baseY(); horse(b,P,{ ...o, coat:o.coat??'#b89a78', dark:o.dark??'#7a6048', mane:'#e8dcc8' });
  const X=o.x??0; if(X) shiftParts(b,i0,X,0,0);
  for(const s of [-1,1]){ const ax=X+.74*k, ay=y0+1.42*k, az=s*.08*k; seg(b,GEO.cyl6,C.bone,V(ax,ay,az),V(ax-.18*k,ay+.34*k,az+s*.2*k),.025*k); seg(b,GEO.cyl6,C.bone,V(ax-.1*k,ay+.18*k,az+s*.1*k),V(ax+.08*k,ay+.34*k,az+s*.22*k),.02*k); seg(b,GEO.cyl6,C.bone,V(ax-.18*k,ay+.34*k,az+s*.2*k),V(ax-.2*k,ay+.5*k,az+s*.12*k),.018*k); seg(b,GEO.cyl6,C.bone,V(ax-.18*k,ay+.34*k,az+s*.2*k),V(ax-.06*k,ay+.46*k,az+s*.3*k),.016*k); } }
function ram(b,P,o={}){ const y0=o.y0??baseY(), k=o.k??1, X=o.x??0, wool='#d9d2c2', face='#6a5a4a';
  const A=(geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(b,geo,col,X+x*k,y0+y*k,z*k,sx*k,sy*k,sz*k,rx,ry,rz), p=(x,y,z)=>V(X+x*k,y0+y*k,z*k);
  A(GEO.sph,wool,0,.74,0,.6,.36,.34); A(GEO.sph,wool,-.3,.78,0,.3,.32,.3); A(GEO.sph,shade(wool,.9),.3,.72,0,.3,.3,.28);
  let i0=b.length; A(GEO.sph,face,.58,.84,0,.2,.18,.17); A(GEO.box,face,.74,.78,0,.18,.12,.13); A(GEO.box,'#1a1416',.84,.76,0,.04,.04,.06);
  for(const s of [-1,1]){ A(GEO.torus,C.bone,.5,.92,s*.17,.14,.14,.16,0,0,s*.3); A(GEO.box,'#1a1416',.7,.88,s*.08,.02,.03,.03); A(GEO.cone4,face,.5,.98,s*.12,.04,.1,.04,s*.6,0,0); }
  tag(b,i0,PART.HEAD,X+.5*k,y0+.8*k,0);
  for(const [x,z] of [[.3,.12],[.3,-.12],[-.3,.12],[-.3,-.12]]){ i0=b.length; seg(b,GEO.cyl6,face,p(x,.58,z),p(x+.02,.3,z),.055*k); seg(b,GEO.cyl6,face,p(x+.02,.3,z),p(x+.03,.06,z),.045*k); A(GEO.box,'#2a2420',x+.04,.04,z,.09,.06,.08); tag(b,i0,x>0?(z>0?PART.MFR:PART.MFL):(z>0?PART.MBR:PART.MBL),X+x*k,y0+.58*k,z*k); }
  A(GEO.box,o.saddle??P.body,0,1.02,0,.36,.06,.5); A(GEO.box,P.rim,0,.99,0,.38,.02,.52);
}
function boar(b,P,o={}){ const y0=o.y0??baseY(), k=o.k??1, X=o.x??0, hide=o.hide??'#5a4538', dark=shade(hide,.7), bristle='#2a2220';
  const A=(geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(b,geo,col,X+x*k,y0+y*k,z*k,sx*k,sy*k,sz*k,rx,ry,rz), p=(x,y,z)=>V(X+x*k,y0+y*k,z*k);
  A(GEO.sph,hide,0,.66,0,.68,.4,.4); A(GEO.sph,dark,.06,.5,0,.58,.22,.34); for(let i=0;i<5;i++) A(GEO.cone4,bristle,-.4+i*.18,1.02,0,.06,.14,.05,0,0,-.2);
  let i0=b.length; A(GEO.sph,hide,.6,.72,0,.3,.28,.3); A(GEO.box,hide,.86,.6,0,.3,.2,.22,0,0,.2); A(GEO.box,'#2a1f1c',1.0,.56,0,.08,.1,.14);
  for(const s of [-1,1]){ A(GEO.cone6,C.bone,.92,.5,s*.1,.03,.2,.03,s*.4,0,-1.2); A(GEO.box,'#ffd24a',.82,.78,s*.1,.03,.03,.03); A(GEO.cone4,hide,.5,.96,s*.14,.06,.14,.05,s*.5,0,0); }
  tag(b,i0,PART.HEAD,X+.5*k,y0+.66*k,0);
  for(const [x,z] of [[.36,.16],[.36,-.16],[-.36,.16],[-.36,-.16]]){ i0=b.length; seg(b,GEO.cyl6,dark,p(x,.5,z),p(x+.02,.24,z),.07*k); seg(b,GEO.cyl6,dark,p(x+.02,.24,z),p(x+.03,.04,z),.055*k); A(GEO.box,'#2a2420',x+.04,.03,z,.1,.06,.09); tag(b,i0,x>0?(z>0?PART.MFR:PART.MFL):(z>0?PART.MBR:PART.MBL),X+x*k,y0+.5*k,z*k); }
  i0=b.length; seg(b,GEO.cyl6,dark,p(-.66,.74,0),p(-.86,.9,0),.03*k); tag(b,i0,PART.TAIL,X-.66*k,y0+.74*k,0);
  if(o.plates){ A(GEO.box,RACE_FX.orcIron,0,.92,0,.7,.1,.5); for(const s of [-1,1]) A(GEO.box,RACE_FX.orcIron,0,.74,s*.38,.6,.28,.05); A(GEO.box,RACE_FX.orcIron,.72,.82,0,.3,.14,.3); for(let i=0;i<4;i++) A(GEO.cone6,C.iron,-.3+i*.2,1.0,0,.03,.08,.03); }
  else { A(GEO.box,o.saddle??P.body,0,.92,0,.4,.06,.5); A(GEO.box,P.rim,0,.9,0,.42,.02,.52); }
}
function lizard(b,P,o={}){ const y0=o.y0??baseY(), k=o.k??1, X=o.x??0, hide=o.hide??'#5f7a3a', belly='#a8b07a';
  const A=(geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(b,geo,col,X+x*k,y0+y*k,z*k,sx*k,sy*k,sz*k,rx,ry,rz), p=(x,y,z)=>V(X+x*k,y0+y*k,z*k);
  A(GEO.sph,hide,0,.4,0,.7,.26,.3); A(GEO.sph,belly,.02,.3,0,.6,.14,.26); for(let i=0;i<6;i++) A(GEO.cone4,shade(hide,.7),-.5+i*.2,.64,0,.05,.12,.04);
  let i0=b.length; seg(b,GEO.cyl,hide,p(.6,.42,0),p(.9,.5,0),.12*k); A(GEO.box,hide,1.08,.5,0,.36,.16,.22); for(const s of [-1,1]){ A(GEO.box,'#ffe27a',1.12,.6,s*.09,.04,.04,.02); A(GEO.cone6,C.bone,1.2,.44,s*.08,.015,.06,.015,0,0,-1.6); } tag(b,i0,PART.HEAD,X+.6*k,y0+.42*k,0);
  for(const [x,z] of [[.4,.24],[.4,-.24],[-.4,.24],[-.4,-.24]]){ i0=b.length; seg(b,GEO.cyl6,hide,p(x,.34,z),p(x+.1,.2,z*1.4),.06*k); seg(b,GEO.cyl6,hide,p(x+.1,.2,z*1.4),p(x+.16,.03,z*1.5),.05*k); A(GEO.box,shade(hide,.7),x+.2,.03,z*1.5,.14,.05,.1); tag(b,i0,x>0?(z>0?PART.MFR:PART.MFL):(z>0?PART.MBR:PART.MBL),X+x*k,y0+.34*k,z*k); }
  i0=b.length; seg(b,GEO.cone6,hide,p(-.68,.4,0),p(-1.5,.3,0),.12*k); tag(b,i0,PART.TAIL,X-.68*k,y0+.4*k,0);
  A(GEO.box,o.saddle??P.body,0,.66,0,.36,.05,.4); A(GEO.box,P.rim,0,.64,0,.38,.02,.42);
}
function batBody(b,P,o={}){ const k=o.k??1, fur=o.fur??'#4a3a44', dark=shade(fur,.7);
  add(b,GEO.sph,fur,0,0,0,.42*k,.26*k,.3*k); add(b,GEO.sph,dark,.05*k,-.08*k,0,.34*k,.16*k,.24*k);
  let i0=b.length; add(b,GEO.sph,fur,.42*k,.1*k,0,.2*k,.2*k,.2*k); add(b,GEO.box,'#2a1f24',.58*k,.04*k,0,.12*k,.08*k,.1*k);
  for(const s of [-1,1]){ add(b,GEO.cone4,fur,.36*k,.3*k,s*.1*k,.06*k,.22*k,.05*k,s*.3,0,0); add(b,GEO.box,'#ff6a4a',.56*k,.14*k,s*.07*k,.03*k,.03*k,.03*k); add(b,GEO.cone6,C.bone,.6*k,-.02*k,s*.04*k,.012*k,.06*k,.012*k,Math.PI,0,0); }
  tag(b,i0,PART.HEAD,.3*k,.05*k,0);
  for(const s of [-1,1]) membraneWing(b,s,o.wing??'#2e2430',dark,o.span??1.1,k,-.05,.08);
  for(const s of [-1,1]) seg(b,GEO.cyl6,dark,V(-.2*k,-.14*k,s*.12*k),V(-.26*k,-.36*k,s*.14*k),.03*k);
  add(b,GEO.box,o.saddle??P.body,0,.2*k,0,.3*k,.05*k,.34*k);
}
function treantBody(b,P,o={}){ const k=o.k??1, X=o.x??0, y0=o.y0??baseY(), bark='#5a4632', barkD='#3e3022', leaf='#4f8a4a', leafL='#7fb86a';
  const A=(geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(b,geo,col,X+x*k,y0+y*k,z*k,sx*k,sy*k,sz*k,rx,ry,rz), p=(x,y,z)=>V(X+x*k,y0+y*k,z*k);
  let i0;
  for(const s of [-1,1]){ i0=b.length; seg(b,GEO.cyl6,barkD,p(0,.7,s*.2),p(.06,.3,s*.26),.12*k); seg(b,GEO.cyl6,barkD,p(.06,.3,s*.26),p(.02,.04,s*.28),.1*k); for(const t of [-1,0,1]) A(GEO.cone6,barkD,.14,.03,s*.28+t*.1,.04,.12,.04,0,0,-Math.PI/2); tag(b,i0,s<0?PART.LEGL:PART.LEGR,X,y0+.7*k,s*.2*k); }
  A(GEO.taper,bark,0,1.1,0,.36,.9,.34); for(let i=0;i<5;i++) A(GEO.box,barkD,.26+Math.cos(i*1.3)*.08,.7+i*.22,Math.sin(i*1.3)*.28,.08,.2,.07,0,-i*1.3,0); A(GEO.box,shade(bark,1.15),-.1,1.5,.3,.12,.26,.08);
  for(const s of [-1,1]){ i0=b.length; seg(b,GEO.cyl6,bark,p(0,1.4,s*.3),p(.18,1.0,s*.6),.09*k); seg(b,GEO.cyl6,bark,p(.18,1.0,s*.6),p(.5,.7,s*.62),.07*k); for(const t of [-1,0,1]) seg(b,GEO.cyl6,barkD,p(.5,.7,s*.62),p(.68,.56+t*.1,s*.62+t*.06),.03*k); tag(b,i0,s<0?PART.ARML:PART.ARMR,X,y0+1.4*k,s*.3*k); }
  i0=b.length; A(GEO.sph,bark,.06,1.72,0,.26,.22,.24); A(GEO.box,'#1a2418',.3,1.72,0,.03,.1,.26); for(const s of [-1,1]) A(GEO.box,RACE_FX.elfGlow,.31,1.74,s*.08,.02,.04,.04);
  A(GEO.ico,leaf,-.05,2.02,0,.42,.3,.42); A(GEO.ico,leafL,.14,2.16,.12,.28,.22,.3); A(GEO.ico,leaf,-.22,2.1,-.18,.3,.24,.3); A(GEO.ico,leafL,-.1,2.3,.05,.22,.18,.22); A(GEO.box,barkD,.0,1.9,.0,.3,.14,.3); for(let i=0;i<5;i++) A(GEO.cone6,barkD,-.3+i*.15,1.95,(i%2?.2:-.2),.03,.3,.03,0,0,(i-2)*.2);
  tag(b,i0,PART.HEAD,X,y0+1.6*k,0);
  if(o.banner){ A(GEO.cyl6,barkD,-.3,2.3,0,.02,.8,.02); A(GEO.box,P.body,-.2,2.55,0,.26,.26,.02); }
}

const MODELS16={
  // ================= Human Knights (Holts) =================
  swornGuard(b,P){ base(b,P,1); hum(b,P,{ helm:'kettle', armour:P.steelD, shield:'tower', weapon:'sword', tabard:P.body, crest:'cross', pants:P.steelD, boots:P.steelD, gloves:P.steelD }); },
  pegasus(b,P){ const i0=b.length; horse(b,P,{ y0:-.9, coat:'#f4f0e8', dark:'#d8d2c6', mane:'#e8dcc8', barding:P.body, trim:P.rim }); shiftParts(b,i0,-.2,.2,0);
    for(const s of [-1,1]) featherWing(b,s,'#f6f3ec',P.body,1.3,.35,-.1,1);
    hum(b,P,{ y0:.46, x:-.15, k:.66, mounted:true, helm:'great', plume:P.body, armour:P.steel, tabard:P.body, weapon:'lance', pennant:P.body, cape:P.body, rh:[.2,.9,.24], lh:[.2,.9,-.24] }); },
  guardWagon(b,P){ base(b,P,2,1.1); wagon(b,P,{ puller:'ox' }); const y0=baseY();
    add(b,GEO.half,C.canvas,-.12,y0+.62,0,.36,1.1,.36,0,0,Math.PI/2); for(const x of [-.55,-.12,.31]) add(b,GEO.torus,P.body,x,y0+.62,0,.37,.37,.3,0,Math.PI/2,0);
    for(const s of [-1,1]) for(const x of [-.5,-.1,.3]){ add(b,GEO.box,P.rim,x,y0+.6,s*.37,.2,.3,.04); add(b,GEO.box,P.body,x,y0+.6,s*.39,.14,.22,.02); emblem(b,'cross',P,x,y0+.6,s*.405,.08); }
    add(b,GEO.cone6,P.steel,-.7,y0+1.1,0,.05,.4,.05); add(b,GEO.box,P.body,-.64,y0+1.2,0,.16,.1,.02); },
  arbalest(b,P){ base(b,P,3,1.1); const y0=baseY();
    add(b,GEO.box,C.wood,-.25,y0+.36,0,.9,.14,.36,0,0,.1); for(const s of [-1,1]) wheel(b,-.05,y0+.42,s*.32,.4,C.wheel,C.gold);
    add(b,GEO.box,C.woodD,-.3,y0+.6,0,.14,.4,.14); add(b,GEO.box,C.wood,.2,y0+.84,0,1.3,.12,.14,0,0,.12);
    { const i0=b.length; add(b,GEO.arc,P.steelD,.55,y0+.9,0,.72,.72,.9,0,0,Math.PI/2+.12); seg(b,GEO.cyl6,'#e8e2d0',V(.5,y0+1.0,.72),V(.5,y0+1.0,-.72),.008); add(b,GEO.box,P.steel,.2,y0+.92,0,1.4,.04,.04,0,0,.12); add(b,GEO.cone6,P.steel,.92,y0+1.02,0,.06,.16,.06,0,0,-1.45); tag(b,i0,PART.RECOIL,0,0,0); }
    add(b,GEO.cyl6,C.iron,-.55,y0+.78,0,.12,.16,.12,Math.PI/2,0,0); for(let i=0;i<6;i++){ const a=i*TAU/6; add(b,GEO.box,C.woodD,-.55+Math.cos(a)*.14,y0+.78+Math.sin(a)*.14,0,.1,.03,.03,0,0,a); }
    hum(b,P,{ x:-.78, k:.62, helm:'kettle', tabard:P.body, crest:'cross', weapon:null, rh:[.3,.9,.18], lh:[.3,.9,-.18] }); },
  paladinLord(b,P){ base(b,P,4,1.2); hum(b,P,{ k:1.25, armour:P.steel, helm:'great', plume:C.gold, shield:'tower', weapon:null, tabard:P.body, crest:'sun', cape:P.body, pants:P.steelD, boots:P.steelD, gloves:P.steelD, pauldron:C.gold, rh:[.3,.9,.3], lh:[.2,.82,-.3] });
    const k=1.25, y0=baseY(), hx=.3*k, hy=y0+.9*k, hz=.3*k;   // warhammer
    seg(b,GEO.cyl6,C.woodD,V(hx,hy-.4*k,hz),V(hx+.1*k,hy+.7*k,hz),.03*k); add(b,GEO.box,P.steel,hx+.1*k,hy+.72*k,hz,.5*k,.2*k,.2*k); add(b,GEO.cone6,P.steel,hx+.42*k,hy+.72*k,hz,.08*k,.2*k,.08*k,0,0,-Math.PI/2); add(b,GEO.box,C.gold,hx+.1*k,hy+.72*k,hz,.52*k,.06*k,.06*k);
    for(let i=0;i<8;i++){ const a=i*TAU/8; add(b,GEO.box,C.gold,-.04*k,y0+1.72*k+Math.sin(a)*.2*k,Math.cos(a)*.2*k,.02*k,.06*k,.03*k,a,0,0); }   // halo
    add(b,GEO.ring,C.gold,-.04*k,y0+1.72*k,0,.2*k,.2*k,.2*k,0,Math.PI/2,0); },
  // ================= Elven Army (Kyndrili) =================
  stagRider(b,P){ base(b,P,1,1.05); stag(b,P,{}); hum(b,P,{ y0:baseY()+.5, x:-.02, k:.7, mounted:true, helm:'hood', hood:'#3d5a3a', weapon:'spear', tip:P.steel, tunic:'#4b6a44', tabard:P.body, cape:'#3d5a3a', pants:'#3e5a46', skin:P.skin, hair:P.hair, rh:[.2,.92,.26], lh:[.25,.95,-.2] }); },
  treant(b,P){ base(b,P,1,1.05); treantBody(b,P,{ k:1.15, banner:true }); },
  gladeWagon(b,P){ base(b,P,2,1.1); { const i0=b.length; wagon(b,P,{ puller:'none', side:'#5d6b4a', bed:'#6f7f58' }); } stag(b,P,{ x:.95, k:.62, saddle:P.body }); const y0=baseY();
    add(b,GEO.sph,'#4f8a4a',-.12,y0+.84,0,.62,.3,.4); add(b,GEO.sph,'#7fb86a',-.3,y0+.98,.1,.3,.2,.3); for(const x of [-.5,.2]) add(b,GEO.cyl6,'#5a4632',x,y0+.7,0,.03,.4,.03);
    for(let i=0;i<4;i++) add(b,GEO.sph6,RACE_FX.elfGlow,-.4+i*.22,y0+1.05,(i%2?.18:-.18),.04,.04,.04); },
  elfGriffon(b,P){ griffonBody(b,P,{ coat:'#e6dcc8', head:'#f8f6f0', wing:'#f6f9f8', tip:'#bfe6ff', barding:P.body });
    hum(b,P,{ y0:.2-.62*.62, x:.02, k:.62, mounted:true, helm:'hood', hood:'#3d5a3a', weapon:'bow', tunic:'#4b6a44', tabard:P.body, cape:'#3d5a3a', lh:[.34,1.0,-.1], rh:[.02,1.06,.1] }); },
  starweaver(b,P){ base(b,P,2); hum(b,P,{ robe:'#c9dcd0', trim:'#3a86c8', stole:P.body, weapon:'staff', staffHead:'crystal', glow:RACE_FX.elfGlow, hair:P.hair, skin:P.skin, cape:'#3d5a3a', rh:[.2,.95,.28], lh:[.22,.95,-.18] });
    const y0=baseY(); for(const s of [-1,1]){ seg(b,GEO.cyl6,C.bone,V(.02,y0+1.5,s*.1),V(-.1,y0+1.78,s*.22),.015); seg(b,GEO.cyl6,C.bone,V(-.05,y0+1.64,s*.16),V(.06,y0+1.8,s*.26),.012); }   // antler circlet
    for(let i=0;i<5;i++){ const a=i*TAU/5; add(b,GEO.ico,RACE_FX.elfGlow,.1+Math.cos(a)*.3,y0+1.0+Math.sin(a*1.3)*.25,Math.sin(a)*.3,.04,.06,.04); } },
  thornbow(b,P){ base(b,P,3,1.1); wagon(b,P,{ puller:'none', side:'#5d6b4a', bed:'#6f7f58' }); const y0=baseY();
    add(b,GEO.cyl6,'#5a4632',-.1,y0+.72,0,.1,.36,.1); add(b,GEO.box,'#5a4632',.1,y0+.95,0,.6,.08,.7,0,0,.4);
    for(const z of [-.24,0,.24]){ const i0=b.length; add(b,GEO.arc,'#5a4632',.3,y0+1.02,z,.36,.36,.5,0,0,Math.PI/2+.4); seg(b,GEO.cyl6,'#e8e2d0',V(.26,y0+1.1,z+.36),V(.26,y0+1.1,z-.36),.005); add(b,GEO.cone6,'#5a4632',.5,y0+1.16,z,.02,.2,.02,0,0,-1.15); if(z===0) tag(b,i0,PART.RECOIL,0,0,0); }
    for(let i=0;i<6;i++) add(b,GEO.cone6,'#4f8a4a',-.1+Math.cos(i)*.12,y0+1.0+i*.04,Math.sin(i)*.12,.02,.1,.02,0,0,(i-3)*.3);
    hum(b,P,{ y0:y0+.46, x:-.5, k:.6, helm:'hood', hood:'#3d5a3a', tunic:'#4b6a44', tabard:P.body, weapon:null, rh:[.3,.9,.18], lh:[.3,.9,-.18] }); },
  moonhawk(b,P){ griffonBody(b,P,{ k:1.15, coat:'#f0ebe0', head:'#ffffff', wing:'#f8fbff', tip:'#9fd8ff', barding:P.body, span:1.25 });
    hum(b,P,{ y0:.2-.62*.7, x:.02, k:.7, mounted:true, helm:'great', plume:'#bfe6ff', armour:P.steel, tabard:P.body, weapon:'lance', lanceColor:'#dfe9ef', pennant:P.body, cape:'#e8f1e4', rh:[.2,.9,.24], lh:[.2,.9,-.24] });
    add(b,GEO.arc,'#dfe9ef',-.25,.9,0,.18,.18,.3,0,Math.PI/2,0); },   // crescent standard
  crystalChariot(b,P){ base(b,P,4,1.25); const y0=baseY();
    add(b,GEO.box,'#dfe9ef',-.25,y0+.5,0,.66,.12,.7); add(b,GEO.box,P.body,-.02,y0+.74,0,.08,.46,.7); for(const s of [-1,1]) add(b,GEO.box,P.body,-.25,y0+.68,s*.35,.66,.34,.04);
    for(const s of [-1,1]) wheel(b,-.3,y0+.4,s*.44,.4,'#9fb8c8',C.gold);
    for(const s of [-1,1]){ const i0=b.length; stag(b,P,{ y0, k:.6, x:.66, saddle:P.body }); shiftParts(b,i0,0,0,s*.22); }   // two stags
    add(b,GEO.ico,RACE_FX.elfGlow,-.3,y0+1.25,0,.26,.42,.26); add(b,GEO.ico,'#dfe9ef',-.3,y0+1.0,0,.18,.26,.18); for(let i=0;i<4;i++) add(b,GEO.ico,RACE_FX.elfGlow,-.3+Math.cos(i*1.57)*.32,y0+1.1,Math.sin(i*1.57)*.32,.06,.1,.06);
    hum(b,P,{ y0:y0+.55, x:-.35, k:.62, helm:'hood', hood:'#e8f1e4', armour:P.steel, tabard:P.body, weapon:null, cape:'#e8f1e4', rh:[.35,.9,.2], lh:[.35,.9,-.2] }); },
  // ================= Dwarven Army (Borvik) =================
  axeDwarf(b,P){ base(b,P,1); dwarfHum(b,P,{ helm:'kettle', helmColor:RACE_FX.dwarfBrass, weapon:'mace', maceHead:RACE_FX.dwarfIron, shield:'round', shieldColor:P.body, shieldRim:RACE_FX.dwarfBrass, tabard:P.body, armour:P.steelD }); },
  sapper(b,P){ base(b,P,1); dwarfHum(b,P,{ helm:'kettle', helmColor:RACE_FX.dwarfIron, weapon:null, tabard:P.body, armour:P.steelD, rh:[.26,.86,.24], lh:[.26,.86,-.24] });
    const k=.82, y0=baseY(); seg(b,GEO.cyl,C.bronze,V(.26*k,y0+.7*k,0),V(.5*k,y0+1.3*k,0),.08*k); add(b,GEO.cyl,shade(C.bronze,.7),.26*k,y0+.68*k,0,.1*k,.06*k,.1*k);   // hand mortar
    add(b,GEO.sph6,C.flame,.02*k,y0+1.58*k,.0,.05*k,.05*k,.05*k); add(b,GEO.box,RACE_FX.dwarfBrass,.0,y0+1.52*k,0,.1*k,.06*k,.1*k);   // helmet lamp
    add(b,GEO.box,C.woodD,-.22*k,y0+.9*k,0,.16*k,.3*k,.3*k); add(b,GEO.cyl6,C.bronze,-.22*k,y0+1.1*k,.08*k,.04*k,.1*k,.04*k); },   // powder pack
  ramRider(b,P){ base(b,P,1,1.05); ram(b,P,{ saddle:P.body }); dwarfHum(b,P,{ y0:baseY()+.5, x:-.04, k:.85, mounted:true, helm:'kettle', helmColor:RACE_FX.dwarfBrass, weapon:'spear', tip:RACE_FX.dwarfIron, pennant:P.body, tabard:P.body, armour:P.steelD, rh:[.22,.92,.26], lh:[.25,.95,-.2] }); },
  ironclad(b,P){ base(b,P,1,1.05); dwarfHum(b,P,{ k:1.15, armour:RACE_FX.dwarfIron, helm:'great', helmColor:RACE_FX.dwarfIron, shield:'tower', shieldColor:P.body, shieldRim:RACE_FX.dwarfBrass, weapon:'mace', maceHead:RACE_FX.dwarfIron, tabard:P.body, pauldron:RACE_FX.dwarfBrass, pants:P.steelD, boots:RACE_FX.dwarfIron, gloves:RACE_FX.dwarfIron });
    const k=.82*1.15, y0=baseY(); add(b,GEO.cyl,C.bronze,-.3*k,y0+1.0*k,0,.16*k,.5*k,.16*k); add(b,GEO.cyl6,C.iron,-.3*k,y0+1.32*k,.06*k,.03*k,.2*k,.03*k); add(b,GEO.sph6,C.white,-.3*k,y0+1.46*k,.06*k,.05*k,.05*k,.05*k);   // boiler + steam
    for(const y of [.8,1.1]) add(b,GEO.torus,RACE_FX.dwarfBrass,-.3*k,y0+y*k,0,.17*k,.17*k,.2*k,Math.PI/2,0,0); },
  holdWagon(b,P){ base(b,P,2,1.1); wagon(b,P,{ puller:'none', side:RACE_FX.dwarfIron, bed:C.woodD }); ram(b,P,{ x:.95, k:.7, saddle:P.body }); const y0=baseY();
    for(const x of [-.45,-.12,.21]) add(b,GEO.cyl,C.wood,x,y0+.72,0,.16,.3,.16,Math.PI/2,0,0); for(const x of [-.45,-.12,.21]) for(const z of [-.14,.14]) add(b,GEO.torus,RACE_FX.dwarfBrass,x,y0+.72,z,.165,.165,.3,0,0,0);
    for(const s of [-1,1]) for(const x of [-.5,-.12,.26]) add(b,GEO.box,C.iron,x,y0+.58,s*.345,.05,.05,.05); add(b,GEO.box,P.body,-.12,y0+.98,0,.3,.14,.02); },
  gyrocopter(b,P){ const k=1; add(b,GEO.sph,RACE_FX.dwarfBrass,0,0,0,.42,.3,.34); add(b,GEO.box,RACE_FX.dwarfIron,-.4,.0,0,.5,.12,.12); add(b,GEO.box,P.body,-.66,.08,0,.08,.3,.02);
    for(const s of [-1,1]) add(b,GEO.cyl6,C.iron,0,-.2,s*.2,.03,.3,.03,s*.3,0,0); add(b,GEO.box,C.iron,0,-.36,0,.5,.03,.5);
    add(b,GEO.cyl6,C.iron,0,.42,0,.03,.3,.03); { const i0=b.length; for(const a of [0,Math.PI/2]) add(b,GEO.box,'#c9c2b0',0,.56,0,1.8,.02,.12,0,a,0); tag(b,i0,PART.SPIN,0,.56,0); }
    { const i0=b.length; add(b,GEO.cyl6,C.iron,-.68,.0,0,.02,.02,.5,0,0,0); for(const a of [0,Math.PI/2]) add(b,GEO.box,'#c9c2b0',-.68,.0,0,.03,.4,.08,a,0,0); tag(b,i0,PART.WINGL,-.68,0,0); }
    add(b,GEO.cyl6,C.bronze,-.3,.22,.2,.05,.2,.05,.4,0,0); add(b,GEO.sph6,C.white,-.3,.36,.24,.06,.06,.06);
    dwarfHum(b,P,{ y0:.1-.62*.5, x:.1, k:.6, mounted:true, helm:'cap', cap:P.leather, tabard:P.body, weapon:null, rh:[.26,.9,.2], lh:[.26,.9,-.2] }); },
  runesmith(b,P){ base(b,P,2); dwarfHum(b,P,{ robe:P.cloth, trim:RACE_FX.dwarfBrass, stole:P.body, helm:'cap', cap:P.leather, weapon:'mace', maceHead:RACE_FX.dwarfIron, rh:[.22,.9,.26], lh:[.22,.9,-.22] });
    const y0=baseY(); add(b,GEO.box,'#6a6a62',-.36,y0+.26,0,.3,.3,.3); add(b,GEO.box,RACE_FX.dwarfBrass,-.36,y0+.42,0,.32,.04,.32);   // anvil stone
    for(let i=0;i<3;i++){ const a=i*TAU/3+.5; add(b,GEO.box,'#8a8f86',-.1+Math.cos(a)*.34,y0+1.0+i*.12,Math.sin(a)*.34,.08,.12,.03,0,-a,0); add(b,GEO.box,P.glow,-.1+Math.cos(a)*.345,y0+1.0+i*.12,Math.sin(a)*.345,.02,.08,.015,0,-a,0); } },   // floating runestones
  thunderer(b,P){ base(b,P,3,1.1); const y0=baseY();
    add(b,GEO.box,C.wood,-.2,y0+.36,0,.8,.14,.4,0,0,.1); for(const s of [-1,1]) wheel(b,0,y0+.42,s*.34,.4,C.wheel,RACE_FX.dwarfBrass);
    { const i0=b.length; for(let i=0;i<5;i++){ const z=(i-2)*.1; seg(b,GEO.cyl6,C.bronze,V(-.3,y0+.72+(i%2)*.05,z),V(.6,y0+1.1+(i%2)*.05,z),.045); add(b,GEO.cyl6,shade(C.bronze,.7),.6,y0+1.1+(i%2)*.05,z,.05,.03,.05,0,0,-1.15); } tag(b,i0,PART.RECOIL,0,0,0); }
    add(b,GEO.box,RACE_FX.dwarfIron,-.3,y0+.76,0,.2,.3,.5); add(b,GEO.box,RACE_FX.dwarfBrass,-.3,y0+.94,0,.22,.04,.52);
    dwarfHum(b,P,{ x:-.7, k:.68, helm:'kettle', helmColor:RACE_FX.dwarfBrass, tabard:P.body, armour:P.steelD, weapon:null, rh:[.3,.9,.18], lh:[.3,.9,-.18] }); },
  sapperWagon(b,P){ base(b,P,3,1.1); wagon(b,P,{ puller:'none', side:RACE_FX.dwarfIron, bed:C.woodD }); ram(b,P,{ x:.95, k:.7, saddle:P.body }); const y0=baseY();
    for(const [x,z] of [[-.5,-.15],[-.5,.15],[-.2,0],[.1,-.15],[.1,.15]]){ add(b,GEO.cyl,C.woodD,x,y0+.68,z,.11,.26,.11); add(b,GEO.torus,C.iron,x,y0+.72,z,.115,.115,.3,Math.PI/2,0,0); }
    add(b,GEO.cyl6,C.iron,-.7,y0+.95,0,.02,.6,.02); add(b,GEO.sph6,C.flame,-.7,y0+1.27,0,.06,.07,.06); add(b,GEO.box,P.body,-.62,y0+1.1,0,.16,.1,.02); },
  thunderCannon(b,P){ base(b,P,3,1.15); const y0=baseY();
    add(b,GEO.box,RACE_FX.dwarfIron,-.25,y0+.36,0,1.0,.16,.4,0,0,.1); for(const s of [-1,1]) wheel(b,-.05,y0+.44,s*.34,.44,C.wheel,RACE_FX.dwarfBrass);
    { const i0=b.length; seg(b,GEO.cyl16,C.bronze,V(-.4,y0+.66,0),V(.95,y0+.86,0),.2); add(b,GEO.cyl16,RACE_FX.dwarfBrass,.96,y0+.86,0,.25,.1,.25,0,0,Math.PI/2+.15);
      for(const x of [-.15,.25,.6]) add(b,GEO.torus,RACE_FX.dwarfBrass,x,y0+.69+x*.15,0,.23,.23,.3,0,Math.PI/2,.15); add(b,GEO.box,P.glow,.3,y0+.92,0,.5,.03,.06,0,0,.15); tag(b,i0,PART.RECOIL,0,0,0); }
    add(b,GEO.box,C.woodD,-.6,y0+.5,0,.4,.1,.3,0,0,-.4);
    dwarfHum(b,P,{ x:-.82, k:.68, helm:'kettle', helmColor:RACE_FX.dwarfBrass, tabard:P.body, armour:P.steelD, weapon:null, rh:[.3,.8,.2], lh:[.3,.8,-.2] }); },
  earthshaker(b,P){ base(b,P,4,1.25); wagon(b,P,{ puller:'none', len:1.4, wid:.8, side:RACE_FX.dwarfIron, bed:C.woodD }); ram(b,P,{ x:1.05, k:.78, saddle:P.body }); const y0=baseY();
    add(b,GEO.box,RACE_FX.dwarfIron,-.2,y0+.7,0,.9,.3,.7);
    { const i0=b.length; for(const z of [-.24,0,.24]){ seg(b,GEO.cyl16,C.bronze,V(-.3,y0+.85,z),V(.1,y0+1.4,z),.12); add(b,GEO.torus,RACE_FX.dwarfBrass,-.1,y0+1.12,z,.13,.13,.3,0,0,.6); } tag(b,i0,PART.RECOIL,0,0,0); }
    add(b,GEO.box,RACE_FX.dwarfBrass,-.6,y0+.9,0,.1,.3,.6); add(b,GEO.box,P.body,-.66,y0+1.2,0,.02,.26,.5); emblem(b,'sun',P,-.68,y0+1.2,0,.14);
    dwarfHum(b,P,{ y0:y0+.46, x:.5, k:.6, helm:'cap', cap:P.leather, tabard:P.body, weapon:null, rh:[.3,.9,.2], lh:[.3,.9,-.2] }); },
  // ================= Orcish Army (Grom) =================
  grunt(b,P){ base(b,P,1); orcHum(b,P,{ weapon:'sword', blade:RACE_FX.orcIron, guard:C.iron, shield:'round', shieldColor:P.body, shieldRim:RACE_FX.orcIron, armour:null, pants:P.pants }); },
  berserker(b,P){ base(b,P,1); orcHum(b,P,{ k:1.05, weapon:'mace', maceHead:RACE_FX.orcIron, rh:[.3,.9,.3], lh:[.3,.9,-.3] });
    const k=1.08*1.05, y0=baseY(); seg(b,GEO.cyl6,C.woodD,V(.3*k,y0+.8*k,-.3*k),V(.42*k,y0+1.3*k,-.3*k),.025*k); add(b,GEO.box,RACE_FX.orcIron,.44*k,y0+1.32*k,-.3*k,.3*k,.16*k,.03*k);   // second axe
    for(let i=0;i<3;i++) add(b,GEO.box,RACE_FX.orcPaint,.21*k,y0+(.8+i*.1)*k,0,.01*k,.03*k,.3*k); },
  armoredBoar(b,P){ base(b,P,1,1.1); boar(b,P,{ k:1.1, plates:true }); orcHum(b,P,{ y0:baseY()+.6, x:-.1, k:.72, mounted:true, helm:'horned', helmColor:RACE_FX.orcIron, weapon:'spear', tip:RACE_FX.orcIron, pennant:P.body, armour:RACE_FX.orcIron, rh:[.22,.9,.26], lh:[.25,.92,-.2] }); },
  warbandCart(b,P){ base(b,P,2,1.1); wagon(b,P,{ puller:'none', side:'#3a2a1e', bed:'#4a3a2a' }); boar(b,P,{ x:.95, k:.7, saddle:P.body }); const y0=baseY();
    for(const x of [-.55,-.2,.15]) { add(b,GEO.cyl6,C.woodD,x,y0+.9,.26,.025,.5,.025); emblem(b,'skull',P,x,y0+1.14,.26,.12); } add(b,GEO.box,P.body,-.2,y0+1.0,-.2,.6,.26,.02);
    for(const s of [-1,1]) add(b,GEO.cone6,C.bone,-.7,y0+.7,s*.3,.04,.3,.04,s*.6,0,0); },
  orcWyvern(b,P){ wyvernBody(b,P,{ hide:'#4a5a3a', belly:'#8a9a6a' }); orcHum(b,P,{ y0:.2-.62*.62, x:.02, k:.6, mounted:true, helm:'horned', helmColor:RACE_FX.orcIron, weapon:'spear', tip:RACE_FX.orcIron, pennant:P.body, rh:[.2,.9,.24], lh:[.2,.9,-.24] }); },
  shaman(b,P){ base(b,P,2); orcHum(b,P,{ robe:P.cloth, trim:RACE_FX.orcPaint, stole:P.body, weapon:'staff', staffHead:'skull', rh:[.2,.95,.28], lh:[.22,.95,-.18] });
    const y0=baseY(); for(let i=0;i<4;i++) add(b,GEO.box,i%2?C.white:RACE_FX.orcPaint,-.1,y0+1.5+i*.06,(i-1.5)*.08,.02,.2,.04,0,0,.3);   // feathers
    for(let i=0;i<3;i++) add(b,GEO.sph6,C.bone,.1+i*.06,y0+1.05,-.2+i*.05,.04,.04,.04); add(b,GEO.sph,RACE_FX.orcPaint,.22,y0+1.74,.3,.07,.07,.07); },
  harpoonCart(b,P){ base(b,P,3,1.1); wagon(b,P,{ puller:'none', side:'#3a2a1e', bed:'#4a3a2a' }); boar(b,P,{ x:.95, k:.7, saddle:P.body }); const y0=baseY();
    add(b,GEO.box,C.woodD,-.1,y0+.72,0,.14,.36,.14); { const i0=b.length; add(b,GEO.box,C.wood,.1,y0+.98,0,.9,.1,.12,0,0,.5); seg(b,GEO.cyl6,RACE_FX.orcIron,V(-.1,y0+.9,0),V(.55,y0+1.3,0),.03); add(b,GEO.cone6,RACE_FX.orcIron,.6,y0+1.33,0,.05,.16,.05,0,0,-1.1); for(const s of [-1,1]) add(b,GEO.cone6,RACE_FX.orcIron,.5,y0+1.26,s*.05,.02,.08,.02,0,0,.8); tag(b,i0,PART.RECOIL,0,0,0); }
    seg(b,GEO.cyl6,'#b8ab98',V(.55,y0+1.3,0),V(-.4,y0+.7,.2),.008); add(b,GEO.cyl6,C.woodD,-.4,y0+.7,.2,.08,.16,.08,Math.PI/2,0,0);
    orcHum(b,P,{ y0:y0+.46, x:-.55, k:.55, helm:'horned', helmColor:RACE_FX.orcIron, armour:RACE_FX.orcIron, weapon:null, rh:[.3,.9,.18], lh:[.3,.9,-.18] }); },
  berserkerCart(b,P){ base(b,P,2,1.1); wagon(b,P,{ puller:'none', side:'#3a2a1e', bed:'#4a3a2a' }); boar(b,P,{ x:.95, k:.7, saddle:P.body }); const y0=baseY();
    for(const x of [-.5,-.25,0,.25]) { seg(b,GEO.cyl6,C.woodD,V(x,y0+.5,-.2),V(x,y0+1.0,-.2),.02); add(b,GEO.box,RACE_FX.orcIron,x,y0+1.0,-.2,.2,.12,.03); }   // axe rack
    add(b,GEO.box,P.body,-.2,y0+.9,.3,.5,.3,.02); for(let i=0;i<3;i++) add(b,GEO.box,RACE_FX.orcPaint,-.4+i*.2,y0+.9,.312,.08,.2,.01); add(b,GEO.cyl6,C.iron,-.7,y0+.8,0,.1,.3,.1); },   // drum
  tuskBreaker(b,P){ base(b,P,3,1.2); boar(b,P,{ k:1.35, hide:'#4a3a30', plates:true }); const y0=baseY();
    seg(b,GEO.cyl6,RACE_FX.orcIron,V(1.3,y0+.8,0),V(1.75,y0+.95,0),.06); add(b,GEO.cone6,RACE_FX.orcIron,1.8,y0+.97,0,.08,.2,.08,0,0,-Math.PI/2);   // iron ram tusk
    for(const s of [-1,1]) add(b,GEO.cone6,RACE_FX.orcIron,1.1,y0+1.3,s*.2,.05,.3,.05,s*.4,0,0);
    orcHum(b,P,{ y0:y0+.78, x:-.2, k:.72, mounted:true, helm:'horned', helmColor:RACE_FX.orcIron, weapon:'spear', tip:RACE_FX.orcIron, pennant:P.body, armour:RACE_FX.orcIron, rh:[.22,.9,.26], lh:[.25,.92,-.2] }); },
  bloodChampion(b,P){ base(b,P,4,1.2); orcHum(b,P,{ k:1.3, armour:RACE_FX.orcIron, helm:'horned', helmColor:RACE_FX.orcIron, weapon:'mace', maceHead:RACE_FX.orcIron, cape:P.body, pauldron:RACE_FX.orcIron, pauldronTrim:C.bone, rh:[.3,.9,.3], lh:[.3,.9,-.3] });
    const k=1.08*1.3, y0=baseY(); seg(b,GEO.cyl6,C.woodD,V(.3*k,y0+.8*k,-.3*k),V(.5*k,y0+1.4*k,-.3*k),.03*k); add(b,GEO.box,RACE_FX.orcIron,.52*k,y0+1.42*k,-.3*k,.4*k,.2*k,.04*k);
    for(const s of [-1,1]) emblem(b,'skull',P,-.02*k,y0+1.16*k,s*.3*k,.12*k); for(let i=0;i<3;i++) add(b,GEO.box,RACE_FX.orcPaint,.25*k,y0+(.8+i*.1)*k,0,.01*k,.03*k,.34*k); },
  // ================= Skeletal Army (Ilsabet) =================
  skeleton(b,P){ base(b,P,1); skeletonHum(b,P,{ helm:'kettle', helmColor:'#8a8178', weapon:'sword', blade:'#9a958a', shield:'round', shieldColor:P.body, shieldRim:'#6a6058' }); },
  shade(b,P){ const y0=baseY(), g='#2a2434', gl=RACE_FX.boneLight;   // no legs: a hooded wisp drifting above the ground
    add(b,GEO.cone,g,0,y0+.5,0,.26,.7,.26,Math.PI,0,0); add(b,GEO.taper,g,0,y0+.95,0,.24,.5,.22,Math.PI,0,0);
    let i0=b.length; add(b,GEO.cone,g,-.01,y0+1.45,0,.21,.42,.2); add(b,GEO.sph,g,-.03,y0+1.34,0,.18,.17,.17); add(b,GEO.box,'#0d0f14',.14,y0+1.34,0,.03,.12,.14); for(const s of [-1,1]) add(b,GEO.box,gl,.17,y0+1.36,s*.055,.012,.03,.03); tag(b,i0,PART.HEAD,0,y0+1.16,0);
    for(const s of [-1,1]){ i0=b.length; seg(b,GEO.cyl6,g,V(0,y0+1.08,s*.25),V(.26,y0+.84,s*.28),.06); add(b,GEO.box,C.bone,.3,y0+.82,s*.28,.1,.06,.06); tag(b,i0,s<0?PART.ARML:PART.ARMR,0,y0+1.08,s*.25); }
    add(b,GEO.sph6,gl,.18,y0+.9,0,.06,.06,.06); },
  barrowRider(b,P){ base(b,P,1,1.05); boneHorse(b,P,{ y0:baseY(), x:0, k:1.0 }); skeletonHum(b,P,{ y0:baseY()+.5, x:-.02, k:.7, mounted:true, helm:'kettle', helmColor:'#8a8178', weapon:'spear', tip:C.bone, pennant:P.body, tunic:'#3a2f44', cape:'#3a2f44', rh:[.2,.92,.26], lh:[.25,.95,-.2] }); },
  graveKnight(b,P){ base(b,P,1,1.05); skeletonHum(b,P,{ k:1.08, armour:'#3f444c', helm:'horned', helmColor:'#3f444c', shield:'kite', shieldColor:P.body, shieldRim:'#2a2d33', weapon:'greatsword', blade:'#2e3238', bladeGlow:RACE_FX.boneLight, tunic:'#3a2f44', cape:'#3a2f44', pants:'#2a2d33', boots:'#1f2226' }); },
  boneWyvern(b,P){ wyvernBody(b,P,{ hide:'#d8ccb0', belly:'#eee6d0', bone:'#b8ab98', wing:'#4a3a44', eye:RACE_FX.boneLight }); skeletonHum(b,P,{ y0:.2-.62*.62, x:.02, k:.6, mounted:true, helm:'kettle', helmColor:'#8a8178', weapon:'lance', lanceColor:C.bone, pennant:P.body, tunic:'#3a2f44', rh:[.2,.9,.24], lh:[.2,.9,-.24] }); },
  lich(b,P){ base(b,P,2); skeletonHum(b,P,{ robe:'#2a2334', trim:P.body, stole:P.body, helm:'crown', weapon:'staff', staffHead:'skull', rh:[.2,.95,.28], lh:[.24,1.0,-.2] });
    const y0=baseY(); add(b,GEO.sph,RACE_FX.boneLight,.24,y0+1.02,-.2,.07,.07,.07); for(let i=0;i<4;i++){ const a=i*TAU/4; add(b,GEO.sph6,RACE_FX.boneLight,Math.cos(a)*.3,y0+1.3+Math.sin(a*2)*.1,Math.sin(a)*.3,.03,.03,.03); } },
  shardFlinger(b,P){ base(b,P,3,1.1); wagon(b,P,{ puller:'bones', side:'#3a3036', bed:'#3a3036' }); const y0=baseY();
    add(b,GEO.box,C.woodD,-.1,y0+.72,0,.14,.36,.14); { const i0=b.length; seg(b,GEO.cyl6,C.bone,V(-.1,y0+.9,0),V(.4,y0+1.4,0),.04); add(b,GEO.sph6,'#2a2434',.42,y0+1.42,0,.1,.08,.1); for(let i=0;i<6;i++){ const a=i*TAU/6; add(b,GEO.cone6,C.bone,.42+Math.cos(a)*.14,y0+1.42,Math.sin(a)*.14,.02,.14,.02,Math.sin(a)*1.2,0,-Math.cos(a)*1.2); } tag(b,i0,PART.RECOIL,0,0,0); }
    skeletonHum(b,P,{ y0:y0+.46, x:-.55, k:.6, helm:'kettle', helmColor:'#8a8178', weapon:null, tunic:'#3a2f44', rh:[.3,.9,.18], lh:[.3,.9,-.18] }); },
  shadeCart(b,P){ base(b,P,2,1.15); wagon(b,P,{ puller:'bones', side:'#2a2434', bed:'#3a3044', len:1.3 }); const y0=baseY();
    for(const x of [-.6,-.2,.2]) for(const s of [-1,1]){ add(b,GEO.cyl6,C.iron,x,y0+.9,s*.3,.012,.5,.012); add(b,GEO.box,'#1a1620',x,y0+1.15,s*.3,.08,.12,.08); add(b,GEO.sph6,RACE_FX.boneLight,x,y0+1.15,s*.3,.04,.05,.04); }   // soul lanterns
    add(b,GEO.sph,'#2a2434',-.2,y0+.78,0,.4,.2,.3); add(b,GEO.sph6,RACE_FX.boneLight,-.2,y0+.9,0,.1,.08,.1); emblem(b,'skull',P,.3,y0+.8,0,.18); },
  // ================= Troll Army (Mawgrom) =================
  trollkin(b,P){ base(b,P,1); trollBody(b,P,{ k:.66 }); const y0=baseY(), k=.66; seg(b,GEO.cyl6,C.woodD,V(.4*k,y0+.5*k,.56*k),V(.6*k,y0+1.2*k,.62*k),.04); add(b,GEO.sph6,RACE_FX.trollStone,.62*k,y0+1.26*k,.62*k,.09,.08,.09); },
  stoneHurler(b,P){ base(b,P,1); trollBody(b,P,{ k:.66 }); const y0=baseY(), k=.66; seg(b,GEO.cyl6,P.leather,V(.4*k,y0+.66*k,.56*k),V(.1*k,y0+1.9*k,.2*k),.01); seg(b,GEO.cyl6,P.leather,V(.4*k,y0+.66*k,-.56*k),V(.1*k,y0+1.9*k,.2*k),.01); add(b,GEO.sph6,RACE_FX.trollStone,.1*k,y0+1.9*k,.2*k,.08,.07,.08); },
  goblinRunner(b,P){ base(b,P,1,1.05); lizard(b,P,{ saddle:P.body }); goblinHum(b,P,{ y0:baseY()+.5, x:-.05, k:1.0, mounted:true, helm:'cap', cap:P.leather, weapon:'daggers', rh:[.3,.8,.22], lh:[.3,.8,-.22], tunic:P.cloth, cape:P.body }); },
  caveTroll(b,P){ base(b,P,1,1.1); trollBody(b,P,{ k:1.05, loin:P.leather }); const y0=baseY(), k=1.05; seg(b,GEO.cyl6,C.woodD,V(.4*k,y0+.66*k,.56*k),V(.66*k,y0+1.5*k,.7*k),.07); add(b,GEO.sph6,RACE_FX.trollStone,.7*k,y0+1.6*k,.72*k,.16,.2,.16); add(b,GEO.box,P.body,-.02*k,y0+1.36*k,0,.46,.06,.56); },
  trollkinCart(b,P){ base(b,P,2,1.15); wagon(b,P,{ puller:'none', side:'#4a3a28', bed:'#5a4a32', len:1.3 }); { const i0=b.length; trollBody(b,P,{ k:.7, x:1.15 }); } const y0=baseY();
    seg(b,GEO.cyl6,C.woodD,V(.55,y0+.5,.1),V(1.1,y0+.9,.1),.02); seg(b,GEO.cyl6,C.woodD,V(.55,y0+.5,-.1),V(1.1,y0+.9,-.1),.02);
    for(let i=0;i<4;i++) add(b,GEO.sph6,RACE_FX.trollStone,-.6+i*.22,y0+.62,(i%2?.15:-.15),.1,.08,.1); add(b,GEO.box,P.body,-.72,y0+.95,0,.02,.3,.3); add(b,GEO.sph,RACE_FX.trollMoss,-.2,y0+.7,.2,.14,.08,.14); },
  direBat(b,P){ batBody(b,P,{ k:1.1, saddle:P.body }); goblinHum(b,P,{ y0:.25-.62*.9, x:.0, k:.9, mounted:true, helm:'cap', cap:P.leather, weapon:'spear', tip:C.bone, pennant:P.body, tunic:P.cloth, rh:[.2,.9,.24], lh:[.2,.9,-.24] }); },
  bogWitch(b,P){ base(b,P,2); hum(b,P,{ robe:'#3a4a32', trim:RACE_FX.trollMoss, stole:P.body, helm:'hat', hat:'#2a2a1e', weapon:'staff', staffHead:'skull', skin:'#8a9a7a', eyes:P.eye, hair:'#c9c2b0', rh:[.2,.95,.28], lh:[.22,.95,-.18] });
    const y0=baseY(); add(b,GEO.cone,'#8a9a7a',.2,y0+1.3,0,.03,.14,.03,0,0,-Math.PI/2-.4);   // hooked nose
    add(b,GEO.sph,'#2a2a2e',-.3,y0+.9,0,.2,.18,.2); add(b,GEO.cyl16,P.glow,-.3,y0+1.04,0,.17,.03,.17); for(let i=0;i<3;i++) add(b,GEO.sph6,P.glow,-.3+(i-1)*.08,y0+1.14+i*.06,(i-1)*.05,.04,.04,.04); },   // cauldron on the back
  slingTroll(b,P){ base(b,P,3,1.15); trollBody(b,P,{ k:1.0, loin:P.leather, harness:P.leather }); const y0=baseY();
    for(const s of [-1,1]) seg(b,GEO.cyl6,C.woodD,V(-.3,y0+1.3,s*.5),V(-.5,y0+2.4,s*.6),.04); seg(b,GEO.cyl6,P.leather,V(-.5,y0+2.4,.6),V(-.5,y0+2.4,-.6),.015);
    add(b,GEO.box,P.leather,-.5,y0+2.2,0,.12,.06,.3); add(b,GEO.sph6,RACE_FX.trollStone,-.5,y0+2.2,0,.1,.08,.1); add(b,GEO.box,P.body,-.4,y0+2.5,0,.02,.2,.3); },
  hurlerCart(b,P){ base(b,P,2,1.15); wagon(b,P,{ puller:'none', side:'#4a3a28', bed:'#5a4a32', len:1.3 }); { trollBody(b,P,{ k:.7, x:1.15 }); } const y0=baseY();
    seg(b,GEO.cyl6,C.woodD,V(.55,y0+.5,.1),V(1.1,y0+.9,.1),.02); seg(b,GEO.cyl6,C.woodD,V(.55,y0+.5,-.1),V(1.1,y0+.9,-.1),.02);
    for(const [x,z,y] of [[-.6,.1,.62],[-.4,-.15,.62],[-.2,.15,.62],[-.5,0,.8]]) add(b,GEO.sph6,RACE_FX.trollStone,x,y0+y,z,.11,.09,.11);
    seg(b,GEO.cyl6,C.woodD,V(.1,y0+.5,0),V(-.3,y0+1.3,0),.03); add(b,GEO.box,P.leather,-.32,y0+1.32,0,.14,.06,.14); add(b,GEO.box,P.body,.2,y0+.9,0,.02,.3,.3); },
  boulderTroll(b,P){ base(b,P,3,1.2); trollBody(b,P,{ k:1.15, loin:P.leather, harness:P.leather, helm:'iron' }); const y0=baseY(), k=1.15;
    for(const s of [-1,1]){ seg(b,GEO.cyl6,P.skin,V(-.05*k,y0+1.5*k,s*.46*k),V(.0,y0+2.1*k,s*.4*k),.1*k); add(b,GEO.box,shade(P.skin,.78),.0,y0+2.16*k,s*.4*k,.16,.12,.16); }   // arms up
    add(b,GEO.sph,RACE_FX.trollStone,.05*k,y0+2.5*k,0,.46,.38,.46); add(b,GEO.sph6,RACE_FX.trollMoss,.15*k,y0+2.78*k,.15,.14,.08,.14); },   // boulder held overhead
  mountainTroll(b,P){ base(b,P,4,1.3); trollBody(b,P,{ k:1.45, loin:P.leather, harness:RACE_FX.orcIron, helm:'iron' }); const y0=baseY(), k=1.45;
    seg(b,GEO.cyl,C.woodD,V(.4*k,y0+.66*k,.56*k),V(1.1*k,y0+1.9*k,.7*k),.14); add(b,GEO.cyl,shade(C.woodD,.8),.4*k,y0+.66*k,.56*k,.16,.1,.16,0,0,-.7); for(let i=0;i<4;i++) add(b,GEO.cone6,C.iron,(.55+i*.14)*k,y0+(.95+i*.26)*k,.6*k,.03,.1,.03,0,0,-Math.PI/2);   // battering log
    add(b,GEO.box,P.body,-.1*k,y0+1.36*k,0,.5*k,.08,.6*k); add(b,GEO.cyl6,C.woodD,-.4*k,y0+2.3*k,0,.03,1.0,.03); add(b,GEO.box,P.body,-.3*k,y0+2.6*k,0,.3,.3,.02); },
};
Object.assign(MODELS,MODELS16);
AIR_MODELS.add('pegasus'); AIR_MODELS.add('elfGriffon'); AIR_MODELS.add('moonhawk'); AIR_MODELS.add('gyrocopter'); AIR_MODELS.add('orcWyvern'); AIR_MODELS.add('boneWyvern'); AIR_MODELS.add('direBat');
