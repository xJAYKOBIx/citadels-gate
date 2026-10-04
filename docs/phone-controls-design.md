# Citadel's Gate — touch controls, pace and map rethink (decided 2026-10-03)

## Decisions
- **Touch is landscape, held like a controller** — but both orientations are optimized. No stationary camera stations (the user wants the overlooking-a-battlefield feel).
- **Touch camera: fixed facing toward the enemy base + pinch zoom that drives height/tilt** (zoomed out = high and flat across the field; zoomed in = low over the troops). No twist rotation on touch. Full free rotation stays on desktop.
- **Two lanes**, with hidden paths as bypasses rather than full lanes.
- **Sylvanmere** (enchanted forest, winding lanes, diagonal river, hidden paths crossing at a ford, a nest above each lane) is the only map in play until it is settled; Frostmere and Thornspire Pass are set aside.
- **Slow the pace.** Placing units is the strategy: speed, power, range and health must visibly matter. Reacting to the opponent, not spam.
- Units come out of the keep gate at double speed until they clear the base circle.

## Pace targets
- A counter launched when a push is seen at midfield arrives in 15–25 s.
- Casters are the core mortar: they outrange towers by a little, never the keep, must stand still to cast, and are fragile. Nests above each lane give them height.

## Carry-overs still wanted
- **Banners**: units moving together collapse into one badge; tap to select, tap destination or drag a route.
- **Alert rail**: top-edge chips (tower under attack, wave entering lane, flyers inbound, caster spotted, push at enemy gate); tap to jump the camera.
- Sound; campaign; multiplayer (Cloudflare Workers + Durable Objects relay, lockstep on the deterministic sim).
