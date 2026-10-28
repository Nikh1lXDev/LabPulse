import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { EQUIPMENT } from '../data/mockEquipment'

// ─── Equipment configuration for 3D scene ─────────────────────────────────
// Maps equipment IDs to 3D positions in the scene
const SCENE_EQUIPMENT = [
  // Row 1 — left bank (Lab A, PCs 01-08)
  { id: 'PC-01', position: [-5.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-02', position: [-3.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-03', position: [-1.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-04', position: [ 0.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-05', position: [ 2.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-06', position: [ 4.5, 0, -3.5], type: 'desktop' },
  { id: 'PC-07', position: [-5.5, 0,  0],   type: 'desktop' },
  { id: 'PC-08', position: [-3.5, 0,  0],   type: 'desktop' },
  // Row 2 — right bank (Lab B, PCs 09-15)
  { id: 'PC-09', position: [-1.5, 0,  0],   type: 'desktop' },
  { id: 'PC-10', position: [ 0.5, 0,  0],   type: 'desktop' },
  { id: 'PC-11', position: [ 2.5, 0,  0],   type: 'desktop' },
  { id: 'PC-12', position: [ 4.5, 0,  0],   type: 'desktop' },
  { id: 'PC-13', position: [-5.5, 0,  3.5], type: 'desktop' },
  { id: 'PC-14', position: [-3.5, 0,  3.5], type: 'desktop' },
  { id: 'PC-15', position: [-1.5, 0,  3.5], type: 'desktop' },
  // Laptops
  { id: 'LAPTOP-01', position: [4.5, 0, 3.5], type: 'laptop' },
  { id: 'LAPTOP-02', position: [6.0, 0, 0],   type: 'laptop' },
  // Projectors
  { id: 'PROJ-01', position: [-7.2, 0, -4.5], type: 'projector' },
  { id: 'PROJ-02', position: [-7.2, 0,  4.5], type: 'projector' },
  // Routers / networking
  { id: 'ROUTER-01', position: [7.0, 0, -3.5], type: 'router' },
  { id: 'ROUTER-02', position: [7.0, 0,  0],   type: 'router' },
  { id: 'ROUTER-03', position: [7.0, 0,  3.5], type: 'router' },
  { id: 'SWITCH-01', position: [7.0, 0,  2.0], type: 'switch' },
]

// ─── Status -> colour mapping ────────────────────────────────────────────────
const STATUS_COLORS = {
  healthy:  0x3ddc84,
  warning:  0xf5a623,
  critical: 0xe8453c,
}
const STATUS_EMISSIVE = {
  healthy:  0x0a3320,
  warning:  0x3d2a00,
  critical: 0x3a0a0a,
}

// ─── Build a desktop PC group ────────────────────────────────────────────────
function buildDesktop(status) {
  const group = new THREE.Group()
  const col = STATUS_COLORS[status] ?? 0x4a9eff

  // Desk surface
  const deskGeo = new THREE.BoxGeometry(1.4, 0.06, 0.8)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e2330, roughness: 0.8 })
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.position.set(0, 0.32, 0)
  desk.receiveShadow = true
  group.add(desk)

  // Desk legs
  const legGeo = new THREE.BoxGeometry(0.06, 0.32, 0.06)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.9 })
  const legPositions = [[-0.65, 0.16, -0.35], [0.65, 0.16, -0.35], [-0.65, 0.16, 0.35], [0.65, 0.16, 0.35]]
  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(...pos)
    group.add(leg)
  })

  // Tower / PC case
  const towerGeo = new THREE.BoxGeometry(0.22, 0.42, 0.28)
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.6, metalness: 0.4 })
  const tower = new THREE.Mesh(towerGeo, towerMat)
  tower.position.set(-0.45, 0.56, 0)
  group.add(tower)

  // Tower accent stripe
  const stripeGeo = new THREE.BoxGeometry(0.04, 0.42, 0.28)
  const stripeMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.5 })
  const stripe = new THREE.Mesh(stripeGeo, stripeMat)
  stripe.position.set(-0.33, 0.56, 0)
  group.add(stripe)

  // Monitor stand
  const standGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06)
  const standMat = new THREE.MeshStandardMaterial({ color: 0x111420, roughness: 0.9 })
  const stand = new THREE.Mesh(standGeo, standMat)
  stand.position.set(0.12, 0.44, 0)
  group.add(stand)

  // Monitor bezel
  const bezelGeo = new THREE.BoxGeometry(0.72, 0.46, 0.04)
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.5, metalness: 0.3 })
  const bezel = new THREE.Mesh(bezelGeo, bezelMat)
  bezel.position.set(0.12, 0.73, 0)
  group.add(bezel)

  // Monitor screen
  const screenGeo = new THREE.BoxGeometry(0.65, 0.39, 0.01)
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0a1525, emissive: 0x0a1525, emissiveIntensity: 0.3,
    roughness: 0.1, metalness: 0.1,
  })
  const screen = new THREE.Mesh(screenGeo, screenMat)
  screen.position.set(0.12, 0.73, 0.025)
  group.add(screen)

  // Status LED on monitor
  const ledGeo = new THREE.SphereGeometry(0.025, 8, 8)
  const ledMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.position.set(-0.28, 0.51, 0.03)
  group.add(led)

  // Keyboard
  const kbGeo = new THREE.BoxGeometry(0.55, 0.02, 0.18)
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.8 })
  const kb = new THREE.Mesh(kbGeo, kbMat)
  kb.position.set(0.15, 0.35, 0.2)
  group.add(kb)

  return group
}

// ─── Build a laptop group ────────────────────────────────────────────────────
function buildLaptop(status) {
  const group = new THREE.Group()
  const col = STATUS_COLORS[status] ?? 0x4a9eff

  // Base
  const baseGeo = new THREE.BoxGeometry(0.8, 0.04, 0.55)
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.5, metalness: 0.5 })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.set(0, 0.02, 0)
  group.add(base)

  // Keyboard surface
  const kbGeo = new THREE.BoxGeometry(0.7, 0.005, 0.45)
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x111420, roughness: 0.9 })
  const kb = new THREE.Mesh(kbGeo, kbMat)
  kb.position.set(0, 0.045, 0.02)
  group.add(kb)

  // Lid (slightly open ~120 deg)
  const lidGeo = new THREE.BoxGeometry(0.8, 0.035, 0.52)
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.5, metalness: 0.5 })
  const lid = new THREE.Mesh(lidGeo, lidMat)

  // Screen inside lid
  const screenGeo = new THREE.BoxGeometry(0.72, 0.025, 0.44)
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1525, emissive: 0x0a1525, emissiveIntensity: 0.4 })
  const screen = new THREE.Mesh(screenGeo, screenMat)
  screen.position.set(0, -0.005, 0.005)
  lid.add(screen)

  // Status dot on screen
  const dotGeo = new THREE.CircleGeometry(0.02, 12)
  const dotMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1 })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.position.set(0, 0, 0.015)
  lid.add(dot)

  const lidPivot = new THREE.Group()
  lidPivot.add(lid)
  lid.position.set(0, 0, -0.26)
  lidPivot.rotation.x = -Math.PI * 0.28 // ~50 degrees open
  lidPivot.position.set(0, 0.04, -0.275)
  group.add(lidPivot)

  return group
}

// ─── Build a projector mesh ──────────────────────────────────────────────────
function buildProjector(status) {
  const group = new THREE.Group()
  const col = STATUS_COLORS[status] ?? 0x4a9eff

  // Mount bracket (wall)
  const bracketGeo = new THREE.BoxGeometry(0.12, 0.28, 0.12)
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e2330, roughness: 0.8 })
  const bracket = new THREE.Mesh(bracketGeo, bracketMat)
  bracket.position.set(0, 1.0, 0)
  group.add(bracket)

  // Projector body
  const bodyGeo = new THREE.BoxGeometry(0.52, 0.18, 0.35)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.5, metalness: 0.3 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, 0.86, 0)
  group.add(body)

  // Lens
  const lensGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.06, 16)
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.1, metalness: 0.6 })
  const lens = new THREE.Mesh(lensGeo, lensMat)
  lens.rotation.z = Math.PI / 2
  lens.position.set(0.29, 0.86, 0)
  group.add(lens)

  // Status LED
  const ledGeo = new THREE.SphereGeometry(0.02, 8, 8)
  const ledMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.position.set(-0.2, 0.96, 0)
  group.add(led)

  return group
}

// ─── Build a router / switch box ─────────────────────────────────────────────
function buildRouter(status) {
  const group = new THREE.Group()
  const col = STATUS_COLORS[status] ?? 0x4a9eff

  const bodyGeo = new THREE.BoxGeometry(0.5, 0.1, 0.3)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.5, metalness: 0.4 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, 0.05, 0)
  group.add(body)

  // Port strip
  const portGeo = new THREE.BoxGeometry(0.38, 0.05, 0.02)
  const portMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.9 })
  const ports = new THREE.Mesh(portGeo, portMat)
  ports.position.set(0, 0.05, 0.15)
  group.add(ports)

  // Antenna
  const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8)
  const antMat = new THREE.MeshStandardMaterial({ color: 0x222836, roughness: 0.6 })
  const ant1 = new THREE.Mesh(antGeo, antMat)
  ant1.position.set(-0.15, 0.21, 0)
  group.add(ant1)
  const ant2 = new THREE.Mesh(antGeo, antMat)
  ant2.position.set(0.15, 0.21, 0)
  group.add(ant2)

  // Status LED
  const ledGeo = new THREE.SphereGeometry(0.018, 8, 8)
  const ledMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.position.set(0.2, 0.05, 0.155)
  group.add(led)

  return group
}

// ─── Build a network switch ───────────────────────────────────────────────────
function buildSwitch(status) {
  const group = new THREE.Group()
  const col = STATUS_COLORS[status] ?? 0x4a9eff

  const bodyGeo = new THREE.BoxGeometry(0.7, 0.08, 0.28)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.5, metalness: 0.5 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, 0.04, 0)
  group.add(body)

  // LED row
  for (let i = 0; i < 8; i++) {
    const lGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02)
    const lMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1 })
    const l = new THREE.Mesh(lGeo, lMat)
    l.position.set(-0.28 + i * 0.08, 0.09, 0.13)
    group.add(l)
  }
  return group
}

// ─── Build one equipment group by type ───────────────────────────────────────
function buildEquipmentMesh(type, status) {
  switch (type) {
    case 'desktop':   return buildDesktop(status)
    case 'laptop':    return buildLaptop(status)
    case 'projector': return buildProjector(status)
    case 'router':    return buildRouter(status)
    case 'switch':    return buildSwitch(status)
    default:          return buildDesktop(status)
  }
}

// ─── LabScene component ───────────────────────────────────────────────────────
export default function LabScene({ viewMode = 'structure', onEquipmentClick }) {
  const mountRef   = useRef(null)
  const sceneRef   = useRef(null)
  const [loading, setLoading]     = useState(true)
  const [tooltip, setTooltip]     = useState(null) // { equipData, x, y }
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const equipmentMap = useRef({}) // id -> { group, meshes }

  // ─── Build scene ────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x12161e)
    // No fog — keep equipment always visible

    // ── Camera — fixed isometric position, scene rotates instead ────────────
    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 200
    )
    camera.position.set(14, 10, 14)
    camera.lookAt(0, 1, 0)

    // SceneGroup — all lab content goes here so it can be rotated
    const sceneGroup = new THREE.Group()
    scene.add(sceneGroup)

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x2a3060, 2.5)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xd0e8ff, 2.0)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 80
    dirLight.shadow.camera.left   = -15
    dirLight.shadow.camera.right  =  15
    dirLight.shadow.camera.top    =  15
    dirLight.shadow.camera.bottom = -15
    scene.add(dirLight)

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x203050, 0.6)
    fillLight.position.set(-8, 8, -8)
    scene.add(fillLight)

    // ── Floor ────────────────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(22, 16)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1018, roughness: 0.95, metalness: 0.05,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    sceneGroup.add(floor)

    // Floor grid lines
    const gridHelper = new THREE.GridHelper(22, 22, 0x1a2030, 0x131820)
    gridHelper.position.y = 0.001
    sceneGroup.add(gridHelper)

    // ── Walls ────────────────────────────────────────────────────────────────
    // Cutaway architectural diorama: back and left walls only, open front & right
    // FrontSide culls backfaces so walls never block the view when rotating
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c101a, roughness: 0.95, side: THREE.FrontSide })

    // Back wall
    const backWallGeo = new THREE.PlaneGeometry(22, 6)
    const backWall = new THREE.Mesh(backWallGeo, wallMat)
    backWall.position.set(0, 3, -8)
    backWall.receiveShadow = true
    sceneGroup.add(backWall)

    // Left wall
    const leftWallGeo = new THREE.PlaneGeometry(16, 6)
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone())
    leftWall.position.set(-11, 3, 0)
    leftWall.rotation.y = Math.PI / 2
    leftWall.receiveShadow = true
    sceneGroup.add(leftWall)

    // Subtle wall baseboards
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x1a2336, roughness: 0.8 })
    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(22, 0.15, 0.08), baseboardMat)
    baseBack.position.set(0, 0.075, -7.96)
    sceneGroup.add(baseBack)

    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 16), baseboardMat)
    baseLeft.position.set(-10.96, 0.075, 0)
    sceneGroup.add(baseLeft)

    // ── Ceiling lighting fixtures ─────────────────────────────────────────────
    // Centered above the 3 rows of desks (z = -3.5, 0, 3.5)
    ;[-3.5, 0, 3.5].forEach(z => {
      // Sleek fixture bar
      const barGeo = new THREE.BoxGeometry(14, 0.06, 0.18)
      const barMat = new THREE.MeshStandardMaterial({ color: 0xd8ecff, emissive: 0xb0d4ff, emissiveIntensity: 0.4 })
      const fixture = new THREE.Mesh(barGeo, barMat)
      fixture.position.set(0, 4.2, z)
      sceneGroup.add(fixture)

      // Downlight
      const downLight = new THREE.PointLight(0xd8ecff, 0.45, 9)
      downLight.position.set(0, 4.0, z)
      sceneGroup.add(downLight)
    })

    // ── Lab Information Canvas Board ──────────────────────────────────────────
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#080d19'
    ctx.fillRect(0, 0, 512, 128)
    ctx.fillStyle = '#10223d'
    ctx.fillRect(0, 0, 512, 34)
    ctx.fillStyle = '#4a9eff'
    ctx.font = 'bold 18px monospace'
    ctx.fillText('LAB 01 — SYSTEMS & NETWORKING LAB', 20, 24)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '15px monospace'
    ctx.fillText('23 CONNECTED STATIONS · LABPULSE ACTIVE', 20, 68)
    ctx.fillStyle = '#3ddc84'
    ctx.font = 'bold 14px monospace'
    ctx.fillText('● REAL-TIME TELEMETRY STREAM ONLINE', 20, 102)

    const boardTex = new THREE.CanvasTexture(canvas)
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.4 })
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), boardMat)
    board.position.set(-2, 3.2, -7.94)
    sceneGroup.add(board)

    // ── Equipment objects ─────────────────────────────────────────────────────
    const interactableMeshes = []

    SCENE_EQUIPMENT.forEach(({ id, position, type }) => {
      const equipData = EQUIPMENT.find(e => e.id === id)
      if (!equipData) return

      const group = buildEquipmentMesh(type, equipData.status)
      group.position.set(...position)
      group.scale.setScalar(1.8) // Scale up for visibility
      group.castShadow = true
      sceneGroup.add(group)

      // Dedicated hit-box for reliable raycasting across workstations
      const hitBoxGeo = new THREE.BoxGeometry(1.6, 1.5, 1.1)
      const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat)
      hitBox.position.set(0, 0.6, 0)
      hitBox.userData.equipId = id
      hitBox.userData.equipData = equipData
      hitBox.userData.isHitBox = true
      group.add(hitBox)
      interactableMeshes.push(hitBox)

      // Collect visual meshes for hover highlight
      const visualMeshes = []
      group.traverse(child => {
        if (child.isMesh && !child.userData.isHitBox) {
          child.castShadow = true
          child.receiveShadow = true
          visualMeshes.push(child)
        }
      })
      equipmentMap.current[id] = { group, visualMeshes, hitBox }
    })

    sceneRef.current = { renderer, scene, camera, interactableMeshes, container }

    // ── Raycasting / Hover ────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let hoveredId = null
    const originalMaterials = new Map()

    const setHighlight = (id, highlight) => {
      const entry = equipmentMap.current[id]
      if (!entry) return
      entry.visualMeshes.forEach(mesh => {
        const key = `${id}_${mesh.uuid}`
        if (highlight) {
          if (!originalMaterials.has(key)) {
            originalMaterials.set(key, mesh.material)
          }
          const hMat = mesh.material.clone()
          hMat.emissive = new THREE.Color(0x38bdf8)
          hMat.emissiveIntensity = 0.65
          mesh.material = hMat
        } else {
          if (originalMaterials.has(key)) {
            mesh.material = originalMaterials.get(key)
            originalMaterials.delete(key)
          }
        }
      })
    }

    // ── Mouse & Drag to Rotate ────────────────────────────────────────────────
    let isDragging = false
    let prevX = 0
    let clickStartX = 0
    let clickStartY = 0
    let baseRotationY = 0
    let swayAngle = 0
    let autoRotate = true
    let autoRotateTimer = null

    const onMouseDown = (e) => {
      if (e.button === 0) {
        isDragging = true
        prevX = e.clientX
        clickStartX = e.clientX
        clickStartY = e.clientY
        autoRotate = false
        if (autoRotateTimer) clearTimeout(autoRotateTimer)
      }
    }

    const onMouseUp = (e) => {
      if (isDragging) {
        isDragging = false
        autoRotateTimer = setTimeout(() => { autoRotate = true }, 2500)

        // If mouse moved less than 6px, treat as a direct workstation click
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY)
        if (dist < 6) {
          const rect = container.getBoundingClientRect()
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
          sceneGroup.updateMatrixWorld(true)
          raycaster.setFromCamera(mouse, camera)
          const intersects = raycaster.intersectObjects(interactableMeshes, false)
          if (intersects.length > 0) {
            const eqData = intersects[0].object.userData.equipData
            if (onEquipmentClick && eqData) onEquipmentClick(eqData)
          }
        }
      }
    }

    const onMouseMove = (event) => {
      const rect = container.getBoundingClientRect()

      if (isDragging) {
        const deltaX = event.clientX - prevX
        prevX = event.clientX
        baseRotationY += deltaX * 0.007
        sceneGroup.rotation.y = baseRotationY
      }

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      sceneGroup.updateMatrixWorld(true)
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(interactableMeshes, false)

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const newId = hit.userData.equipId
        const eqData = hit.userData.equipData

        if (newId !== hoveredId) {
          if (hoveredId) setHighlight(hoveredId, false)
          hoveredId = newId
          setHighlight(newId, true)
        }

        const tx = Math.min(event.clientX + 16, window.innerWidth - 256)
        const ty = Math.min(event.clientY + 16, window.innerHeight - 200)
        setTooltip({ equipData: eqData, x: tx, y: ty })
        setTooltipVisible(true)
        container.style.cursor = 'pointer'
      } else {
        if (hoveredId) {
          setHighlight(hoveredId, false)
          hoveredId = null
        }
        setTooltip(null)
        setTooltipVisible(false)
        container.style.cursor = isDragging ? 'grabbing' : 'default'
      }
    }

    const onClick = (event) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      sceneGroup.updateMatrixWorld(true)
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(interactableMeshes, false)
      if (intersects.length > 0) {
        const eqData = intersects[0].object.userData.equipData
        if (onEquipmentClick && eqData) onEquipmentClick(eqData)
      }
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('click', onClick)

    // ── Resize handler ────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    // ── Animation loop ────────────────────────────────────────────────────────
    let frameId
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (autoRotate && !isDragging) {
        swayAngle += 0.005
        sceneGroup.rotation.y = baseRotationY + Math.sin(swayAngle) * 0.1
      }
      renderer.render(scene, camera)
    }
    animate()
    setLoading(false)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId)
      if (autoRotateTimer) clearTimeout(autoRotateTimer)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('click', onClick)
      resizeObserver.disconnect()
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply view-mode colour changes
  useEffect(() => {
    Object.entries(equipmentMap.current).forEach(([id, { visualMeshes }]) => {
      const eq = EQUIPMENT.find(e => e.id === id)
      if (!eq || !visualMeshes) return
      visualMeshes.forEach(child => {
        if (viewMode === 'health') {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(STATUS_COLORS[eq.status] ?? 0x000000)
          child.material.emissiveIntensity = eq.status === 'healthy' ? 0.08 : eq.status === 'warning' ? 0.25 : 0.5
        } else if (viewMode === 'risk') {
          const riskColors = { low: 0x3ddc84, medium: 0xf5a623, high: 0xe8453c }
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(riskColors[eq.riskLevel] ?? 0x000000)
          child.material.emissiveIntensity = 0.35
        } else {
          // structure — reset emissive
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0x000000)
          child.material.emissiveIntensity = 0
        }
      })
    })
  }, [viewMode])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Three.js canvas container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <div className="lab-loading">
          <div className="spinner" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Initializing 3D scene…</span>
        </div>
      )}

      {/* Equipment tooltip */}
      {tooltip && (
        <EquipmentTooltip
          data={tooltip.equipData}
          x={tooltip.x}
          y={tooltip.y}
          visible={tooltipVisible}
          onSelect={onEquipmentClick}
        />
      )}
    </div>
  )
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────
function EquipmentTooltip({ data, x, y, visible, onSelect }) {
  if (!data) return null

  const statusColor = {
    healthy:  'var(--green-base)',
    warning:  'var(--amber-base)',
    critical: 'var(--red-base)',
  }[data.status] ?? 'var(--text-secondary)'

  const riskLabel = { low: 'Low', medium: 'Medium', high: 'High' }[data.riskLevel]
  const riskColor = {
    low:    'var(--green-base)',
    medium: 'var(--amber-base)',
    high:   'var(--red-base)',
  }[data.riskLevel]

  return (
    <div
      className={`equipment-tooltip${visible ? ' visible' : ''}`}
      style={{ left: x, top: y, pointerEvents: 'auto', cursor: 'pointer' }}
      onClick={() => onSelect && onSelect(data)}
      title="Click to view full equipment telemetry"
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {data.id}
        </span>
        <span
          className="badge"
          style={{
            background: `${statusColor}18`,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
            fontSize: 9,
          }}
        >
          <span
            className="dot"
            style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }}
          />
          {data.status.toUpperCase()}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <TooltipRow label="Type"    value={data.type} />
        <TooltipRow label="Lab"     value={data.labName} />
        {data.fault && (
          <div style={{ marginTop: 4, padding: '5px 7px', background: 'rgba(232,69,60,0.1)', border: '1px solid rgba(232,69,60,0.2)', borderRadius: 3 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--red-base)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
              ⚠ {data.faultType}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {data.fault}
            </div>
          </div>
        )}
        <TooltipRow label="Risk"    value={riskLabel} valueStyle={{ color: riskColor, fontWeight: 600 }} />
        <TooltipRow label="Last PM" value={data.lastMaintenance || '—'} />
        <TooltipRow label="Next PM" value={data.nextMaintenance || '—'} />
        {data.temp != null && (
          <TooltipRow
            label="Temp"
            value={`${data.temp} °C`}
            valueStyle={{ color: data.temp > 80 ? 'var(--red-base)' : data.temp > 65 ? 'var(--amber-base)' : 'var(--green-base)' }}
          />
        )}
      </div>

      <div style={{ marginTop: 7, fontSize: 9, color: 'var(--text-muted)' }}>
        Click to open equipment detail
      </div>
    </div>
  )
}

function TooltipRow({ label, value, valueStyle }) {
  return (
    <div className="flex justify-between items-center" style={{ gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, minWidth: 50 }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', ...valueStyle }}>{value}</span>
    </div>
  )
}
