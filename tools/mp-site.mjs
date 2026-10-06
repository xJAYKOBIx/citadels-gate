// node --experimental-transform-types --no-warnings --import ./tools/sitehooks.mjs tools/mp-site.mjs <build.html> <path-to-jaykobi-website> [seconds]
// Two real game pages play a networked match through the website's actual CitadelRoom Durable Object code
// (jaykobi-website/server/citadel.ts + vendor/citadel/room.ts) running on a small fake of the Workers runtime.
// Covers: sign-in gate, room creation over HTTP, lobby, lockstep play, a dropped socket (auto-reconnect + resync),
// a Durable Object restart mid-match (recovery), a page refresh mid-match (rebuild + state), account saves, chat.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [file, siteDir, secsArg = '80'] = process.argv.slice(2);
const SECS = +secsArg, ORIGIN = 'http://games.test';
const { citadelFetch, CitadelRoom } = await import(pathToFileURL(path.resolve(siteDir, 'server/citadel.ts')).href);

// ---------- a small Workers runtime ----------
const OrigResponse = globalThis.Response;
globalThis.Response = class extends OrigResponse {
  constructor(body, init) { if (init && init.status === 101) { super(null, { status: 200 }); this._s = 101; this.webSocket = init.webSocket; } else super(body, init); }
  get status() { return this._s ?? super.status; }
  get ok() { return this._s ? false : super.ok; }
};
let wsSeq = 0; const log = (...a) => console.log('  ', ...a);
class ServerWS {
  constructor() { this.readyState = 1; this.att = null; this.tags = []; this.id = ++wsSeq; this.peer = null; this.obj = null; }
  serializeAttachment(v) { this.att = structuredClone(v); }
  deserializeAttachment() { return this.att && structuredClone(this.att); }
  send(d) { if (this.readyState !== 1) throw new Error('closed'); this.peer?.deliver(d); }
  close(code = 1000, reason = '') { if (this.readyState === 3) return; this.readyState = 3; this.peer?.closed(code, reason); const o = this.obj; setTimeout(() => o?.webSocketClose(this), 0); }
}
globalThis.WebSocketPair = class { constructor() { const s = new ServerWS(); this[0] = { server: s }; this[1] = s; } };
const users = { host: { id: 'u-host', displayName: 'Jay <Host>' }, guest: { id: 'u-guest', displayName: 'Friend' } };
const accounts = {
  async getIdentity(cookie) { const m = /sid=(\w+)/.exec(cookie || ''); const u = m && users[m[1]]; return u ? { user: u, sessionHash: 'h-' + m[1] } : null; },
  async identityByHash(h) { const u = users[h.slice(2)]; return u ? { user: u, sessionHash: h } : null; },
  async consumeLimit() { return true; },
};
const objects = new Map();   // code -> { storage, obj, sockets }
function makeObj(code) {
  const rec = objects.get(code) ?? { storage: new Map(), sockets: [] }; objects.set(code, rec);
  const sockets = rec.sockets = [];
  const ctx = {
    storage: { get: async k => structuredClone(rec.storage.get(k)), put: async (k, v) => { rec.storage.set(k, structuredClone(v)); }, setAlarm: async t => { rec.alarm = t; }, deleteAll: async () => rec.storage.clear() },
    acceptWebSocket(ws, tags) { ws.tags = tags; ws.obj = rec.obj; sockets.push(ws); },
    getWebSockets(tag) { return sockets.filter(w => w.readyState === 1 && (!tag || w.tags.includes(tag))); },
    blockConcurrencyWhile: fn => fn(),
  };
  rec.obj = new CitadelRoom(ctx, env);
  return rec;
}
const env = {
  PLATFORM_ORIGIN: ORIGIN,
  ACCOUNTS: { getByName: () => accounts },
  CITADEL_ROOMS: { getByName: code => ({ fetch: req => (objects.get(code)?.obj ? objects.get(code) : makeObj(code)).obj.fetch(typeof req === 'string' ? new Request(req) : req) }) },
};
function restartObject(code) {          // the isolate dies: timers stop, sockets drop without any handler running
  const rec = objects.get(code); rec.obj.room?.dispose();
  for (const ws of rec.sockets) { ws.readyState = 3; ws.obj = null; ws.peer?.closed(1006, ''); }
  makeObj(code);
}

// ---------- HTTP-level checks ----------
const req = (url, init = {}) => new Request(ORIGIN + url, init);
let r = await citadelFetch(req('/api/citadel/rooms/new', { method: 'POST', headers: { origin: ORIGIN } }), env);
console.log('signed out create ->', r.status, (await r.json()).error); if (r.status !== 401) throw new Error('expected 401');
r = await citadelFetch(req('/api/citadel/rooms/new', { method: 'POST', headers: { origin: 'https://evil.example', cookie: 'sid=host' } }), env);
console.log('cross-site create ->', r.status); if (r.status !== 403) throw new Error('expected 403');
r = await citadelFetch(req('/api/citadel/rooms/ZZZZZ/ws', { headers: { origin: ORIGIN, cookie: 'sid=host', upgrade: 'websocket' } }), env);
console.log('unknown room ws ->', r.status); if (r.status !== 404) throw new Error('expected 404');

// ---------- the pages ----------
const html = readFileSync(file, 'utf8');
const saves = new Map();   // user -> { revision, data, updatedAt }
const br = await chromium.launch(); const errs = []; const pages = [null, null]; const who = ['host', 'guest'];
const sockOf = new Map();
async function setupPage(i) {
  const ctx = await br.newContext(); const pg = await ctx.newPage(); pages[i] = pg;
  pg.on('pageerror', e => errs.push(i + ': ' + e.message));
  if (process.env.DBG) pg.on('console', m => log(`[${who[i]} console]`, m.text().slice(0, 200)));
  pg.on('dialog', d => d.accept());
  await pg.addInitScript(() => {
    try { localStorage.setItem('cc-map', 'sylvan'); } catch (_) {}
    window.__wsn = Math.random().toString(36).slice(2); window.__wsc = 0; window.__ws = new Map();
    window.WebSocket = class {
      constructor(url) { this.url = url; this.readyState = 0; this._l = {}; const k = window.__wsn + ':' + (++window.__wsc); this._k = k; window.__ws.set(k, this);
        window.__wsOpen(k, url).then(ok => { if (ok) { this.readyState = 1; this.onopen && this.onopen({}); } else this._closed(1006, ''); }); }
      send(d) { if (this.readyState === 1) window.__wsSend(this._k, d); }
      close() { if (this.readyState >= 2) return; window.__wsClose(this._k); this._closed(1000, ''); }
      _closed(code, reason) { if (this.readyState === 3) return; this.readyState = 3; const e = { code, reason }; this.onclose && this.onclose(e); (this._l.close || []).forEach(f => f(e)); }
      addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }
    };
    window.__wsDeliver = (k, d) => { const w = window.__ws.get(k); if (w && w.readyState === 1 && w.onmessage) w.onmessage({ data: d }); };
    window.__wsClosed = (k, code, reason) => { const w = window.__ws.get(k); if (w) w._closed(code, reason); };
  });
  await pg.exposeFunction('__wsOpen', async (k, url) => { if (process.env.DBG) log(who[i], 'opens', url);
    const res = await citadelFetch(new Request(url.replace(/^ws/, 'http'), { headers: { upgrade: 'websocket', origin: ORIGIN, cookie: 'sid=' + who[i] } }), env);
    if (res.status !== 101) { log('ws refused', res.status); return false; }
    const s = res.webSocket.server; sockOf.set(k, s);
    s.peer = { deliver: d => { if (process.env.DBG) { const t = JSON.parse(d).t; if (t !== 'turn') log(`→${who[i]}`, d.slice(0, 120)); } return pages[i].evaluate(([k, d]) => window.__wsDeliver(k, d), [k, d]).catch(() => {}); }, closed: (code, reason) => pages[i].evaluate(([k, c, r]) => window.__wsClosed(k, c, r), [k, code, reason]).catch(() => {}) };
    return true;
  });
  await pg.exposeFunction('__wsSend', (k, d) => { const s = sockOf.get(k); if (process.env.DBG) { const t = JSON.parse(d).t; if (t !== 'sum' && t !== 'cmd') log(`${who[i]}→`, d.slice(0, 120), s?.readyState); } if (s && s.readyState === 1) s.obj?.webSocketMessage(s, d); });
  await pg.exposeFunction('__wsClose', k => { const s = sockOf.get(k); if (s && s.readyState === 1) { s.readyState = 3; s.obj?.webSocketClose(s); } });
  await pg.route('**/*', async route => {
    const u = new URL(route.request().url()), m = route.request().method();
    if (u.origin !== ORIGIN) return route.abort();
    if (u.pathname === '/game-builds/citadels-gate/index.html') return route.fulfill({ contentType: 'text/html', body: html });
    if (u.pathname === '/api/platform/me') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: users[who[i]] }) });
    if (u.pathname.startsWith('/api/citadel/')) {
      const res = await citadelFetch(new Request(u.href, { method: m, headers: { origin: ORIGIN, cookie: 'sid=' + who[i] }, body: m === 'POST' ? route.request().postData() || '{}' : undefined }), env);
      return route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
    }
    if (u.pathname === '/api/platform/saves/citadels-gate/match') {
      const cur = saves.get(who[i]);
      if (m === 'GET') return cur ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...cur, game: 'citadels-gate', slot: 'match' }) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"No cloud save in this slot yet."}' });
      const b = JSON.parse(route.request().postData());
      if ((cur?.revision || 0) !== b.expectedRevision) return route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"A newer cloud save exists."}' });
      const bytes = JSON.stringify(b.data).length; if (bytes > 131072) return route.fulfill({ status: 413, contentType: 'application/json', body: '{"error":"too big"}' });
      const next = { revision: (cur?.revision || 0) + 1, data: b.data, updatedAt: Date.now(), bytes }; saves.set(who[i], next);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ revision: next.revision }) });
    }
    return route.fulfill({ status: 404, body: 'not found' });
  });
  await pg.goto(ORIGIN + '/game-builds/citadels-gate/index.html#sylvan' + (i === 1 && pages.code ? '' : ''));
  await pg.waitForFunction(() => window.FA);
  await pg.waitForFunction(() => FA.eval('MP.platform!==null'));
  // record every checksum this page sends, keyed by tick (a replayed tick overwrites its entry)
  await pg.evaluate(() => FA.eval(`(()=>{ const s0=NET.send.bind(NET); NET.send=o=>{ if(o.t==='sum') (window.__h||(window.__h={}))[o.tick]=o.hash; if(o.t==='checkpoint') window.__cp=(window.__cp||0)+1; s0(o); }; })()`));
  return pg;
}
const ev = (i, code) => pages[i].evaluate(c => FA.eval(c), code);
const until = async (i, code, ms = 8000) => { const t0 = Date.now(); for (;;) { if (await ev(i, code)) return; if (Date.now() - t0 > ms) throw new Error(`timeout waiting on page ${i}: ${code}`); await new Promise(r => setTimeout(r, 100)); } };
await setupPage(0); await setupPage(1);
console.log('menus', JSON.stringify(await Promise.all([0, 1].map(i => ev(i, `$('mpWho').textContent+' | create '+($('mpCreate').disabled?'off':'on')`)))));

await ev(0, `setup.cmd='holts'; mpCreate()`);
await until(0, `NET.seat===0 && !!NET.room`);
const code = await ev(0, 'NET.code'); console.log('room', code, 'link', await ev(0, `mpPlayUrl(NET.code)`));
await ev(1, `$('mpCodeIn').value='${code.toLowerCase()}'; $('mpJoinBtn').click()`);
await until(1, `NET.seat===1 && !!NET.room`);
console.log('lobby text', JSON.stringify(await ev(0, `(hud.overlay.textContent||'').replace(/\\s+/g,' ').slice(0,140)`)));
if ((await ev(0, `hud.overlay.innerHTML`)).includes('<Host>')) throw new Error('display name not escaped');
await ev(1, `NET.ready(true,'kyndrili')`); await new Promise(r => setTimeout(r, 200));
console.log('same-faction pick ->', await ev(1, `(hud.overlay.textContent||'').includes('other faction')`));
await ev(1, `NET.ready(true,'grom')`); await ev(0, `NET.ready(true,'holts')`);
await until(0, `MP.lastRoom.players[1]&&MP.lastRoom.players[1].ready&&MP.lastRoom.players[0].ready`);
await ev(0, `NET.startMatch()`);
await until(0, `NET.state==='play'`); await until(1, `NET.state==='play'`);
console.log('playing; ME', await ev(0, 'ME'), await ev(1, 'ME'));

const script = (i, t) => ev(i, `(()=>{ if(NET.state!=='play'||S.phase!=='play') return 0; const seat=${i}; const T=S.teams[seat]; const list=T.roster.filter(id=>!buyCheck(seat,id)); if(!list.length) return 0;
  const type=list[${t}%list.length], k=MAP.keeps[seat], dir=seat?-1:1, a=(${t}%7-3)*0.3;
  const plan=planDrop(seat,type,k.x+dir*Math.cos(a)*300,k.y+Math.sin(a)*300); if(!plan.ok) return 0;
  issueCmd({ k:'deploy', team:seat, type, sx:plan.sx, sy:plan.sy, mode:plan.mode, lane:plan.lane, hp:plan.hp, tx:plan.tx, ty:plan.ty }); if(${t}%9===4) issueCmd({ k:'seal', team:seat }); return 1; })()`);
const status = async () => (await Promise.all([0, 1].map(i => ev(i, `({ st:NET.state, tick:NET.tick, ents:S.ents.length, phase:S.phase, gold:S.teams.map(x=>x.gold).join('/') })`)))).map(s => `${s.st} t${s.tick} e${s.ents} ${s.gold}`).join(' | ');
let chatSeen = '', preReload = {}; let t = 0; const at = f => Math.floor(SECS * f); const events = [];
for (let sec = 0; sec < SECS; sec++) {
  await new Promise(r => setTimeout(r, 1000));
  if (sec % 2 === 0) { await script(0, t).catch(() => 0); await script(1, t).catch(() => 0); t++; }
  if (sec === 3) { await ev(0, `mpChat(1)`); events.push('chat'); }
  if (sec === 4) { chatSeen = await ev(1, `$('mpChatLog').textContent`); }
  if (sec % 10 === 0) log(sec + 's', await status());
  if (sec === at(0.2)) { log('-- guest socket dropped by the network'); const s = [...sockOf.values()].find(s => s.readyState === 1 && s.att?.pid === 'u-guest'); s.close(1006, ''); events.push('drop'); }
  if (sec === at(0.2) + 6) log('after drop:', await status());
  if (process.env.DBG && sec > at(0.2) && sec < at(0.2) + 8) { for (const i of [0, 1]) log('probe', who[i], await Promise.race([ev(i, `JSON.stringify({ st:NET.state, tick:NET.tick, allowed:NET.allowed, rt:NET.resyncTick, rf:NET.resyncFrom, lt:NET.lastTurn })`), new Promise(r => setTimeout(() => r('NO ANSWER'), 1500))])); }
  if (sec === at(0.4)) { log('-- room object restarts'); restartObject(code); events.push('restart'); }
  if (sec === at(0.4) + 8) log('after restart:', await status());
  if (sec === at(0.6)) { log('-- guest refreshes the page'); preReload = await ev(1, 'window.__h||{}'); await pages[1].reload(); await pages[1].waitForFunction(() => window.FA && FA.eval('MP.platform!==null'));
    await pages[1].evaluate(() => FA.eval(`(()=>{ const s0=NET.send.bind(NET); NET.send=o=>{ if(o.t==='sum') (window.__h||(window.__h={}))[o.tick]=o.hash; s0(o); }; })()`));
    log('prefilled code:', await ev(1, `$('mpCodeIn').value`)); await ev(1, `$('mpJoinBtn').click()`); events.push('refresh'); }
  if (sec === at(0.6) + 10) log('after refresh:', await status());
  if (sec === at(0.8)) { await ev(0, `mpSave()`); await new Promise(r => setTimeout(r, 400)); await ev(0, `mpSave()`); await new Promise(r => setTimeout(r, 400)); const sv = saves.get('host'); log('account save rev', sv?.revision, 'bytes', sv?.bytes, 'snap ents', sv?.data?.snap?.ents?.length); events.push('save'); }
  const ph = await Promise.all([0, 1].map(i => ev(i, 'S.phase')));
  if (ph[0] === 'over' && ph[1] === 'over') break;
}
const fin = await status(); console.log('final', fin);
const h = await Promise.all([0, 1].map(i => ev(i, 'window.__h||{}'))); h[1] = { ...preReload, ...h[1] };
let same = 0, diff = 0; for (const k of Object.keys(h[0])) if (k in h[1]) { if (h[0][k] === h[1][k]) same++; else { diff++; if (diff < 5) console.log('  differs at tick', k); } }
console.log(`checksums compared ${same + diff}: equal ${same}, different ${diff}; guest chat log "${chatSeen}"; events ${events.join(',')}; account save rev ${saves.get('host')?.revision}`);
if (errs.length) console.log('PAGE ERRORS', errs);
const ok = diff === 0 && same >= 40 && chatSeen.includes('Well played') && !errs.length && (await ev(0, 'NET.state')) !== 'idle' && saves.get('host')?.revision === 2;
console.log(ok ? 'PASS' : 'FAIL');
for (const rec of objects.values()) rec.obj.room?.dispose();
await br.close(); process.exit(ok ? 0 : 1);
