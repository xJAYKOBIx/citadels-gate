// Citadel's Gate — the two-lane crossing map ("Wardens' Ford"). Authored for the west half; everything is
// point-mirrored onto the east. Two lanes leave each gate together, split, cross at the Gate (a stone causeway
// over the river) and reach the far stronghold from the other side. A sunken hollow way along each rim lets a
// unit slip round the Gate; a lookout mesa on each side overlooks the approach to the Gate.
function buildGateDef(MW,MH,helpers){
  const { mirrorAll, Rxy, Rp, Rrect, resamplePoly, splineSample, cumOf, generateHF }=helpers;
  const KX=330, KY=MH/2, KH=46, CX=MW/2, CY=MH/2, DECK=22;
  const M=([x,y,h])=>h==null?[MW-x,MH-y]:[MW-x,MH-y,h];
  const Mp=p=>({...p, x:MW-p.x, y:MH-p.y}), Ml=l=>({...l, pts:l.pts.map(Rxy)});
  // ---- lanes: west half to the Gate; the east half is the point mirror of the other lane ----
  // North lane climbs over Hangman's Rise, drops to the river meadow and enters the Gate from the north-west.
  const NW=[[KX,KY,KH],[KX+60,KY-180],[485,758],[653,636],[793,574],[924,611],[1008,733],[1073,856],[1185,966],[1288,1039],[1344,CY,DECK]];
  // South lane runs through the Low Fields and the Mire bend, then enters the Gate from the south-west.
  const SW=[[KX,KY,KH],[KX+60,KY+180],[485,1442],[653,1564],[821,1601],[952,1552],[1045,1430],[1148,1271],[1260,1173],[1344,CY,DECK]];
  // the causeway (the Gate itself) is a bridge link between 1440 and 1560; the lane polylines run straight across it
  const NF=[...NW, ...NW.map(M).reverse()];                     // each lane is its own point mirror: an X through the Gate
  const SF=[...SW, ...SW.map(M).reverse()];
  // ---- the hollow ways (bypass trails along the rims; hidden in the woods) ----
  const TR0=[
    { name:'the north hollow way', pieces:[[[793,574],[933,403],[1167,354],[1325,367,-5],[1400,367,-5],[1475,367,-5],[1633,403],[1867,513],[1979,599]]] },   // slips round the Gate and comes out on the enemy's south-lane approach
    { name:'Gallows stair', pieces:[[[1073,856],[1101,782],[1167,746],[1213,794,96]]] },
  ];
  const TR=[...TR0, ...TR0.map(t=>({...t, pieces:t.pieces.map(p=>p.map(M))}))];
  const roads=[
    { name:'North', kind:'lane', pieces:[NW, NW.map(M).reverse()], w:26, sh:30 },
    { name:'South', kind:'lane', pieces:[SW, SW.map(M).reverse()], w:26, sh:30 },
    ...TR.map(t=>({...t, kind:'trail', w:14, sh:20, grade:0.3 })),
  ];
  // ---- landforms (west half) ----
  const RANGES0=[
    { name:'the North Wall', pts:[[-187,73],[373,24],[840,86],[1307,37],[1773,86],[2240,37],[2707,73]], H:240, w:230, lump:240 },
    { name:'Hangman\'s Rise', pts:[[653,306],[747,513],[803,684],[747,856]], H:110, w:120, p:1.3 },         // the north lane climbs over its saddle
    { name:'Rise spur', pts:[[560,856],[523,1002]], H:70, w:80 },
    { name:'the Mire bank', pts:[[933,1833],[1073,1736],[1213,1687]], H:60, w:90, p:1.2, walk:0.35 },  // low walkable bank south of the south lane
    { name:'Gatehouse rock', pts:[[1325,929],[1381,856]], H:80, w:55, p:1.3 },                          // the stump of the old gatehouse tower
  ];
  const HILLS0=[ { x:KX, y:KY, r:300, H:46 }, { x:933, y:1076, r:220, H:30 }, { x:607, y:1283, r:160, H:22 } ];
  const MESAS0=[
    { name:'Gallows Hill', pts:[[1148,684],[1241,782],[1269,929]], top:96, w:36, edge:30 },              // lookout over the Gate approach
  ];
  const LINKS=[
    { kind:'bridge', name:'the Gate', deckH:DECK, level:1, pts:[[1344,CY],[1400,CY],[1456,CY]] },
  ];
  const def={ w:MW, h:MH, seed:23, base:20, roll:15, bump:3,
    ranges:mirrorAll(RANGES0,r=>({...r, pts:r.pts.map(Rxy)})), hills:mirrorAll(HILLS0,Mp), mesas:mirrorAll(MESAS0,m=>({...m, pts:m.pts.map(Rxy)})),
    river:{ half:46, amp:90, period:260 }, gorge:{ floor:-4, fw:50, slope:0.5, bed:-26 },
    roads,
    pads:[ ...mirrorAll([{ x:KX, y:KY, r:190, h:KH, edge:80, early:true }],Mp),
           { x:1344, y:CY, r:34, h:DECK, edge:34 }, { x:1456, y:CY, r:34, h:DECK, edge:34 },
           ...mirrorAll([{ x:1213, y:794, r:22, h:96, edge:10 }],Mp) ],
  };
  const laneN=resamplePoly(splineSample(NF,6).pts,40), laneS=resamplePoly(splineSample(SF,6).pts,40);
  const lanes=[laneN, laneS];
  const at=(pts,s,side,off)=>{ const cum=cumOf(pts); let i=0; while(i<pts.length-2 && cum[i+1]<s) i++; const t=(s-cum[i])/((cum[i+1]-cum[i])||1), a=pts[i], b=pts[i+1], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    return { x:Math.round(a[0]+(b[0]-a[0])*t-(b[1]-a[1])/L*off*side), y:Math.round(a[1]+(b[1]-a[1])*t+(b[0]-a[0])/L*off*side) }; };
  const TOWERS0=[ {lane:0,slot:'inner',...at(lanes[0],470,1,48)}, {lane:0,slot:'outer',...at(lanes[0],1000,-1,48)},
                  {lane:1,slot:'inner',...at(lanes[1],470,-1,48)}, {lane:1,slot:'outer',...at(lanes[1],1000,1,48)} ];
  def.pads.push(...mirrorAll(TOWERS0.map(t=>({x:t.x,y:t.y,r:22,edge:16})),Mp));
  const gen=generateHF(def);
  const LANE_MIRROR=[0,1];                                     // each lane is its own point mirror (an X through the Gate)
  const FLANKS0=[ { lane:0, to:1, via:[{x:1167,y:354},{x:1633,y:403},{x:1979,y:599}] },        // the north hollow way: round the Gate, out onto the other lane
                  { lane:1, to:0, via:[{x:1167,y:1797},{x:1633,y:1846},{x:2007,y:1626}] } ];   // the south hollow way
  const OVERWATCH0=[ [{x:1213,y:794},{x:1008,y:782}], [{x:1101,y:1369},{x:840,y:1528}] ];
  return {
    id:'gate', name:'Wardens\' Ford', w:MW, h:MH, platH:40, laneMirror:LANE_MIRROR, terrain:'hf',
    hf:gen.hf, rough:gen.rough, hfW:gen.TW, hfH:gen.TH, roads:gen.roads, trails:TR, ranges:def.ranges, mesas:def.mesas,
    zoneR:420, speedMult:0.85, viewSpan:1400, step:11, midTower:{ hp:1, dmg:1 },
    keeps:[{x:KX,y:KY},{x:MW-KX,y:MH-KY}],
    lanes, laneNames:['North','South'],
    towers:[...TOWERS0.map(t=>({...t,team:0})), ...TOWERS0.map(t=>({...Rp(t),team:1,lane:LANE_MIRROR[t.lane]}))],
    plateaus:[], ramps:[], links:LINKS,
    rocks:mirrorAll([ {x:1120,y:980,r:30}, {x:560,y:560,r:22} ],Rp),
    forests:mirrorAll([ {x:1250,y:290,r:120,name:'the Hollow Wood'}, {x:1600,y:310,r:110}, {x:1950,y:420,r:90}, {x:1000,y:330,r:80},
                        {x:620,y:1350,r:90}, {x:900,y:1500,r:70}, {x:180,y:600,r:70}, {x:180,y:1200,r:70}, {x:1350,y:1200,r:60} ],Rp),
    houses:mirrorAll([ {x:1000,y:1020,w:40,h:26}, {x:1050,y:1050,w:28,h:40}, {x:760,y:1120,w:36,h:24} ],Rrect),
    farms:mirrorAll([ {x:700,y:1150,w:120,h:64,a:.15}, {x:1020,y:960,w:80,h:50,a:-.1} ],f=>({...f, x:MW-f.x, y:MH-f.y})),
    landmarks:mirrorAll([ {kind:'watch',x:1330,y:650,a:0}, {kind:'chapel',x:980,y:1180,a:.4}, {kind:'mill',x:560,y:1120,a:-.5} ],l=>({...l, x:MW-l.x, y:MH-l.y, a:l.a+Math.PI})),
    camp:{ tents:[{x:150,y:KY-100},{x:135,y:KY},{x:150,y:KY+100}], fire:{x:195,y:KY},
           banners:[{x:KX-80,y:KY-160},{x:KX+80,y:KY-160},{x:KX+170,y:KY-60},{x:KX+170,y:KY+60},{x:KX-80,y:KY+160},{x:KX+80,y:KY+160},
                    ...TOWERS0.filter(t=>t.slot==='outer').map(t=>({x:t.x+26,y:t.y+26}))] },
    river:{ half:46, amp:90, period:260, crossings:[[CY-62,CY+62,'bridge'],[CY-780,CY-680,'bridge'],[CY+680,CY+780,'bridge']] },
    water:-20, bridgeY:-5,
    caches:[ {x:CX,y:CY,name:'the Gate'}, {x:1300,y:650,name:'Gallows Hill'}, {x:MW-1300,y:MH-650,name:'their Gallows Hill'},
             {x:1250,y:290,name:'the Hollow Wood'}, {x:MW-1250,y:MH-290,name:'their Hollow Wood'} ],
    overwatch:[ OVERWATCH0, [0,1].map(l=>OVERWATCH0[LANE_MIRROR[l]].map(Rp)) ],
    flanks:[ FLANKS0, FLANKS0.map(f=>({ lane:1-f.lane, to:1-f.to, via:f.via.map(Rp) })) ],   // each lane is its own mirror, so the mirrored hollow way belongs to the other lane
    nests:mirrorAll([ { x:1213, y:794, name:'Gallows Hill', r:60 } ],Mp),   // v11: overlook nests (caster range/height bonus)
  };
}
if(typeof module!=='undefined') module.exports={ buildGateDef };
