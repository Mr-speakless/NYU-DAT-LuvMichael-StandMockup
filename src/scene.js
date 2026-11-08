import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { COLORS, TRAY, STAND, TRAYS } from './config.js'
import { woodTexture, roundedSlab, std, mkCanvas, canvasTex, FONT } from './gfx.js'

export function buildScene(renderer) {
  const scene = new THREE.Scene()

  // soft vertical gradient behind everything
  const [bg, bctx] = mkCanvas(8, 256)
  const grad = bctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#EFE3D6')
  grad.addColorStop(1, '#D3BEAD')
  bctx.fillStyle = grad
  bctx.fillRect(0, 0, 8, 256)
  scene.background = canvasTex(bg)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.32

  // ── lights ────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xb89a80, 0.5))
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.5)
  sun.position.set(-9, 17, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const sc = sun.shadow.camera
  sc.left = -15
  sc.right = 15
  sc.top = 13
  sc.bottom = -13
  sc.near = 1
  sc.far = 50
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 3
  sun.shadow.intensity = 0.92
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xd3e6ff, 0.3)
  fill.position.set(12, 8, 6)
  scene.add(fill)

  // ── room: floor, wall, little desk ────────────────────────
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), std(COLORS.floor, { roughness: 0.95 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -8.8
  floor.receiveShadow = true
  scene.add(floor)

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), std(COLORS.wall, { roughness: 1 }))
  wall.position.set(0, 16, -17)
  scene.add(wall)

  const deskTex = woodTexture(COLORS.desk, COLORS.deskDark, { seed: 7, planks: 4 })
  deskTex.repeat.set(1 / 14, 1 / 14)
  const deskMat = std(0xffffff, { map: deskTex, roughness: 0.75 })
  const desk = new THREE.Mesh(roundedSlab(27, 20.5, 0.9, 0.7), deskMat)
  desk.position.set(0, -0.9, 1.0)
  desk.receiveShadow = true
  desk.castShadow = true
  scene.add(desk)

  const legGeo = new THREE.CylinderGeometry(0.45, 0.35, 7.9, 24)
  const legMat = std(COLORS.deskDark, { roughness: 0.8 })
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(sx * 12, -0.9 - 3.95, 1.0 + sz * 8.9)
      leg.castShadow = true
      scene.add(leg)
    }

  // ── stand: tray leans back, pivoting on its front-bottom edge ──
  const Zp = TRAY.d / 2
  const tiltG = new THREE.Group()
  tiltG.position.set(0, 0, Zp)
  tiltG.rotation.x = STAND.tilt
  const content = new THREE.Group() // design coordinates live here
  content.position.set(0, 0, -Zp)
  tiltG.add(content)
  scene.add(tiltG)

  // ── wooden tray ───────────────────────────────────────────
  const trayTex = woodTexture(COLORS.wood, COLORS.woodDark, { seed: 3 })
  trayTex.repeat.set(1 / 9, 1 / 9)
  const trayMat = std(0xffffff, { map: trayTex, roughness: 0.55 })
  const floorMesh = new THREE.Mesh(roundedSlab(TRAY.w, TRAY.d, TRAY.floorH, TRAY.r), trayMat)
  floorMesh.castShadow = floorMesh.receiveShadow = true
  content.add(floorMesh)

  const railTex = trayTex.clone()
  railTex.needsUpdate = true
  railTex.repeat.set(1 / 6, 1 / 6)
  const rail = new THREE.Mesh(
    roundedSlab(TRAY.w, TRAY.d, TRAY.railH, TRAY.r, { w: TRAY.w - TRAY.railW * 2, d: TRAY.d - TRAY.railW * 2, r: TRAY.r - 0.2 }),
    std(0xffffff, { map: railTex, color: 0xffe9d2, roughness: 0.5 })
  )
  rail.position.y = TRAY.floorH - 0.02
  rail.castShadow = rail.receiveShadow = true
  content.add(rail)

  // wooden side cheeks + back panel holding the tray up
  const yb = TRAY.d * Math.sin(STAND.tilt)
  const zb = Zp - TRAY.d * Math.cos(STAND.tilt)
  const tri = new THREE.Shape()
  tri.moveTo(Zp - 0.25, 0.02)
  tri.lineTo(zb, 0.02)
  tri.lineTo(zb, yb - 0.1)
  tri.closePath()
  const cheekGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3 })
  cheekGeo.rotateY(-Math.PI / 2)
  const cheekMat = std(0xffffff, { map: trayTex, color: 0xf2c79a, roughness: 0.55 })
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, cheekMat)
    cheek.position.x = sx * (TRAY.w / 2 - 0.55) + (sx > 0 ? 0.17 : 0.17)
    cheek.castShadow = cheek.receiveShadow = true
    scene.add(cheek)
  }
  const backH = yb - 0.3
  const back = new THREE.Mesh(roundedSlab(TRAY.w - 1.2, backH, 0.3, 0.1), cheekMat)
  back.geometry.rotateX(Math.PI / 2)
  back.geometry.translate(0, backH / 2 + 0.02, 0)
  back.position.set(0, 0, zb + 0.05)
  back.castShadow = back.receiveShadow = true
  scene.add(back)
  tiltG.updateMatrixWorld(true)

  for (const t of Object.values(TRAYS)) addTray(scene, t)
  addProps(scene)
  return { scene, stand: { content, tilt: STAND.tilt } }
}

// A few desk props so the table feels lived-in. Kept deliberately simple —
// swap for real models later (see assets list).
function addProps(scene) {
  // mug
  const mug = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 1.15, 32), std('#8DE8C4', { roughness: 0.35 }))
  body.position.y = 0.575
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.02, 32), std('#7A4B34', { roughness: 0.3 }))
  coffee.position.y = 1.08
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 12, 24, Math.PI * 1.2), std('#8DE8C4', { roughness: 0.35 }))
  handle.position.set(0.62, 0.62, 0)
  handle.rotation.z = -Math.PI * 0.6
  mug.add(body, coffee, handle)
  mug.position.set(8.6, 0, 0.2)
  mug.traverse((o) => (o.castShadow = o.isMesh))
  scene.add(mug)

  // little plant
  const plant = new THREE.Group()
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 1.1, 28), std('#FF9E80', { roughness: 0.7 }))
  pot.position.y = 0.55
  plant.add(pot)
  const leafMat = std('#6FD98E', { roughness: 0.5 })
  const leaves = [
    [0, 1.9, 0, 0.55, 1.1],
    [-0.45, 1.6, 0.1, 0.4, 0.8],
    [0.45, 1.65, -0.1, 0.4, 0.85],
    [0.1, 1.5, 0.45, 0.35, 0.7],
    [-0.1, 1.55, -0.45, 0.35, 0.7],
  ]
  for (const [x, y, z, rx, ry] of leaves) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), leafMat)
    l.scale.set(rx, ry, rx * 0.8)
    l.position.set(x, y, z)
    plant.add(l)
  }
  plant.position.set(9.6, 0, -3.6)
  plant.traverse((o) => (o.castShadow = o.isMesh))
  scene.add(plant)

  // spare marker + eraser lying in front of the tray
  const marker = new THREE.Group()
  const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 20), std('#FF5C93', { roughness: 0.4 }))
  const mCap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 20), std('#33415C', { roughness: 0.4 }))
  mCap.position.y = 0.95
  const mTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 20), std('#33415C'))
  mTip.position.y = -0.88
  mTip.rotation.x = Math.PI
  marker.add(mBody, mCap, mTip)
  marker.rotation.z = Math.PI / 2
  marker.rotation.y = 0.5
  marker.position.set(8.2, 0.15, 3.4)
  marker.traverse((o) => (o.castShadow = o.isMesh))
  scene.add(marker)

  const eraser = new THREE.Mesh(roundedSlab(1.2, 0.55, 0.32, 0.14), std('#CFE3FF', { roughness: 0.8 }))
  eraser.position.set(9.5, 0, 4.6)
  eraser.rotation.y = -0.25
  eraser.castShadow = true
  scene.add(eraser)
}

// A plain wooden tray lying on the desk, with a faint label. Not interactive.
function addTray(scene, t) {
  const tex = woodTexture('#EBB97A', '#B9783E', { seed: Math.round(t.cx * 7 + 11) })
  tex.repeat.set(1 / 7, 1 / 7)
  const mat = std(0xffffff, { map: tex, roughness: 0.55 })
  const g = new THREE.Group()
  g.position.set(t.cx, 0, t.cz)
  const floor = new THREE.Mesh(roundedSlab(t.w, t.d, t.h, 0.5), mat)
  floor.castShadow = floor.receiveShadow = true
  g.add(floor)
  const rw = 0.3
  const rail = new THREE.Mesh(
    roundedSlab(t.w, t.d, t.h + 0.2, 0.5, { w: t.w - rw * 2, d: t.d - rw * 2, r: 0.3 }),
    std(0xffffff, { map: tex, color: 0xffe9d2, roughness: 0.5 })
  )
  rail.castShadow = rail.receiveShadow = true
  g.add(rail)
  const PX = 90
  const [c, ctx] = mkCanvas(Math.round(t.w * PX), Math.round(t.d * PX))
  ctx.fillStyle = 'rgba(120,70,25,0.30)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const size = Math.min(t.w * 0.09, t.labelY ? 0.6 : 1.1) * PX
  ctx.font = `800 ${size}px ${FONT}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.18}px`
  ctx.fillText(t.label, c.width / 2, c.height * (t.labelY ?? 0.5))
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(t.w, t.d).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: canvasTex(c), transparent: true, roughness: 0.7, depthWrite: false })
  )
  label.position.y = t.h + 0.004
  label.receiveShadow = true
  g.add(label)
  scene.add(g)
}
