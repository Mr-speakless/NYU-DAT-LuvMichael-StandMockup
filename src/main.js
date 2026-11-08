import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MARKERS, STAND, SPREADS } from './config.js'
import { buildScene } from './scene.js'
import { createNameBoard, createCountBoard } from './whiteboard.js'
import { createBinder } from './binder.js'
import { createPanels } from './panels.js'
import { createTokens } from './tokens.js'

const canvas = document.getElementById('stage')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.NeutralToneMapping // keeps pastels saturated
renderer.toneMappingExposure = 0.95

const { scene, stand } = buildScene(renderer)
const camera = new THREE.PerspectiveCamera(40, 1, 1, 120)
const TARGET = new THREE.Vector3(-1.4, 1.2, 2.2)
// Spherical view around TARGET. polar = angle from straight-down, so a small
// polar looks straight down. The stand leans back by STAND.tilt, so looking
// along the board's normal means polar = STAND.tilt.
const VIEWS = {
  default: { polar: 0.62, azim: 0, dist: 23 },
  face: { polar: STAND.tilt, azim: 0, dist: 23 },
}
const setView = (v) => {
  camera.position.setFromSphericalCoords(v.dist, v.polar, v.azim).add(TARGET)
}
setView(VIEWS.default)

const controls = new OrbitControls(camera, canvas)
controls.target.copy(TARGET)
// left-drag on empty space orbits (gated below), wheel zooms
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }
controls.enablePan = false
controls.enableDamping = true
controls.dampingFactor = 0.12
controls.rotateSpeed = 0.6
controls.minDistance = 8
controls.maxDistance = 34
controls.minPolarAngle = 0.2
controls.maxPolarAngle = 0.95
controls.minAzimuthAngle = -0.3
controls.maxAzimuthAngle = 0.3
controls.update()

// ── objects ────────────────────────────────────────────────
const ui = {
  page: document.getElementById('r-page'),
  status: document.getElementById('r-status'),
  feel: document.getElementById('r-feel'),
}
const pageNames = SPREADS.map((sp) => sp.name)

createPanels(stand.content)
const nameBoard = createNameBoard(stand.content)
const countBoard = createCountBoard(stand.content)
const boards = [nameBoard, countBoard]
let activeBoard = null
const binder = createBinder(stand.content, (s) => (ui.page.textContent = pageNames[s] ?? ''))
const tokens = createTokens(scene, stand, (st) => {
  const on = Object.entries(st.status).filter(([, v]) => v).map(([k]) => k[0].toUpperCase() + k.slice(1))
  ui.status.textContent = on.length ? on.join(', ') : 'none'
  ui.feel.innerHTML = st.feelings.length
    ? st.feelings
        .map((f) => `${f.label} <span class="dots">${'●'.repeat(f.level)}${'○'.repeat(5 - f.level)}</span>`)
        .join('<br>')
    : 'none placed'
})

const pickables = [nameBoard.mesh, countBoard.mesh, ...binder.pickables, ...tokens.pickables]

// ── collapsible info panel ─────────────────────────────────
const panel = document.getElementById('panel')
const panelBtn = document.getElementById('panel-toggle')
function setPanel(collapsed) {
  panel.classList.toggle('collapsed', collapsed)
  panelBtn.setAttribute('aria-expanded', String(!collapsed))
  panelBtn.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel')
  try {
    localStorage.setItem('panelCollapsed', collapsed ? '1' : '0')
  } catch {}
}
try {
  if (localStorage.getItem('panelCollapsed') === '1') setPanel(true)
} catch {}
panelBtn.onclick = () => setPanel(!panel.classList.contains('collapsed'))
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey) setPanel(!panel.classList.contains('collapsed'))
})

// ── marker colours + cursor ────────────────────────────────
let markerColor = MARKERS[0].color
function markerCursor(color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><g transform='rotate(45 8 44)'><path d='M8 44 L3 36 L13 36 Z' fill='#33415C'/><rect x='2' y='14' width='12' height='23' rx='3' fill='${color}' stroke='#fff' stroke-width='1.5'/><rect x='3' y='6' width='10' height='9' rx='3' fill='#33415C'/></g></svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 8 44, crosshair`
}
let cursorMarker = markerCursor(markerColor)
const swWrap = document.getElementById('swatches')
MARKERS.forEach((m, i) => {
  const b = document.createElement('button')
  b.className = 'swatch' + (i === 0 ? ' on' : '')
  b.style.background = m.color
  b.title = m.name
  b.onclick = () => {
    markerColor = m.color
    boards.forEach((b) => b.setColor(m.color))
    cursorMarker = markerCursor(m.color)
    swWrap.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'))
    b.classList.add('on')
  }
  swWrap.appendChild(b)
})
boards.forEach((b) => b.setColor(markerColor))
document.getElementById('btn-erase').onclick = () => nameBoard.erase()
document.getElementById('btn-erase-count').onclick = () => countBoard.erase()
document.getElementById('btn-reset').onclick = () => {
  boards.forEach((b) => b.erase())
  binder.reset()
  tokens.reset()
}

// ── pointer routing ────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()
let mode = null

function setRay(e) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
}
const firstHit = () => raycaster.intersectObjects(pickables, false)[0]

// Orbit only when the press lands on empty space; presses on objects belong to them.
window.addEventListener(
  'pointerdown',
  (e) => {
    if (e.target !== canvas) return
    if (e.button === 0) {
      setRay(e)
      controls.enabled = !firstHit()
    }
  },
  true
)
const reenable = () => (controls.enabled = true)
window.addEventListener('pointerup', reenable)
window.addEventListener('pointercancel', reenable)

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  setRay(e)
  const hit = firstHit()
  if (!hit) return
  const ud = hit.object.userData
  canvas.setPointerCapture(e.pointerId)
  if (ud.kind === 'board') {
    mode = 'draw'
    activeBoard = ud.board
    activeBoard.begin(hit.uv)
  } else if (ud.kind === 'leaf') {
    mode = 'page'
    binder.press(ud.leaf, raycaster, e) // click flips; press-and-drag turns it by hand
  } else if (ud.kind === 'tab') {
    binder.clickTab(ud.tab)
  } else if (ud.kind === 'drag') {
    mode = 'drag'
    tokens.begin(ud.item, hit.point, raycaster)
    canvas.style.cursor = 'grabbing'
  }
})

canvas.addEventListener('pointermove', (e) => {
  setRay(e)
  if (mode === 'draw') {
    const h = raycaster.intersectObject(activeBoard.mesh, false)[0]
    activeBoard.move(h ? h.uv : null)
    return
  }
  if (mode === 'drag') {
    tokens.move(raycaster)
    return
  }
  if (mode === 'page') {
    binder.dragMove(raycaster, e)
    canvas.style.cursor = 'grabbing'
    return
  }
  const hit = firstHit()
  const k = hit?.object.userData.kind
  canvas.style.cursor =
    k === 'board' ? cursorMarker : k === 'drag' ? 'grab' : k === 'leaf' ? 'grab' : k === 'tab' ? 'pointer' : ''
})

const release = (e) => {
  if (mode === 'draw') activeBoard.end()
  if (mode === 'drag') tokens.end()
  if (mode === 'page') binder.release()
  mode = null
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
  setRay(e)
  const k = firstHit()?.object.userData.kind
  canvas.style.cursor = k === 'drag' || k === 'leaf' ? 'grab' : ''
}
canvas.addEventListener('pointerup', release)
canvas.addEventListener('pointercancel', release)
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') binder.next()
  if (e.key === 'ArrowLeft') binder.prev()
})

// smooth jump between camera presets
let tween = null
function goTo(v) {
  const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET))
  tween = { t: 0, from: sph, to: v }
}
document.getElementById('view-default').onclick = () => goTo(VIEWS.default)
document.getElementById('view-face').onclick = () => goTo(VIEWS.face)

// ── sizing: keep the whole table in view on narrow windows ──
function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  const dist = camera.position.distanceTo(controls.target)
  const needHalfW = 12.2
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(needHalfW / camera.aspect / dist))
  camera.fov = Math.max(34, fov)
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

// ── loop ───────────────────────────────────────────────────
const clock = new THREE.Timer()
renderer.setAnimationLoop(() => {
  clock.update()
  const dt = Math.min(0.05, clock.getDelta())
  binder.update(dt)
  tokens.update(dt)
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.7)
    const e = tween.t * tween.t * (3 - 2 * tween.t)
    const f = tween.from
    const g = tween.to
    camera.position
      .setFromSphericalCoords(f.radius + (g.dist - f.radius) * e, f.phi + (g.polar - f.phi) * e, f.theta + (g.azim - f.theta) * e)
      .add(TARGET)
    if (tween.t >= 1) tween = null
  }
  controls.update()
  renderer.render(scene, camera)
})

window.__mock = { scene, camera, controls, nameBoard, countBoard, binder, tokens, renderer }
