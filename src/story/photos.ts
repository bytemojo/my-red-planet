// NASA photos bundled in public/journal/ (no hotlinking). Credits and sources checked 2026-11-14 on each
// NASA Photojournal page. Use: NASA Images and Media Usage Guidelines and the JPL Image Use Policy allow
// educational use with credit (see docs/NASA_SOURCES.md).
export interface Photo { id: string; file: string; title: string; caption: string; credit: string; source: string }
export const PHOTOS: Photo[] = [
  { id: 'PIA11704', file: '/journal/PIA11704.jpg', title: 'Pits and channels of Hebrus Valles',
    caption: 'The real land near our base, seen from orbit. The dark pit is about 1.9 km long and nearly 500 m deep. Pits like this might hide ice, which is why they are candidate landing sites.',
    credit: 'NASA/JPL-Caltech/Univ. of Arizona', source: 'https://www.jpl.nasa.gov/images/pia11704-pits-and-channels-of-hebrus-valles/' },
  { id: 'PIA19400', file: '/journal/PIA19400.jpg', title: 'Sunset in Gale Crater',
    caption: 'Curiosity filmed this sunset in 2015. Mars sunsets look blue near the Sun because fine dust lets blue light through best. That is why dusk in our game is blue.',
    credit: 'NASA/JPL-Caltech/MSSS/Texas A&M Univ.', source: 'https://www.jpl.nasa.gov/images/pia19400-sunset-in-mars-gale-crater/' },
  { id: 'PIA22487', file: '/journal/PIA22487.jpg', title: 'Mars before and during the 2018 dust storm',
    caption: 'Left: Mars in May 2018. Right: a few weeks later, the dust storm hides almost the whole planet. Storms like this are why solar power is a gamble.',
    credit: 'NASA/JPL-Caltech/MSSS', source: 'https://www.jpl.nasa.gov/images/pia22487-mars-before-and-after-dust-storm/' },
  { id: 'PIA17936', file: '/journal/PIA17936.jpg', title: 'Earth, the evening star',
    caption: 'The brightest dot in this Mars sky is Earth, with our Moon just below it. Every message home has to cross that gap.',
    credit: 'NASA/JPL-Caltech/MSSS/TAMU', source: 'https://www.jpl.nasa.gov/images/pia17936-bright-evening-star-seen-from-mars-is-earth/' },
];
export const MARS_MAP = { file: '/map/mars_mola_1024.jpg', width: 1024, height: 512,
  credit: 'USGS Astrogeology Science Center, Goddard Space Flight Center, NASA (Mars Global Surveyor MOLA). Public domain.',
  source: 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m' };
