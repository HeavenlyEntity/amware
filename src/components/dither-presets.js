/* The hero Dither from the design's mountDither(), shared by the Projects
   and Courses heroes. */
export const HERO_DITHER = {
  waveColor: '#3ce8ce',
  backgroundColor: '#0b0b0f',
  palette: ['#0b0b0f', '#123c37', '#0b756c', '#3ce8ce'],
  colorNum: 4,
  ditherMode: 'bayer4',
  pixelSize: 3,
  scale: 1.1,
  waveSpeed: 0.035,
  waveFrequency: 2.6,
  waveAmplitude: 0.32,
  contrast: 0.9,
  brightness: -0.08,
  mouseEffect: 'ripple',
  mouseRadius: 0.9,
  mouseStrength: 0.8,
  trail: 0.6,
  clickRipple: true,
}

/* The Accelerator card: same palette, finer and softer, no pointer. */
export const TRACK_DITHER = {
  waveColor: '#3ce8ce',
  backgroundColor: '#0b0b0f',
  palette: ['#0b0b0f', '#123c37', '#0b756c', '#3ce8ce'],
  colorNum: 4,
  ditherMode: 'bayer4',
  pixelSize: 2,
  scale: 1.4,
  waveSpeed: 0.03,
  waveFrequency: 3,
  waveAmplitude: 0.3,
  contrast: 0.85,
  brightness: -0.12,
  enableMouseInteraction: false,
  clickRipple: false,
  intro: false,
}
