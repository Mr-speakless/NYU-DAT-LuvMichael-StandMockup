import * as THREE from 'three'
import { STRIP, SURF, COLORS } from './config.js'
import { mkCanvas, canvasTex, roundedSlab, std, decal } from './gfx.js'

const PX = 200

export function createStrip(scene) {
  const W = Math.round(STRIP.w * PX)
  const H = Math.round(STRIP.d * PX)
  const slab = new THREE.Mesh(roundedSlab(STRIP.w, STRIP.d, STRIP.h, 0.3), std(COLORS.strip, { roughness: 0.55 }))
  slab.position.set(STRIP.cx, SURF, STRIP.cz)
  slab.castShadow = slab.receiveShadow = true
  scene.add(slab)

  const [canvas, ctx] = mkCanvas(W, H)
  const tex = canvasTex(canvas)
  const top = decal(STRIP.w, STRIP.d, tex)
  top.position.y = STRIP.h + 0.003
  top.userData.kind = 'strip'
  slab.add(top)

  const n = STRIP.count
  const rowH = H / n
  const R = 0.2 * PX
  const centers = Array.from({ length: n }, (_, i) => ({ x: W / 2, y: (i + 0.5) * rowH }))
  const ticks = Array(n).fill(0) // 0 → none, up to 1 → fully drawn
  const targets = Array(n).fill(0)
  // deterministic little wobble per tick so each looks hand-made
  const wob = Array.from({ length: n }, (_, i) => [Math.sin(i * 12.9) * 0.08, Math.cos(i * 7.7) * 0.08, Math.sin(i * 3.3) * 0.08])

  function draw() {
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.0)'
    ctx.fillRect(0, 0, W, H)
    // numbers + holes
    for (let i = 0; i < n; i++) {
      const c = centers[i]
      ctx.beginPath()
      ctx.arc(c.x, c.y, R, 0, Math.PI * 2)
      ctx.fillStyle = '#F4F6FF'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(30,40,100,0.18)'
      ctx.stroke()
      // faint number
      ctx.fillStyle = 'rgba(60,70,150,0.5)'
      ctx.font = `800 ${R * 0.95}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (ticks[i] < 0.05) ctx.fillText(String(i + 1), c.x, c.y + 2)
    }
    // marker ticks
    for (let i = 0; i < n; i++) {
      const p = ticks[i]
      if (p <= 0) continue
      const c = centers[i]
      const w = wob[i]
      const pts = [
        [c.x - R * (0.55 + w[0]), c.y + R * (0.02 + w[1])],
        [c.x - R * (0.15 + w[1]), c.y + R * (0.5 + w[2])],
        [c.x + R * (0.75 + w[2]), c.y - R * (0.62 + w[0])],
      ]
      ctx.save()
      ctx.strokeStyle = '#1FBF7A'
      ctx.lineWidth = R * 0.34
      ctx.lineCap = ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])
      const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])
      const total = l1 + l2
      let d = p * total
      const seg = (a, b, len) => {
        const t = Math.min(1, d / len)
        ctx.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        d -= len
      }
      seg(pts[0], pts[1], l1)
      if (d > 0) seg(pts[1], pts[2], l2)
      ctx.stroke()
      ctx.restore()
    }
    tex.needsUpdate = true
  }
  draw()

  return {
    mesh: top,
    toggle(uv) {
      const y = (1 - uv.y) * H
      let best = -1
      let bd = 1e9
      centers.forEach((c, i) => {
        const dd = Math.abs(c.y - y)
        if (dd < bd) {
          bd = dd
          best = i
        }
      })
      if (best < 0 || bd > rowH * 0.5) return
      targets[best] = targets[best] > 0 ? 0 : 1
    },
    clear() {
      targets.fill(0)
      ticks.fill(0)
      draw()
    },
    update(dt) {
      let changed = false
      for (let i = 0; i < n; i++) {
        if (ticks[i] === targets[i]) continue
        const step = dt / 0.35
        ticks[i] = targets[i] > ticks[i] ? Math.min(1, ticks[i] + step) : Math.max(0, ticks[i] - step * 2)
        changed = true
      }
      if (changed) draw()
    },
  }
}
