/* ---------- v18 networked match: lockstep client ----------
   NET talks to a room through a transport { send(obj), close() } that calls NET.recv(obj) for each message.
   The default transport is JSON over WebSocket (NET.connectWs); tests inject their own. The room is src/room.ts,
   hosted by the website (jaykobi-website/server/citadel.ts); who you are comes from your site sign-in, not from here. */
NET={
  active:false, seat:-1, code:null, name:'', tr:null, room:null,
  turnMs:100, tpt:3, turns:new Map(), lastTurn:0, tick:0, allowed:0, acc:0, pending:[], state:'idle', peerAway:false, awayLimit:0, awaySince:0,
  snapWait:null, resyncTick:-1, resyncFrom:-1, chatLog:[], onUi:()=>{}, lastSum:0, pingAt:0, rtt:0, countdownAt:0,
  get waiting(){ return this.state==='play' && this.tick>=this.allowed; },
  // a match is "live" here while this page still holds its simulation; a refreshed page is not, and receives the state instead
  get live(){ return this.active && (this.state==='play'||this.state==='paused'||this.state==='countdown') && !!S && !S.demo && !!S.net; },
  // ---- transport ----
  connectWs(url,hello){
    try{ if(this.tr) this.tr.close(); }catch(_){}
    const ws=new WebSocket(url); this.ws=ws; this.tr={ send:o=>{ if(ws.readyState===1) ws.send(JSON.stringify(o)); }, close:()=>ws.close() };
    ws.onopen=()=>{ if(this.ws!==ws) return; this._tries=0; this.tr.send({ t:'hello', ...hello(), live:this.live, lastTurn:this.lastTurn }); this.ui('connected'); };
    ws.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(_){ return; } this.recv(m); };
    ws.onclose=e=>{ if(this.ws!==ws) return;
      if(e.code===4003||e.code===4004||e.code===4005||e.code===4001){ this.ui('refused',{ code:e.code, reason:e.reason }); if(e.code!==4004) this.state='idle'; return; }
      if(this.state==='play'||this.state==='paused'||this.state==='countdown'||this.state==='lobby'){ this.ui('dropped'); this.reconnect(url,hello); }
      else this.ui('closed'); };
    ws.onerror=()=>{};
    return ws;
  },
  // one retry timer at a time; the socket's own close handler is the only thing that schedules the next try
  reconnect(url,hello){ if(this._rc) return; this._tries=(this._tries||0)+1; if(this._tries>40){ this.ui('closed'); return; }
    this._rc=setTimeout(()=>{ this._rc=null; if(this.state==='idle'||this.state==='over') return; this.connectWs(url,hello); },Math.min(8000,400*this._tries)); },
  attach(tr){ this.tr=tr; },
  send(o){ if(this.tr) this.tr.send(o); },
  ui(ev,data){ try{ this.onUi(ev,data); }catch(e){ console.error(e); } },
  // ---- lobby ----
  hello(hello){ this.send({ t:'hello', ...hello, live:this.live, lastTurn:this.lastTurn }); },
  ready(on,cmd){ this.send({ t:'ready', on, cmd }); },
  setSetup(setup){ this.send({ t:'setup', setup }); },
  startMatch(){ this.send({ t:'start' }); },
  chat(id){ this.send({ t:'chat', id }); },
  rematch(){ this.send({ t:'rematch' }); },
  forfeitAway(){ this.send({ t:'forfeit' }); },
  leave(){ this.send({ t:'leave' }); this.state='idle'; this.active=false; clearTimeout(this._rc); this._rc=null; const tr=this.tr; this.tr=null; this.ws=null; try{ tr&&tr.close(); }catch(_){} NET_RESET(); },
  // ---- commands ----
  issue(c){ if(this.state!=='play') return; this.send({ t:'cmd', c }); },
  // ---- messages from the room ----
  recv(m){
    switch(m.t){
      case 'room': this.code=m.code; if(m.seat!=null) this.seat=m.seat; this.room=m; this.ui('room',m); break;
      case 'error': this.ui('error',m.msg); break;
      case 'start': this.active=true; this.state='countdown'; this.turnMs=m.turnMs||100; this.tpt=m.ticksPerTurn||3; this.turns.clear(); this.lastTurn=0; this.tick=0; this.allowed=0; this.acc=0; this.peerAway=false; this._overSent=false; this.resyncTick=-1; this.countdownAt=performance.now();
        this.ui('start',m); break;
      case 'turn': this.turns.set(m.n,m.cmds); this.lastTurn=Math.max(this.lastTurn,m.n); this.allowed=this.lastTurn*this.tpt; if(this.state==='countdown'){ this.state='play'; this.ui('go'); } break;
      case 'pause': if(this.state!=='lobby') this.state='paused'; this.ui('pause',m); break;
      case 'peer': if(m.state==='away'){ this.peerAway=true; this.awayLimit=m.limit||120000; this.awaySince=performance.now(); } else if(m.state==='back') this.peerAway=false; this.ui('peer',m); break;
      // the room names who holds the truth (from); that player snapshots when its sim reaches the tick, the other waits
      case 'resync': this.resyncTick=m.tick; this.resyncFrom=m.from; if(m.from===this.seat && this.tick>=m.tick) this.sendState(); this.ui('resync',m); break;
      case 'state': this.ui('state',m); break;                                                              // the other side restores (mpEvent → applyState)
      case 'resume': this.state='countdown'; this.countdownAt=performance.now(); this.ui('resume',m); break;
      case 'chat': this.chatLog.push(m); this.ui('chat',m); break;
      case 'over': this.state='over'; this.ui('over',m); break;
    }
  },
  // ---- lockstep step: called from the frame loop instead of the free-running accumulator ----
  // returns how many sim ticks were run; applies each turn's commands on its first tick
  advance(dt){
    if(this.state!=='play' && this.state!=='paused') return 0;          // while paused the sim may still finish the turns it already holds
    // the source snapshots exactly at the requested tick, before stepping past it
    if(this.resyncTick>=0 && this.resyncFrom===this.seat && this.tick>=this.resyncTick){ this.sendState(); }
    let behind=this.allowed-this.tick; if(this.resyncTick>=0 && this.resyncFrom===this.seat) behind=Math.min(behind,this.resyncTick-this.tick);
    if(behind<=0){ this.acc=0; return 0; }
    this.acc+=dt; let n=0; const maxSteps=behind>this.tpt*6?6:behind>this.tpt*2?3:1;     // catch up after a hiccup, but gently
    while(this.acc>=STEP && n<maxSteps && this.tick<this.allowed && !(this.resyncTick>=0 && this.resyncFrom===this.seat && this.tick>=this.resyncTick)){
      this.acc-=STEP;
      if(this.tick%this.tpt===0){ const turn=this.tick/this.tpt+1, cmds=this.turns.get(turn)||[]; for(const c of cmds) applyCmd(c); this.turns.delete(turn); }
      step(STEP); this.tick++; n++;
      if(this.tick%30===0){ this.send({ t:'sum', tick:this.tick, hash:stateHash() }); }
      // the host leaves a checkpoint with the room once a minute: if both players ever lose the page, the match resumes from it
      if(this.seat===0 && this.tick%1800===0){ this.send({ t:'checkpoint', tick:this.tick, snap:serializeState() }); }
      if(S.phase==='over' && !this._overSent){ this._overSent=true; this.send({ t:'over', winner:S.winner }); }
    }
    if(this.tick>=this.allowed) this.acc=Math.min(this.acc,STEP);
    return n;
  },
  // after a resync the room numbers turns from this tick again: drop anything held beyond it
  truncate(tick){ this.tick=tick; this.turns.clear(); this.lastTurn=Math.floor(tick/this.tpt); this.allowed=tick; this.acc=0; },
  sendState(){ if(this.resyncTick<0) return; const snap=serializeState(); this.send({ t:'state', tick:this.tick, snap }); this.truncate(this.tick); this.resyncTick=-1; },
  applyState(m){ restoreState(m.snap,{ noAI:true }); S.net=true; S.speed=1; this.truncate(m.tick); this.resyncTick=-1; this.send({ t:'synced', tick:this.tick }); },
};
function NET_RESET(){ NET.turns.clear(); NET.tick=0; NET.allowed=0; NET.lastTurn=0; NET.acc=0; NET.peerAway=false; NET.resyncTick=-1; NET.resyncFrom=-1; NET._overSent=false; NET.room=null; NET.seat=-1; NET.chatLog=[]; NET.active=false; }
window.NET=NET;
function netWaitUI(n){ if(typeof netWaitUI.impl==='function') netWaitUI.impl(n); }
