# The hackathon challenge (read before building anything)

**Event:** NASA Space Apps Challenge 2026. **Challenge:** "Build a Junior Astronaut Mission Trainer".
**Author's video** (NASA Space Apps Challenge channel, published 2026-10-29, 3:31): https://www.youtube.com/watch?v=_R0y4i3iY_M
**Official challenge page:** https://www.spaceappschallenge.org/2026/challenges/ (the team has NOT read it yet; check the judging rubric and the listed data resources before finalising).

## The brief (summary of the text we were given)
Design and build an interactive game or app where kids aged 7-12 run a lunar or Martian outpost, making real decisions about **life support, radiation shielding, power budgeting, food production and communication delay**, then watch the consequences play out. Browser-playable, no account, a working prototype.
- Ground it in real NASA open data where possible (DONKI space weather, OSDR astronaut research, Artemis / Mars surface data). Attribute sources inside the tool. A curated embedded dataset is fine if live calls are not feasible, but **never present static data as live**.
- No "safe" choice with no cost. Two or three core resources, not five or six. Plain language; explain terms like sol and radiation dose in context.
- Stand-out: link a shielding decision to real current space weather; replayability that lets kids learn from failure without punishment; a short explanation of which datasets were used and why, so judges can verify.
- "Don't let visual polish substitute for mechanical accuracy."

## What the author said in the video (auto-captions, lightly interpreted)
Caption errors: "death storm" = **dust storm**, "donkey" = **DONKI**. The speaker and company names are garbled in the captions; verify on the challenge page before quoting anyone.
- Opening scene: "Sol 214 ... a dust storm just rolled in. Your solar panels are about to get buried. You have about **10 seconds** to decide. Retract the panels and lose power tonight, or leave the exposed panels and risk losing a lot more? **That single decision is the entire spirit of this challenge.**"
- "Not a quiz, not a slideshow, a **living simulation where every choice costs something**."
- "Every watt of power, every liter of oxygen, every gram of radiation shielding is a tradeoff against something else. **There is no unlimited resource mode in space.**"
- "Every button you press is teaching a real constraint of deep space survival."
- "Put someone in the commander seat and **make them own their consequences**."
- DONKI: "Imagine building a game where **today's actual solar activity changes how risky your mission is**."
- "Almost anyone can build a working prototype in a weekend." The bar is a finished, clear demo, not a huge game.

## What that means for this project
| Author wants | Where we are | Action |
|---|---|---|
| One tense, fair 10-second decision | Storm episode exists only as an idea; panels can only be cleaned | Build "The Storm Call" (Task 1 in HANDOFF.md) |
| Comms delay as gameplay | Only a line of dialogue and the shipment | "Ask Earth" whose reply arrives after the timer (Task 1) |
| Radiation shielding as a real trade-off | Radiation resets nightly, nothing to plan | Make shielding a planned spend (Task 3) |
| Today's real solar activity changes risk | Flare dates typed from memory, climate table invented | Verify DONKI, add "Today's Sun" (Task 2) |
| Own your consequences | Journal exists, no cause-and-effect view | Debrief screen + replay (Task 4) |
| 2-3 core resources | Seven bars on screen | Decision for the owner (Task 5) |

**Our edge:** warm, replayable, crew you care about, a unit-tested simulation, and Rewind (kids learn from failure without punishment; the weather never changes on rewind, which is itself a lesson: Earth will not change its mind).
**Our risk:** it reads as a cosy farming game at first glance. The trade-off must be impossible to miss, and a judge must reach the storm decision within about two minutes.

## Recommended scope cuts (owner has NOT confirmed)
Cut or shrink: character creator (prompt-pack Step 3), bathroom and science-lab rooms, gym down to one machine tied to a real OSDR/NASA finding, 2 crew chats each (not 5), Mars map and journal photos, Episode 2. Visual Pass B: keep cooking only if the electric heater costs power and competes with shielding; keep the watering and panel-cleaning animations; skip the rest.

## Pitch and demo checklist
- Open on the author's own scene (the storm decision), not on the menu.
- README for judges: table of dataset, what it drives in the game, **live or archived**, limitations. `docs/DATA_MANIFEST.md` is the source of truth.
- 2-minute video: problem (1 line), 60 s gameplay showing one trade-off and its consequence, data sources, a kid playing.
- If possible, one real 7-12-year-old plays it; quote them.
- No plan guarantees a win. This one spends effort where the author said he would look.
