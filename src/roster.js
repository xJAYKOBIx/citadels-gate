/* =====================================================================
   v13 ROSTER — "Citadel's Gate — Commanders & Units" (design doc, 2026-10-03).
   Two factions (Covenant, Forsaken), six commanders in three roles (Infantry, Air, Siege).
   Every commander fields the same six CORE slots (stats are faction-wide; each race only reskins the name)
   plus three UNIQUES (elite spawner, anti-armor answer, finisher). No conditional mechanics anywhere:
   "weak to" is only the ordinary extra-damage counter (vs / takes).
   Stats are written on the fan guide's scale, before the rank multiplier and speed scaling:
   HP 1→50 2→110 3→170 4→240 5→330 · Speed 0.5→25 1→60 2→85 3→115 4→140 5→180
   DPS 1→6 2→11 3→16 4→24 · Range 1→60 2→100 3→150 4→260
   ===================================================================== */
const INF = {
  // wave and core-spawner infantry: one stat line per faction, named per race (model = the miniature it borrows)
  levy:        { name:'Levy',             race:'human',    model:'militia',  hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'foot',   melee:true },
  wildwoodWarden:{name:'Wildwood Warden', race:'elf',      model:'wildwood', hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'foot',   melee:true },
  axeDwarf:    { name:'Axe-Dwarf',        race:'dwarf',    model:'axeDwarf',  hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'foot',   melee:true },
  grunt:       { name:'Grunt',            race:'orc',      model:'grunt',  hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'foot',   melee:true },
  skeleton:    { name:'Skeleton Warrior', race:'skeletal', model:'skeleton',    hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'ghoul',  melee:true },
  trollkin:    { name:'Trollkin',         race:'troll',    model:'trollkin',    hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'ghoul',  melee:true },
  // elite infantry raised by the elite spawners
  swornGuard:  { name:'Sworn Guard',      race:'human',    model:'swornGuard',  hp:80, speed:45, dmg:5, interval:1.0, range:40, aggro:110, r:6,   shape:'foot',   melee:true, specialty:true },
  shadowstalker:{name:'Shadowstalker',    race:'elf',      model:'shadow',   hp:40, speed:60, dmg:9, interval:1.0, range:70, aggro:130, r:5.5, shape:'shadow', specialty:true, takes:{caster:1.5} },
  sapper:      { name:'Sapper',           race:'dwarf',    model:'sapper',hp:45, speed:45, dmg:6, interval:1.6, range:110,aggro:140, r:5.5, shape:'priest', splash:12, sb:2, specialty:true },
  berserker:   { name:'Berserker',        race:'orc',      model:'berserker',  hp:40, speed:80, dmg:10,interval:1.0, range:40, aggro:120, r:5,   shape:'foot',   melee:true, specialty:true },
  shade:       { name:'Shade',            race:'skeletal', model:'shade',    hp:40, speed:60, dmg:5, interval:1.0, range:40, aggro:110, r:5,   shape:'ghoul',  melee:true },
  stoneHurler: { name:'Stone Hurler',     race:'troll',    model:'stoneHurler',hp:60, speed:45, dmg:6, interval:1.6, range:85, aggro:120, r:6,   shape:'priest', splash:10, sb:2, specialty:true },
};

const FIGHTER_VS = { inf:1.5, light:1.2, heavy:0.5, struct:0.3 };
const CORE_SLOTS=['scout','line','spawner','flyer','caster','aa'];
// v14: one core stat line for both factions (the old Forsaken asymmetries are gone); only the looks differ per faction
const CORE_BASE={
  scout:  { cls:'light', hp:90, speed:138, dmg:4, interval:0.33, range:65, targets:'ground', cost:4, rank:1, shape:'rider', r:7, scout:true, role:'scout', proj:'tracer' },
  line:   { cls:'heavy', hp:265, speed:60, dmg:11, interval:1.0, range:100, targets:'ground', cost:9, rank:1, shape:'tank', r:10, role:'line', proj:'bolt' },
  spawner:{ cls:'light', hp:60, speed:115, targets:'none', cost:7, rank:2, shape:'wagon', r:9, spawns:{n:3,every:14}, role:'caravan' },
  flyer:  { cls:'air', air:true, hp:170, speed:180, dmg:6.5, interval:0.5, range:75, arc:55, targets:'both', cost:9, rank:2, shape:'fighter', r:9, turn:3.2, fighter:true, vs:FIGHTER_VS, tag:'fighter', role:'air', proj:'tracer' },
  caster: { cls:'light', hp:50, speed:85, dmg:28, interval:2.5, range:200, minRange:60, splash:40, targets:'ground', stationary:true, noLOS:true, cost:12, rank:2, shape:'star', r:7, tag:'caster', vs:{inf:1.3}, prefer:['specialty','inf'], role:'caster' },
  aa:     { cls:'light', hp:60, speed:85, dmg:8, interval:0.5, range:160, targets:'air', cost:15, rank:3, shape:'aa', r:9, tag:'aa', role:'aa', proj:'bolt' },
};
const CORE_LOOK={
  covenant:{ spawner:{mark:'cross'}, caster:{proj:'orb'} },
  forsaken:{ spawner:{mark:'skull'}, caster:{proj:'hex'} },
};
// v16: every army has its own miniatures for the six core slots
const RACE_MODELS={
  human:   { scout:'outrider',     line:'warder',      spawner:'caravan',      flyer:'pegasus',     caster:'mage',       aa:'ballista' },
  elf:     { scout:'stagRider',    line:'treant',      spawner:'gladeWagon',   flyer:'elfGriffon',  caster:'starweaver', aa:'thornbow' },
  dwarf:   { scout:'ramRider',     line:'ironclad',    spawner:'holdWagon',    flyer:'gyrocopter',  caster:'runesmith',  aa:'thunderer' },
  orc:     { scout:'wolf',         line:'armoredBoar', spawner:'warbandCart',  flyer:'orcWyvern',   caster:'shaman',     aa:'harpoonCart' },
  skeletal:{ scout:'barrowRider',  line:'graveKnight', spawner:'boneCart',     flyer:'boneWyvern',  caster:'lich',       aa:'shardFlinger' },
  troll:   { scout:'goblinRunner', line:'caveTroll',   spawner:'trollkinCart', flyer:'direBat',     caster:'bogWitch',   aa:'slingTroll' },
};
const CORE={};
for(const f of ['covenant','forsaken']){ CORE[f]={}; for(const k of CORE_SLOTS) CORE[f][k]={ ...CORE_BASE[k], ...CORE_LOOK[f][k] }; }
const SLOT_TEXT={
  scout:'Fastest ground unit. Grabs relic caches and runs down casters nobody is guarding.',
  line:'Front-line fighter. Drop it on a lane to lead the push, screen fragile units and soak tower fire.',
  spawner:'Drives to a spot and raises a squad of infantry every 14 s that joins the nearest lane.',
  flyer:'Fighter. Guards the sky and strafes troops along the loop you draw. Dies to anti-air.',
  caster:'The core mortar: lobs area spells just past tower range with no line of sight. Must stand still to cast; fragile up close, so post it on a nest.',
  aa:'Anti-air. Only shoots flyers, but shreds them.',
};
// race skins: the same six core slots under each army's names; inf = the infantry its waves and core spawner raise
const RACES={
  human:   { army:'Human Knights',  inf:'levy',        names:{ scout:'Courser',       line:'Knight',         spawner:'Levy Wagon',     flyer:'Pegasus Knight', caster:'War Mage',  aa:'Ballista Wagon' } },
  elf:     { army:'Elven Army',     inf:'wildwoodWarden', names:{ scout:'Stag Rider',    line:'Warden Treant',  spawner:'Glade Wagon',    flyer:'Griffon Rider',  caster:'Starweaver', aa:'Thornbow Array' } },
  dwarf:   { army:'Dwarven Army',   inf:'axeDwarf',    names:{ scout:'Ram Rider',     line:'Steam Ironclad', spawner:'Hold Wagon',     flyer:'Gyrocopter',     caster:'Runesmith', aa:'Thunderer' } },
  orc:     { army:'Orcish Army',    inf:'grunt',       names:{ scout:'Wolf Rider',    line:'Armored Boar',   spawner:'Warband Cart',   flyer:'Wyvern Rider',   caster:'Shaman',    aa:'Harpoon Cart' } },
  skeletal:{ army:'Skeletal Army',  inf:'skeleton',    names:{ scout:'Barrow Rider',  line:'Grave Knight',   spawner:'Ossuary Cart',   flyer:'Bone Wyvern',    caster:'Lich',      aa:'Shard Flinger' } },
  troll:   { army:'Troll Army',     inf:'trollkin',    names:{ scout:'Goblin Runner', line:'Cave Troll',     spawner:'Trollkin Cart',  flyer:'Dire Bat Rider', caster:'Bog Witch', aa:'Sling Troll' } },
};
const UNITS = {
  // ---- Sir Asher Holts (Covenant, Infantry, Human Knights) ----
  swornGuardWagon:{ name:'Sworn Guard Wagon', short:'Sworn Guard', race:'human', cls:'light', hp:70, speed:115, targets:'none', cost:9, rank:2, shape:'wagon', r:9, spawns:{type:'swornGuard',n:3,every:14}, role:'caravan', mark:'cross', model:'guardWagon',
    text:'Raises Sworn Guard: shield squads with twice a levy’s health, but slower. Hold a chokepoint against anything on foot.' },
  greatArbalest:{ name:'Great Arbalest', short:'Arbalest', race:'human', cls:'light', hp:170, speed:25, dmg:26, interval:2.0, range:170, targets:'ground', cost:14, rank:3, shape:'cannon', r:9, tag:'at', vs:{heavy:2, inf:0.4}, prefer:['heavy'], role:'at', proj:'bolt', model:'arbalest',
    text:'Crawls, needs line of sight, and two-shots heavies. Best on the overlook or behind a Guard wall.' },
  paladinLord:{ name:'Paladin Lord', short:'Paladin Lord', race:'human', cls:'heavy', hp:330, speed:60, dmg:16, interval:1.0, range:100, targets:'ground', cost:24, rank:4, shape:'tank', r:12, vs:{struct:1.5}, role:'line', proj:'bolt', model:'paladinLord',
    text:'The toughest unit on the Covenant side. His warhammer hits towers hard.' },
  // ---- Kyndrili Veli'sha (Covenant, Air, Elven Army) ----
  shadowstalkerWagon:{ name:'Shadowstalker Wagon', short:'Shadowstalkers', race:'elf', cls:'light', hp:70, speed:115, targets:'none', cost:9, rank:2, shape:'wagon', r:9, spawns:{type:'shadowstalker',n:3,every:14}, role:'caravan', mark:'hood', model:'shadowCaravan',
    text:'Raises Shadowstalkers: elite rangers with twice an archer’s damage and longer range. Fragile under towers and casters.' },
  moonhawk:{ name:'Moonhawk Knight', short:'Moonhawk', race:'elf', cls:'air', air:true, hp:160, speed:180, dmg:5.5, interval:0.5, range:150, arc:70, targets:'both', cost:16, rank:3, shape:'heavyFighter', r:11, turn:2.8, fighter:true, hunter:['heavy','air'], vs:{heavy:1.5, struct:0.4}, tag:'fighter', role:'air', proj:'tracer', model:'moonhawk',
    text:'Ranged griffon lancer. Engages armor and flyers inside its loop on its own, so one loop covers a lane.' },
  crystalChariot:{ name:'Crystal Chariot', short:'Crystal Chariot', race:'elf', cls:'heavy', hp:290, speed:85, dmg:8, interval:0.5, range:100, targets:'both', cost:24, rank:4, shape:'sanctum', r:11, role:'line', proj:'bolt', model:'crystalChariot',
    text:'A tough chariot that fires fast at ground and air alike. Her only heavy ground unit.' },
  // ---- Thane Borvik Stonehallow (Covenant, Siege, Dwarven Army) ----
  sapperWagon:{ name:'Sapper Wagon', short:'Sappers', race:'dwarf', cls:'light', hp:80, speed:100, targets:'none', cost:9, rank:2, shape:'wagon', r:9, spawns:{type:'sapper',n:3,every:14}, role:'caravan', mark:'sun', model:'sapperWagon',
    text:'Raises Sappers: slow hand-mortar dwarves with bonus damage to towers, weaker than levies up close.' },
  thunderCannon:{ name:'Thunder Cannon', short:'Thunder Cannon', race:'dwarf', cls:'light', hp:200, speed:40, dmg:28, interval:2.2, range:190, targets:'ground', stationary:true, cost:12, rank:3, shape:'cannon', r:9, tag:'at', vs:{heavy:2, inf:0.4}, prefer:['heavy'], role:'at', proj:'shot', model:'thunderCannon',
    text:'Siege gun that must stop to fire. Outranges towers and two-shots heavies, but it is helpless while it rolls and the keep outguns it.' },
  earthshaker:{ name:'Earthshaker', short:'Earthshaker', race:'dwarf', cls:'heavy', hp:280, speed:60, dmg:14, interval:2.2, range:215, minRange:60, multi:3, splash:24, targets:'ground', stationary:true, noLOS:true, cost:24, rank:4, shape:'orbWagon', r:10, tag:'caster', role:'caster', proj:'shot', model:'earthshaker',
    text:'Multi-barrel mortar battery. Volleys at three targets at once from beyond tower range; must stand still to fire.' },
  // ---- Warchief Grom (Forsaken, Infantry, Orcish Army) ----
  berserkerCart:{ name:'Berserker Cart', short:'Berserkers', race:'orc', cls:'light', hp:70, speed:115, targets:'none', cost:9, rank:2, shape:'wagon', r:9, spawns:{type:'berserker',n:3,every:14}, role:'caravan', mark:'skull', model:'berserkerCart',
    text:'Raises Berserkers: faster than grunts, twice the damage, less health. They win the clash if they swing first.' },
  tuskBreaker:{ name:'Tusk Breaker', short:'Tusk Breaker', race:'orc', cls:'heavy', hp:280, speed:85, dmg:32, interval:2.0, range:50, targets:'ground', cost:14, rank:3, shape:'beetle', r:11, tag:'at', vs:{heavy:2, inf:0.4}, prefer:['heavy'], role:'at', proj:'shot', model:'tuskBreaker',
    text:'Melee armor-breaker: the Arbalest’s damage on a mobile brute that needs no line of sight, but it must close in.' },
  bloodChampion:{ name:'Blood Champion', short:'Champion', race:'orc', cls:'heavy', hp:240, speed:85, dmg:24, interval:1.0, range:100, targets:'ground', cost:24, rank:4, shape:'tank', r:12, vs:{struct:1.5}, role:'line', proj:'bolt', model:'bloodChampion',
    text:'Less health than a Paladin Lord, more damage and twice the speed. Cracks towers fast and stands under them less long.' },
  // ---- Duchess Ilsabet Mourncroft (Forsaken, Air, Skeletal Army) ----
  shadeCart:{ name:'Shade Cart', short:'Shades', race:'skeletal', cls:'light', hp:70, speed:115, targets:'none', cost:8, rank:2, shape:'wagon', r:9, spawns:{type:'shade',n:4,every:14}, role:'caravan', mark:'skull', model:'shadeCart',
    text:'Raises Shades: ordinary skeleton stats, but four per wave instead of three, and a gold cheaper.' },
  dreadWyvern:{ name:'Dread Wyvern', short:'Dread Wyvern', race:'skeletal', cls:'air', air:true, hp:240, speed:140, dmg:5.5, interval:0.5, range:100, arc:70, targets:'both', cost:16, rank:3, shape:'heavyFighter', r:11, turn:2.6, fighter:true, hunter:['heavy','air'], vs:{heavy:1.5, struct:0.4}, tag:'fighter', role:'air', proj:'tracer', model:'wyvernLord',
    text:'Heavy flyer that engages armor and flyers on its loop. Tougher, slower and shorter-ranged than the Moonhawk.' },
  ossuaryDrake:{ name:'Ossuary Drake', short:'Drake', race:'skeletal', cls:'air', air:true, hp:200, speed:140, targets:'none', bomber:{dmg:30, every:0.4, radius:45}, cost:24, rank:4, shape:'dragon', r:14, turn:2.0, vs:{struct:1.2}, keepMult:0.35, role:'bomber', model:'boneDragon',
    text:'Bone dragon that rains shards along the line you draw. Huge against towers and clumps, reduced against the Citadel. Dies to fighters.' },
  // ---- Mawgrom (Forsaken, Siege, Troll Army) ----
  hurlerCart:{ name:'Hurler Cart', short:'Hurlers', race:'troll', cls:'light', hp:80, speed:100, targets:'none', cost:9, rank:2, shape:'wagon', r:9, spawns:{type:'stoneHurler',n:3,every:14}, role:'caravan', mark:'skull', model:'cart',
    text:'Raises Stone Hurlers: ranged trollkin with bonus damage to towers; shorter range and more health than Sappers.' },
  boulderTroll:{ name:'Boulder Troll', short:'Boulder Troll', race:'troll', cls:'heavy', hp:200, speed:45, dmg:26, interval:2.2, range:150, targets:'ground', cost:14, rank:3, shape:'golem', r:11, tag:'at', vs:{heavy:2, inf:0.4}, prefer:['heavy'], role:'at', proj:'shot', model:'boulderTroll',
    text:'Hurls boulders that crack armour from range. Slow and tough, and it keeps firing on the move; weak against infantry.' },
  mountainTroll:{ name:'Mountain Troll', short:'Mountain Troll', race:'troll', cls:'heavy', hp:360, speed:60, dmg:32, interval:2.0, range:60, splash:18, targets:'ground', cost:24, rank:4, shape:'golem', r:14, vs:{struct:1.5}, role:'line', proj:'shot', model:'mountainTroll',
    text:'Harnessed war-troll with a battering log: the most health in the game and a splashing swing, but it must reach the tower.' },
};
const FACTIONS = {
  covenant:{ key:'covenant', name:'Covenant', keep:'Covenant Keep', tower:'Watchtower',
    super:{ name:'Divine Judgment', short:'Judgment', radius:105, dmg:380, style:'judgment' },
    pal:{ body:'#2f6fd6', rim:'#e2b54a', dark:'#1b3f82', light:'#a9c8ff', stone:'#a3a9b0', proj:'#fff0b8', rgb:'226,181,74' } },
  forsaken:{ key:'forsaken', name:'Forsaken', keep:'Forsaken Citadel', tower:'Bone Spire',
    super:{ name:'Meteor', short:'Meteor', radius:80, dmg:420, style:'meteor' },
    pal:{ body:'#8e2630', rim:'#e3d6b8', dark:'#4c1117', light:'#ffb0b6', stone:'#8a8480', proj:'#a6f5c0', rgb:'227,214,184' } },
};
const COMMANDERS = {
  holts:   { faction:'covenant', race:'human',    name:'Sir Asher Holts',            short:'Holts',    title:'Lord Marshal of the Shieldwall', arch:'Infantry', voice:'Steady, dutiful, short orders',
             blurb:'Hold the chokepoint, then advance as one block. Shield squads, a crawling arbalest and the Paladin Lord. Least micro.', units:['swornGuardWagon','greatArbalest','paladinLord'] },
  kyndrili:{ faction:'covenant', race:'elf',      name:'Kyndrili Veli’sha',     short:'Kyndrili', title:'Windsinger of the Silver Aerie', arch:'Air',      voice:'Serene, aloof, talks to the wind',
             blurb:'Strike where they aren’t looking. Precision flyers, elite rangers and a crystal chariot. Most micro.', units:['shadowstalkerWagon','moonhawk','crystalChariot'] },
  borvik:  { faction:'covenant', race:'dwarf',    name:'Thane Borvik Stonehallow',   short:'Borvik',   title:'Master of Engines',               arch:'Siege',    voice:'Gruff, cheerful, loves his machines',
             blurb:'Outrange it, then roll over it. Sappers, a thunder cannon and the Earthshaker mortar. Low micro.', units:['sapperWagon','thunderCannon','earthshaker'] },
  grom:    { faction:'forsaken', race:'orc',      name:'Warchief Grom',              short:'Grom',     title:'Leader of the Blood Legion',      arch:'Infantry', voice:'Brutal, guttural, counts kills',
             blurb:'Hit first, hit hardest: tempo over endurance. Berserkers, a tusked armor-breaker and the Blood Champion. Least micro.', units:['berserkerCart','tuskBreaker','bloodChampion'] },
  ilsabet: { faction:'forsaken', race:'skeletal', name:'Duchess Ilsabet Mourncroft', short:'Ilsabet',  title:'the Hollow Crown',                arch:'Air',      voice:'Dark fallen nobility, cold and courtly',
             blurb:'The sky never empties: durable, numerous flyers. Shades, the Dread Wyvern and the Ossuary Drake. Most micro.', units:['shadeCart','dreadWyvern','ossuaryDrake'] },
  mawgrom: { faction:'forsaken', race:'troll',    name:'Mawgrom',                    short:'Mawgrom',  title:'the Mountain That Walks',          arch:'Siege',    voice:'Ancient, slow-spoken, a force of nature',
             blurb:'Walk up and knock it down: tough, slow columns. Stone hurlers, boulder trolls and the Mountain Troll. Low micro.', units:['hurlerCart','boulderTroll','mountainTroll'] },
};
const SHORT_NAMES={ 'Pegasus Knight':'Pegasus', 'Ballista Wagon':'Ballista', 'Warden Treant':'Treant', 'Griffon Rider':'Griffon', 'Thornbow Array':'Thornbow', 'Steam Ironclad':'Ironclad', 'Wyvern Rider':'Wyvern', 'Harpoon Cart':'Harpoon', 'Armored Boar':'Boar', 'Barrow Rider':'Barrow', 'Shard Flinger':'Shards', 'Goblin Runner':'Goblin', 'Dire Bat Rider':'Dire Bat', 'Trollkin Cart':'Trollkin', 'Ossuary Cart':'Ossuary', 'Warband Cart':'Warband' };
// build each commander's six core units from its faction's stat lines and its race's names
for(const [ck,c] of Object.entries(COMMANDERS)){
  const R=RACES[c.race]; c.army=R.army; c.core=[];
  for(const slot of CORE_SLOTS){
    const base=CORE[c.faction][slot], id=c.race+'_'+slot, nm=R.names[slot];
    const d={ ...base, name:nm, short:SHORT_NAMES[nm]||nm, race:c.race, slot, text:SLOT_TEXT[slot], model:RACE_MODELS[c.race][slot] };
    if(base.spawns) d.spawns={ ...base.spawns, type:R.inf };
    UNITS[id]=d; c.core.push(id);
  }
  for(const u of c.units) UNITS[u].commander=ck;
}
for(const [id,d] of Object.entries(UNITS)){
  d.id=id;
  const m=CONFIG.rankMult[d.rank]||1;
  d.hp=Math.round(d.hp*m);
  if(d.dmg) d.dmg=+(d.dmg*m).toFixed(2);
  if(d.bomber) d.bomber={...d.bomber,dmg:d.bomber.dmg*m};
  if(d.diver) d.diver={...d.diver,dmg:d.diver.dmg*m};
  d.speed*=CONFIG.speedMult;
  d.r=+(d.r*(1.2+(d.rank-1)*0.08)).toFixed(1);
}
for(const [id,d] of Object.entries(INF)){ d.id=id; d.speed*=CONFIG.speedMult; d.r=+(d.r*1.15).toFixed(1); }
function rosterOf(cmdKey){
  const c=COMMANDERS[cmdKey];
  return [...c.core, ...c.units].sort((a,b)=>UNITS[a].rank-UNITS[b].rank || UNITS[a].cost-UNITS[b].cost);
}
const modelOf=id=>{ const d=UNITS[id]||INF[id]; return (d&&d.model)||id; };
