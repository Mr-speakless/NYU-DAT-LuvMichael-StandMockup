import * as THREE from 'three'
import { SURF, PANEL_H, BOARD_H, ZONES, STRIP, BINDER, TRAY, STAND, STATUS_CARDS, FEELINGS, LEVELS, TRAYS } from './config.js'
import { mkCanvas, rr, canvasTex, roundedSlab, std, drawFace, drawCardIcon, FONT } from './gfx.js'
import { slotCenter, cellCenter, commBounds } from './panels.js'

// Feeling stickers are upright bars: as wide as a lane, tall enough to pinch.
// They may overhang their cell a little.
const STICK = { w: 0.56, d: 1.04, h: 0.14 }
// A status card is exactly as big as the status area: one card fills it.
export const CARD ={ w: ZONES.status.w - 0.1, d: ZONES.status.d - 0.1, h: 0.12 }
const PX = 200

const inRect = (x, z, cx, cz, w, d, m = 0) => Math.abs(x - cx) <= w / 2 + m && Math.abs(z - cz) <= d / 2 + m

// height of whatever is under (x, z), in tray design coordinates
export function surfaceAt(x, z) {
  const n = ZONES.name
  if (inRect(x, z, n.cx, n.cz, n.w, n.d)) return SURF + BOARD_H
  for (const k of ['status', 'comm']) if (inRect(x, z, ZONES[k].cx, ZONES[k].cz, ZONES[k].w, ZONES[k].d)) return SURF + PANEL_H
  if (inRect(x, z, STRIP.cx, STRIP.cz, STRIP.w, STRIP.d)) return SURF + BOARD_H
  if (inRect(x, z, BINDER.cx, BINDER.cz, BINDER.baseW, BINDER.baseD)) return SURF + BINDER.baseH + 0.12
  return SURF
}

// height of the desk (or a loose tray) under (x, z) in world coordinates
export function deskY(x, z) {
  for (const t of Object.values(TRAYS)) if (inRect(x, z, t.cx, t.cz, t.w - 0.6, t.d - 0.6)) return t.h
  return 0
}

function cardDecal(card) {
  const w = Math.round(CARD.w * PX)
  const h = Math.round(CARD.d * PX)
  const [c, ctx] = mkCanvas(w, h)
  rr(ctx, 0, 0, w, h, 0.28 * PX)
  ctx.fillStyle = card.color
  ctx.fill()
  rr(ctx, 14, 14, w - 28, h - 28, 0.22 * PX)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fill()
  drawCardIcon(ctx, card.id, w * 0.27, h / 2, 0.5 * PX * 0.62, '#fff')
  ctx.fillStyle = '#fff'
  ctx.font = `900 ${0.5 * PX}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 6
  ctx.fillText(card.label, w * 0.64, h / 2 + 6)
  return canvasTex(c)
}

function stickerTex(f) {
  const w = Math.round(STICK.w * PX)
  const h = Math.round(STICK.d * PX)
  const [c, ctx] = mkCanvas(w, h)
  rr(ctx, 0, 0, w, h, 0.2 * PX)
  ctx.fillStyle = f.color
  ctx.fill()
  const g = ctx.createRadialGradient(w * 0.35, h * 0.2, 6, w / 2, h / 2, h * 0.7)
  g.addColorStop(0, '#ffffff55')
  g.addColorStop(1, '#ffffff00')
  ctx.fillStyle = g
  ctx.fill()
  rr(ctx, 7, 7, w - 14, h - 14, 0.15 * PX)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 4
  ctx.stroke()
  drawFace(ctx, f.id, w / 2, h * 0.38, w * 0.36)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `900 ${0.115 * PX}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 4
  ctx.fillText(f.label, w / 2, h * 0.8)
  return canvasTex(c)
}

// stand = { content }  (the tilted group that holds the tray's design coordinates)
export function createTokens(scene, stand, onChange) {
  const items = []
  const pickables = []

  const mark = (obj, item) =>
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.userData.kind = 'drag'
        o.userData.item = item
        pickables.push(o)
      }
    })

  // status cards
  STATUS_CARDS.forEach((card, i) => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(roundedSlab(CARD.w, CARD.d, CARD.h, 0.3), std(card.color, { roughness: 0.45 })))
    const top = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w - 0.06, CARD.d - 0.06).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cardDecal(card), roughness: 0.45, transparent: true }))
    top.position.y = CARD.h + 0.003
    g.add(top)
    const item = { kind: 'card', id: card.id, index: i, group: g, home: card.home, target: { mode: 'desk', x: 0, y: 0, z: 0, ry: 0 }, slot: false, dragging: false, scale: 1 }
    mark(g, item)
    scene.add(g)
    items.push(item)
  })

  // feeling stickers: upright bars
  FEELINGS.forEach((f, i) => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(roundedSlab(STICK.w, STICK.d, STICK.h, 0.2), std(f.color, { roughness: 0.35 })))
    const top = new THREE.Mesh(new THREE.PlaneGeometry(STICK.w - 0.04, STICK.d - 0.04).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: stickerTex(f), roughness: 0.3, transparent: true }))
    top.position.y = STICK.h + 0.003
    g.add(top)
    const item = { kind: 'sticker', id: f.id, label: f.label, index: i, group: g, home: f.home, target: { mode: 'desk', x: 0, y: 0, z: 0, ry: 0 }, level: 0, dragging: false, scale: 1 }
    mark(g, item)
    scene.add(g)
    items.push(item)
  })

  const tmp = new THREE.Vector3()
  const worldPos = (t, out) => {
    out.set(t.x, t.y, t.z)
    if (t.mode === 'stand') stand.content.localToWorld(out)
    return out
  }

  function toHome(item, instant = true) {
    const [x, z, ry] = item.home
    item.target = { mode: 'desk', x, z, ry, y: deskY(x, z) }
    item.slot = false
    item.level = 0
    if (instant) {
      item.group.position.set(x, deskY(x, z), z)
      item.group.rotation.set(0, ry, 0)
    }
  }
  items.forEach((it) => toHome(it))

  // Where is the pointer? On the leaning tray, or on the desk?
  const inv = new THREE.Matrix4()
  const ray = new THREE.Ray()
  const trayPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(SURF + 0.6))
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6)
  const hitV = new THREE.Vector3()
  function pointerTarget(raycaster) {
    inv.copy(stand.content.matrixWorld).invert()
    ray.copy(raycaster.ray).applyMatrix4(inv)
    if (ray.intersectPlane(trayPlane, hitV) && Math.abs(hitV.x) < TRAY.w / 2 - 0.2 && Math.abs(hitV.z) < TRAY.d / 2 - 0.2) {
      return { mode: 'stand', x: hitV.x, z: hitV.z }
    }
    if (raycaster.ray.intersectPlane(deskPlane, hitV)) {
      return { mode: 'desk', x: THREE.MathUtils.clamp(hitV.x, -12.4, 12.4), z: THREE.MathUtils.clamp(hitV.z, -7.5, 10.3) }
    }
    return null
  }

  let active = null
  function readState() {
    return {
      status: Object.fromEntries(items.filter((i) => i.kind === 'card').map((i) => [i.id, i.slot])),
      feelings: items.filter((i) => i.kind === 'sticker' && i.level > 0).map((i) => ({ id: i.id, label: i.label, level: i.level })),
    }
  }
  const changed = () => onChange?.(readState())

  const api = {
    pickables,
    get dragging() {
      return !!active
    },
    begin(item, hitPoint, raycaster) {
      active = item
      item.dragging = true
      item.slot = false
      item.level = 0
      if (item.kind === 'sticker') item.target.ry = 0
      api.move(raycaster)
      changed()
    },
    move(raycaster) {
      if (!active) return
      const r = pointerTarget(raycaster)
      if (!r) return
      const t = active.target
      t.mode = r.mode
      t.x = r.x
      t.z = r.z
      t.y = r.mode === 'stand' ? surfaceAt(r.x, r.z) + 0.6 : deskY(r.x, r.z) + 0.6
    },
    end() {
      const it = active
      if (!it) return
      active = null
      it.dragging = false
      const t = it.target
      if (t.mode === 'desk') {
        t.y = deskY(t.x, t.z)
      } else if (it.kind === 'card') {
        const z = ZONES.status
        if (inRect(t.x, t.z, z.cx, z.cz, z.w, z.d, 0.9)) {
          const s = slotCenter()
          t.x = s.x
          t.z = s.z
          t.ry = 0
          t.y = SURF + PANEL_H
          // only one status at a time: whoever was there goes back to the desk
          for (const o of items) if (o !== it && o.kind === 'card' && o.slot) toHome(o, false)
          it.slot = true
        } else t.y = surfaceAt(t.x, t.z)
      } else {
        const b = commBounds()
        const rowH = (b.z1 - b.z0) / LEVELS
        if (t.x > b.x0 - 0.7 && t.x < b.x1 + 0.7 && t.z > b.z0 - 0.7 && t.z < b.z1 + 0.7) {
          const row = THREE.MathUtils.clamp(Math.floor((t.z - b.z0) / rowH), 0, LEVELS - 1)
          const c = cellCenter(it.index, row)
          t.x = c.x
          t.z = c.z
          t.y = SURF + PANEL_H
          it.level = LEVELS - row
        } else t.y = surfaceAt(t.x, t.z)
      }
      changed()
    },
    reset() {
      items.forEach((it) => toHome(it, false))
      changed()
    },
    state: readState,
    update(dt) {
      const k = 1 - Math.exp(-dt * 15)
      for (const it of items) {
        const p = it.group.position
        worldPos(it.target, tmp)
        p.lerp(tmp, k)
        const r = it.group.rotation
        r.x += ((it.target.mode === 'stand' ? STAND.tilt : 0) - r.x) * k
        r.y += (it.target.ry - r.y) * k
        const sc = it.dragging ? 1.06 : 1
        it.scale += (sc - it.scale) * k
        it.group.scale.setScalar(it.scale)
      }
    },
  }
  return api
}
