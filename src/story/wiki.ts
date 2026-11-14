// The in-game NASA wiki: for players who want to go deeper. Five topics on living in space, plus how the
// game uses NASA data. Every link was opened and checked on 2026-11-14 (see docs/NASA_SOURCES.md).
// Plain language for ages 7-12. Links open the real NASA page in a new tab; the game works offline without them.
export interface WikiLink { title: string; blurb: string; url: string }
export interface WikiSection { id: string; title: string; icon: string; intro: string; links: WikiLink[] }

export const WIKI: WikiSection[] = [
  { id: 'food', title: 'Food: growing things to eat', icon: 'farm', intro: 'On a long mission you cannot pack enough food, so astronauts are learning to farm in space.', links: [
    { title: 'Growing Plants in Space', blurb: 'How the space station\'s "Veggie" garden works.', url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/' },
    { title: 'Veggie: fresh food on the station', blurb: 'Plants grow in little pillows under red, blue and green LED lights.', url: 'https://www.nasa.gov/missions/station/veggie-will-expand-fresh-food-production-on-space-station/' },
    { title: 'Which crops for deep space?', blurb: 'Potatoes, sweet potatoes, wheat and soybeans are good picks.', url: 'https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/' },
    { title: 'So you want to be a space farmer', blurb: 'What NASA is learning by growing plants in orbit.', url: 'https://www.nasa.gov/missions/station/so-you-want-to-be-a-space-farmer/' },
    { title: 'Growing Beyond Earth', blurb: 'Classrooms help NASA test which plants to grow in space. You could join.', url: 'https://science.nasa.gov/growing-beyond-earth/' },
  ] },
  { id: 'health', title: 'Health: staying strong and safe', icon: 'crew', intro: 'Radiation and low gravity are hard on the body. Shielding and daily exercise are the answer.', links: [
    { title: 'NASA explains space radiation', blurb: 'Why protecting astronauts from radiation is one of the biggest challenges of a Mars trip.', url: 'https://www.nasa.gov/humans-in-space/positive-negative-or-neutral-it-all-matters-nasa-explains-space-radiation/' },
    { title: 'Real Martians: protecting astronauts on Mars', blurb: 'Mars has no global magnetic field and a thin atmosphere. Water and plastic make good shields.', url: 'https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/' },
    { title: 'Counteracting bone and muscle loss', blurb: 'Without gravity, bones get weaker. Astronauts exercise about two hours every day.', url: 'https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/' },
    { title: 'Astronaut health care in space', blurb: 'How crews stay healthy far from any hospital.', url: 'https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/' },
    { title: 'Open Science Data Repository (OSDR)', blurb: 'NASA\'s open library of space biology and astronaut health data.', url: 'https://science.nasa.gov/biological-physical/data/osdr/' },
  ] },
  { id: 'energy', title: 'Energy: power for the base', icon: 'power', intro: 'Solar panels need sunlight. Dust storms block it. NASA is also building small nuclear reactors for the Moon and Mars.', links: [
    { title: 'Fission Surface Power', blurb: 'NASA plans a nuclear power system on the Moon first, then Mars.', url: 'https://www.nasa.gov/directorates/stmd/fission-surface-power/' },
    { title: 'Kilopower', blurb: 'The small reactor design that started it, tested in 2018.', url: 'https://www.nasa.gov/directorates/stmd/tech-demo-missions-program/kilopower-hmqzw/' },
    { title: 'The 2018 Mars dust storm, 10 things', blurb: 'When dust blocks the Sun, a solar-powered rover cannot recharge.', url: 'https://science.nasa.gov/solar-system/planets/mars/10-things-massive-dust-storm-on-mars/' },
    { title: 'Opportunity\'s mission comes to an end', blurb: 'The rover\'s last message was on June 10, 2018, during the dust storm.', url: 'https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/' },
    { title: 'What the global storm taught us', blurb: 'How Mars lost water, and other lessons from the 2018 storm.', url: 'https://www.nasa.gov/missions/martian-dust-could-help-explain-water-loss-plus-other-learnings-from-global-storm/' },
  ] },
  { id: 'travel', title: 'Travel: getting there and calling home', icon: 'dish', intro: 'Mars is far. Trips take months and radio messages take minutes, so crews must decide for themselves.', links: [
    { title: 'How long does it take to get to Mars?', blurb: 'About seven to ten months, a NASA expert explains.', url: 'https://www.nasa.gov/directorates/smd/how-long-does-it-take-to-get-to-the-moon-mars-jupiter-we-asked-a-nasa-expert-episode-51/' },
    { title: 'Talking to Perseverance', blurb: 'Radio commands take between 3 and 22 minutes to reach Mars.', url: 'https://science.nasa.gov/blog/speaking-percys-language-how-to-talk-so-perseverance-will-listen/' },
    { title: 'Mars in a Minute: how do you get to Mars?', blurb: 'About every two years the planets line up for the cheapest trip.', url: 'https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-how-do-you-get-to-mars/' },
    { title: 'Delay-tolerant networking', blurb: 'The "space internet" that copes with long delays and dropped signals.', url: 'https://www.nasa.gov/communicating-with-missions/delay-disruption-tolerant-networking/' },
    { title: 'Artemis: Moon to Mars', blurb: 'NASA\'s plan to return to the Moon and prepare for Mars.', url: 'https://www.nasa.gov/humans-in-space/artemis/' },
  ] },
  { id: 'resources', title: 'Resources: water, air and building stuff', icon: 'water', intro: 'Every litre of water and every breath of air has to be recycled or made on Mars.', links: [
    { title: 'MOXIE made oxygen on Mars', blurb: 'Perseverance\'s experiment turned Martian air into 122 grams of oxygen.', url: 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
    { title: '98% water recovery on the space station', blurb: 'Almost every drop, including sweat and urine, becomes clean water again.', url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/' },
    { title: 'A treasure map of ice on Mars', blurb: 'Buried ice could give future astronauts water to drink and fuel to fly.', url: 'https://www.nasa.gov/solar-system/planets/mars/nasa-is-locating-ice-on-mars-with-this-new-map/' },
    { title: 'Follow the water', blurb: 'Why the first Mars base should be built near ice.', url: 'https://www.nasa.gov/centers-and-facilities/jpl/where-should-future-astronauts-land-on-mars-follow-the-water/' },
    { title: '3D printing with Mars soil', blurb: 'A NASA print head that builds with regolith mixed with plastic.', url: 'https://technology.nasa.gov/patent/KSC-TOPS-88' },
  ] },
  { id: 'data', title: 'How this game uses NASA data', icon: 'doc', intro: 'The storm in Episode 1 is modelled on a real solar flare. Here is where the numbers come from.', links: [
    { title: 'DONKI: NASA\'s space weather database', blurb: 'The catalogue of real solar flares the game reads. Flight controllers use it too.', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
    { title: 'The X9.0 flare of 3 October 2024', blurb: 'The strongest flare of this solar cycle. Episode 1\'s storm is modelled on it.', url: 'https://science.nasa.gov/blogs/solar-cycle-25/2024/10/03/sun-releases-strong-solar-flare-6/' },
    { title: 'The X8.7 flare of 14 May 2024', blurb: 'The second real flare in the game\'s calendar.', url: 'https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/' },
    { title: 'Pits and channels of Hebrus Valles', blurb: 'The real pit near our (fictional) base: about 1.9 km long and nearly 500 m deep.', url: 'https://www.jpl.nasa.gov/images/pia11704-pits-and-channels-of-hebrus-valles/' },
    { title: 'Curiosity measures radiation on Mars', blurb: 'The RAD instrument tells NASA what astronauts would face on the surface.', url: 'https://www.nasa.gov/missions/mars-science-laboratory/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/' },
  ] },
];
