import * as THREE from 'three'
import { ZONES, SURF, BOARD_H, COLORS, MARKERS } from './config.js'
import { mkCanvas, rr, canvasTex, roundedSlab, std, decal, FONT } from './gfx.js'

const PX = 220 // canvas pixels per scene unit

export function createWhiteboard(scene) {
  const z = ZONES.name
  const frame = new THREE.Mesh(roundedSlab(z.w, z.d, BOARD_H, 0.3), std(COLORS.boardFrame, { roughness: 0.5 }))
  frame.position.set(z.cx, SURF, z.cz)
  frame.castShadow = frame.receiveShadow = true
  scene.add(frame)

  const inset = 0.15
  const sw = z.w - inset * 2
  const sd = z.d - inset * 2
  const W = Math.round(sw * PX)
  const H = Math.round(sd * PX)
  const [display, dctx] = mkCanvas(W, H)
  const [strokes, sctx] = mkCanvas(W, H)
  const tex = canvasTex(display)
  const surface = decal(sw, sd, tex, { roughness: 0.22 })
  surface.position.y = BOARD_H + 0.003
  surface.userData.kind = 'board'
  frame.add(surface)

  const state = { color: MARKERS[0].color, width: 13, last: null, drawing: false, dirty: false }

  function paint() {
    dctx.clearRect(0, 0, W, H)
    rr(dctx, 0, 0, W, H, 0.17 * PX)
    dctx.fillStyle = '#FCFEFF'
    dctx.fill()
    dctx.save()
    dctx.clip()
    // faint caption + underline guide, the marker covers them
    dctx.fillStyle = '#C9D4E8'
    dctx.font = `700 ${0.2 * PX}px ${FONT}`
    dctx.textBaseline = 'top'
    dctx.fillText('My name', 0.3 * PX, 0.16 * PX)
    dctx.strokeStyle = '#E4EAF6'
    dctx.setLineDash([10, 14])
    dctx.lineWidth = 4
    dctx.beginPath()
    dctx.moveTo(0.3 * PX, H - 0.28 * PX)
    dctx.lineTo(W - 0.3 * PX, H - 0.28 * PX)
    dctx.stroke()
    dctx.setLineDash([])
    dctx.drawImage(strokes, 0, 0)
    dctx.restore()
    tex.needsUpdate = true
  }
  paint()

  const toPx = (uv) => ({ x: uv.x * W, y: (1 - uv.y) * H })

  return {
    mesh: surface,
    setColor(c) {
      state.color = c
    },
    begin(uv) {
      const p = toPx(uv)
      state.drawing = true
      state.last = p
      sctx.fillStyle = state.color
      sctx.beginPath()
      sctx.arc(p.x, p.y, state.width / 2, 0, Math.PI * 2)
      sctx.fill()
      paint()
    },
    move(uv) {
      if (!state.drawing) return
      if (!uv) {
        state.last = null // pen left the board: next hit starts a new line
        return
      }
      const p = toPx(uv)
      if (!state.last) {
        state.last = p
        return
      }
      sctx.strokeStyle = state.color
      sctx.lineWidth = state.width
      sctx.lineCap = sctx.lineJoin = 'round'
      sctx.beginPath()
      sctx.moveTo(state.last.x, state.last.y)
      const mx = (state.last.x + p.x) / 2
      const my = (state.last.y + p.y) / 2
      sctx.quadraticCurveTo(state.last.x, state.last.y, mx, my)
      sctx.lineTo(p.x, p.y)
      sctx.stroke()
      state.last = p
      paint()
    },
    end() {
      state.drawing = false
      state.last = null
    },
    erase() {
      sctx.clearRect(0, 0, W, H)
      paint()
    },
    get drawing() {
      return state.drawing
    },
  }
}
