/* ---------- v18 multiplayer UI: Play a friend, waiting room, pause/rejoin, quick chat, rematch, host saves ----------
   v18.1: rooms, names and saves come from the JAYKOBI GAMES account. The game runs on the site (same origin) at
   /play/citadels-gate; rooms live at /api/citadel/rooms/*, saves at /api/platform/saves/citadels-gate/<slot>.
   Off the site (claude.ai preview, a file) multiplayer is unavailable and single player is unchanged. */
const MP={ overlayOn:false, lastRoom:null, saveKey:'cc-mp-save', slot:'match', platform:null, user:null, saveRev:0, cloudSave:null };
const CHAT_LINES=['Good luck!','Well played','Nice one','Oops','Hold on a moment','Ready when you are'];
const mpEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function mpApi(path,opts={}){
  const r=await fetch(path,{ credentials:'same-origin', cache:'no-store', ...opts, headers:{ ...(opts.body?{ 'Content-Type':'application/json' }:{}), ...(opts.headers||{}) } });
  let body=null; try{ body=await r.json(); }catch(_){}
  if(!r.ok){ const e=new Error((body&&body.error)||('Request failed ('+r.status+')')); e.status=r.status; throw e; }
  return body;
}
// ---- the site: are we on it, and who is signed in? ----
async function mpDetect(){
  if(location.protocol==='file:' || /claude\.ai$|claudeusercontent\.com$|github\.io$/.test(location.hostname)){ MP.platform=false; return; }
  try{ const me=await mpApi('/api/platform/me'); MP.platform=true; MP.user=me&&me.user||null; }
  catch(_){ MP.platform=false; MP.user=null; }
}
function mpPlayUrl(code){ return `${location.origin}/play/citadels-gate${code?'?join='+code:''}`; }
function mpRoomsUrl(code){ const wss=location.protocol==='https:'?'wss':'ws'; return `${wss}://${location.host}/api/citadel/rooms/${code}/ws`; }
function mpMenuMsg(text,tone){ const el=$('mpMsg'); if(!el) return; el.textContent=text||''; el.className='lnote mp-msg '+(tone||''); }
function mpCleanCode(code){ return (code||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,5); }
function mpCanPlay(){
  if(MP.platform===null){ mpMenuMsg('Checking your sign-in…'); return false; }
  if(!MP.platform){ mpMenuMsg('Online play runs on JAYKOBI GAMES (games.jaykobi.workers.dev).','bad'); return false; }
  if(!MP.user){ mpMenuMsg('Sign in on JAYKOBI GAMES first, then come back to this page.','bad'); return false; }
  return true;
}
// ---- entry points ----
async function mpCreate(snapshot){
  if(!mpCanPlay()) return;
  mpMenuMsg('Creating a room…');
  try{ const { code }=await mpApi('/api/citadel/rooms/new',{ method:'POST', body:'{}' }); mpConnect(code,()=>({ cmd:setup.cmd, ...(snapshot?{ snapshot }:{}) })); mpMenuMsg(''); }
  catch(e){ mpMenuMsg(e.message,'bad'); }
}
function mpJoin(code){
  code=mpCleanCode(code); if(code.length<5){ mpMenuMsg('Enter the 5-letter room code.','bad'); return; }
  if(!mpCanPlay()) return;
  mpConnect(code,()=>({}));
}
function mpConnect(code,hello){
  NET_RESET(); NET.state='lobby'; NET.code=code; MP.hello=hello; MP.wsUrl=mpRoomsUrl(code);
  try{ sessionStorage.setItem('cc-mp-room',code); }catch(_){}
  NET.onUi=mpEvent; NET.connectWs(MP.wsUrl,hello);
  mpShowLobby('Connecting…');
}
function mpLeave(){ NET.leave(); mpHideOverlay(); try{ sessionStorage.removeItem('cc-mp-room'); }catch(_){} if(S && !S.demo){ toMenu(); } renderMenu(); mpRefreshMenu(); }
// ---- events from NET ----
function mpEvent(ev,m){
  switch(ev){
    case 'connected': break;
    case 'error': if(NET.state==='lobby' && !NET.room){ mpHideOverlay(); mpMenuMsg(m,'bad'); } else if(MP.overlayOn && NET.state==='lobby') mpShowLobby(m); else toast(m,'bad'); break;
    case 'refused': mpHideOverlay(); NET.state='idle'; if(S && !S.demo && m.code!==4004) toMenu();
      mpMenuMsg(m.code===4005?'This room is open in another tab.':m.code===4001?'Your sign-in expired. Sign in again on JAYKOBI GAMES.':(m.reason||'Could not join that room.'),'bad'); break;
    case 'room': MP.lastRoom=m; if(NET.state==='lobby' || !S || S.demo) mpShowLobby(); break;
    case 'start': mpStart(m); break;
    case 'go': mpHideOverlay(); break;
    case 'pause': mpShowPause(m); break;
    case 'peer': if(m.state==='away') mpShowPause({ reason:'away', seat:m.seat }); else if(m.state==='back') mpShowPause({ reason:'syncing' }); else if(m.state==='rematch') toast(`${mpPeerName()} wants a rematch`,'info'); break;
    case 'resync': mpShowPause({ reason:'syncing' }); break;
    case 'state': NET.applyState(m); setupHUD(); mpShowPause({ reason:'syncing' }); break;
    case 'resume': mpShowResume(m); break;
    case 'chat': mpChatBubble(m); break;
    case 'over':
      mpHideOverlay();
      if(S && !S.demo && S.phase!=='over' && (m.reason==='forfeit'||m.reason==='left'||m.reason==='lost')){
        S.phase='over'; S.winner=m.winner==null?-1:m.winner; S.endTime=S.t; S.overAt=performance.now()-2000; S.forfeit=m.reason!=='lost'; S.lost=m.reason==='lost'; }
      break;
    case 'dropped': if(NET.state==='lobby') mpShowLobby('Reconnecting…'); else mpShowPause({ reason:'self' }); break;
    case 'closed': if(NET.state==='lobby'){ mpHideOverlay(); mpMenuMsg('Lost the connection to the room.','bad'); } break;
  }
}
function mpPeerName(){ const r=MP.lastRoom; if(!r||!r.players) return 'Your opponent'; const p=r.players[1-NET.seat]; return p?p.name:'Your opponent'; }
// ---- the waiting room ----
function mpShowLobby(status){
  const r=MP.lastRoom, me=NET.seat, host=me===0, ps=(r&&r.players)||[null,null], other=ps[1-me];
  const myCmd=host?setup.cmd:(ps[me]&&ps[me].cmd)||null;
  const foeFaction=k=>COMMANDERS[k].faction==='covenant'?'forsaken':'covenant';
  // the guest picks from the faction the host isn't playing
  const hostCmd=ps[0]&&ps[0].cmd; const pickFrom=host||me<0?null:(hostCmd?foeFaction(hostCmd):null);
  const seat=(p,i)=>`<div class="mp-seat ${p?'':'empty'}">${p&&p.cmd?portraitImg(p.cmd,COMMANDERS[p.cmd].faction):'<div class="mp-ph"></div>'}<div><b>${p?mpEsc(p.name):(i===0?'Host':'Waiting for a friend…')}</b><small>${p&&p.cmd?COMMANDERS[p.cmd].name:(p?'Choosing a commander':'')}</small>${p?`<span class="mp-rdy ${p.ready?'on':''}">${p.away?'Away':p.ready?'Ready':'Not ready'}</span>`:''}</div></div>`;
  const picks=pickFrom?`<div class="mp-pick">${Object.entries(COMMANDERS).filter(([k,c])=>c.faction===pickFrom).map(([k,c])=>`<button class="mp-cmd ${k===myCmd?'on':''}" data-k="${k}">${portraitImg(k,c.faction)}<span>${c.short}</span></button>`).join('')}</div>`:'';
  const canStart=host && ps[0] && ps[1] && ps[0].ready && ps[1].ready && !ps[1].away;
  hud.overlay.className='overlay mp'; hud.overlay.hidden=false; MP.overlayOn=true;
  hud.overlay.innerHTML=`<div class="card mp-card"><div class="eyebrow">Play a friend · Sylvanmere${r&&r.saved?' · resuming a saved match':''}</div>
    <h1>Room ${mpEsc(NET.code||'')}</h1>
    ${status?`<p class="mp-status">${mpEsc(status)}</p>`:''}
    <div class="mp-code"><span>Share this code or link</span><b>${mpEsc(NET.code||'')}</b><button class="btn" id="mpCopy">Copy link</button>${navigator.share?'<button class="btn" id="mpShare">Share…</button>':''}</div>
    <div class="mp-seats">${seat(ps[0],0)}${seat(ps[1],1)}</div>
    ${picks}
    <div class="btns"><button class="btn ${ps[me]&&ps[me].ready?'':'primary'}" id="mpReady" ${myCmd&&me>=0?'':'disabled'}>${ps[me]&&ps[me].ready?'Not ready':'Ready'}</button>${host?`<button class="btn primary" id="mpStart" ${canStart?'':'disabled'}>Start battle</button>`:''}<button class="btn" id="mpLeave">Leave</button></div>
    <p class="lnote">${host?'You pick first; your friend chooses from the other faction. Both press Ready, then you start.':'Pick a commander from the other faction, then press Ready.'} Your friend needs a JAYKOBI GAMES account.</p></div>`;
  const link=mpPlayUrl(NET.code);
  $('mpCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(link); $('mpCopy').textContent='Copied'; }catch(_){ prompt('Copy this link',link); } };
  const sh=$('mpShare'); if(sh) sh.onclick=()=>navigator.share({ title:'Citadel\'s Gate', text:'Join my match: room '+NET.code, url:link }).catch(()=>{});
  $('mpReady').onclick=()=>{ const on=!(ps[me]&&ps[me].ready); NET.ready(on,myCmd); };
  const st=$('mpStart'); if(st) st.onclick=()=>{ NET.setSetup({ caps:setup.caps!==false }); NET.startMatch(); };
  $('mpLeave').onclick=mpLeave;
  for(const b of hud.overlay.querySelectorAll('.mp-cmd')) b.onclick=()=>{ NET.ready(false,b.dataset.k); };
}
function mpHideOverlay(){ if(MP.overlayOn){ hud.overlay.hidden=true; hud.overlay.className='overlay'; MP.overlayOn=false; } if(MP.cdTimer){ clearInterval(MP.cdTimer); MP.cdTimer=null; } }
// ---- match start (also a refreshed player rebuilding a match in progress: m.rejoin, the state follows) ----
function mpStart(m){
  const st={ faction:COMMANDERS[m.setup.cmd].faction, cmd:m.setup.cmd, foe:m.setup.foe, diff:'regular', caps:m.setup.caps!==false };
  // seat 1 plays as team 1 but sees the battle from its own side: the sim is symmetric, so we swap the local view
  MP.mySeat=NET.seat; ME=NET.seat===1?1:0;                 // the guest is team 1: every "you" in the HUD and input code follows ME
  startMatch(st,{ seed:m.seed, noAI:true, foe:m.setup.foe });
  if(m.snapshot){ restoreState(m.snapshot,{ noAI:true }); setupHUD(); }
  S.net=true; S.speed=1;
  if(m.rejoin) mpShowPause({ reason:'syncing' }); else mpShowPause({ reason:'countdown', secs:m.countdown||3 });
}
// ---- pause / rejoin ----
function mpShowPause(m){
  if(!S || S.demo) return;
  const [a,b]=S.teams; hud.overlay.className='overlay mp'; hud.overlay.hidden=false; MP.overlayOn=true;
  let h='', btns='';
  if(m.reason==='countdown'){ h=`<h1>${a.cmd.short} vs ${b.cmd.short}</h1><p>Both armies are in place.</p><div class="count" id="count">${m.secs}</div>`; }
  else if(m.reason==='away'||m.reason==='lag'){ h=`<h1>Paused</h1><p>${mpEsc(mpPeerName())} lost their connection. The match waits for them to come back.</p><div class="mp-wait" id="mpWait"></div>`; btns=`<button class="btn danger" id="mpForfeit" disabled>End match (win by forfeit)</button><button class="btn" id="mpQuit">Leave the match</button>`; }
  else if(m.reason==='self'){ h=`<h1>Reconnecting…</h1><p>Your connection dropped. Hold on; you keep your seat for two minutes.</p>`; btns=`<button class="btn" id="mpQuit">Give up</button>`; }
  else if(m.reason==='desync'){ h=`<h1>One moment</h1><p>The two copies of the battle drifted apart; syncing them.</p>`; }
  else if(m.reason==='server'){ h=`<h1>One moment</h1><p>The room restarted. Picking the battle up where it was.</p>`; }
  else { h=`<h1>Syncing…</h1><p>Bringing both players to the same moment.</p>`; }
  hud.overlay.innerHTML=`<div class="card mp-card">${mpVsRow()}${h}<div class="btns">${btns}</div></div>`;
  const q=$('mpQuit'); if(q) q.onclick=()=>{ mpLeave(); };
  const f=$('mpForfeit'); if(f){ const t0=NET.awaySince||performance.now(), lim=NET.awayLimit||120000;
    if(MP.cdTimer) clearInterval(MP.cdTimer);
    const tick=()=>{ const left=Math.max(0,lim-(performance.now()-t0)); const w=$('mpWait'); if(w) w.textContent=left>0?`You can claim the win in ${Math.ceil(left/1000)} s`:'You can claim the win now'; if(left<=0){ f.disabled=false; } };
    tick(); MP.cdTimer=setInterval(tick,500); f.onclick=()=>NET.forfeitAway(); }
}
function mpShowResume(m){ mpShowPause({ reason:'countdown', secs:m.in||3 }); let n=m.in||3; if(MP.cdTimer) clearInterval(MP.cdTimer); MP.cdTimer=setInterval(()=>{ n--; const c=$('count'); if(c) c.textContent=Math.max(1,n); if(n<=0){ clearInterval(MP.cdTimer); MP.cdTimer=null; } },1000); }
function mpVsRow(){ const [a,b]=S.teams; return `<div class="vs">${portraitImg(cmdKeyOf(a),a.faction.key)}<span>VS</span>${portraitImg(cmdKeyOf(b),b.faction.key)}</div>`; }
// ---- stall indicator: when we're waiting on the other player's turns ----
let mpStallT=0;
netWaitUI.impl=function(n){ const w=NET.waiting; mpStallT=w?mpStallT+1:0; const el=$('mpStall'); if(!el) return; el.hidden=!(mpStallT>45 && NET.state==='play'); };
// ---- quick chat (the room sends lines to the other player; ours is shown here) ----
function mpChat(id){ NET.chat(id); mpChatBubble({ seat:NET.seat, id }); }
function mpChatBubble(m){ const el=$('mpChatLog'); if(!el) return; const who=m.seat===NET.seat?'You':mpPeerName(); const d=document.createElement('div'); d.className='mp-bubble'+(m.seat===NET.seat?' me':''); d.textContent=`${who}: ${CHAT_LINES[m.id]||'…'}`; el.appendChild(d); while(el.children.length>4) el.removeChild(el.firstChild); setTimeout(()=>{ if(d.parentNode) d.remove(); },6000); if(m.seat!==NET.seat) snd('ui'); }
function mpToggleChat(){ const p=$('mpChatMenu'); p.hidden=!p.hidden; }
// ---- host saves: into the host's JAYKOBI GAMES account (one slot), on this device when that isn't possible ----
function mpSaveData(){ return { meta:{ savedAt:Date.now(), code:NET.code, cmd:S.setup.cmd, foe:S.setup.foe, t:Math.round(S.t), version:'v18.1' }, snap:serializeState(), setup:S.setup }; }
async function mpSave(){
  if(NET.seat!==0) return;
  const data=mpSaveData();
  if(MP.platform && MP.user){
    const put=rev=>mpApi(`/api/platform/saves/citadels-gate/${MP.slot}`,{ method:'PUT', body:JSON.stringify({ schemaVersion:1, expectedRevision:rev, data }) });
    try{ const r=await put(MP.saveRev); MP.saveRev=r.revision; MP.cloudSave={ at:data.meta.savedAt }; toast('Match saved to your account','good'); return; }
    catch(e){
      if(e.status===409){
        if(!confirm('Your account already holds a newer saved match (from another device or tab). Replace it with this one?')) return;
        try{ const cur=await mpApi(`/api/platform/saves/citadels-gate/${MP.slot}`); const r=await put(cur.revision); MP.saveRev=r.revision; toast('Match saved to your account','good'); return; }catch(e2){ toast('Could not save: '+e2.message,'bad'); return; }
      }
      if(e.status!==401){ toast('Could not save: '+e.message,'bad'); return; }
    }
  }
  try{ localStorage.setItem(MP.saveKey,JSON.stringify({ at:data.meta.savedAt, code:NET.code, snap:data.snap, setup:data.setup })); toast('Match saved on this device','good'); }catch(e){ toast('Could not save: '+e.message,'bad'); }
}
function mpLoadLocal(){ try{ return JSON.parse(localStorage.getItem(MP.saveKey)||'null'); }catch(_){ return null; } }
async function mpLoadSave(){
  if(MP.platform && MP.user){
    try{ const r=await mpApi(`/api/platform/saves/citadels-gate/${MP.slot}`); MP.saveRev=r.revision; const d=r.data; return d&&d.snap?{ at:d.meta&&d.meta.savedAt||r.updatedAt, snap:d.snap, setup:d.setup, cloud:true }:null; }
    catch(e){ if(e.status===404){ MP.saveRev=0; } else return mpLoadLocal(); }
  }
  return mpLoadLocal();
}
async function mpResumeSaved(){ const sv=await mpLoadSave(); if(!sv){ mpMenuMsg('No saved match found.','bad'); return; } setup.cmd=sv.setup.cmd; mpCreate(sv.snap); }
// ---- the menu section: who you are, invite codes, the saved match ----
async function mpRefreshMenu(){
  if(MP.platform===null) await mpDetect();
  const who=$('mpWho'); if(!who) return;
  if(MP.platform && MP.user){ who.innerHTML=`Playing as <b>${mpEsc(MP.user.displayName||MP.user.handle||'you')}</b>`; }
  else if(MP.platform){ who.innerHTML=`<a href="/account" target="_top">Sign in on JAYKOBI GAMES</a> to play a friend online. Single player needs no account.`; }
  else who.textContent='Online play is available on JAYKOBI GAMES (games.jaykobi.workers.dev).';
  const on=!!(MP.platform && MP.user); for(const id of ['mpCreate','mpJoinBtn']){ const b=$(id); if(b) b.disabled=!on; }
  const b=$('mpResume'); if(b){ const sv=on?await mpLoadSave():null; b.hidden=!sv; if(sv){ b.textContent=`Resume saved match (${new Date(sv.at).toLocaleDateString()})`; b.onclick=()=>{ saveSetup(); mpResumeSaved(); }; } }
}
// invite links: /play/citadels-gate?join=ABCDE (the site passes ?join= to this page) prefill the code; joining is a tap
function mpPrefillJoin(){
  let code=''; try{ code=new URLSearchParams(location.search).get('join')||''; }catch(_){}
  if(!code){ try{ code=sessionStorage.getItem('cc-mp-room')||''; }catch(_){} }
  code=mpCleanCode(code); if(code.length===5){ $('mpCodeIn').value=code; mpMenuMsg(`Room ${code}: tap Join to enter.`); }
}
