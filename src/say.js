/* v21: commander blurbs (locked lines: claude/commander-blurbs.md). A short line from your commander, or the enemy's, in a
   toast under the clock. Cosmetic only: nothing here touches the sim state, so lockstep and saves are unaffected.
   Keys: first flyer unit rank elite strike towerLost towerWon gate keepLow gold[3] win lose */
const SAY_LINES={
  kyndrili:{ first:'The wind favours this. Go.', flyer:'Moonhawks, up.', unit:'Quietly now.', rank:'Ah. There is the sky I wanted.', elite:'Something heavy and slow. How thoughtful of them.', strike:'Look up.', towerLost:'A tower is only a place to stand. We’ll stand elsewhere.', towerWon:'One fewer place for them to stand.', gate:'Their gate is open. I can see straight through.', keepLow:'The ground is closer than I’d like.', gold:['Your purse is full. Gold that sits does not fly.','Do spend something. The sky is looking very empty.','Still full. I shall hum until you spend something.'], win:'The wind told me. I merely agreed.', lose:'The air went still. Next time I will listen sooner.' },
  holts:{ first:'Shields up. Hold the line.', flyer:'Wings up. Try to bring them home.', unit:'Steady.', rank:'Good. Now we can do this properly.', elite:'Something big on the left. Nobody panic.', strike:'Judgment. Clear the ground.', towerLost:'We’ll have that back.', towerWon:'One down. Don’t cheer yet.', gate:'That’s the gate. Finish it cleanly.', keepLow:'The keep is hurting. Nobody leaves this line.', gold:['A full purse does no work.','Spend it. Coin in a purse never held a wall.','Still full. I’ll assume that’s deliberate. It isn’t, is it.'], win:'Well held. Count the wounded.', lose:'Fall back to the road. We’re not done; we’re just done here.' },
  borvik:{ first:'Mind the wheels!', flyer:'Up she goes! Don’t let her touch the ground, she’s sulky.', unit:'Gently now. Gently. She’s only just been oiled.', rank:'Ha! The good machines are open now.', elite:'Oh, a big one. Oh, that’s lovely. Load.', strike:'Everybody back from the barrel!', towerLost:'Pff. That one was held together with hope. We’ll build it better.', towerWon:'There goes a tower! Nice and clean, no splinters.', gate:'Gate’s open! Somebody bring the big cannon.', keepLow:'The keep’s rattling! Hold her together, lads!', gold:['Gold in the purse, no gears in the wagon. Spend, spend!','That’s a lot of coin doing nothing. I could build a whole cannon with that.','Still full! I’m not going to say anything. … Spend it!'], win:'Ha! Write that on the barrel. No, the other barrel.', lose:'Back to the workshop. I know exactly what went wrong. Several things.' },
  grom:{ first:'Go. Go. GO.', flyer:'Wyverns. Up. Hit something expensive.', unit:'Berserkers, ahead of me.', rank:'More. Good. Send more.', elite:'Big one. Means they’re scared.', strike:'Meteor. Don’t stand under it.', towerLost:'Tower’s gone! That better not happen again!', towerWon:'Down. Next.', gate:'The gate’s open. Everybody in. Now!', keepLow:'Keep’s cracking. Whoever let them in, I’ll find you.', gold:['Full purse. Buy something. Now.','Coin sits, we sit. Spend it.','Still full. SPEND. THE. GOLD.'], win:'The keep’s ours. Cut the Legion’s name into the gate.', lose:'Fine. They bled for it. Next time they drown.' },
  ilsabet:{ first:'Rise, and attend me.', flyer:'The Drake will join us presently.', unit:'Shades. You know what to do.', rank:'The crown remembers. Open the next vault.', elite:'How gauche. Kill it.', strike:'I have asked the sky for a small favour.', towerLost:'Stone falls. We do not.', towerWon:'One less thing for them to hide behind.', gate:'Their gate is open. Do come in, all of you.', keepLow:'They are in the house. How very rude.', gold:['A full purse is a locked vault, my dear. Do open it.','I would not wish to hurry you. I would wish you to spend something.','Still full. I have waited a great while. I would rather not wait for this.'], win:'You left me once. Note that I did not leave you.', lose:'Patience. I have had a great deal of practice at waiting.' },
  mawgrom:{ first:'Walk.', flyer:'Wings. We will allow it.', unit:'Hurlers. Find a rock.', rank:'Now the old ones wake.', elite:'Small.', strike:'Stand away. The sky is heavy.', towerLost:'Towers fall. Mountains do not notice.', towerWon:'That was in the way. Now it is not.', gate:'Their wall is thin. We can feel it.', keepLow:'We are being moved. We do not like being moved.', gold:['The purse is full. Heavy things should be thrown.','Gold that does not move is only a rock. We know about rocks. Spend it.','Still full. We can wait longer than you. Please do not make us.'], win:'The stones will remember this. So will we.', lose:'We will be here. We are always here. Come back when you are ready.' },
};
const SAY_CFG={
  gap:20,                 // seconds (game time) between blurbs; gold alerts ignore it
  life:3400,              // ms on screen
  keyGap:{ flyer:90, unit:90, elite:60, towerLost:30, towerWon:30, gate:30 },   // the same line is not repeated sooner than this
  once:new Set(['first','keepLow']),                                             // once per side per match
  prio:{ gold:8, gate:6, keepLow:6, towerLost:5, strike:5, towerWon:4, elite:4, rank:3, first:2, flyer:1, unit:1 },
  goldWait:8, goldEvery:15, keepLow:0.35,
};
const SAY={ s:null, q:[], last:-1e9, keyAt:{}, said:new Set(), gold:{ since:null, step:0, next:0 }, timer:0, log:[] };
function voiceOn(){ return STYLE.voice!==false; }
function sayReset(){
  SAY.s=S; SAY.q.length=0; SAY.last=-1e9; SAY.keyAt={}; SAY.said=new Set(); SAY.gold={ since:null, step:0, next:0 };
  const el=document.getElementById('cmdSay'); if(el){ el.hidden=true; clearTimeout(SAY.timer); }
}
function sayLine(team,key,i){ const L=SAY_LINES[cmdKeyOf(S.teams[team])]; if(!L) return null; const v=L[key]; return Array.isArray(v)?v[i|0]:v; }
// called from the sim's event points (deploy, seals, strikes, towers). Queues a request; sayTick picks one.
function say(team,key,i){
  if(!S || S.demo || S.phase!=='play' || !S.teams[team]) return;
  if(SAY.s!==S || S.t<SAY.last) sayReset();
  const me=S.teams[ME]; if(!me || me.ai) return;                       // nobody at this screen (AI-vs-AI)
  const mine=team===ME;
  if(!mine && (key==='flyer'||key==='unit'||key==='gold')) return;    // the enemy's deploy chatter and purse stay private
  const id=team+':'+key;
  if(SAY_CFG.once.has(key)){ if(SAY.said.has(id)) return; SAY.said.add(id); }
  if(headless || !voiceOn()) return;
  SAY.q.push({ team, key, i, t:S.t, prio:(SAY_CFG.prio[key]||1)+(mine?0.5:0) });
}
function sayTick(){
  if(!S || S.demo || S.phase!=='play') return;
  if(SAY.s!==S || S.t<SAY.last) sayReset();
  const me=S.teams[ME]; if(!me || me.ai) return;
  // gold-full alert: after goldWait s at the cap, three lines goldEvery s apart, then quiet until the purse is spent and refilled
  const g=SAY.gold;
  if(me.gold<CONFIG.gold.cap){ g.since=null; g.step=0; }
  else {
    if(g.since==null) g.since=S.t;
    if(g.step<3 && S.t-g.since>=SAY_CFG.goldWait && S.t>=g.next){
      say(ME,'gold',g.step);
      if(g.step===0 && voiceOn()){                                          // a nudge toward what the purse could buy right now
        if(me.rank<4 && me.gold>=CONFIG.seals[me.rank+1]) toast(`The Rank ${ROMAN[me.rank+1]} seal is within reach`,'info');
        else if(me.rank>=CONFIG.super.rank && me.superCd<=0 && me.gold>=CONFIG.super.cost) toast(`${me.faction.super.name} is ready`,'info');
      }
      g.step++; g.next=S.t+SAY_CFG.goldEvery;
    }
  }
  // own keep low (either side)
  for(const k of S.keeps||[]){ if(!k.dead && k.hp/(k.maxHp||CONFIG.keep.hp)<SAY_CFG.keepLow) say(k.team,'keepLow'); }
  if(!SAY.q.length) return;
  SAY.q=SAY.q.filter(r=>S.t-r.t<2);                                     // a moment that has passed is not worth a line
  SAY.q.sort((a,b)=>b.prio-a.prio);
  while(SAY.q.length){
    const r=SAY.q[0], kg=SAY_CFG.keyGap[r.key], kid=r.team+':'+r.key;
    if(kg && S.t-(SAY.keyAt[kid]??-1e9)<kg){ SAY.q.shift(); continue; }
    if(r.key!=='gold' && S.t-SAY.last<SAY_CFG.gap) return;               // wait (it expires after 2 s)
    SAY.q.length=0; SAY.keyAt[kid]=S.t; SAY.last=S.t; showSay(r.team,r.key,r.i); return;
  }
}
function showSay(team,key,i){
  const el=document.getElementById('cmdSay'), T=S.teams[team], k=cmdKeyOf(T), line=sayLine(team,key,i);
  if(!el || !line) return;
  SAY.log.push(Math.round(S.t)+':'+team+':'+key);
  const c=COMMANDERS[k]||T.cmd;
  el.className='cs'+(team===ME?'':' foe')+(T.faction.key==='forsaken'?' forsaken':'');
  el.innerHTML=`${portraitImg(k,'cs-p')}<div class="cs-t"><span class="cs-n">${c.short||c.name}</span><span class="cs-l">“${line}”</span></div>`;
  sayPlace(); el.hidden=false;
  el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  clearTimeout(SAY.timer); SAY.timer=setTimeout(()=>{ el.hidden=true; },SAY_CFG.life);
}
function sayPlace(){
  const el=document.getElementById('cmdSay'); if(!el) return;
  const top=hudTop.getBoundingClientRect(), compact=document.documentElement.classList.contains('compact');
  let y=top.bottom+(compact?6:10);
  if(compact && innerHeight>innerWidth && !mini.hidden){ const m=mini.getBoundingClientRect(); if(m.height) y=Math.max(y,m.bottom+8); }
  el.style.top=y+'px';
}
