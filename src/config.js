// ─────────────────────────────────────────────────────────────
//  Layout + content config. Everything is in "scene units"
//  (1 unit ≈ 1 inch-ish). x → right, z → toward the viewer.
//  Proportions come from the 4-block sketch.
// ─────────────────────────────────────────────────────────────

export const SURF = 0.4 // top of the tray floor (y)

// The tray leans back on a stand: rotates about its front-bottom edge.
export const STAND = { tilt: 0.34 }

// Loose, non-interactive trays on the desk (just places things can rest)
export const TRAYS = {
  work: { cx: 0, cz: 7.8, w: 22, d: 4.7, h: 0.25, label: 'WORK AREA', labelY: 0.86 },
  done: { cx: -10.1, cz: 0.4, w: 5.2, d: 7.2, h: 0.25, label: 'DONE SPOT' },
}

// Tray
export const TRAY = { w: 13.4, d: 10.3, floorH: SURF, railH: 0.3, railW: 0.36, r: 0.55 }

// 4 zones (tray-local = world, tray is centred on the origin)
const INNER_W = 12.16
const MAIN_W = 9.0
const GAP_X = 0.4
const SIDE_W = 2.76
const H1 = 1.73
const GAP_Z = 0.36
const H2 = 6.96
const X0 = -INNER_W / 2
const Z0 = -4.525

export const ZONES = {
  name: { cx: X0 + MAIN_W / 2, cz: Z0 + H1 / 2, w: MAIN_W, d: H1 },
  status: { cx: X0 + MAIN_W + GAP_X + SIDE_W / 2, cz: Z0 + H1 / 2, w: SIDE_W, d: H1 },
  main: { cx: X0 + MAIN_W / 2, cz: Z0 + H1 + GAP_Z + H2 / 2, w: MAIN_W, d: H2 },
  comm: { cx: X0 + MAIN_W + GAP_X + SIDE_W / 2, cz: Z0 + H1 + GAP_Z + H2 / 2, w: SIDE_W, d: H2 },
}

// Inside the main block: [count strip | binder]
export const STRIP = { w: 0.75, d: H2, h: 0.12, cx: X0 + 0.75 / 2, cz: ZONES.main.cz, count: 10 }
export const BINDER = {
  baseW: 7.4,
  baseD: H2,
  baseH: 0.14,
  cx: -1.01, // leaves room for the tabs on both sides: strip | tab 0.6 | pages | tab 0.6
  cz: ZONES.main.cz,
  pageW: 3.6,
  pageD: 6.6,
  rings: 6,
}

export const PANEL_H = 0.07
export const BOARD_H = 0.16

// ── Palette: soft, high-lightness, high-saturation ──────────
export const COLORS = {
  wood: '#E3A868',
  woodDark: '#B9783E',
  desk: '#E6BF8C',
  deskDark: '#B88650',
  wall: '#E8D3C2',
  floor: '#D7C6B5',
  boardFrame: '#CFE3FF',
  strip: '#7F8FF0',
  binderBase: '#7BDDB8',
  statusPanel: '#BFE8FF',
  commPanel: '#F6DCEA',
}

export const MARKERS = [
  { name: 'Ink', color: '#33415C' },
  { name: 'Blue', color: '#3D8BFF' },
  { name: 'Pink', color: '#FF5C93' },
  { name: 'Green', color: '#25C486' },
]

// ── Status cards: only ONE fits the status area at a time ───
export const STATUS_CARDS = [
  { id: 'break', label: 'Break', color: '#FFAE57', home: [-4.3, 7.65, 0.05] },
  { id: 'help', label: 'Help', color: '#4DB9FF', home: [-1.3, 7.55, -0.04] },
  { id: 'switch', label: 'Switch', color: '#6FD97F', home: [1.7, 7.65, 0.04] },
]

// ── Feeling stickers (bottom-right "communication area") ────
//  One lane per feeling, 5 intensity rows (top = strongest).
//  Add/remove entries to change the number of lanes.
export const FEELINGS = [
  { id: 'happy', label: 'Happy', color: '#FFD84D', home: [3.7, 7.15, 0] },
  { id: 'tired', label: 'Tired', color: '#B9A3FF', home: [4.45, 7.95, 0] },
  { id: 'worried', label: 'Worried', color: '#FF9E80', home: [5.2, 7.2, 0] },
  { id: 'sad', label: 'Sad', color: '#7FB2FF', home: [5.95, 7.9, 0] },
]
export const LEVELS = 5

// ── Binder: one SPREAD (left + right page) = one step ───────
//  The leaf with the tab is the page whose FRONT is the spread's right half.
//  Spread k = [back of leaf k-1 | front of leaf k]. Flip leaf k to move on.
//  Tabs are glued on the leaves, so they travel with their page.
const cover = { kind: 'cover', photo: 'cover', title: 'Bracelet Station', sub: 'Cover photo of the job goes here' }
const step = (n, textA, textB) => ({
  id: 'step' + n,
  name: 'Step ' + n,
  tab: { label: 'Step ' + n, color: ['#FFE17A', '#FFC27A', '#8CCBFF', '#C7B3FF'][n - 1] },
  left: { kind: 'step', n, photo: `step${n}a`, text: textA },
  right: { kind: 'step', n, photo: `step${n}b`, text: textB },
})
export const SPREADS = [
  { id: 'cover', name: 'Cover', tab: { label: 'Cover', color: '#8DE8C4' }, left: cover, right: cover },
  step(1, 'Placeholder: pick up the string from the start tray.', 'Placeholder: close-up of the string in your hand.'),
  step(2, 'Placeholder: add 5 beads.', 'Placeholder: count them on the strip.'),
  step(3, 'Placeholder: tie the knot at the end.', 'Placeholder: pull it snug, not tight.'),
  step(4, 'Placeholder: put your bracelet in the done spot.', 'Placeholder: this is what done looks like.'),
  {
    id: 'reset',
    name: 'Reset',
    tab: { label: 'Reset', color: '#FF9EB5' },
    left: { kind: 'reset', photo: 'reseta', text: 'Placeholder: put leftover beads back in the tray.' },
    right: { kind: 'reset', photo: 'resetb', text: 'Placeholder: wipe the table and push your chair in.' },
  },
]

// Photo slots. Drop an image into /public/assets and put its URL here;
// it is drawn into the matching page automatically (null = placeholder).
export const PHOTOS = {
  cover: null, // e.g. '/assets/cover.jpg'
  step1a: null, step1b: null,
  step2a: null, step2b: null,
  step3a: null, step3b: null,
  step4a: null, step4b: null,
  reseta: null, resetb: null,
}
