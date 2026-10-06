// node --experimental-strip-types tools/room-ts.mjs   — unit tests for src/room.ts with hand-driven timers
import assert from 'node:assert/strict';
const { Room, validMessage, TICKS_PER_TURN } = await import('../src/room.ts');

function harness(saved) {
  let now = 1_000_000; const timers = new Map(); let nextId = 1; const out = { host: [], guest: [], other: [] }; const closed = [];
  const stored = { data: null };
  const opts = {
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms, at: now + ms, every: true }); return id; },
    clearTimer: id => timers.delete(id),
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms, at: now + ms, every: false }); return id; },
    clearTimeout: id => timers.delete(id),
    now: () => now, random: () => 0.5, persist: d => { stored.data = JSON.parse(JSON.stringify(d)); },
  };
  const tr = { send: (pid, m) => out[pid].push(m), close: (pid, code) => closed.push([pid, code]) };
  const room = new Room('ABCDE', 'host', tr, opts, saved);
  const advance = ms => { const end = now + ms; for (;;) { let best = null; for (const [id, t] of timers) if (t.at <= end && (!best || t.at < best[1].at)) best = [id, t]; if (!best) break; now = best[1].at; if (best[1].every) best[1].at += best[1].ms; else timers.delete(best[0]); best[1].fn(); } now = end; };
  const last = (who, t) => [...out[who]].reverse().find(m => m.t === t);
  const clear = () => { out.host.length = 0; out.guest.length = 0; out.other.length = 0; };
  return { room, out, closed, stored, advance, last, clear, setNow: n => { now = n; }, getNow: () => now };
}
function toPlay(h) {
  const { room } = h;
  assert.equal(room.join('host', 'Host<b>', { t: 'hello', cmd: 'holts' }), 0);
  assert.equal(room.join('guest', 'Guest', { t: 'hello', cmd: null }), 1);
  room.handle('guest', { t: 'ready', on: true, cmd: 'kyndrili' });
  assert.equal(room.seats[1].cmd, null, 'same-faction pick refused');
  room.handle('guest', { t: 'ready', on: true, cmd: 'grom' });
  room.handle('host', { t: 'ready', on: true, cmd: 'holts' });
  room.handle('host', { t: 'start' });
  assert.equal(room.state, 'countdown');
  h.advance(3000); assert.equal(room.state, 'play');
}
let n = 0; const test = (name, fn) => { fn(); n++; console.log('ok', name); };

test('lobby, start, turns stamp the sender team', () => {
  const h = harness(); toPlay(h);
  assert.equal(h.room.seats[0].name, 'Hostb', 'names are cleaned');
  const st = h.last('guest', 'start'); assert.equal(st.setup.cmd, 'holts'); assert.equal(st.setup.foe, 'grom');
  h.room.handle('guest', { t: 'cmd', c: { k: 'seal', team: 0 } });
  h.advance(100);
  const turn = h.last('host', 'turn'); assert.equal(turn.n, 1); assert.deepEqual(turn.cmds, [{ k: 'seal', team: 1 }]);
  h.advance(1000); assert.equal(h.room.turn, 11);
});
test('a third account cannot join; a stranger cannot join a started match', () => {
  const h = harness(); toPlay(h);
  assert.equal(h.room.join('other', 'X', { t: 'hello' }), -1); assert.equal(h.last('other', 'error').msg, 'That match has already started.');
  const h2 = harness(); h2.room.join('host', 'H', { t: 'hello' }); h2.room.join('guest', 'G', { t: 'hello' });
  assert.equal(h2.room.join('other', 'X', { t: 'hello' }), -1); assert.equal(h2.last('other', 'error').msg, 'This room is full.');
});
test('guest drops and rejoins live: host is the source at the room turn', () => {
  const h = harness(); toPlay(h); h.advance(1000);
  h.room.disconnect('guest'); assert.equal(h.room.state, 'paused'); assert.equal(h.last('host', 'peer').state, 'away');
  h.advance(5000); const t = h.room.turn; h.clear();
  h.room.join('guest', 'Guest', { t: 'hello', live: true, lastTurn: t - 2 });
  const rs = h.last('host', 'resync'); assert.equal(rs.from, 0); assert.equal(rs.tick, t * TICKS_PER_TURN);
  h.room.handle('host', { t: 'state', tick: rs.tick, snap: { a: 1 } });
  assert.deepEqual(h.last('guest', 'state'), { t: 'state', tick: rs.tick, snap: { a: 1 } });
  h.room.handle('guest', { t: 'synced', tick: rs.tick });
  assert.equal(h.room.state, 'countdown'); h.advance(3100); assert.equal(h.room.state, 'play'); assert.ok(h.room.turn > t);
});
test('host drops and missed turns: resync at the last turn it holds', () => {
  const h = harness(); toPlay(h); h.advance(1000);
  h.room.disconnect('host'); const t = h.room.turn; h.clear();
  h.room.join('host', 'Host', { t: 'hello', live: true, lastTurn: t - 3 });
  const rs = h.last('guest', 'resync'); assert.equal(rs.from, 0); assert.equal(rs.tick, (t - 3) * TICKS_PER_TURN);
  h.room.handle('host', { t: 'state', tick: rs.tick, snap: {} }); assert.equal(h.room.turn, t - 3);
});
test('a refreshed player (no live sim) rebuilds the match, then takes the state', () => {
  const h = harness(); toPlay(h); h.advance(1000);
  h.room.disconnect('guest'); h.clear();
  h.room.join('guest', 'Guest', { t: 'hello', live: false });
  const st = h.last('guest', 'start'); assert.ok(st.rejoin); assert.equal(st.seed, h.room.seed);
  assert.equal(h.last('host', 'resync').from, 0);
});
test('host refreshed: the guest is the source', () => {
  const h = harness(); toPlay(h); h.advance(1000);
  h.room.disconnect('host'); h.clear();
  h.room.join('host', 'Host', { t: 'hello', live: false });
  assert.equal(h.last('guest', 'resync').from, 1); assert.ok(h.last('host', 'start').rejoin);
  const tick = h.last('guest', 'resync').tick;
  h.room.handle('guest', { t: 'state', tick, snap: { g: 1 } }); assert.deepEqual(h.last('host', 'state').snap, { g: 1 });
  h.room.handle('host', { t: 'synced', tick }); assert.equal(h.room.state, 'countdown');
});
test('server restart mid-match: rebuilt paused, recovers from the host', () => {
  const h = harness(); toPlay(h); h.advance(2000);
  h.room.handle('host', { t: 'checkpoint', tick: 30, snap: { cp: 1 } });
  const saved = h.stored.data; assert.equal(saved.state, 'play');
  const h2 = harness(saved); assert.equal(h2.room.state, 'paused');
  assert.equal(h2.room.reattach('host'), false, 'a surviving socket is not trusted after a restart');
  h2.room.join('host', 'Host', { t: 'hello', live: true, lastTurn: 17 });
  assert.equal(h2.out.host.at(-1).t, 'pause');
  h2.room.join('guest', 'Guest', { t: 'hello', live: true, lastTurn: 19 });
  const rs = h2.last('guest', 'resync'); assert.equal(rs.from, 0); assert.equal(rs.tick, 17 * TICKS_PER_TURN);
});
test('restart and both refreshed: the checkpoint is the source; no checkpoint ends the match', () => {
  const h = harness(); toPlay(h); h.advance(2000); h.room.handle('host', { t: 'checkpoint', tick: 30, snap: { cp: 1 } });
  const h2 = harness(h.stored.data);
  h2.room.join('host', 'Host', { t: 'hello' }); h2.room.join('guest', 'Guest', { t: 'hello' });
  assert.deepEqual(h2.last('guest', 'state'), { t: 'state', tick: 30, snap: { cp: 1 } }); assert.equal(h2.room.turn, 10);
  h2.room.handle('host', { t: 'synced', tick: 30 }); assert.equal(h2.room.state, 'paused');
  h2.room.handle('guest', { t: 'synced', tick: 30 }); assert.equal(h2.room.state, 'countdown');
  const h3 = harness(); toPlay(h3); h3.advance(500); const h4 = harness(h3.stored.data);
  h4.room.join('host', 'Host', { t: 'hello' }); h4.room.join('guest', 'Guest', { t: 'hello' });
  assert.equal(h4.room.state, 'over'); assert.equal(h4.last('host', 'over').reason, 'lost');
});
test('lobby survives hibernation: open sockets reattach', () => {
  const h = harness(); h.room.join('host', 'Host', { t: 'hello', cmd: 'holts' }); h.room.join('guest', 'Guest', { t: 'hello' });
  const h2 = harness(h.stored.data); assert.equal(h2.room.reattach('host'), true); assert.equal(h2.room.reattach('guest'), true);
  h2.room.handle('guest', { t: 'ready', on: true, cmd: 'grom' }); assert.equal(h2.room.seats[1].ready, true);
});
test('checksum mismatch pauses and resyncs from the host', () => {
  const h = harness(); toPlay(h); h.advance(1000);
  h.room.handle('host', { t: 'sum', tick: 30, hash: 1 }); h.room.handle('guest', { t: 'sum', tick: 30, hash: 1 }); assert.equal(h.room.state, 'play');
  h.room.handle('host', { t: 'sum', tick: 60, hash: 1 }); h.room.handle('guest', { t: 'sum', tick: 60, hash: 2 });
  assert.equal(h.room.state, 'paused'); assert.equal(h.last('host', 'resync').tick, h.room.turn * TICKS_PER_TURN);
});
test('leaving concedes; forfeit only after the away limit', () => {
  const h = harness(); toPlay(h); h.room.handle('guest', { t: 'leave' });
  assert.equal(h.room.state, 'over'); assert.deepEqual(h.last('host', 'over'), { t: 'over', reason: 'left', winner: 0 });
  const h2 = harness(); toPlay(h2); h2.room.disconnect('guest');
  h2.room.handle('host', { t: 'forfeit' }); assert.equal(h2.room.state, 'paused');
  h2.advance(120000); h2.room.handle('host', { t: 'forfeit' }); assert.equal(h2.room.state, 'over'); assert.equal(h2.last('host', 'over').winner, 0);
});
test('lagging player is cut and the match pauses', () => {
  const h = harness(); toPlay(h);
  h.room.handle('guest', { t: 'sum', tick: 30, hash: 1 }); h.advance(10000);
  assert.equal(h.room.state, 'paused'); assert.deepEqual(h.closed[0], ['guest', 4010]);
});
test('chat goes to the other player only, rate limited', () => {
  const h = harness(); toPlay(h); h.clear();
  h.room.handle('host', { t: 'chat', id: 2 }); h.room.handle('host', { t: 'chat', id: 3 });
  assert.equal(h.out.guest.filter(m => m.t === 'chat').length, 1); assert.equal(h.out.host.filter(m => m.t === 'chat').length, 0);
  h.room.handle('host', { t: 'chat', id: 99 }); h.advance(2000); h.room.handle('host', { t: 'chat', id: 99 });
  assert.equal(h.out.guest.filter(m => m.t === 'chat').length, 1, 'unknown line ignored');
});
test('rematch needs both players and starts a new seed', () => {
  const h = harness(); toPlay(h); h.room.handle('host', { t: 'over', winner: 1 }); assert.equal(h.room.state, 'over');
  h.room.handle('host', { t: 'rematch' }); assert.equal(h.room.state, 'over'); h.room.handle('guest', { t: 'rematch' }); assert.equal(h.room.state, 'countdown');
});
test('host saved match: the snapshot rides in the start message once', () => {
  const h = harness(); h.room.join('host', 'Host', { t: 'hello', cmd: 'holts', snapshot: { saved: true } });
  assert.equal(h.last('host', 'room').saved, true);
  h.room.join('guest', 'Guest', { t: 'hello' }); h.room.handle('guest', { t: 'ready', on: true, cmd: 'grom' }); h.room.handle('host', { t: 'ready', on: true }); h.room.handle('host', { t: 'start' });
  assert.deepEqual(h.last('guest', 'start').snapshot, { saved: true }); assert.equal(h.room.saved, null);
});
test('message validation', () => {
  assert.ok(validMessage({ t: 'cmd', c: { k: 'route', u: 4, pts: [{ x: 1, y: 2 }] } }));
  assert.ok(!validMessage({ t: 'cmd', c: { k: 'route', u: 4, pts: Array(200).fill({ x: 1, y: 1 }) } }));
  assert.ok(!validMessage({ t: 'cmd', c: { k: 'eval', code: 'x' } }));
  assert.ok(!validMessage({ t: 'ready', on: true, cmd: 'nobody' }));
  assert.ok(!validMessage({ t: 'sum', tick: 1.5, hash: 3 }));
  assert.ok(!validMessage({ t: 'hello', name: 'x', cmd: 'zz' }));
  assert.ok(validMessage({ t: 'hello', cmd: 'grom', live: true, lastTurn: 4 }));
  assert.ok(!validMessage([1])); assert.ok(!validMessage(null));
});
console.log(`${n} room tests passed`);
