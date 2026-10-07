# Commander Blurbs — design and locked lines

Status: design agreed 2026-10-06, **built in v21 (2026-10-07)**; see build-status v21 for the exact rules as coded. Kyndrili's, Holts', Borvik's and Grom's lines are locked; Ilsabet's and Mawgrom's are locked too, so all six commanders are done (90 lines).

## What it is
A short line from your commander (and the enemy commander) shown as a small toast with the existing 22–26 px portrait circle, at the top of the screen just under the clock, away from the card tray and minimap. Visible about 3 s. Uses the one portrait each commander already has (240 × 240); no new art needed. A Settings toggle "Commander voice: on/off". Look APPROVED 2026-10-07 (mockup `blurb-toast-mockup.png`): pill with 26–30 px portrait circle, commander name in small caps above an italic line; yours on the left with a gold ring, the enemy mirrored on the right in red; landscape phones and desktop centred just under the clock, portrait phones just below the minimap row; one blurb visible at a time; name label kept. Text only for now (no sound sting until the sound review is done). Enemy commander speaks too, on the red side.

## Rules
- At most one blurb every 20–30 s, except the gold alerts below. No repeats until a commander's pool for that trigger is used up.
- Triggers: first deploy, deploy a flyer, deploy a ground/wagon/caster unit, rank seal broken, enemy Rank III/IV unit fielded, own strike called, own tower lost, enemy tower lost, a lane broken (winning), own keep low, gold full, match won, match lost.
- **Gold-full alert** (user decision 2026-10-06): fires only after gold has sat at the 30 cap for about 8 s. Lines 1–3 play in order, **at least 15 s apart** (user changed it from 30 s). After the third it stays quiet until the player spends and fills up again. It is suppressed while the player is deliberately saving: if gold is full and the next rank seal or the strike is already affordable, it shows a hint line instead (e.g. "The seal is within reach. Break it."). The gold meter keeps its own flashing "Full" label.
- **No counting**: no line states or implies how many towers or enemies there are or remain (the tower count may become a match setting). Grom's original "Nine left" and "Twelve. No, thirteen" lines were dropped for this reason.
- Every commander gets the same three gold-full lines in their own voice (Holts dry, Grom short and rude).

## Kyndrili Veli'sha — LOCKED (15 lines)
Deploy
1. "The wind favours this. Go." (first unit of the match)
2. "Moonhawks, up." (any flyer)
3. "Quietly now." (wagon or caster)

Change of fortune
4. "Ah. There is the sky I wanted." (rank seal broken)
5. "Something heavy and slow. How thoughtful of them." (enemy Rank III/IV unit)
6. "Look up." (own strike)
7. "A tower is only a place to stand. We'll stand elsewhere." (own tower lost)
8. "One fewer place for them to stand." (enemy tower lost)
9. "Their gate is open. I can see straight through." (lane broken)
10. "The ground is closer than I'd like." (own keep low)

Gold full (15 s apart, in order)
11. "Your purse is full. Gold that sits does not fly."
12. "Do spend something. The sky is looking very empty."
13. "Still full. I shall hum until you spend something."

Match end
14. "The wind told me. I merely agreed." (victory)
15. "The air went still. Next time I will listen sooner." (defeat)

## Sir Asher Holts — LOCKED (15 lines)
Deploy
1. "Shields up. Hold the line." (first unit of the match)
2. "Wings up. Try to bring them home." (any flyer)
3. "Steady." (wagon or caster)

Change of fortune
4. "Good. Now we can do this properly." (rank seal broken)
5. "Something big on the left. Nobody panic." (enemy Rank III/IV unit)
6. "Judgment. Clear the ground." (own strike)
7. "We'll have that back." (own tower lost)
8. "One down. Don't cheer yet." (enemy tower lost)
9. "That's the gate. Finish it cleanly." (lane broken)
10. "The keep is hurting. Nobody leaves this line." (own keep low)

Gold full (15 s apart, in order)
11. "A full purse does no work."
12. "Spend it. Coin in a purse never held a wall."
13. "Still full. I'll assume that's deliberate. It isn't, is it."

Match end
14. "Well held. Count the wounded." (victory)
15. "Fall back to the road. We're not done; we're just done here." (defeat)

## Thane Borvik — LOCKED (15 lines)
Deploy
1. "Mind the wheels!" (first unit of the match)
2. "Up she goes! Don't let her touch the ground, she's sulky." (any flyer)
3. "Gently now. Gently. She's only just been oiled." (wagon or caster)

Change of fortune
4. "Ha! The good machines are open now." (rank seal broken)
5. "Oh, a big one. Oh, that's lovely. Load." (enemy Rank III/IV unit)
6. "Everybody back from the barrel!" (own strike)
7. "Pff. That one was held together with hope. We'll build it better." (own tower lost)
8. "There goes a tower! Nice and clean, no splinters." (enemy tower lost)
9. "Gate's open! Somebody bring the big cannon." (lane broken)
10. "The keep's rattling! Hold her together, lads!" (own keep low)

Gold full (15 s apart, in order)
11. "Gold in the purse, no gears in the wagon. Spend, spend!"
12. "That's a lot of coin doing nothing. I could build a whole cannon with that."
13. "Still full! I'm not going to say anything. ... Spend it!"

Match end
14. "Ha! Write that on the barrel. No, the other barrel." (victory)
15. "Back to the workshop. I know exactly what went wrong. Several things." (defeat)

## Warchief Grom — LOCKED (15 lines)
Deploy
1. "Go. Go. GO." (first unit of the match)
2. "Wyverns. Up. Hit something expensive." (any flyer)
3. "Berserkers, ahead of me." (wagon or caster)

Change of fortune
4. "More. Good. Send more." (rank seal broken)
5. "Big one. Means they're scared." (enemy Rank III/IV unit)
6. "Meteor. Don't stand under it." (own strike)
7. "Tower's gone! That better not happen again!" (own tower lost)
8. "Down. Next." (enemy tower lost)
9. "The gate's open. Everybody in. Now!" (lane broken)
10. "Keep's cracking. Whoever let them in, I'll find you." (own keep low)

Gold full (15 s apart, in order)
11. "Full purse. Buy something. Now."
12. "Coin sits, we sit. Spend it."
13. "Still full. SPEND. THE. GOLD."

Match end
14. "The keep's ours. Cut the Legion's name into the gate." (victory)
15. "Fine. They bled for it. Next time they drown." (defeat)

## Duchess Ilsabet Mourncroft — LOCKED (15 lines)
Deploy
1. "Rise, and attend me." (first unit of the match)
2. "The Drake will join us presently." (any flyer)
3. "Shades. You know what to do." (wagon or caster)

Change of fortune
4. "The crown remembers. Open the next vault." (rank seal broken)
5. "How gauche. Kill it." (enemy Rank III/IV unit)
6. "I have asked the sky for a small favour." (own strike)
7. "Stone falls. We do not." (own tower lost)
8. "One less thing for them to hide behind." (enemy tower lost)
9. "Their gate is open. Do come in, all of you." (lane broken)
10. "They are in the house. How very rude." (own keep low)

Gold full (15 s apart, in order)
11. "A full purse is a locked vault, my dear. Do open it."
12. "I would not wish to hurry you. I would wish you to spend something."
13. "Still full. I have waited a great while. I would rather not wait for this."

Match end
14. "You left me once. Note that I did not leave you." (victory)
15. "Patience. I have had a great deal of practice at waiting." (defeat)

## Mawgrom — the Mountain That Walks — LOCKED (15 lines)
Deploy
1. "Walk." (first unit of the match)
2. "Wings. We will allow it." (any flyer)
3. "Hurlers. Find a rock." (wagon or caster)

Change of fortune
4. "Now the old ones wake." (rank seal broken)
5. "Small." (enemy Rank III/IV unit)
6. "Stand away. The sky is heavy." (own strike)
7. "Towers fall. Mountains do not notice." (own tower lost)
8. "That was in the way. Now it is not." (enemy tower lost)
9. "Their wall is thin. We can feel it." (lane broken)
10. "We are being moved. We do not like being moved." (own keep low)

Gold full (15 s apart, in order)
11. "The purse is full. Heavy things should be thrown."
12. "Gold that does not move is only a rock. We know about rocks. Spend it."
13. "Still full. We can wait longer than you. Please do not make us."

Match end
14. "The stones will remember this. So will we." (victory)
15. "We will be here. We are always here. Come back when you are ready." (defeat)

## To do
Play-test on the phone (frequency, placement). Possible later: a soft sound sting after the sound review; more lines per trigger so repeats are rarer.
