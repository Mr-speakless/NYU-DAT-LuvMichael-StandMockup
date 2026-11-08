import * as THREE from 'three'
import { ZONES, STRIP, SURF, BOARD_H, COLORS, MARKERS } from './config.js'
import { mkCanvas, rr, canvasTex, roundedSlab, std, decal, FONT } from './gfx.js'

// A real-feeling dry-erase board: a frame, a white glossy writing surface, and
// strokes you draw yourself. Nothing is animated or automatic.
function createBoard(parent, { cx, cz, w, d, inset, px, radius, paint }) {
  const frame = new THREE.Mesh(roundedSlab(w, d, BOARD_H, 0.3), std(COLORS.boardFrame, { roughness: 0.5 }))
  frame.position.set(cx, SURF, cz)
  frame.castShadow = frame.receiveShadow = true
  parent.add(frame)

  const sw = w - inset * 2
  const sd = d - inset * 2
  const W = Math.round(sw * px)
  const H = Math.round(sd * px)
  const [display, dctx] = mkCanvas(W, H)
  const [strokes, sctx] = mkCanvas(W, H)
  const tex = canvasTex(display)
  const surface = decal(sw, sd, tex, { roughness: 0.22 })
  surface.position.y = BOARD_H + 0.003
  frame.add(surface)

  const state = { color: MARKERS[0].color, width: 0.06 * px, last: null, drawing: false }

  function redraw() {
    dctx.clearRect(0, 0, W, H)
    rr(dctx, 0, 0, W, H, radius * px)
    dctx.fillStyle = '#FCFEFF'
    dctx.fill()
    dctx.save()
    dctx.clip()
    paint(dctx, W, H, px)
    dctx.drawImage(strokes, 0, 0)
    dctx.restore()
    tex.needsUpdate = true
  }
  redraw()

  const toPx = (uv) => ({ x: uv.x * W, y: (1 - uv.y) * H })

  const api = {
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
      redraw()
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
      redraw()
    },
    end() {
      state.drawing = false
      state.last = null
    },
    erase() {
      sctx.clearRect(0, 0, W, H)
      redraw()
    },
  }
  surface.userData.kind = 'board'
  surface.userData.board = api
  return api
}

// Top board: "My name"
export function createNameBoard(parent) {
  const z = ZONES.name
  return createBoard(parent, {
    cx: z.cx,
    cz: z.cz,
    w: z.w,
    d: z.d,
    inset: 0.15,
    px: 220,
    radius: 0.17,
    paint(ctx, W, H, px) {
      ctx.fillStyle = '#C9D4E8'
      ctx.font = `700 ${0.2 * px}px ${FONT}`
      ctx.textBaseline = 'top'
      ctx.fillText('My name', 0.3 * px, 0.16 * px)
      ctx.strokeStyle = '#E4EAF6'
      ctx.setLineDash([10, 14])
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0.3 * px, H - 0.28 * px)
      ctx.lineTo(W - 0.3 * px, H - 0.28 * px)
      ctx.stroke()
      ctx.setLineDash([])
    },
  })
}

// Left board: just the numbers 1–10 printed down it. You tick them by hand.
export function createCountBoard(parent) {
  return createBoard(parent, {
    cx: STRIP.cx,
    cz: STRIP.cz,
    w: STRIP.w,
    d: STRIP.d,
    inset: 0.08,
    px: 220,
    radius: 0.22,
    paint(ctx, W, H, px) {
      ctx.fillStyle = '#9FAAC4'
      ctx.font = `800 ${0.3 * px}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < STRIP.count; i++) ctx.fillText(String(i + 1), W / 2, ((i + 0.5) * H) / STRIP.count)
    },
  })
}
