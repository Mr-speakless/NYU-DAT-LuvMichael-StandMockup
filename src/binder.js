import * as THREE from 'three'
import { BINDER, SURF, COLORS, SPREADS, PHOTOS } from './config.js'
import { mkCanvas, rr, canvasTex, roundedSlab, std, decal, FONT } from './gfx.js'

const PW = 720
const PH = 1320
const LEAF_T = 0.014
const LEAF_GAP = 0.018
const BASE_Y = 0.02
const SEGS = 16

const THEME = {
  cover: { bg: '#DDF8EC', accent: '#4FD3A0', ink: '#1F5E49' },
  step: { bg: '#FFF6D3', accent: '#FFC53D', ink: '#6B4B00' },
  reset: { bg: '#FFE4DB', accent: '#FF8F73', ink: '#7A2F1C' },
  blank: { bg: '#F3F4FA', accent: '#CBD0E6', ink: '#8890B4' },
}

const photoCache = {}
function loadPhoto(url, cb) {
  if (!url) return null
  if (photoCache[url]) return photoCache[url].complete ? photoCache[url] : (photoCache[url].addEventListener('load', cb), null)
  const img = new Image()
  img.onload = cb
  img.src = url
  photoCache[url] = img
  return null
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = w
      y += lh
    } else line = t
  }
  if (line) ctx.fillText(line, x, y)
}

// Draws one page face. side 'front' = right-hand page (rings on its left),
// 'back' = left-hand page (rings on its right).
function drawPage(canvas, spec, side) {
  const ctx = canvas.getContext('2d')
  const th = THEME[spec.kind] || THEME.blank
  ctx.clearRect(0, 0, PW, PH)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(0, 0, PW, PH, side === 'front' ? [0, 52, 52, 0] : [52, 0, 0, 52])
  ctx.clip()
  ctx.fillStyle = th.bg
  ctx.fillRect(0, 0, PW, PH)

    const innerL = side === 'front' ? 96 : 56
  const innerW = PW - 96 - 56
  ctx.textBaseline = 'alphabetic'

  if (spec.kind !== 'blank') {
    const key = spec.photo
    let top = 90
    if (spec.kind !== 'cover') {
      // round badge + title, repeated on both halves so each page names its step
      ctx.fillStyle = th.accent
      ctx.beginPath()
      ctx.arc(innerL + 56, 150, 56, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `900 74px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(spec.kind === 'step' ? String(spec.n) : '\u21BA', innerL + 56, 156)
      ctx.fillStyle = th.ink
      ctx.textAlign = 'left'
      ctx.font = `800 64px ${FONT}`
      ctx.fillText(spec.kind === 'step' ? 'Step ' + spec.n : 'Reset', innerL + 140, 156)
      top = 250
    }
    // photo slot
    const ph = spec.kind === 'cover' ? 760 : 600
    const px = innerL
    const py = top
    rr(ctx, px, py, innerW, ph, 36)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fill()
    const img = loadPhoto(PHOTOS[key], spec.redraw)
    if (img) {
      ctx.save()
      rr(ctx, px, py, innerW, ph, 36)
      ctx.clip()
      const sc = Math.max(innerW / img.width, ph / img.height)
      ctx.drawImage(img, px + (innerW - img.width * sc) / 2, py + (ph - img.height * sc) / 2, img.width * sc, img.height * sc)
      ctx.restore()
    } else {
      ctx.setLineDash([22, 18])
      ctx.lineWidth = 6
      ctx.strokeStyle = th.accent
      rr(ctx, px + 3, py + 3, innerW - 6, ph - 6, 34)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = th.accent
      ctx.font = `900 56px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PHOTO', px + innerW / 2, py + ph / 2 - 20)
      ctx.font = `700 30px ${FONT}`
      ctx.fillStyle = th.ink
      ctx.globalAlpha = 0.6
      ctx.fillText(spec.kind === 'cover' ? 'photo of the job' : key.endsWith('a') ? 'photo 1 of 2' : 'photo 2 of 2', px + innerW / 2, py + ph / 2 + 36)
      ctx.globalAlpha = 1
    }
    // text
    ctx.textAlign = spec.kind === 'cover' ? 'center' : 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = th.ink
    if (spec.kind === 'cover') {
      ctx.font = `900 76px ${FONT}`
      wrap(ctx, spec.title, PW / 2 + (side === 'front' ? 20 : -20), py + ph + 130, innerW, 86)
      ctx.font = `700 34px ${FONT}`
      ctx.globalAlpha = 0.65
      ctx.fillText(spec.sub, PW / 2 + (side === 'front' ? 20 : -20), py + ph + 250)
      ctx.globalAlpha = 1
    } else {
      ctx.font = `700 42px ${FONT}`
      wrap(ctx, spec.text, innerL, py + ph + 90, innerW, 56)
    }
  } else {
    ctx.fillStyle = th.ink
    ctx.font = `700 34px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('end', PW / 2, PH / 2)
  }

  // punched holes next to the rings
  const holeX = side === 'front' ? 34 : PW - 34
  for (let i = 0; i < BINDER.rings; i++) {
    const z = (i - (BINDER.rings - 1) / 2) * 1.0
    const y = ((z + BINDER.pageD / 2) / BINDER.pageD) * PH
    ctx.fillStyle = 'rgba(40,50,90,0.22)'
    ctx.beginPath()
    ctx.arc(holeX, y, 17, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function pageMaterial(spec, side, onRedraw) {
  const [c] = mkCanvas(PW, PH)
  spec.redraw = () => {
    drawPage(c, spec, side)
    tex.needsUpdate = true
    onRedraw?.()
  }
  const tex = canvasTex(c)
  drawPage(c, spec, side)
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.5 })
}

// A tab is glued across the page's outer edge: half on the page, half sticking out.
// Only its front carries a label; the back is plain colour.
function makeTab(cfg, index) {
  const w = 0.7
  const d = 0.88
  const h = 0.07
  const group = new THREE.Group()
  const slab = new THREE.Mesh(roundedSlab(w, d, h, 0.14), std(cfg.color, { roughness: 0.5 }))
  // only 0.1 of the tab overlaps the page; the label sits on the part sticking out,
  // so pages stacked above a lower tab never cover its text
  slab.position.set(0.25, -h / 2, 0)
  const [c, ctx] = mkCanvas(280, 352)
  rr(ctx, 0, 0, 280, 352, 64)
  ctx.fillStyle = cfg.color
  ctx.fill()
  ctx.fillStyle = 'rgba(40,40,70,0.8)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const [a, b] = cfg.label.split(' ')
  if (b) {
    ctx.font = `800 70px ${FONT}`
    ctx.fillText(a, 160, 128)
    ctx.font = `900 130px ${FONT}`
    ctx.fillText(b, 160, 244)
  } else {
    ctx.font = `900 70px ${FONT}`
    ctx.fillText(a, 160, 176)
  }
  const top = decal(w, d, canvasTex(c))
  top.position.y = h + 0.003
  slab.add(top)
  slab.castShadow = slab.receiveShadow = true
  for (const m of [slab, top]) {
    m.userData.kind = 'tab'
    m.userData.tab = index
  }
  group.add(slab)
  return { group, meshes: [slab, top] }
}

class Leaf {
  constructor(index, total, frontSpec, backSpec, tabCfg) {
    this.index = index
    this.total = total
    this.angle = 0
    this.target = 0
    this.delay = 0
    this.dragging = false
    this.dragAngle = 0
    this.group = new THREE.Group()
    const N = SEGS
    const verts = (N + 1) * 2
    const uvF = new Float32Array(verts * 2)
    const uvB = new Float32Array(verts * 2)
    const idxF = []
    const idxB = []
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j < 2; j++) {
        const k = (i * 2 + j) * 2
        uvF[k] = i / N
        uvF[k + 1] = j ? 0 : 1
        uvB[k] = 1 - i / N
        uvB[k + 1] = j ? 0 : 1
      }
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2
      const c = a + 1
      const b = a + 2
      const d = a + 3
      idxF.push(a, c, b, b, c, d)
      idxB.push(a, b, c, b, d, c)
    }
    const mk = (uv, idx) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3))
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      g.setIndex(idx)
      return g
    }
    this.gF = mk(uvF, idxF)
    this.gB = mk(uvB, idxB)
    this.front = new THREE.Mesh(this.gF, pageMaterial(frontSpec, 'front'))
    this.back = new THREE.Mesh(this.gB, pageMaterial(backSpec, 'back'))
    for (const m of [this.front, this.back]) {
      m.castShadow = true
      m.receiveShadow = true
      m.frustumCulled = false
      m.userData.kind = 'leaf'
      m.userData.leaf = index
      this.group.add(m)
    }
    this.tab = makeTab(tabCfg, index)
    this.tab.group.position.z = (index - (total - 1) / 2) * 0.98
    this.group.add(this.tab.group)
    this.update()
  }

  update() {
    const th = this.angle
    const N = SEGS
    const W = BINDER.pageW
    const D = BINDER.pageD
    const ds = W / N
    const lead = 0.8 * Math.sin(th)
    const pf = this.gF.attributes.position
    const pb = this.gB.attributes.position
    let cx = 0
    let cy = 0
    let prev = th - lead
    for (let i = 0; i <= N; i++) {
      const a = th - lead * (1 - i / N)
      if (i > 0) {
        const am = (a + prev) / 2
        cx += ds * Math.cos(am)
        cy += ds * Math.sin(am)
      }
      prev = a
      const nx = -Math.sin(a)
      const ny = Math.cos(a)
      for (let j = 0; j < 2; j++) {
        const z = j ? D / 2 : -D / 2
        pf.setXYZ(i * 2 + j, cx + (nx * LEAF_T) / 2, cy + (ny * LEAF_T) / 2, z)
        pb.setXYZ(i * 2 + j, cx - (nx * LEAF_T) / 2, cy - (ny * LEAF_T) / 2, z)
      }
    }
    // glue the tab on the tip: follows the page's end position and angle
    this.tab.group.position.x = cx
    this.tab.group.position.y = cy
    this.tab.group.rotation.z = th
    pf.needsUpdate = pb.needsUpdate = true
    this.gF.computeVertexNormals()
    this.gB.computeVertexNormals()
    this.gF.computeBoundingSphere()
    this.gB.computeBoundingSphere()
    const t = th / Math.PI
    const yR = BASE_Y + (this.total - 1 - this.index) * LEAF_GAP
    const yL = BASE_Y + this.index * LEAF_GAP
    this.group.position.y = yR + (yL - yR) * t
  }
}

export function createBinder(scene, onSpread) {
  const root = new THREE.Group()
  root.position.set(BINDER.cx, SURF, BINDER.cz)
  scene.add(root)

  const base = new THREE.Mesh(roundedSlab(BINDER.baseW, BINDER.baseD, BINDER.baseH, 0.38), std(COLORS.binderBase, { roughness: 0.5 }))
  base.castShadow = base.receiveShadow = true
  root.add(base)

  const pages = new THREE.Group()
  pages.position.y = BINDER.baseH
  root.add(pages)

  // static backings: left cover page and right end page
  const mkBacking = (spec, side) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BINDER.pageW, BINDER.pageD), pageMaterial(spec, side))
    m.rotation.x = -Math.PI / 2
    m.position.set(side === 'front' ? BINDER.pageW / 2 : -BINDER.pageW / 2, 0.004, 0)
    m.receiveShadow = true
    pages.add(m)
  }
  mkBacking(SPREADS[0].left, 'back')
  mkBacking({ kind: 'blank' }, 'front')

  // rings
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xe9eef7, metalness: 0.95, roughness: 0.22 })
  for (let i = 0; i < BINDER.rings; i++) {
    const z = (i - (BINDER.rings - 1) / 2) * 1.0
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.036, 10, 28), ringMat)
    ring.position.set(0, 0.1, z)
    ring.castShadow = true
    pages.add(ring)
  }

  // Leaf k: front = right half of spread k, back = left half of spread k+1.
  // Its tab belongs to spread k's step.
  const leaves = SPREADS.map((sp, k, arr) => new Leaf(k, arr.length, sp.right, arr[k + 1] ? arr[k + 1].left : { kind: 'blank' }, sp.tab))
  leaves.forEach((l) => pages.add(l.group))
  const maxSpread = leaves.length - 1
  let spread = 0

  // ── press-and-drag a page ─────────────────────────────────
  // The page tip follows the pointer (θ = acos of its x along the page);
  // on release it settles to whichever side it is closer to, or the way you flicked it.
  const inv = new THREE.Matrix4()
  const ray = new THREE.Ray()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(BINDER.baseH + 0.15))
  const hit = new THREE.Vector3()
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  let press = null
  function pointerAngle(raycaster) {
    root.updateWorldMatrix(true, false)
    inv.copy(root.matrixWorld).invert()
    ray.copy(raycaster.ray).applyMatrix4(inv)
    if (!ray.intersectPlane(plane, hit)) return null
    return Math.acos(clamp(hit.x / BINDER.pageW, -1, 1))
  }

  function setSpread(s, instant = false) {
    s = Math.max(0, Math.min(maxSpread, s))
    if (s === spread && !instant) return
    const forward = s > spread
    let n = 0
    const order = forward ? leaves : [...leaves].reverse()
    for (const l of order) {
      const want = l.index < s ? Math.PI : 0
      if (want !== l.target) {
        l.target = want
        l.delay = instant ? 0 : n++ * 0.09
      }
      if (instant) {
        l.angle = want
        l.update()
      }
    }
    spread = s
    onSpread?.(s)
  }

  return {
    pickables: leaves.flatMap((l) => [l.front, l.back, ...l.tab.meshes]),
    get spread() {
      return spread
    },
    setSpread,
    press(k, raycaster, e) {
      const l = leaves[k]
      // only the page on top of a stack can be turned by hand
      const eligible = l.target > 0 ? k === spread - 1 : k === spread && k < maxSpread
      press = { k, x: e.clientX, y: e.clientY, eligible, dragging: false, off: 0, last: 0, lastT: 0, vel: 0 }
    },
    dragMove(raycaster, e) {
      if (!press || !press.eligible) return
      const l = leaves[press.k]
      const a = pointerAngle(raycaster)
      if (a == null) return
      const now = performance.now()
      if (!press.dragging) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return
        press.dragging = true
        press.off = l.angle - a // grab the page where you touched it, no jump
        press.last = l.angle
        press.lastT = now
        l.dragging = true
        l.delay = 0
        l.dragAngle = l.angle
      }
      const th = clamp(a + press.off, 0, Math.PI)
      l.dragAngle = th
      const dt = (now - press.lastT) / 1000
      if (dt > 0.004) {
        press.vel = press.vel * 0.6 + ((th - press.last) / dt) * 0.4
        press.last = th
        press.lastT = now
      }
    },
    release() {
      if (!press) return
      const p = press
      press = null
      const l = leaves[p.k]
      if (!p.dragging) {
        this.clickLeaf(p.k)
        return
      }
      l.dragging = false
      const flick = Math.abs(p.vel) > 1.6
      const flipped = flick ? p.vel > 0 : l.dragAngle > Math.PI / 2
      l.target = flipped ? Math.PI : 0
      l.angle = l.dragAngle
      spread = flipped ? p.k + 1 : p.k
      onSpread?.(spread)
    },
    clickLeaf(k) {
      const l = leaves[k]
      if (l.target > 0) setSpread(k) // flipped → turn it (and later ones) back
      else if (k < maxSpread) setSpread(k + 1)
    },
    // tabs are glued to their page: wherever it is, the tab opens that step
    clickTab(k) {
      setSpread(k)
    },
    next: () => setSpread(spread + 1),
    prev: () => setSpread(spread - 1),
    reset: () => setSpread(0),
    update(dt) {
      for (const l of leaves) {
        if (l.dragging) {
          l.angle += (l.dragAngle - l.angle) * (1 - Math.exp(-dt * 28))
          l.update()
          continue
        }
        if (l.angle !== l.target) {
          if (l.delay > 0) {
            l.delay -= dt
            continue
          }
          const d = l.target - l.angle
          l.angle += d * (1 - Math.exp(-dt * 7.5))
          if (Math.abs(l.target - l.angle) < 0.002) l.angle = l.target
          l.update()
        }
      }
    },
  }
}
