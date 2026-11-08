import * as THREE from 'three'
import { ZONES, SURF, PANEL_H, COLORS, FEELINGS, STATUS_CARDS, LEVELS } from './config.js'
import { mkCanvas, rr, canvasTex, roundedSlab, std, decal, drawFace, drawCardIcon, FONT } from './gfx.js'

const PX = 200
const HEADER = 0.95
const GAUGE = 0.34

// ── layout helpers shared with the draggable tokens ─────────
export function slotCenter() {
  const z = ZONES.status
  return { x: z.cx, z: z.cz }
}

const commGeom = () => {
  const z = ZONES.comm
  const laneX0 = z.cx - z.w / 2 + GAUGE + 0.04
  const laneW = (z.w - GAUGE - 0.04 - 0.06) / FEELINGS.length
  const top = z.cz - z.d / 2 + HEADER
  const rowH = (z.d - HEADER - 0.1) / LEVELS
  return { z, laneX0, laneW, top, rowH }
}
export function cellCenter(lane, row) {
  const g = commGeom()
  return { x: g.laneX0 + (lane + 0.5) * g.laneW, z: g.top + (row + 0.5) * g.rowH }
}
export function commBounds() {
  const g = commGeom()
  return { x0: g.z.cx - g.z.w / 2, x1: g.z.cx + g.z.w / 2, z0: g.top, z1: g.top + g.rowH * LEVELS }
}

function slab(zone, color, scene) {
  const m = new THREE.Mesh(roundedSlab(zone.w, zone.d, PANEL_H, 0.3), std(color, { roughness: 0.55 }))
  m.position.set(zone.cx, SURF, zone.cz)
  m.castShadow = m.receiveShadow = true
  scene.add(m)
  return m
}

export function createPanels(scene) {
  // ── status area ─────────────────────────────────────────
  {
    const z = ZONES.status
    const s = slab(z, COLORS.statusPanel, scene)
    const [c, ctx] = mkCanvas(Math.round(z.w * PX), Math.round(z.d * PX))
    const w = z.w * PX
    const h = z.d * PX
    rr(ctx, 14, 14, w - 28, h - 28, 0.22 * PX)
    ctx.fillStyle = 'rgba(70,120,190,0.14)'
    ctx.fill()
    ctx.setLineDash([16, 14])
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(70,120,190,0.3)'
    ctx.stroke()
    ctx.setLineDash([])
    STATUS_CARDS.forEach((card, i) => {
      const x = w * (0.22 + i * 0.28)
      drawCardIcon(ctx, card.id, x, h * 0.42, 0.2 * PX, 'rgba(70,120,190,0.3)')
      ctx.fillStyle = 'rgba(70,120,190,0.42)'
      ctx.font = `800 ${0.13 * PX}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(card.label, x, h * 0.72)
    })
    const d = decal(z.w, z.d, canvasTex(c))
    d.position.y = PANEL_H + 0.003
    s.add(d)
  }

  // ── communication area ──────────────────────────────────
  {
    const g = commGeom()
    const z = g.z
    const s = slab(z, COLORS.commPanel, scene)
    const [c, ctx] = mkCanvas(Math.round(z.w * PX), Math.round(z.d * PX))
    const ox = z.cx - z.w / 2
    const oz = z.cz - z.d / 2
    // lane headers: faint faces
    FEELINGS.forEach((f, i) => {
      const p = cellCenter(i, 0)
      const x = (p.x - ox) * PX
      ctx.beginPath()
      ctx.arc(x, 0.5 * PX, 0.27 * PX, 0, Math.PI * 2)
      ctx.fillStyle = f.color
      ctx.globalAlpha = 0.55
      ctx.fill()
      ctx.globalAlpha = 0.85
      drawFace(ctx, f.id, x, 0.5 * PX, 0.27 * PX, '#6B4D5C')
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(107,77,92,0.7)'
      ctx.font = `800 ${0.115 * PX}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(f.label, x, 0.86 * PX)
    })
    // intensity cells + gauge bars
    for (let r = 0; r < LEVELS; r++) {
      const level = LEVELS - r // top row = strongest
      for (let i = 0; i < FEELINGS.length; i++) {
        const p = cellCenter(i, r)
        const x = (p.x - ox) * PX
        const y = (p.z - oz) * PX
        rr(ctx, x - (g.laneW / 2 - 0.03) * PX, y - (g.rowH / 2 - 0.04) * PX, (g.laneW - 0.06) * PX, (g.rowH - 0.08) * PX, 0.14 * PX)
        ctx.fillStyle = FEELINGS[i].color
        ctx.globalAlpha = 0.1 + 0.14 * (level / LEVELS)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      // gauge bar, longer = stronger
      const y = (g.top + (r + 0.5) * g.rowH - oz) * PX
      const len = (0.06 + 0.045 * level) * PX
      rr(ctx, 0.06 * PX, y - 0.035 * PX, len, 0.07 * PX, 0.035 * PX)
      ctx.fillStyle = 'rgba(160,80,120,0.45)'
      ctx.fill()
    }
    const d = decal(z.w, z.d, canvasTex(c))
    d.position.y = PANEL_H + 0.003
    s.add(d)
  }
}
