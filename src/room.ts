/* Citadel's Gate match room: pure TypeScript, no DOM, no Cloudflare APIs.
   Hosted by the website's CitadelRoom Durable Object (jaykobi-website/server/citadel.ts) and by the headless tests.

   Two seats. Seat 0 belongs to the account that created the room (the host), seat 1 to the first other account that
   joins. Both browsers run the same deterministic simulation; the room only stamps commands with the turn they run on
   and broadcasts one turn every TURN_MS (lockstep). Players are identified by account id, supplied by the server from
   the session cookie, never by the client.

   Persistence: `data()` is everything needed to rebuild the room after the Durable Object restarts. It is saved on
   lobby changes, start, pause, resume, end and checkpoints, never per turn. A room rebuilt mid-match starts paused and
   resyncs from whichever player still has a live simulation, or from the latest checkpoint the host uploaded. */

export const TURN_MS = 100, TICKS_PER_TURN = 3, COUNTDOWN = 3, AWAY_LIMIT_MS = 120_000, LAG_TICKS = 240, CHAT_LINES = 6;

export const COMMANDER_FACTION: Record<string, 'covenant' | 'forsaken'> = {
  holts: 'covenant', kyndrili: 'covenant', borvik: 'covenant', grom: 'forsaken', ilsabet: 'forsaken', mawgrom: 'forsaken',
};

export type RoomPhase = 'lobby' | 'countdown' | 'play' | 'paused' | 'over';
export type Seat = 0 | 1;
export interface Setup { caps: boolean; cmd?: string; foe?: string }
export interface Snapshot { tick: number; snap: unknown }

/** Messages a client sends. `id` and `name` never come from here: the server supplies identity. */
export type ClientMsg =
  | { t: 'hello'; cmd?: string | null; snapshot?: unknown; live?: boolean; lastTurn?: number }
  | { t: 'ready'; on: boolean; cmd?: string | null }
  | { t: 'setup'; setup: { caps?: boolean } }
  | { t: 'start' }
  | { t: 'cmd'; c: Record<string, unknown> }
  | { t: 'sum'; tick: number; hash: number }
  | { t: 'state'; tick: number; snap: unknown }
  | { t: 'checkpoint'; tick: number; snap: unknown }
  | { t: 'synced'; tick: number }
  | { t: 'chat'; id: number }
  | { t: 'over'; winner: number }
  | { t: 'rematch' }
  | { t: 'forfeit' }
  | { t: 'leave' };

export interface PlayerView { name: string; cmd: string | null; ready: boolean; away: boolean }
export type ServerMsg =
  | { t: 'room'; code: string; seat?: Seat; players: (PlayerView | null)[]; state: RoomPhase; setup: Setup | null; saved: boolean }
  | { t: 'start'; seed: number; setup: Setup; snapshot: unknown; countdown: number; turnMs: number; ticksPerTurn: number; rejoin?: boolean }
  | { t: 'turn'; n: number; cmds: Record<string, unknown>[] }
  | { t: 'pause'; reason: string; seat: number; turn: number }
  | { t: 'resync'; tick: number; from: number }
  | { t: 'state'; tick: number; snap: unknown }
  | { t: 'resume'; in: number; turn: number }
  | { t: 'peer'; seat: number; state: 'away' | 'back' | 'rematch'; limit?: number }
  | { t: 'chat'; seat: number; id: number }
  | { t: 'over'; reason: string; winner: number | null }
  | { t: 'error'; msg: string };

/** How the room reaches players. `send` goes to every open socket of that account. */
export interface Transport {
  send(pid: string, msg: ServerMsg): void;
  close?(pid: string, code: number, reason: string): void;
}
export interface RoomOptions {
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (h: unknown) => void;
  now?: () => number;
  random?: () => number;
  persist?: (data: RoomData) => void;
  log?: (...a: unknown[]) => void;
}

interface PlayerData { id: string; name: string; cmd: string | null; ready: boolean; rematch: boolean; live: boolean; lastTurn: number; awaySince: number }
interface Player extends PlayerData { connected: boolean; lastTick: number }
export interface RoomData {
  v: 1; code: string; hostId: string; state: RoomPhase; seats: (PlayerData | null)[]; setup: Setup | null;
  seed: number | null; turn: number; saved: unknown; checkpoint: Snapshot | null; createdAt: number;
}

const clampName = (s: unknown) => String(s ?? 'Player').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) || 'Player';

export class Room {
  readonly code: string;
  readonly hostId: string;
  state: RoomPhase = 'lobby';
  seats: (Player | null)[] = [null, null];
  setup: Setup | null = null;
  seed: number | null = null;
  turn = 0;
  saved: unknown = null;                 // a host-saved match waiting to be resumed
  checkpoint: Snapshot | null = null;    // the host's latest periodic snapshot of this match
  createdAt: number;
  private pending: Record<string, unknown>[] = [];
  private timer: unknown = null;
  private countdownTimer: unknown = null;
  private sums = new Map<number, (number | undefined)[]>();
  private resync: { from: number | 'room'; tick: number; waiting: Set<number> } | null = null;
  private chatAt = [0, 0];
  private recovering = false;
  private o: Required<RoomOptions>;
  private tr: Transport;

  constructor(code: string, hostId: string, tr: Transport, opts: RoomOptions = {}, saved?: RoomData) {
    this.tr = tr;
    this.o = {
      setTimer: opts.setTimer ?? ((fn, ms) => setInterval(fn, ms)),
      clearTimer: opts.clearTimer ?? (h => clearInterval(h as ReturnType<typeof setInterval>)),
      setTimeout: opts.setTimeout ?? ((fn, ms) => setTimeout(fn, ms)),
      clearTimeout: opts.clearTimeout ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>)),
      now: opts.now ?? (() => Date.now()),
      random: opts.random ?? Math.random,
      persist: opts.persist ?? (() => {}),
      log: opts.log ?? (() => {}),
    };
    this.code = code; this.hostId = hostId; this.createdAt = this.o.now();
    if (saved) {
      this.createdAt = saved.createdAt; this.setup = saved.setup; this.seed = saved.seed; this.turn = saved.turn;
      this.saved = saved.saved; this.checkpoint = saved.checkpoint;
      this.seats = saved.seats.map(p => p && { ...p, connected: false, lastTick: 0 });
      this.state = saved.state;
      // the object restarted mid-match: everyone's socket dropped with it, so wait for them and resync
      if (this.state === 'countdown' || this.state === 'play' || this.state === 'paused') { this.state = 'paused'; this.recovering = true; }
    }
  }

  // ---------- views and persistence ----------
  data(): RoomData {
    return { v: 1, code: this.code, hostId: this.hostId, state: this.state, setup: this.setup, seed: this.seed, turn: this.turn,
      saved: this.saved, checkpoint: this.checkpoint, createdAt: this.createdAt,
      seats: this.seats.map(p => p && { id: p.id, name: p.name, cmd: p.cmd, ready: p.ready, rematch: p.rematch, live: p.live, lastTurn: p.lastTurn, awaySince: p.awaySince }) };
  }
  /** After the hosting object wakes from hibernation: this account's socket survived, so it never left. */
  reattach(pid: string): boolean { const s = this.seatOf(pid); if (s < 0 || this.recovering) return false; this.seats[s]!.connected = true; return true; }
  players(): (PlayerView | null)[] { return this.seats.map(p => p && { name: p.name, cmd: p.cmd, ready: p.ready, away: !p.connected }); }
  view() { return { code: this.code, state: this.state, players: this.players(), saved: !!this.saved }; }
  seatOf(pid: string): Seat | -1 { return this.seats[0]?.id === pid ? 0 : this.seats[1]?.id === pid ? 1 : -1; }
  private save() { this.o.persist(this.data()); }
  private sendTo(seat: number, msg: ServerMsg) { const p = this.seats[seat]; if (p && p.connected) this.tr.send(p.id, msg); }
  private broadcast(msg: ServerMsg, except = -1) { this.seats.forEach((p, i) => { if (p && p.connected && i !== except) this.tr.send(p.id, msg); }); }
  private roomMsg(seat?: Seat): ServerMsg { return { t: 'room', code: this.code, ...(seat != null ? { seat } : {}), players: this.players(), state: this.state, setup: this.setup, saved: !!this.saved }; }
  private lobbyUpdate() { this.seats.forEach((p, i) => { if (p && p.connected) this.tr.send(p.id, this.roomMsg(i as Seat)); }); this.save(); }

  // ---------- joining and leaving ----------
  /** A socket for account `pid` opened. Returns the seat, or -1 when refused (an error has been sent). */
  join(pid: string, name: string, hello: Extract<ClientMsg, { t: 'hello' }>): Seat | -1 {
    let found = this.seatOf(pid);
    if (found < 0) {
      if (this.state !== 'lobby') { this.tr.send(pid, { t: 'error', msg: 'That match has already started.' }); return -1; }
      found = pid === this.hostId ? 0 : 1;
      if (this.seats[found]) { this.tr.send(pid, { t: 'error', msg: 'This room is full.' }); return -1; }
      this.seats[found] = { id: pid, name: clampName(name), cmd: null, ready: false, rematch: false, connected: true, awaySince: 0, lastTick: 0, lastTurn: 0, live: false };
    }
    const seat = found as Seat;
    const p = this.seats[seat]!;
    p.name = clampName(name); p.connected = true; p.awaySince = 0;
    p.live = !!hello.live; p.lastTurn = p.live && Number.isSafeInteger(hello.lastTurn) ? Math.max(0, hello.lastTurn!) : 0;
    if (this.state === 'lobby') {
      if (hello.cmd !== undefined) p.cmd = validCmd(hello.cmd) ? hello.cmd : null;
      if (seat === 0 && hello.snapshot && typeof hello.snapshot === 'object') this.saved = hello.snapshot;
      this.lobbyUpdate();
      return seat;
    }
    this.tr.send(pid, this.roomMsg(seat));
    if (this.state === 'over') return seat;
    // back during a match: everyone pauses, then the two copies are brought to the same moment
    if (this.state !== 'paused') this.pause('rejoin', seat);
    else this.tr.send(pid, { t: 'pause', reason: this.recovering ? 'server' : 'rejoin', seat, turn: this.turn });
    this.broadcast({ t: 'peer', seat, state: 'back' }, seat);
    this.beginResync();
    return seat;
  }
  /** Every socket of account `pid` has closed. */
  disconnect(pid: string) {
    const seat = this.seatOf(pid); if (seat < 0) return;
    const p = this.seats[seat]!; if (!p.connected) return;
    p.connected = false; p.awaySince = this.o.now(); p.live = false;
    if (this.state === 'lobby') {
      if (seat === 1) this.seats[1] = null;      // a guest who leaves the waiting room frees the seat; the host's seat is kept
      this.lobbyUpdate(); return;
    }
    if (this.state === 'over') { this.save(); return; }
    if (this.resync) { this.resync = null; }
    this.pause('away', seat);
    this.broadcast({ t: 'peer', seat, state: 'away', limit: AWAY_LIMIT_MS });
    if (!this.seats.some(q => q && q.connected)) this.stopTurns();
  }

  // ---------- messages ----------
  handle(pid: string, m: ClientMsg) {
    const seat = this.seatOf(pid); if (seat < 0) return;
    const p = this.seats[seat]!; if (!p.connected) return;
    switch (m.t) {
      case 'hello': break;                                          // handled by join
      case 'ready':
        if (this.state !== 'lobby') break;
        if (m.cmd !== undefined) {
          if (m.cmd !== null && !validCmd(m.cmd)) break;
          // the guest must lead the other faction
          const host = this.seats[0];
          if (seat === 1 && m.cmd && host?.cmd && COMMANDER_FACTION[m.cmd] === COMMANDER_FACTION[host.cmd]) { this.tr.send(pid, { t: 'error', msg: 'Pick a commander from the other faction.' }); break; }
          p.cmd = m.cmd;
          if (seat === 0 && this.seats[1]?.cmd && m.cmd && COMMANDER_FACTION[this.seats[1].cmd!] === COMMANDER_FACTION[m.cmd]) { this.seats[1].cmd = null; this.seats[1].ready = false; }
        }
        p.ready = !!m.on && !!p.cmd;
        this.lobbyUpdate(); break;
      case 'setup':
        if (seat === 0 && this.state === 'lobby') { this.setup = { caps: m.setup?.caps !== false }; this.lobbyUpdate(); } break;
      case 'start':
        if (seat === 0 && this.state === 'lobby' && this.seats[1] && this.seats.every(q => q && q.ready && q.connected && q.cmd)) this.start(); break;
      case 'cmd':
        if (this.state === 'play' && m.c && typeof m.c === 'object') { this.pending.push({ ...m.c, team: seat }); } break;
      case 'sum':
        if (this.state === 'play' && Number.isSafeInteger(m.tick)) { p.lastTick = m.tick; this.checkSum(seat, m.tick, m.hash >>> 0); } break;
      case 'state':
        if (this.resync && this.resync.from === seat && m.tick >= this.resync.tick && m.tick % TICKS_PER_TURN === 0) {
          this.checkpoint = { tick: m.tick, snap: m.snap };
          this.turn = m.tick / TICKS_PER_TURN;
          for (const s of this.resync.waiting) this.sendTo(s, { t: 'state', tick: m.tick, snap: m.snap });
          this.save();
        } break;
      case 'checkpoint':
        if (seat === 0 && (this.state === 'play' || this.state === 'paused') && Number.isSafeInteger(m.tick) && m.tick % TICKS_PER_TURN === 0) { this.checkpoint = { tick: m.tick, snap: m.snap }; this.save(); } break;
      case 'synced':
        if (this.resync) { this.resync.waiting.delete(seat); if (!this.resync.waiting.size) { this.resync = null; this.resume(); } } break;
      case 'chat': {
        const now = this.o.now(); const id = m.id | 0;
        if (id < 0 || id >= CHAT_LINES || now - this.chatAt[seat] < 1500) break;
        this.chatAt[seat] = now; this.broadcast({ t: 'chat', seat, id }, seat); break;
      }
      case 'over':
        // either client reports a keep falling; both run the same sim, so the first report is the result
        if (this.state === 'play') { this.end('keep', m.winner === 0 || m.winner === 1 ? m.winner : null); } break;
      case 'rematch':
        if (this.state !== 'over') break;
        p.rematch = true; this.broadcast({ t: 'peer', seat, state: 'rematch' }, seat);
        if (this.seats.every(q => q && q.rematch && q.connected)) { this.seats.forEach(q => { q!.rematch = false; q!.ready = true; }); this.saved = null; this.start(); }
        else this.save();
        break;
      case 'forfeit': {
        const other = this.seats[1 - seat];
        if (this.state === 'paused' && other && !other.connected && this.o.now() - other.awaySince >= AWAY_LIMIT_MS) this.end('forfeit', seat);
        break;
      }
      case 'leave':
        if (this.state === 'countdown' || this.state === 'play' || this.state === 'paused') this.end('left', 1 - seat);
        if (this.state === 'lobby' && seat === 1) { this.seats[1] = null; this.lobbyUpdate(); }
        else if (this.state === 'over') { p.rematch = false; this.broadcast({ t: 'peer', seat, state: 'away' }, seat); this.save(); }
        break;
    }
  }

  // ---------- the match ----------
  private start() {
    this.stopTurns(); this.o.clearTimeout(this.countdownTimer);
    this.state = 'countdown'; this.turn = 0; this.pending = []; this.sums.clear(); this.resync = null; this.recovering = false; this.checkpoint = null;
    this.seed = Math.floor(this.o.random() * 1e9) | 0;
    this.setup = { caps: this.setup?.caps !== false, cmd: this.seats[0]!.cmd!, foe: this.seats[1]!.cmd! };
    const snapshot = this.saved ?? null; this.saved = null;
    this.seats.forEach(q => { q!.lastTick = 0; q!.lastTurn = 0; q!.live = true; });
    this.broadcast({ t: 'start', seed: this.seed, setup: this.setup, snapshot, countdown: COUNTDOWN, turnMs: TURN_MS, ticksPerTurn: TICKS_PER_TURN });
    this.save();
    this.countdownTimer = this.o.setTimeout(() => { if (this.state === 'countdown') { this.state = 'play'; this.startTurns(); } }, COUNTDOWN * 1000);
  }
  private startTurns() { this.stopTurns(); this.timer = this.o.setTimer(() => this.emitTurn(), TURN_MS); }
  private stopTurns() { if (this.timer != null) { this.o.clearTimer(this.timer); this.timer = null; } }
  /** One turn: the commands received since the last one. Exposed for tests that drive time by hand. */
  emitTurn() {
    if (this.state !== 'play') return;
    const cmds = this.pending; this.pending = []; this.turn++;
    this.broadcast({ t: 'turn', n: this.turn, cmds });
    for (const p of this.seats) if (p && p.connected) p.lastTurn = this.turn;
    // a player who has fallen ~8 s behind is treated as gone (the socket is probably dead without having closed)
    const nowTick = this.turn * TICKS_PER_TURN;
    this.seats.forEach((p, i) => {
      if (p && p.connected && p.lastTick && nowTick - p.lastTick > LAG_TICKS) {
        this.o.log('lagged out', i); p.connected = false; p.awaySince = this.o.now(); p.live = true;   // its sim is fine, only late
        this.tr.close?.(p.id, 4010, 'Connection too slow; reconnecting.');
        this.pause('lag', i); this.broadcast({ t: 'peer', seat: i, state: 'away', limit: AWAY_LIMIT_MS });
      }
    });
  }
  private pause(reason: string, seat: number) {
    if (this.state !== 'play' && this.state !== 'countdown') return;
    this.o.clearTimeout(this.countdownTimer);
    this.state = 'paused'; this.stopTurns();
    this.broadcast({ t: 'pause', reason, seat, turn: this.turn });
    this.save();
  }
  /** Both players present: pick who holds the truth and bring the other to it. */
  private beginResync() {
    if (this.state !== 'paused' || this.resync) return;
    if (!this.seats.every(p => p && p.connected)) return;
    const live = [0, 1].filter(i => this.seats[i]!.live);
    const from: number | 'room' | null = live.includes(0) ? 0 : live.includes(1) ? 1 : this.checkpoint ? 'room' : null;
    if (from === null) { this.end('lost', null); return; }
    // a player who lost its simulation (page refresh) first rebuilds the match, then receives the state
    for (const i of [0, 1]) if (!this.seats[i]!.live) this.sendTo(i, { t: 'start', seed: this.seed ?? 0, setup: this.setup!, snapshot: null, countdown: COUNTDOWN, turnMs: TURN_MS, ticksPerTurn: TICKS_PER_TURN, rejoin: true });
    if (from === 'room') {
      const cp = this.checkpoint!;
      this.turn = cp.tick / TICKS_PER_TURN;
      this.resync = { from, tick: cp.tick, waiting: new Set([0, 1]) };
      this.broadcast({ t: 'state', tick: cp.tick, snap: cp.snap });
    } else {
      // the source can only reach a tick it holds every turn for: the room's turn if it never dropped, else what it reported
      const tick = (this.recovering || this.seats[from]!.lastTurn < this.turn ? this.seats[from]!.lastTurn : this.turn) * TICKS_PER_TURN;
      this.resync = { from, tick, waiting: new Set([1 - from]) };
      this.broadcast({ t: 'resync', tick, from });
    }
    this.recovering = false;
  }
  private resume() {
    if (!this.seats.every(p => p && p.connected)) return;
    this.state = 'countdown'; this.sums.clear(); this.seats.forEach(p => { p!.live = true; p!.lastTick = 0; });
    this.broadcast({ t: 'resume', in: COUNTDOWN, turn: this.turn });
    this.save();
    this.countdownTimer = this.o.setTimeout(() => { if (this.state === 'countdown') { this.state = 'play'; this.startTurns(); } }, COUNTDOWN * 1000);
  }
  private checkSum(seat: number, tick: number, hash: number) {
    const s = this.sums.get(tick) ?? [undefined, undefined]; s[seat] = hash; this.sums.set(tick, s);
    if (s[0] === undefined || s[1] === undefined) return;
    for (const k of [...this.sums.keys()]) if (k <= tick) this.sums.delete(k);
    if (s[0] !== s[1] && !this.resync) {
      this.o.log('desync at', tick);
      this.pause('desync', -1);
      this.beginResync();
    }
  }
  private end(reason: string, winner: number | null) {
    this.stopTurns(); this.o.clearTimeout(this.countdownTimer); this.resync = null; this.recovering = false;
    this.state = 'over'; this.checkpoint = null;
    this.seats.forEach(p => { if (p) { p.rematch = false; p.ready = false; } });
    this.broadcast({ t: 'over', reason, winner });
    this.save();
  }
  /** Stop timers (the hosting object is going away). */
  dispose() { this.stopTurns(); this.o.clearTimeout(this.countdownTimer); }
}

export function validCmd(c: unknown): c is string { return typeof c === 'string' && Object.hasOwn(COMMANDER_FACTION, c); }

/** Shape check for a client message, before it reaches the room. Gameplay commands are checked loosely here and
    strictly by each client's simulation (applyCmd ignores anything that isn't legal for that team). */
export function validMessage(v: unknown): v is ClientMsg {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const m = v as Record<string, any>;
  const int = (n: unknown) => Number.isSafeInteger(n);
  switch (m.t) {
    case 'hello': return (m.cmd == null || validCmd(m.cmd)) && (m.lastTurn == null || int(m.lastTurn)) && (m.snapshot == null || typeof m.snapshot === 'object');
    case 'ready': return typeof m.on === 'boolean' && (m.cmd == null || validCmd(m.cmd));
    case 'setup': return !!m.setup && typeof m.setup === 'object';
    case 'start': case 'rematch': case 'forfeit': case 'leave': return true;
    case 'cmd': return validGameCmd(m.c);
    case 'sum': return int(m.tick) && int(m.hash);
    case 'state': case 'checkpoint': return int(m.tick) && m.tick >= 0 && !!m.snap && typeof m.snap === 'object';
    case 'synced': return int(m.tick);
    case 'chat': return int(m.id);
    case 'over': return m.winner === 0 || m.winner === 1;
    default: return false;
  }
}
const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e6;
const pts = (a: unknown) => Array.isArray(a) && a.length <= 96 && a.every(p => p && typeof p === 'object' && num((p as any).x) && num((p as any).y));
export function validGameCmd(c: unknown): boolean {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  const m = c as Record<string, any>;
  switch (m.k) {
    case 'deploy': return typeof m.type === 'string' && m.type.length <= 40 && num(m.sx) && num(m.sy) && typeof m.mode === 'string' && m.mode.length <= 12;
    case 'route': case 'extend': return Number.isSafeInteger(m.u) && pts(m.pts);
    case 'attack': return Number.isSafeInteger(m.u) && Number.isSafeInteger(m.t);
    case 'hold': case 'lane': return Number.isSafeInteger(m.u);
    case 'seal': case 'surrender': return true;
    case 'super': return num(m.x) && num(m.y);
    default: return false;
  }
}
