# HANDOFF (update at the end of every session)

## State: Visual Pass A done (crew quarters, animated crew, morale, meals, day/night). Last updated by Claude Code, 2026-11-14.

### Open questions for the owner
- The owner's Episode 1 prompt pack (Steps 0-14, "The Storm") has NOT been started. Step 0 (align docs: Hebrus Valles, new HUD meters, episodes) is the next scripted step. This session did the owner's "visuals first" note instead.
- Visual Pass B is proposed next: kitchen room with an electric heater, cooking, and on-screen animations for watering, cleaning panels and repairs (owner: "each action done manually rather than a button in a menu").
- Crew art direction: the owner asked for Stardew-style cuteness with original art. This session replaced the tiny prototype sprites with generated 16x26 pixel characters (see below). Say if the look should change before more rooms are drawn in this style.

### Done this session (tested: 37 unit tests, type-check, build, and automated browser screenshots)
- **Crew quarters.** The sealed sick bay is now four small rooms behind thin frosted dividers, each with a bed (blanket in the crew member's colour), a desk with a lamp and notebook, a chair, a rug and one personal item (Reyes: ocean photo; Aiko: seedling; David: toolbox; Sofia: rock samples). Name plates on the wall below. `src/game/quarters.ts`.
- **Animated crew.** Each person walks around their room, stands at the window, lies down, naps, or sits writing at the desk. In the evening they read or write at the desk with the lamp on (glow). At night they sleep (closed eyes, zzz badge) or read at the desk by lamplight. What they do comes from `src/core/crewlife.ts` (`pickActivity`, pure and tested); the world only animates it. After the quarantine ends they work around the base by day (sprites appear at their work spots; there is no door animation yet).
- **Morale and faces.** Every crew member has `morale` (0-100). A face above the head shows happy / neutral / sad. The first chat of the Sol gives +15, later chats +4, no chat overnight −8, story choices with `friend` effects also move it. Sad crew rest more; happy crew potter about. Chat panels and the Control Module crew tab show the mood as a chip.
- **Hunger and the meal hatch.** Crew `hunger` rises while awake (hungry about 6 game hours after a meal). Hungry crew show a food thought bubble and pace about. A **MEAL HATCH** next to the intercom (corridor side of the glass) serves everyone who is hungry: the explorer walks up, lifts a tray (new `tray` frame, 1.3 s animation), food comes from the shared store (needs ≥5 food), costs 6 energy, fed crew show a heart and get +6 morale; going to bed hungry costs −6 morale. Guide arrow points to the hatch when someone is hungry. Only while quarantined; after that the crew cook for themselves (`crewNeedsCare`).
- **Farm bubbles.** Beds show a water-drop thought bubble when a crop needs watering (until 21:00) and a star bubble when ready to harvest.
- **Day and night.** `src/game/skytint.ts` (pure, tested) tints outdoors blue at dusk (Mars sunsets are blue), deep blue-violet at night, dim orange-brown in dust; indoors is tinted at 40%. Outdoor lights (airlock, dish, solar farm corners, rover bay once built) and indoor machine glows come on at night; the EVA helmet glows softly.
- **New character art.** `src/game/pixelart.ts` generates every frame from a `CharSpec` (skin, hair colour, hair style, top, bottom, shoes, accent): 3 directions × 3 walk frames, plus write/read/lie/sleep/tray poses, automatic shading and a coloured outline. Six hair styles (short, bob, bun, crop, curly, long). This is the base for the Step 3 character creator: `buildPlayerSheet(scene, spec)` rebuilds the player sheet. EVA suit frames come from the same spec with `eva: true`.
- **Intercom bug fixed.** The old intercom zone was inside the sealed bay (unreachable on foot). Both intercom and hatch zones are now on the corridor above the glass wall (tiles x 8-9 and 11-12, row 11).
- **Save version 2** with migration from v1 saves and their rewind snapshots (`migrateState` in `session.ts`). Newer-version saves are rejected safely.
- Dev-only hook: `window.__game` (Vite DEV only) lets scripts drive the scene for automated playtests.

### Screenshots
`docs/playtest/` holds this session's screenshots (quarters by day and night, hungry crew, serving a meal, outside at night, player close-up).

### Not verified in this session (needs a human playthrough)
- Touch/joystick controls and the tap-to-walk routing (unchanged code, but the player sprite is taller now).
- Post-quarantine crew placement in the base (positions are random inside work areas, chosen without collision checks; may overlap machines).
- The `tray` animation if the player walks away mid-serve (movement is blocked for 1.3 s, should be fine).
- Rewinding into a Sol saved before this session (migration is unit-tested, not browser-tested).

### Known gaps (carried over)
- Climate data is a DEV FALLBACK (see docs/DATA_MANIFEST.md). Flare entries unverified.
- No underground cave scene; no player bunk (rest is in the Control Module, Time tab).
- The seven-bar HUD is still the prototype's; the owner's new three meters (Base Energy, Player Health, Team Morale) are Step 7 of the prompt pack. `teamMorale(s)` already exists in `crewlife.ts` for it.
- Episode 1 prompt pack Steps 0-14: not started.

### Next
1. Owner review of the art direction (this pass) → Visual Pass B (kitchen + cooking + on-screen action animations).
2. Then Step 0 of the Episode 1 prompt pack (docs alignment), then Step 1 (human browser playtest).

### Commands
`npm install` · `npm run dev` · `npm run check` (tests + type-check + build)
