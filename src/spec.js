import * as THREE from 'three'
import { TRAY, ZONES, STRIP, SURF, BOARD_H } from './config.js'

// ─────────────────────────────────────────────────────────────
//  "Build spec" view: locks the camera face-on to the board and
//  overlays real-world sizes, materials and product links.
//  Everything is scaled from the mockup so the board is ~250 mm wide.
//  Edit BOARD_MM / PRODUCTS / the text below to update the page.
// ─────────────────────────────────────────────────────────────

const BOARD_MM = 250 // overall width you asked for
const K = BOARD_MM / TRAY.w // mm per scene unit
const mm = (u) => Math.round(u * K)

const PRODUCTS = {
  acrylic: {
    name: 'SHOUCAN Acrylic Sheet, clear, 4 mm',
    url: 'https://www.amazon.com/clp/B0CJ59L1NN?lv=shuf&channelId=500',
    img: '/assets/spec/acrylic.webp',
    shot: '/assets/spec/acrylic-listing.webp',
    price: '$33.99',
  },
  velcro: {
    name: 'Art3d Hook and Loop Tape, 1" × 4", sticky back',
    url: 'https://www.amazon.com/dp/B0B58FGF8H?th=1',
    img: '/assets/spec/velcro.webp',
    shot: '/assets/spec/velcro-listing.webp',
    price: '$4.99',
  },
}

// ── sizes derived from the mockup (scene units → mm) ─────────
const nameWin = { cx: ZONES.name.cx, cz: ZONES.name.cz, w: ZONES.name.w - 0.3, d: ZONES.name.d - 0.3 }
const countWin = { cx: STRIP.cx, cz: STRIP.cz, w: STRIP.w - 0.16, d: STRIP.d - 0.16 }

const ZW = TRAY.w / 2
const ZD = TRAY.d / 2
const rect = (cx, cz, w, d) => [
  [cx - w / 2, cz - d / 2],
  [cx + w / 2, cz - d / 2],
  [cx + w / 2, cz + d / 2],
  [cx - w / 2, cz + d / 2],
]

// shapes drawn on the board (design coordinates): the board outline and the two acrylic windows
const AREAS = [
  { cls: 'board', ref: 1, pts: [rect(0, 0, TRAY.w, TRAY.d)] },
  { cls: 'acr', ref: 2, pts: [rect(nameWin.cx, nameWin.cz, nameWin.w, nameWin.d)] },
  { cls: 'acr', ref: 3, pts: [rect(countWin.cx, countWin.cz, countWin.w, countWin.d)] },
]

// dimension lines: a → b with a perpendicular offset, all in design coords
const X1 = ZW
const XR = ZONES.status.cx + ZONES.status.w / 2 // inner right edge of the zones
const ZTOP = ZONES.name.cz - ZONES.name.d / 2
const DIMS = [
  { a: [-X1, -ZD], b: [X1, -ZD], off: [0, -1.9], text: `${BOARD_MM} mm` },
  { a: [ZONES.name.cx - ZONES.name.w / 2, ZTOP], b: [ZONES.name.cx + ZONES.name.w / 2, ZTOP], off: [0, -1.25], text: `${mm(ZONES.name.w)} mm` },
  { a: [ZONES.status.cx - ZONES.status.w / 2, ZTOP], b: [XR, ZTOP], off: [0, -1.25], text: `${mm(ZONES.status.w)} mm` },
  { a: [-X1, -ZD], b: [-X1, ZD], off: [-1.5, 0], text: `${mm(TRAY.d)} mm` },
  { a: [X1, ZTOP], b: [X1, ZTOP + ZONES.name.d], off: [1.2, 0], text: `${mm(ZONES.name.d)} mm` },
  { a: [X1, ZONES.main.cz - ZONES.main.d / 2], b: [X1, ZONES.main.cz + ZONES.main.d / 2], off: [1.2, 0], text: `${mm(ZONES.main.d)} mm` },
]

// numbered call-outs: anchor on the board + pixel offset for the label
const PINS = [
  { ref: 1, at: [X1 - 0.2, ZD - 0.25], off: [70, 34], text: '3D printed' },
  { ref: 2, at: [nameWin.cx + 1.6, nameWin.cz], off: [0, 0], text: 'Acrylic' },
  { ref: 3, at: [countWin.cx, countWin.cz - 2.2], off: [-90, -34], text: 'Acrylic' },
  { ref: 4, at: [ZONES.status.cx, ZONES.status.cz], off: [150, -34], text: 'Hook & loop' },
  { ref: 5, at: [ZONES.comm.cx, ZONES.comm.cz + 1.2], off: [150, 30], text: 'Hook & loop' },
]

// ── drawer content (kept deliberately short: this is a rough concept) ──
const product = (p, facts) => `
  <div class="prod">
    <a class="prod-img" href="${p.shot}" target="_blank" rel="noopener" title="Open the listing screenshot"><img src="${p.img}" alt="${p.name}" /></a>
    <div class="prod-body">
      <strong>${p.name}</strong>
      <span class="price">${p.price}</span>
      <dl class="facts">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
    </div>
  </div>
  <div class="links"><a class="btn" href="${p.url}" target="_blank" rel="noopener noreferrer">Open on Amazon ↗</a></div>`

const drawerHTML = `
<div class="sd-head">
  <div>
    <h2>Build spec</h2>
    <p>Rough concept · board ≈ <b>${BOARD_MM} mm</b> wide</p>
  </div>
  <button id="spec-close" class="ghost">← Back to scene</button>
</div>

<section class="sd-card" data-refs="1">
  <h3><i>1</i> 3D printed</h3>
  <p>The whole board is 3D printed.</p>
</section>

<section class="sd-card" data-refs="2 3">
  <h3><i>2</i><i>3</i> Acrylic board</h3>
  ${product(PRODUCTS.acrylic, [['Size', '400 × 400 mm'], ['Thickness', '4 mm']])}
  <p>The numbers and the name line are printed underneath. The clear acrylic sits on top, so you write on it and the print shows through.</p>
</section>

<section class="sd-card" data-refs="4 5">
  <h3><i>4</i><i>5</i> Hook &amp; loop</h3>
  ${product(PRODUCTS.velcro, [['Pack', '16 sets'], ['Strip', '1" × 4"']])}
  <p>Sticks the status cards and the feeling stickers to the board.</p>
</section>
`

// ─────────────────────────────────────────────────────────────
export function createSpec({ camera, controls, content, onOpen, onClosed }) {
  const root = document.createElement('div')
  root.id = 'spec'
  root.innerHTML = `<svg id="spec-svg"></svg><div id="spec-pins"></div><aside id="spec-drawer">${drawerHTML}</aside>`
  document.body.appendChild(root)
  const svg = root.querySelector('#spec-svg')
  const pinsEl = root.querySelector('#spec-pins')
  const drawer = root.querySelector('#spec-drawer')
  const openBtn = document.getElementById('spec-open')

  const V = THREE.Vector3
  let isOpen = false
  let locked = false
  let tw = null // { t, a, b }
  let base = null
  let dirty = false
  let hl = null

  // ── pins ──
  const pinEls = PINS.map((p) => {
    const b = document.createElement('button')
    b.className = 'pin'
    b.dataset.ref = p.ref
    b.innerHTML = `<b>${p.ref}</b><span>${p.text}</span>`
    b.onclick = () => focusCard(p.ref)
    pinsEl.appendChild(b)
    return b
  })
  const cards = [...drawer.querySelectorAll('.sd-card[data-refs]')]
  function focusCard(ref) {
    const c = cards.find((x) => x.dataset.refs.split(' ').includes(String(ref)))
    if (!c) return
    c.scrollIntoView({ behavior: 'smooth', block: 'start' })
    c.classList.add('flash')
    setTimeout(() => c.classList.remove('flash'), 900)
    setHl(c.dataset.refs.split(' ').map(Number))
  }
  function setHl(refs) {
    hl = refs
    dirty = true
  }
  cards.forEach((c) => {
    c.addEventListener('mouseenter', () => setHl(c.dataset.refs.split(' ').map(Number)))
    c.addEventListener('mouseleave', () => setHl(null))
  })
  pinEls.forEach((b) =>
    b.addEventListener('mouseenter', () => {
      const c = cards.find((x) => x.dataset.refs.split(' ').includes(b.dataset.ref))
      setHl(c ? c.dataset.refs.split(' ').map(Number) : [+b.dataset.ref])
    })
  )
  pinEls.forEach((b) => b.addEventListener('mouseleave', () => setHl(null)))

  // ── camera pose ──
  const dw = () => Math.min(400, Math.max(300, innerWidth * 0.34))
  function pose() {
    const w = innerWidth
    const h = innerHeight
    const avail = w - dw() - 36
    const fov = 32
    const t = Math.tan(THREE.MathUtils.degToRad(fov / 2))
    const dist = Math.max(7.2 / t, 12.3 / (t * (w / h) * (avail / w)), 18)
    const c = content.localToWorld(new V(0, SURF + BOARD_H, -0.9))
    const n = new V(0, 1, 0).transformDirection(content.matrixWorld)
    return { pos: c.clone().addScaledVector(n, dist), tgt: c, fov, shift: (dw() + 36) / 2 }
  }
  function apply(a, b, e) {
    camera.position.lerpVectors(a.pos, b.pos, e)
    controls.target.lerpVectors(a.tgt, b.tgt, e)
    camera.fov = a.fov + (b.fov - a.fov) * e
    const shift = a.shift + (b.shift - a.shift) * e
    if (shift > 0.5) camera.setViewOffset(innerWidth, innerHeight, shift, 0, innerWidth, innerHeight)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    camera.lookAt(controls.target)
    camera.updateMatrixWorld()
    dirty = true
  }

  // ── overlay drawing ──
  const tmp = new V()
  const P = (x, z, y = SURF + 0.3) => {
    tmp.set(x, y, z)
    content.localToWorld(tmp)
    tmp.project(camera)
    return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight]
  }
  const poly = (pts) => 'M' + pts.map(([x, z]) => P(x, z, SURF + BOARD_H + 0.02).map((n) => n.toFixed(1)).join(' ')).join('L') + 'Z'
  const on = (ref) => (hl && hl.includes(ref) ? ' hl' : '')

  function draw() {
    const out = []
    for (const a of AREAS) out.push(`<path class="sv-area ${a.cls}${on(a.ref)}" d="${a.pts.map(poly).join(' ')}"/>`)
    for (const d of DIMS) {
      const A = P(...d.a)
      const B = P(...d.b)
      const A2 = P(d.a[0] + d.off[0], d.a[1] + d.off[1])
      const B2 = P(d.b[0] + d.off[0], d.b[1] + d.off[1])
      const dx = B2[0] - A2[0]
      const dy = B2[1] - A2[1]
      const L = Math.hypot(dx, dy) || 1
      const px = (-dy / L) * 5
      const py = (dx / L) * 5
      const mid = [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2]
      const tw2 = d.text.length * 6.6 + 16
      out.push(
        `<g class="sv-dim">` +
          `<line class="ext" x1="${A[0]}" y1="${A[1]}" x2="${A2[0]}" y2="${A2[1]}"/><line class="ext" x1="${B[0]}" y1="${B[1]}" x2="${B2[0]}" y2="${B2[1]}"/>` +
          `<line x1="${A2[0]}" y1="${A2[1]}" x2="${B2[0]}" y2="${B2[1]}"/>` +
          `<line x1="${A2[0] - px}" y1="${A2[1] - py}" x2="${A2[0] + px}" y2="${A2[1] + py}"/><line x1="${B2[0] - px}" y1="${B2[1] - py}" x2="${B2[0] + px}" y2="${B2[1] + py}"/>` +
          `<rect x="${mid[0] - tw2 / 2}" y="${mid[1] - 9}" width="${tw2}" height="18" rx="9"/><text x="${mid[0]}" y="${mid[1] + 4}">${d.text}</text></g>`
      )
    }
    PINS.forEach((p, i) => {
      const A = P(...p.at)
      const el = pinEls[i]
      const hw = el.offsetWidth / 2 + 8
      const x = Math.min(Math.max(A[0] + p.off[0], hw), innerWidth - dw() - 36 - hw)
      const y = Math.min(Math.max(A[1] + p.off[1], 22), innerHeight - 22)
      if (Math.hypot(x - A[0], y - A[1]) > 4) out.push(`<line class="leader" x1="${A[0]}" y1="${A[1]}" x2="${x}" y2="${y}"/>`)
      out.push(`<circle class="anchor" cx="${A[0]}" cy="${A[1]}" r="3.5"/>`)
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      pinEls[i].classList.toggle('hl', !!(hl && hl.includes(p.ref)))
    })
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
    svg.innerHTML = out.join('')
  }

  // ── open / close ──
  function open() {
    if (isOpen && !tw) return
    onOpen?.()
    isOpen = locked = true
    controls.enabled = false // no orbit, no wheel zoom: the overlay is aligned to this exact view
    if (!base) base = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, shift: 0 }
    const from = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, shift: camera.view?.enabled ? camera.view.offsetX : 0 }
    tw = { t: 0, a: from, b: pose(), dur: 0.9 }
    document.body.classList.add('spec-open')
    root.classList.add('on')
    drawer.style.width = dw() + 'px'
  }
  function close() {
    if (!isOpen) return
    isOpen = false
    root.classList.remove('on')
    document.body.classList.remove('spec-open')
    const from = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, shift: camera.view?.enabled ? camera.view.offsetX : 0 }
    tw = { t: 0, a: from, b: base, dur: 0.8, closing: true }
  }
  const toggle = () => (isOpen ? close() : open())
  openBtn.onclick = open
  drawer.querySelector('#spec-close').onclick = close
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'Escape' && isOpen) close()
    else if (e.key.toLowerCase() === 's') toggle()
  })

  return {
    get locked() {
      return locked
    },
    get isOpen() {
      return isOpen
    },
    open,
    close,
    toggle,
    resize() {
      if (!isOpen || tw) return
      drawer.style.width = dw() + 'px'
      const p = pose()
      apply(p, p, 0)
    },
    update(dt) {
      if (tw) {
        tw.t = Math.min(1, tw.t + dt / tw.dur)
        const e = tw.t * tw.t * (3 - 2 * tw.t)
        apply(tw.a, tw.b, e)
        if (tw.t >= 1) {
          const closing = tw.closing
          tw = null
          if (closing) {
            camera.clearViewOffset()
            base = null
            locked = false
            controls.enabled = true
            controls.update()
            onClosed?.()
          }
        }
      }
      if (dirty && isOpen) {
        dirty = false
        draw()
      }
    },
  }
}
