import * as THREE from 'three'

export const FONT = `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif`

export function mkCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Soft wood grain, drawn in canvas. planks > 0 adds board seams (for the desk).
export function woodTexture(base, dark, { w = 1024, h = 1024, seed = 1, planks = 0 } = {}) {
  const [c, ctx] = mkCanvas(w, h)
  const rnd = mulberry(seed)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  const [r, g, b] = hexRgb(dark)
  const rows = planks || 1
  const ph = h / rows
  for (let p = 0; p < rows; p++) {
    if (planks) {
      ctx.fillStyle = `rgba(255,255,255,${(rnd() - 0.5) * 0.12})`
      ctx.fillRect(0, p * ph, w, ph)
    }
    const lines = 70
    for (let i = 0; i < lines; i++) {
      const y0 = p * ph + rnd() * ph
      const amp = 2 + rnd() * 7
      const cycles = 1 + Math.floor(rnd() * 3)
      const ph0 = rnd() * 6
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.04 + rnd() * 0.13})`
      ctx.lineWidth = 0.8 + rnd() * 2.2
      ctx.beginPath()
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin((x / w) * Math.PI * 2 * cycles + ph0) * amp
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    if (planks && p > 0) {
      ctx.fillStyle = `rgba(${r},${g},${b},0.35)`
      ctx.fillRect(0, p * ph - 2, w, 4)
    }
  }
  const t = canvasTex(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// ── Rounded-rect slab (rounded in plan view AND bevelled) ───
function rrPath(path, w, h, r) {
  const x = -w / 2
  const y = -h / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y)
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x + w, y + h - r)
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  path.lineTo(x + r, y + h)
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + r)
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return path
}

// Footprint w × d (x × z), total height h, base sits on y = 0.
// UVs on the top face are in world units (shape x / shape y).
export function roundedSlab(w, d, h, r, hole = null) {
  const bt = Math.min(0.03, h / 3)
  const shape = rrPath(new THREE.Shape(), w - 2 * bt, d - 2 * bt, Math.max(0.01, r - bt))
  if (hole) {
    const hp = rrPath(new THREE.Path(), hole.w, hole.d, hole.r)
    shape.holes.push(hp)
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, h - 2 * bt),
    bevelEnabled: true,
    bevelThickness: bt,
    bevelSize: bt,
    bevelSegments: 3,
    curveSegments: 16,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, bt, 0)
  return g
}

// Flat textured plane lying on a slab top.
export function decal(w, d, texture, { alphaTest = 0, roughness = 0.7 } = {}) {
  const g = new THREE.PlaneGeometry(w, d)
  g.rotateX(-Math.PI / 2)
  const m = new THREE.MeshStandardMaterial({ map: texture, roughness, transparent: !alphaTest, alphaTest })
  const mesh = new THREE.Mesh(g, m)
  mesh.receiveShadow = true
  return mesh
}

export function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts })
}

// ── Little vector faces for the feeling stickers ────────────
export function drawFace(ctx, kind, cx, cy, r, ink = '#4A3744') {
  ctx.save()
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = r * 0.11
  const eye = (dx, dy, rad = 0.09) => {
    ctx.beginPath()
    ctx.arc(cx + dx * r, cy + dy * r, rad * r, 0, Math.PI * 2)
    ctx.fill()
  }
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath()
    ctx.moveTo(cx + x1 * r, cy + y1 * r)
    ctx.lineTo(cx + x2 * r, cy + y2 * r)
    ctx.stroke()
  }
  const blush = () => {
    ctx.save()
    ctx.fillStyle = 'rgba(255,110,140,0.35)'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + s * 0.55 * r, cy + 0.2 * r, 0.16 * r, 0.1 * r, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  const drop = (x, y, s, col) => {
    ctx.save()
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(cx + x * r, cy + (y - 0.16 * s) * r)
    ctx.bezierCurveTo(cx + (x + 0.14 * s) * r, cy + y * r, cx + (x + 0.12 * s) * r, cy + (y + 0.16 * s) * r, cx + x * r, cy + (y + 0.16 * s) * r)
    ctx.bezierCurveTo(cx + (x - 0.12 * s) * r, cy + (y + 0.16 * s) * r, cx + (x - 0.14 * s) * r, cy + y * r, cx + x * r, cy + (y - 0.16 * s) * r)
    ctx.fill()
    ctx.restore()
  }
  if (kind === 'happy') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + s * 0.34 * r, cy - 0.1 * r, 0.14 * r, Math.PI, 0)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(cx, cy + 0.02 * r, 0.5 * r, 0.12 * Math.PI, 0.88 * Math.PI)
    ctx.stroke()
    blush()
  } else if (kind === 'tired') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + s * 0.34 * r, cy - 0.12 * r, 0.15 * r, 0, Math.PI)
      ctx.stroke()
      line(s * 0.5, 0.12, s * 0.2, 0.12)
    }
    ctx.beginPath()
    ctx.ellipse(cx, cy + 0.46 * r, 0.14 * r, 0.19 * r, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = `800 ${r * 0.42}px ${FONT}`
    ctx.fillText('z', cx + 0.5 * r, cy - 0.5 * r)
    ctx.font = `800 ${r * 0.3}px ${FONT}`
    ctx.fillText('z', cx + 0.78 * r, cy - 0.72 * r)
  } else if (kind === 'worried') {
    line(-0.58, -0.42, -0.2, -0.56)
    line(0.58, -0.42, 0.2, -0.56)
    eye(-0.34, -0.16, 0.1)
    eye(0.34, -0.16, 0.1)
    ctx.beginPath()
    ctx.moveTo(cx - 0.3 * r, cy + 0.42 * r)
    ctx.bezierCurveTo(cx - 0.15 * r, cy + 0.3 * r, cx - 0.05 * r, cy + 0.54 * r, cx + 0.1 * r, cy + 0.42 * r)
    ctx.bezierCurveTo(cx + 0.18 * r, cy + 0.36 * r, cx + 0.25 * r, cy + 0.42 * r, cx + 0.3 * r, cy + 0.4 * r)
    ctx.stroke()
    drop(0.7, -0.35, 1, '#6EC1FF')
  } else if (kind === 'sad') {
    line(-0.58, -0.34, -0.2, -0.5)
    line(0.58, -0.34, 0.2, -0.5)
    eye(-0.34, -0.1, 0.1)
    eye(0.34, -0.1, 0.1)
    ctx.beginPath()
    ctx.arc(cx, cy + 0.72 * r, 0.36 * r, 1.18 * Math.PI, 1.82 * Math.PI)
    ctx.stroke()
    drop(-0.38, 0.22, 1.2, '#6EC1FF')
  }
  ctx.restore()
}

// ── Icons for the status cards ──────────────────────────────
export function drawCardIcon(ctx, kind, cx, cy, s, ink = '#fff') {
  ctx.save()
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = s * 0.09
  if (kind === 'break') {
    // coffee cup + steam
    rr(ctx, cx - 0.5 * s, cy - 0.12 * s, 0.82 * s, 0.7 * s, 0.18 * s)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 0.38 * s, cy + 0.22 * s, 0.22 * s, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    for (const dx of [-0.25, 0.05]) {
      ctx.beginPath()
      ctx.moveTo(cx + dx * s, cy - 0.28 * s)
      ctx.bezierCurveTo(cx + (dx - 0.12) * s, cy - 0.42 * s, cx + (dx + 0.12) * s, cy - 0.54 * s, cx + dx * s, cy - 0.7 * s)
      ctx.stroke()
    }
  } else if (kind === 'help') {
    ctx.beginPath()
    ctx.arc(cx, cy, 0.62 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.font = `900 ${s * 0.95}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', cx, cy + 0.04 * s)
  } else if (kind === 'switch') {
    const arrow = (y, dir) => {
      ctx.beginPath()
      ctx.moveTo(cx - dir * 0.5 * s, cy + y * s)
      ctx.lineTo(cx + dir * 0.45 * s, cy + y * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx + dir * 0.62 * s, cy + y * s)
      ctx.lineTo(cx + dir * 0.28 * s, cy + (y - 0.24) * s)
      ctx.lineTo(cx + dir * 0.28 * s, cy + (y + 0.24) * s)
      ctx.closePath()
      ctx.fill()
    }
    arrow(-0.26, 1)
    arrow(0.26, -1)
  }
  ctx.restore()
}
