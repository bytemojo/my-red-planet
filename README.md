# My Little Red Planet
### A Junior Astronaut Mission Trainer

A browser game for kids aged 7-12, built for the NASA Space Apps Challenge 2026 challenge "Build a Junior Astronaut Mission Trainer". In **Episode 1: The Storm** you run a Mars outpost at Hebrus Valles while a dust storm and a solar storm hit at once and the crew is sick. Every choice about power, radiation shielding, air, water, food and talking to Earth costs something.

**For judges:** every NASA data point and link is listed in [docs/NASA_SOURCES.md](docs/NASA_SOURCES.md). The storm is modelled on a real flare in NASA's DONKI catalogue, and the menu reads today's real flares live from DONKI when online (it says ARCHIVED when not). Play time: about 10 to 15 minutes.

```
npm install
npm run dev      # play
npm run check    # tests + type-check + build
```
AI agents: read **AGENTS.md** first, then **HANDOFF.md**. Controls: WASD/arrows to walk, E to use, C for the Control Module. Touch: drag to walk, tap the orange button. Talk to the crew at the intercom and feed them at the meal hatch; watch the faces and thought bubbles over their heads.
