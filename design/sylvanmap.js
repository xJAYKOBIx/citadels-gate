// Citadel's Gate — Sylvanmere: an elven forest map. Two winding lanes that never meet, a river running
// diagonally through the woods with a few bends, and a hidden path from each side that cross each other at
// the Hidden Ford in the very middle of the map. Authored for the west half; everything is point-mirrored.
// Needs two generator additions: river.tilt (diagonal river) and def.fords (shallow gravel bed under a ford).
function buildSylvanDef(MW,MH,helpers){
  const { mirrorAll, Rxy, Rp, Rrect, resamplePoly, splineSample, cumOf, generateHF }=helpers;
  const KX=330, KY=MH/2, KH=40, CX=MW/2, CY=MH/2;
  const M=([x,y,h])=>h==null?[MW-x,MH-y]:[MW-x,MH-y,h];
  const Mp=p=>({...p, x:MW-p.x, y:MH-p.y});
  // ---- the river: top-left to bottom-right with three bends ----
  const RIVER={ half:48, amp:165, period:215, tilt:0.42 };
  // ---- lanes (west half). The north lane winds up through the Elder Wood, crosses the river on Elder Bridge
  // and meets the midline at the North Glade; the east half is the mirror of the south lane, so the two lanes
  // never touch. ----
  const NW=[[KX,KY,KH],[390,940],[470,840],[600,790],[700,720],[720,620],[820,580],[930,610],[1056,540,2],[1140,470],[1230,480],[1310,420],[1400,380]];
  const SW=[[KX,KY,KH],[380,1270],[430,1420],[560,1470],[680,1540],[760,1630],[880,1620],[960,1700],[1080,1700],[1180,1770],[1300,1760],[1400,1820]];
  const NF=[...NW, ...SW.map(M).reverse().slice(1)], SF=[...SW, ...NW.map(M).reverse().slice(1)];
  // ---- hidden paths: each leaves a lane on your side, slips through the woods to the Hidden Ford in the middle,
  // and comes out on the enemy's far lane. They cross each other at the ford. ----
  const PA=[[700,720],[800,860],[920,980],[1080,1040],[1250,1070],[1400,1100,-9]];       // from the north lane
  const PB=[[760,1630],[880,1460],[1050,1300],[1200,1200],[1330,1130],[1400,1100,-9]];   // from the south lane
  const TR0=[
    { name:'the Elder path', pieces:[[...PA, ...PA.map(M).reverse().slice(1)]] },
    { name:'the Willow path', pieces:[[...PB, ...PB.map(M).reverse().slice(1)]] },
    { name:'Elder Oak stair', pieces:[[[870,600],[840,690],[870,780],[940,800],[985,760,90]]] },
  ];
  const TR=[...TR0.slice(0,2), ...mirrorAll([TR0[2]],t=>({...t, pieces:t.pieces.map(p=>p.map(M))}))];
  const roads=[
    { name:'North', kind:'lane', pieces:[NF], w:26, sh:30 },
    { name:'South', kind:'lane', pieces:[SF], w:26, sh:30 },
    ...TR.map(t=>({...t, kind:'trail', w:13, sh:18, grade:0.3 })),
  ];
  // ---- landforms (west half): wooded rims, a few mossy crags, the Elder Oak rise ----
  const RANGES0=[
    { name:'the North Rim', pts:[[-200,40],[500,10],[1100,60],[1700,20],[2300,60],[3000,30]], H:170, w:190, lump:220 },
    { name:'Mossy crag', pts:[[560,900],[640,980]], H:70, w:60, p:1.3 },
    { name:'Mossy crag', pts:[[1180,1360],[1120,1460]], H:75, w:62, p:1.3 },
    { name:'Mossy crag', pts:[[1060,220],[1180,260]], H:90, w:70, p:1.3 },
  ];
  const HILLS0=[ { x:KX, y:KY, r:300, H:40 }, { x:1000, y:860, r:150, H:18 }, { x:620, y:1250, r:160, H:16 } ];
  const MESAS0=[ { name:'the Elder Oak', pts:[[940,730],[1030,770]], top:90, w:34, edge:28 } ];
  const def={ w:MW, h:MH, seed:31, base:20, roll:12, bump:3,
    ranges:mirrorAll(RANGES0,r=>({...r, pts:r.pts.map(Rxy)})), hills:mirrorAll(HILLS0,Mp), mesas:mirrorAll(MESAS0,m=>({...m, pts:m.pts.map(Rxy)})),
    river:RIVER, gorge:{ floor:-4, fw:44, slope:0.5, bed:-26 }, fords:[[CY-70,CY+70,-9]],
    roads,
    pads:[ ...mirrorAll([{ x:KX, y:KY, r:190, h:KH, edge:80, early:true }, { x:985, y:748, r:22, h:90, edge:10 }],Mp) ],
  };
  const laneN=resamplePoly(splineSample(NF,6).pts,40), laneS=resamplePoly(splineSample(SF,6).pts,40);
  const lanes=[laneN, laneS];
  const at=(pts,s,side,off)=>{ const cum=cumOf(pts); let i=0; while(i<pts.length-2 && cum[i+1]<s) i++; const t=(s-cum[i])/((cum[i+1]-cum[i])||1), a=pts[i], b=pts[i+1], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    return { x:Math.round(a[0]+(b[0]-a[0])*t-(b[1]-a[1])/L*off*side), y:Math.round(a[1]+(b[1]-a[1])*t+(b[0]-a[0])/L*off*side) }; };
  const TOWERS0=[ {lane:0,slot:'inner',...at(lanes[0],470,1,48)}, {lane:0,slot:'outer',...at(lanes[0],1140,1,48)},
                  {lane:1,slot:'inner',...at(lanes[1],470,-1,48)}, {lane:1,slot:'outer',...at(lanes[1],1140,-1,48)} ];
  def.pads.push(...mirrorAll(TOWERS0.map(t=>({x:t.x,y:t.y,r:22,edge:16})),Mp));
  const gen=generateHF(def);
  const LANE_MIRROR=[1,0];                                  // the north lane's east half is the south lane's mirror
  const FLANKS0=[ { lane:0, to:1, via:[{x:920,y:980},{x:1400,y:1100},{x:1880,y:1220},{x:2040,y:1480}] },   // the Elder path
                  { lane:1, to:0, via:[{x:1050,y:1300},{x:1400,y:1100},{x:1750,y:900},{x:2020,y:700}] } ]; // the Willow path
  const OVERWATCH0=[ [{x:990,y:748},{x:980,y:500}], [{x:1060,y:1760},{x:860,y:1620}] ];
  return {
    id:'sylvan', name:'Sylvanmere', w:MW, h:MH, platH:40, laneMirror:LANE_MIRROR, terrain:'hf',
    hf:gen.hf, rough:gen.rough, hfW:gen.TW, hfH:gen.TH, roads:gen.roads, trails:TR, ranges:def.ranges, mesas:def.mesas,
    zoneR:420, speedMult:0.85, viewSpan:1400, step:11, midTower:{ hp:1, dmg:1 },
    keeps:[{x:KX,y:KY},{x:MW-KX,y:MH-KY}],
    lanes, laneNames:['North','South'],
    towers:[...TOWERS0.map(t=>({...t,team:0})), ...TOWERS0.map(t=>({...Rp(t),team:1,lane:LANE_MIRROR[t.lane]}))],
    plateaus:[], ramps:[], links:[],
    rocks:mirrorAll([ {x:1000,y:1180,r:26}, {x:560,y:1020,r:22} ],Rp),
    // the woods: thick along the hidden paths (so they really are hidden), on the rims and between the lanes
    forests:mirrorAll([ {x:810,y:880,r:125,name:'the Elder Wood'}, {x:930,y:990,r:110}, {x:1080,y:1050,r:105}, {x:1240,y:1090,r:95},
                        {x:880,y:1470,r:125,name:'the Willow Wood'}, {x:1050,y:1300,r:110}, {x:1200,y:1200,r:100},
                        {x:700,y:1000,r:80}, {x:1200,y:900,r:90}, {x:1350,y:1000,r:70},
                        {x:600,y:470,r:110}, {x:900,y:380,r:120}, {x:1250,y:230,r:110}, {x:1550,y:170,r:100},
                        {x:620,y:1720,r:110}, {x:820,y:1860,r:120}, {x:1150,y:1960,r:110}, {x:180,y:600,r:90}, {x:180,y:1600,r:90},
                        {x:1300,y:1500,r:90}, {x:1400,y:1680,r:80} ],Rp),
    houses:mirrorAll([ {x:640,y:820,w:36,h:24}, {x:1230,y:1680,w:30,h:40} ],Rrect),
    farms:[],
    landmarks:mirrorAll([ {kind:'watch',x:1010,y:752,a:0}, {kind:'chapel',x:1400,y:300,a:.2}, {kind:'mill',x:1160,y:1890,a:-.4} ],l=>({...l, x:MW-l.x, y:MH-l.y, a:l.a+Math.PI})),
    camp:{ tents:[{x:150,y:KY-100},{x:135,y:KY},{x:150,y:KY+100}], fire:{x:195,y:KY},
           banners:[{x:KX-80,y:KY-160},{x:KX+80,y:KY-160},{x:KX+170,y:KY-60},{x:KX+170,y:KY+60},{x:KX-80,y:KY+160},{x:KX+80,y:KY+160},
                    ...TOWERS0.filter(t=>t.slot==='outer').map(t=>({x:t.x+26,y:t.y+26}))] },
    river:{ ...RIVER, crossings:[[470,620,'bridge'],[CY-70,CY+70,'ford'],[MH-620,MH-470,'bridge']] },   // Elder Bridge, the Hidden Ford, Willow Bridge
    water:-20, bridgeY:2,
    caches:[ {x:CX,y:CY,name:'the Hidden Ford'}, {x:990,y:748,name:'the Elder Oak'}, {x:MW-990,y:MH-748,name:'their Elder Oak'},
             {x:1400,y:380,name:'the North Glade'}, {x:1400,y:MH-380,name:'the South Glade'} ],
    overwatch:[ OVERWATCH0, [0,1].map(l=>OVERWATCH0[LANE_MIRROR[l]].map(Rp)) ],
    flanks:[ FLANKS0, FLANKS0.map(f=>({ lane:LANE_MIRROR[f.lane], to:LANE_MIRROR[f.to], via:f.via.map(Rp) })) ],
    nests:mirrorAll([ { x:990, y:748, name:'the Elder Oak', r:60 } ],Mp),
  };
}
if(typeof module!=='undefined') module.exports={ buildSylvanDef };
