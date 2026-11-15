# NASA sources used in My Little Red Planet (for the judges)

Every NASA data point, number or reference in the game is listed here with where it appears, whether it is **live**, **archived** or a **reference**, and how we checked it. The machine-readable version is `src/data/manifest.json` (a unit test fails if a real-data event cites a source that is not in it). Nothing in the game is presented as live unless it was fetched while you played.

Checked on **2026-11-14** by opening each page or querying the API. Game numbers that are *not* NASA data are labelled **game model** in the game and below.

## 1. Data the game reads

| What | Where it appears | Live or archived | Source | How we checked |
|---|---|---|---|---|
| Solar flares, last 30 days | Compact main-menu Solar Forecast warning opens a detail modal explaining the modeled alert (X = dangerous, M = alert, C and lower = safe) | **LIVE** when online (fetched in the browser, no key, CORS allowed); otherwise the modal says **ARCHIVED** | NASA CCMC DONKI web service `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR` ([about DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)) | Queried 2026-11-01 to 11-14 from the command line: 8 flares returned, `Access-Control-Allow-Origin: *` |
| X9.0 flare, 3 Oct 2024 | Default storm when offline; "Radiation peak" card; debrief | **ARCHIVED** | [DONKI FLR 33693](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/33693/-1), flrID `2024-10-03T12:08:00-FLR-001`, peak 12:18 UTC | DONKI API query for that date returned class X9.0; [NASA Science blog](https://science.nasa.gov/blogs/solar-cycle-25/2024/10/03/sun-releases-strong-solar-flare-6/) gives the same peak (8:18 a.m. ET) |
| X8.7 flare, 14 May 2024 | Campaign mode flare calendar | **ARCHIVED** | [DONKI FLR 30849](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30849/-1), flrID `2024-05-14T16:46:00-FLR-001`, peak 16:51 UTC | DONKI API query; [NASA Science blog](https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/) (12:51 p.m. ET) |
| 2018 global dust storm and Opportunity | The Storm Call card; wiki | Reference | [NASA: lessons from the global storm](https://www.nasa.gov/missions/martian-dust-could-help-explain-water-loss-plus-other-learnings-from-global-storm/); [Opportunity mission ends](https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/) (last contact June 10, 2018) | Pages opened |
| Earth-Mars radio delay, 3 to 22 minutes | "Ask Earth" choice; Reyes' dialogue | Reference | [NASA Science: Speaking Percy's language](https://science.nasa.gov/blog/speaking-percys-language-how-to-talk-so-perseverance-will-listen/) | Page opened; quote: "it takes between 3 and 22 minutes for commands to reach Perseverance" |
| Hebrus Valles pit | Backstory site; candidate cave; wiki | Reference | [JPL PIA11704](https://www.jpl.nasa.gov/images/pia11704-pits-and-channels-of-hebrus-valles/) | Page opened; pit about 1875 m long, nearly 500 m deep, "candidate landing sites" |

**Game models (not NASA data):** the storm timeline (3 locked-in Sols), dust burial of panels, the space-weather alert levels and health drain, crop growth times, crew morale and hunger, battery sizes. The campaign mode's seasonal climate table is a labelled development fallback (`mars-climate-dev-fallback`), not used by Episode 1.

**What DONKI does and does not tell us:** DONKI catalogues real solar flares observed near Earth. It does not measure radiation at a base on Mars. We use the flare class only to set how fierce the in-game storm is.

## 2. Journal photos and the Mars map (bundled in `public/`, not hotlinked)

Use terms checked 2026-11-14: NASA's [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) allow use "for educational or informational purposes, including … computer graphical simulations and Internet Web pages", with NASA acknowledged as the source (NASA notes its imagery is not formally public domain). The [JPL Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) allows educational use; each credit below is copied from the image's Photojournal page. Images were downsized to 880 px wide; nothing else was changed.

| Image | Where in the game | Credit (exact) | Source |
|---|---|---|---|
| PIA11704 Pits and Channels of Hebrus Valles | Journal → Mars photos | NASA/JPL-Caltech/Univ. of Arizona | [JPL PIA11704](https://www.jpl.nasa.gov/images/pia11704-pits-and-channels-of-hebrus-valles/) |
| PIA19400 Sunset in Mars' Gale Crater | Journal → Mars photos | NASA/JPL-Caltech/MSSS/Texas A&M Univ. | [JPL PIA19400](https://www.jpl.nasa.gov/images/pia19400-sunset-in-mars-gale-crater/) |
| PIA22487 Mars Before and After Dust Storm | Journal → Mars photos | NASA/JPL-Caltech/MSSS | [JPL PIA22487](https://www.jpl.nasa.gov/images/pia22487-mars-before-and-after-dust-storm/) |
| PIA17936 Bright 'Evening Star' Seen from Mars is Earth | Journal → Mars photos | NASA/JPL-Caltech/MSSS/TAMU | [JPL PIA17936](https://www.jpl.nasa.gov/images/pia17936-bright-evening-star-seen-from-mars-is-earth/) |
| Mars MGS MOLA Global Color Shaded Relief (1024 px browse image, simple cylindrical) | Journal → Mars map | USGS Astrogeology Science Center, Goddard Space Flight Center, NASA. **Public domain, no use constraints** | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m) |
| Hebrus Valles centre 19.98°N, 126.60°E (planetocentric, +East) | Pin on the Mars map | USGS Gazetteer of Planetary Nomenclature, Feature 2404 | [Gazetteer](https://planetarynames.wr.usgs.gov/Feature/2404) |

The map pin is placed with `mapXY` in `src/core/marsmap.ts` (unit-tested against Hellas basin). The base itself is fictional; the map says "game location based on real map data".

## 3. The in-game NASA wiki (optional reading)

Reachable from the pause menu, the Control Module journal and the debrief. All links opened and checked on 2026-11-14.

**Food:** [Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/) · [Veggie](https://www.nasa.gov/missions/station/veggie-will-expand-fresh-food-production-on-space-station/) · [Deep-space food crops](https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/) · [So you want to be a space farmer](https://www.nasa.gov/missions/station/so-you-want-to-be-a-space-farmer/) · [Growing Beyond Earth](https://science.nasa.gov/growing-beyond-earth/)

**Health:** [NASA explains space radiation](https://www.nasa.gov/humans-in-space/positive-negative-or-neutral-it-all-matters-nasa-explains-space-radiation/) · [Real Martians: radiation on Mars](https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/) · [Bone and muscle loss](https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/) · [Astronaut health care](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/) · [OSDR](https://science.nasa.gov/biological-physical/data/osdr/)

**Energy:** [Fission Surface Power](https://www.nasa.gov/directorates/stmd/fission-surface-power/) · [Kilopower](https://www.nasa.gov/directorates/stmd/tech-demo-missions-program/kilopower-hmqzw/) · [10 things: the 2018 dust storm](https://science.nasa.gov/solar-system/planets/mars/10-things-massive-dust-storm-on-mars/) · [Opportunity's end](https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/) · [Lessons from the global storm](https://www.nasa.gov/missions/martian-dust-could-help-explain-water-loss-plus-other-learnings-from-global-storm/)

**Travel:** [How long to Mars?](https://www.nasa.gov/directorates/smd/how-long-does-it-take-to-get-to-the-moon-mars-jupiter-we-asked-a-nasa-expert-episode-51/) · [Talking to Perseverance](https://science.nasa.gov/blog/speaking-percys-language-how-to-talk-so-perseverance-will-listen/) · [Mars in a Minute](https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-how-do-you-get-to-mars/) · [Delay-tolerant networking](https://www.nasa.gov/communicating-with-missions/delay-disruption-tolerant-networking/) · [Artemis](https://www.nasa.gov/humans-in-space/artemis/)

**Resources:** [MOXIE](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) · [98% water recovery](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) · [Ice map](https://www.nasa.gov/solar-system/planets/mars/nasa-is-locating-ice-on-mars-with-this-new-map/) · [Follow the water](https://www.nasa.gov/centers-and-facilities/jpl/where-should-future-astronauts-land-on-mars-follow-the-water/) · [Regolith 3D printing](https://technology.nasa.gov/patent/KSC-TOPS-88)

**How the game uses NASA data:** [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) · [X9.0 flare](https://science.nasa.gov/blogs/solar-cycle-25/2024/10/03/sun-releases-strong-solar-flare-6/) · [X8.7 flare](https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/) · [Hebrus Valles pit](https://www.jpl.nasa.gov/images/pia11704-pits-and-channels-of-hebrus-valles/) · [Curiosity RAD](https://www.nasa.gov/missions/mars-science-laboratory/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/)

## 4. Facts quoted in the game's learning cards

| Fact | Source |
|---|---|
| Space station crews exercise about two hours a day | [Counteracting bone and muscle loss](https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/) (another NASA page says two and a half hours of scheduled exercise) |
| 98% water recovery on the station | [Water recovery milestone](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) |
| MOXIE made 122 grams of oxygen | [MOXIE completes mission](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) |
| Mars has no global magnetic field and a thin atmosphere; water and plastic are good shields | [Real Martians](https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/) |
| A Mars trip takes about 7 to 10 months | [We asked a NASA expert](https://www.nasa.gov/directorates/smd/how-long-does-it-take-to-get-to-the-moon-mars-jupiter-we-asked-a-nasa-expert-episode-51/) |
| Phoenix found perchlorate salts in Martian soil (2008) | Campaign discovery card; NASA Phoenix mission (not re-verified this session) |

## 5. Known limits

- Perseverance MEDA / Curiosity REMS weather pages were not integrated; Episode 1's weather is a scripted game model.
- NASA OSDR is linked as a resource; no OSDR dataset is read by the game.
- Campaign-mode discovery cards about Hellas and lava tubes still say "verify exact citation" and are not part of Episode 1.
