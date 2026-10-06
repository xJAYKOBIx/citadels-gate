# Citadel's Gate — Multiplayer Plan (v18)

Decided with the user on 2026-10-04. Read this with `claude/build-status.md`.

## Decisions

**Changed 2026-10-04 (user): the rooms, accounts and host saves should build on what The Ossuary already uses** (its code is in the user's GitHub repo `TheOssuary`, not reachable from this session; see Status). Until that code is in hand, a reference Cloudflare Worker + Durable Object implementation of the room protocol lives in `server/`; it is small and can be folded into The Ossuary's Worker, or the Ossuary's room code can be adapted to the protocol in `room.js`. Players find each other by room code: the host taps Create and gets a five-letter code and a share link; the guest enters the code or opens the link. Version one includes pause and rejoin, host saves, in-match quick chat (preset lines only) and a rematch button. The game is served from the user's existing Cloudflare site, with the room Worker beside it (domain still to be confirmed).

## Cost

Durable Objects run on the Workers Free plan with SQLite storage: 100,000 requests a day, 13,000 GB-s of duration a day, 5 GB of storage. Incoming WebSocket messages bill at 20:1. A 15-minute match keeps its room awake (~112 GB-s at 128 MB), so the free plan supports roughly 100 matches a day; the $5/month Workers plan removes the concern. WebRTC peer-to-peer with the room used only for signalling is a later cost optimisation, not version one.

## Architecture: lockstep with snapshot repair

Both browsers run the same deterministic simulation (30 Hz fixed step, seeded `S.rnd`). Only commands travel: deploy, path, attack order, hold, lane join, seal, strike, cache-agnostic orders. The room stamps each command with the tick it executes on (current tick + input delay, ~6 ticks = 200 ms) and broadcasts it to both players, so both apply it on the same tick. The room also sends a turn heartbeat (every 3 ticks, 10 per second) so neither client runs ahead of the other; a client that hasn't received the heartbeat for tick T waits at T.

Desync repair: every 30 ticks each client sends a checksum of the sim state. On mismatch the host serialises its full state (`serializeState()`, entities by id, cross-references as ids) and the guest replaces its state with it. Cross-platform floating-point differences (Safari vs Chrome trig) are expected to cause occasional repairs; same-engine pairs should never desync.

The same snapshot powers rejoin (the returning player receives the host's current state) and host saves (snapshot stored on the host's device; resuming creates a new room from it).

## Simulation changes needed first

All player actions go through one command function instead of mutating state directly. Single-player keeps working through the same path with zero delay. In multiplayer: no game-speed setting, no slow-time while drawing a path, no pause button (pauses come only from disconnects, or a mutual pause request), no AI on either side. Audit: no `Math.random`, `performance.now` or `headless`-dependent branches in sim code; anything visual stays out of the sim. Path drawing produces a route in the issuing client from map data only (deterministic), sent as points.

## Room protocol (WebSocket JSON)

Client → room: `hello {name, cmd, token}`, `ready`, `cmd {c}`, `sum {tick, hash}`, `state {tick, blob}` (host), `chat {id}`, `pause`/`resume` requests, `rematch`. Room → client: `room {code, seat, players}`, `start {seed, setup}`, `turn {tick, cmds[]}`, `resync`, `peer {state: away|back|left}`, `chat`, `ended`. Seats: host = team 0, guest = team 1. Reconnect token kept in `sessionStorage` so a refresh rejoins the same seat.

Disconnect: the match pauses for both; the waiting player sees a countdown (2 minutes) with "Keep waiting" and "End match (win by forfeit)". On return the host sends a snapshot and play resumes after a 3-second countdown.

## Lobby and in-match UI

Main menu gains "Play a friend": Create room (shows code + Copy link + Share), Join (code entry). Waiting room shows both commanders and Ready buttons; the host picks the map (Sylvanmere only for now). In match: a small connection dot by the clock (ping), quick-chat button with six lines, pause overlay on disconnect, rematch on the end screen.

## Deployment

A Worker project in the repo (`server/`: `wrangler.toml`, `src/room.js`), connected to the GitHub repo with Cloudflare Workers Builds so each commit from GitHub Desktop deploys. The Worker serves the game page as a static asset and the rooms at `/rooms/<code>` (WebSocket upgrade). Attach to the user's domain with a route once confirmed.

## Testing

Headless: two simulations fed the same command stream must produce identical checksums for a full match; snapshot round-trip (serialise → deserialise → continue) must match an uninterrupted run; the room logic is tested in-process with fake sockets (wrangler can't be installed in the cloud sandbox). The user does the first real two-device test after deploying.

## Phases

1. Command layer, determinism audit, snapshot and checksum, headless proofs.
2. Room Worker and Durable Object, in-process tests.
3. Client networking, lobby, pause/rejoin, chat, rematch, host saves.
4. Deployment files and steps; first live test with the user.


## Status (2026-10-04, v18 build)

Done and proven headlessly: command layer (`issueCmd`/`applyCmd`), deterministic sim (two sims, same commands, identical hashes for 8 min), snapshots (`serializeState`/`restoreState`, ~24 KB, byte-identical to the live state because dead references are cleared every tick), checksums (`stateHash`), the room reference implementation (`room.js`), the lockstep client (`NET`), the lobby/waiting room/pause/rejoin/resync/resume/chat/rematch/host-save UI, and a two-browser test (`tools/mp.js`) that plays a match through an in-process room with a mid-match drop and rejoin: both copies end on the same hash. The guest plays as team 1 and sees the field from its side (`ME`, camera rotated 180°, minimap flipped).

Not yet done: deploying rooms on the user's site (needs The Ossuary's code or a `wrangler deploy` of `server/`), the first live two-device test, and the account-backed host save (saves are on the host's device for now; `mpSave` → `localStorage cc-mp-save`, resumed from the menu).

Deploy without The Ossuary (works today): `cd citadels-gate/server && npx wrangler login && npx wrangler deploy` → the Worker serves the game page (from the repo root, via the `[assets]` block) and the rooms at `/rooms/<CODE>` on a workers.dev address; add a route on the user's domain afterwards. To serve the page elsewhere (GitHub Pages, the Ossuary site), set `MP_ROOMS_URL='wss://<worker host>/rooms'` before the game script, or in the browser console `localStorage.setItem('cc-rooms','wss://<worker host>/rooms')`.

## Status (2026-10-05, v18.1): on the site, ready to deploy

The rooms now live in the user's website (`xJAYKOBIx/jaykobi-website`) next to The Ossuary's, sharing its accounts and saves: `/api/citadel/rooms/*` → `CitadelRoom` Durable Object (migration `citadel-v1`), room rules in `src/room.ts` (vendored to the site by `scripts/import-citadel.mjs`). Players must be signed in to play online; names come from the account; the host's save goes to the account (`citadels-gate/match`). Protocol changes from v18: no tokens or names from the client (identity from the session cookie); `hello{cmd?, snapshot?, live, lastTurn}`; `resync{tick, from}` (the player still holding the battle is the source, host preferred); `start{rejoin:true}` for a refreshed page; `checkpoint{tick, snap}` from the host every minute; `over{reason: keep|left|forfeit|lost}`; chat goes to the other player only. The standalone `server/` Worker and `room.js` are retired. Tested headlessly against the site's real room code (see build-status v18.1); deploy and the first two-device match are next.
