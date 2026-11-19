# NASA sources used in My Little Red Planet (for the judges)

Every NASA data point, number or reference in the game is listed here with where it appears, whether it is **live**, **archived** or a **reference**, and how we checked it. The machine-readable version is `src/data/manifest.json` (a unit test fails if a real-data event cites a source that is not in it). Nothing in the game is presented as live unless it was fetched while you played.

Checked on **2026-11-14** by opening each page or querying the API. Game numbers that are *not* NASA data are labelled **game model** in the game and below.

**Update rule:** this file is only updated when the game uses new NASA data or sources (a new link, image, number or quiz question source). Other changes do not touch it. Episode 1 sections (1 to 4) were checked 2026-11-14; the quiz section (5) was checked 2026-11-19.

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

## 5. Quiz sources (Phase 10: 100 questions + 1 pop quiz)

Status: **DONE** (added 2026-11-19). Every quiz question carries a `sourceUrl` and `sourceTitle`, and the question screen shows it as the LEARN MORE / STUDY MORE link. All 100 questions are `verified: true`: each fact was read on the NASA page listed here (checked 2026-11-19). A unit test (`tests/quiz-content.test.ts`) fails if a question's link is not on a NASA domain. The questions live in `src/story/quiz-reyes.ts`, `quiz-aoki.ts` (crew id `aiko`), `quiz-david.ts` and `quiz-sofia.ts`; 30 unique NASA pages back all 100 questions. The "Used by" column shows how many questions each crew member draws from the page.

| Page | What it links to | Used by (questions) |
|---|---|---|
| [NASA JPL: Mars at a Glance](https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance) | JPL fact page (from the InSight launch press kit) with basic Mars facts: two moons, mostly carbon dioxide air, gravity, year and sol length. Used because the newer Science Mars facts pages could not be opened in the sandbox. | Reyes 7, Aoki 1 |
| [NASA JPL: Mars in a Minute, When the Sun Blocks Our Signal](https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-what-happens-when-the-sun-blocks-our-signal/) | JPL Edu video page on the communications break (solar conjunction) when the Sun sits between Earth and Mars. | Reyes 3 |
| [NASA JPL: Touchdown! Perseverance Lands on Mars](https://www.jpl.nasa.gov/news/touchdown-nasas-mars-perseverance-rover-safely-lands-on-red-planet/) | JPL news release on Perseverance landing in Jezero Crater on 18 February 2021. | Reyes 1, David 1 |
| [NASA NTRS: Earth Independent Operations for the Mars Campaign](https://ntrs.nasa.gov/api/citations/20240007807/downloads/ASCEND%20DRAFT%20-%20FORMATTED.pdf) | NASA Technical Reports Server paper on how a Mars crew works when the message delay with Earth is long. | Reyes 2 |
| [NASA Science: Mars](https://science.nasa.gov/mars/) | NASA Science's main Mars page: planet overview, including Mars as the fourth planet from the Sun. | Reyes 1 |
| [NASA Science: Speaking Percy's Language](https://science.nasa.gov/missions/mars-2020-perseverance/speaking-percys-language-how-to-talk-so-perseverance-will-listen/) | NASA Science blog on how commands are sent to Perseverance, including the 3 to 22 minute one-way radio delay. | Reyes 2 |
| [NASA: Astronaut Training Fact Sheet](https://www.nasa.gov/wp-content/uploads/2015/10/160410main_space_training_fact_sheet.pdf) | NASA fact sheet (PDF) on astronaut training, including underwater spacewalk practice. | Reyes 2 |
| [NASA: CHAPEA Mission 2](https://www.nasa.gov/humans-in-space/chapea/chapea-mission-2/) | NASA page on the 378-day simulated Mars habitat mission with a crew of four. | Reyes 1 |
| [NASA: Real Martians, How to Protect Astronauts from Space Radiation on Mars](https://www.nasa.gov/solar-system/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/) | NASA feature on space radiation at Mars and how to shield astronauts (hydrogen-rich materials such as water). | Reyes 4 |
| [NASA: Voyagers of Mars, the First CHAPEA Crew](https://www.nasa.gov/missions/voyagers-of-mars-the-first-chapea-crews-yearlong-journey/) | NASA story about the first CHAPEA crew's year-long simulated Mars mission, including the commander's role and message bandwidth. | Reyes 2 |
| [NASA Spinoff: The Martian Garden Recreates Red Planet's Surface](https://spinoff.nasa.gov/Spinoff2018/cg_4.html) | NASA Spinoff 2018 story on Mars Mojave Simulant, a basalt test soil for Mars gardening. | Aoki 2 |
| [NASA: Astronauts Harvest Radish Crop on the Space Station](https://www.nasa.gov/missions/station/astronauts-harvest-radish-crop-on-international-space-station/) | NASA article on the radish harvest in the Advanced Plant Habitat (27 days to maturity, LED lights). | Aoki 3 |
| [NASA: Chile Peppers Start Spicing Up the Space Station](https://www.nasa.gov/missions/station/iss-research/chile-peppers-start-spicing-up-the-space-station/) | NASA station-research article on the chile pepper experiment. | Aoki 2 |
| [NASA: Plant Researchers Explore Question of Deep-Space Food Crops](https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/) | NASA article on which crops could feed a deep-space crew: sunlight on Mars, potatoes, Martian soil, perchlorates. | Aoki 10 |
| [NASA: So You Want to Be a Space Farmer](https://www.nasa.gov/humans-in-space/so-you-want-to-be-a-space-farmer/) | NASA article on the challenges of growing plants in space, such as watering in microgravity. | Aoki 2 |
| [NASA: Veggie Fact Sheet](https://www.nasa.gov/wp-content/uploads/2023/03/veggie-fact-sheet-508.pdf) | NASA fact sheet (PDF) on Veggie, the plant growth unit on the space station: plant pillows, wicks, lights, power. | Aoki 5 |
| [NASA JPL: Ingenuity Mars Helicopter Succeeds in Historic First Flight](https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/) | JPL news on Ingenuity's first flight on 19 April 2021 and Mars's thin air. | David 3 |
| [NASA JPL: Mars 2020 Perseverance Power](https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/spacecraft/power/) | JPL press-kit page on Perseverance's nuclear battery (MMRTG) and its power budget. | David 3 |
| [NASA JPL: Opportunity Hunkers Down During Dust Storm](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) | JPL news on how Opportunity coped with the 2018 global dust storm (low power, heaters, batteries). | David 5 |
| [NASA JPL: Perseverance Extracts First Oxygen from the Red Planet](https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/) | JPL news on MOXIE making oxygen from Martian carbon dioxide. | David 4 |
| [NASA: Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) | NASA reference page on the space station's life support: water recovery, oxygen, carbon dioxide removal. | David 4 |
| [NASA: For InSight, Dust Cleanings Will Yield New Science](https://www.nasa.gov/missions/insight/for-insight-dust-cleanings-will-yield-new-science/) | NASA article on dust on InSight's solar panels, cleaning gusts, and power per sol. | David 2 |
| [NASA: The Mars Relay Network Connects Us to NASA's Martian Explorers](https://www.nasa.gov/centers-and-facilities/jpl/the-mars-relay-network-connects-us-to-nasas-martian-explorers/) | NASA article on how orbiters relay rover data and the Deep Space Network stations. | David 3 |
| [NASA: Counteracting Bone and Muscle Loss in Microgravity](https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/) | NASA station-research article on bone and muscle loss and the daily exercise that fights it (ARED). | Sofia 5 |
| [NASA: Landmark Twins Study Reveals Resilience of Human Body in Space](https://www.nasa.gov/news-release/nasas-landmark-twins-study-reveals-resilience-of-human-body-in-space/) | NASA news release on the Twins Study: Scott Kelly's 340 days in space compared with his twin on Earth. | Sofia 4 |
| [NASA: Seven Ways Astronauts Improve Sleep](https://www.nasa.gov/missions/station/seven-ways-astronauts-improve-sleep-may-help-you-snooze-better-on-earth/) | NASA article on sleep on the station (16 sunrises a day, adjustable lighting). | Sofia 3 |
| [NASA: Space Faring, The Radiation Challenge](https://www.nasa.gov/wp-content/uploads/2017/04/radiationchallenge.pdf) | NASA education guide (PDF) on space radiation. Used for qualitative facts only, because it contradicts itself on dose numbers. | Sofia 4 |
| [NASA: Space Nutrition (2nd edition)](https://www.nasa.gov/wp-content/uploads/2024/10/2024-space-nutrition-2nd-edition-2024.pdf) | NASA book (PDF) on astronaut nutrition: vitamin D, calcium, the food menu, pre-landing salty water. | Sofia 5 |
| [NASA: The Real Story About Astronaut Health Care in Space](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/) | NASA FAQ on how astronauts' health is looked after, including flight surgeons. | Sofia 1 |
| [NASA: Valles Marineris, the Grand Canyon of Mars](https://www.nasa.gov/image-article/valles-marineris-grand-canyon-of-mars/) | NASA image article on Mars's giant canyon: length, depth, and how it may have formed. | Sofia 3 |

**Pop quiz (step 27j):** the early "Radiation peak tonight" event in `src/story/episode1.ts` is one pop quiz question ("What can you do to get more radiation protection in an emergency?"). Source, `verified: true`: [NASA Orion: radiation handout](https://www.nasa.gov/wp-content/uploads/2015/11/np-2014-03-001-jsc-orion_radiation_handout.pdf), a NASA PDF that describes the storm shelter and using water, food and supplies as extra shielding. The NASA technical paper on the RadWorks storm shelter agrees with it.

**Caveat:** the Mars basics facts (two moons, carbon dioxide air, gravity, year and sol length) cite JPL's *Mars at a Glance* page, an older InSight press kit that is still NASA, because the newer science.nasa.gov Mars facts pages could not be opened in the sandbox.

## 6. Known limits

- Perseverance MEDA / Curiosity REMS weather pages were not integrated; Episode 1's weather is a scripted game model.
- NASA OSDR is linked as a resource; no OSDR dataset is read by the game.
- Campaign-mode discovery cards about Hellas and lava tubes still say "verify exact citation" and are not part of Episode 1.
