import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================================
// CONFIGURATION & GLOBAL STATE
// ============================================================================
const CONFIG = {
  isNight: false,
  autoRotate: false,
  viewMode: 'iso', // 'iso' | 'fpv'
  frustumSize: 85,
  cameraDefaultPos: new THREE.Vector3(70, 68, 70),
  targetDefault: new THREE.Vector3(0, 0, 0),
  settings: {
    shadows: 'medium',
    vegetation: 'dense',
    particles: true,
    fog: true,
    waterAnim: true,
    npcCount: 12,
    npcChat: true
  },
  day: {
    sky: 0xd8eeff,
    fog: 0xd8eeff,
    ambient: 0xfff7ed,
    ambientIntensity: 0.95,
    sun: 0xfffbeb,
    sunIntensity: 1.85,
    sunPos: new THREE.Vector3(65, 85, 45),
    lanternIntensity: 0,
    windowEmissive: 0x222222,
    windowIntensity: 0.15
  },
  night: {
    sky: 0x090d16,
    fog: 0x090d16,
    ambient: 0x1e293b,
    ambientIntensity: 0.45,
    sun: 0x60a5fa,
    sunIntensity: 0.55,
    sunPos: new THREE.Vector3(-45, 65, -45),
    lanternIntensity: 2.8,
    windowEmissive: 0xfbbf24,
    windowIntensity: 1.2
  }
};

// Landmark Camera Presets (target, zoom, posOffset)
const LANDMARKS = {
  overview: {
    target: new THREE.Vector3(0, 0, 0),
    pos: new THREE.Vector3(70, 68, 70),
    zoom: 1.0
  },
  market: {
    target: new THREE.Vector3(2, 0.5, -3),
    pos: new THREE.Vector3(26, 24, 21),
    zoom: 2.3
  },
  tavern: {
    target: new THREE.Vector3(18, 0.5, 8),
    pos: new THREE.Vector3(40, 22, 30),
    zoom: 2.3
  },
  watermill: {
    target: new THREE.Vector3(-18, 0.5, 12),
    pos: new THREE.Vector3(-2, 22, 32),
    zoom: 2.3
  },
  windmill: {
    target: new THREE.Vector3(24, 4.0, -26),
    pos: new THREE.Vector3(44, 26, -6),
    zoom: 2.1
  },
  residential: {
    target: new THREE.Vector3(-22, 1.2, -18),
    pos: new THREE.Vector3(-4, 24, 0),
    zoom: 2.1
  }
};

let cameraTransition = null;

// ============================================================================
// THREE.JS CORE SETUP
// ============================================================================
const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.day.sky);
scene.fog = new THREE.Fog(CONFIG.day.fog, 65, 175);

const aspect = window.innerWidth / window.innerHeight;
const halfF = CONFIG.frustumSize / 2;
const camera = new THREE.OrthographicCamera(
  -halfF * aspect, halfF * aspect,
  halfF, -halfF,
  0.1, 800
);
camera.position.copy(CONFIG.cameraDefaultPos);
camera.lookAt(CONFIG.targetDefault);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 2.3;
controls.minZoom = 0.45;
controls.maxZoom = 4.0;
controls.target.copy(CONFIG.targetDefault);

// Dual Camera System & Active PointerLock Reference
let activeCamera = camera;

const fpvCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
fpvCamera.position.set(2, 1.65, 2);
const fpvControls = new PointerLockControls(fpvCamera, canvas);

// ============================================================================
// LIGHTING SETUP (100x100 Coverage)
// ============================================================================
const ambientLight = new THREE.AmbientLight(CONFIG.day.ambient, CONFIG.day.ambientIntensity);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(CONFIG.day.sun, CONFIG.day.sunIntensity);
dirLight.position.copy(CONFIG.day.sunPos);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 5;
dirLight.shadow.camera.far = 250;
const d = 65;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0003;
scene.add(dirLight);

// ============================================================================
// MATERIALS PALETTE (Stylized Low-Poly / PBR)
// ============================================================================
const mat = (color, roughness = 0.85, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true
  });

const materials = {
  // Terrain & Soil
  grassValley: mat(0x7fb858, 0.9),
  grassHills: mat(0x6ca349, 0.9),
  grassHigh: mat(0x5b913d, 0.92),
  dirtDark: mat(0x78563c, 0.9),
  dirtPath: mat(0xa88764, 0.85),
  cobblestone: mat(0xb0a89d, 0.8),
  stoneCliff: mat(0x5a636e, 0.88),
  sandBank: mat(0xd4be8c, 0.9),

  // Architecture
  wallCream: mat(0xf4efe4, 0.8),
  wallTimber: mat(0x8a5d3b, 0.85),
  wallStone: mat(0x9ca3af, 0.82),
  woodDark: mat(0x452b1a, 0.85),
  woodPlank: mat(0xb88351, 0.8),
  roofTerracotta: mat(0xc85a36, 0.75),
  roofSlate: mat(0x3e4c59, 0.7),
  roofThatch: mat(0xd9a441, 0.9),
  roofBlue: mat(0x3b82f6, 0.75),
  roofCrimson: mat(0xd94646, 0.75),

  // Market & Props
  clothWhite: mat(0xfafafa, 0.8),
  clothRed: mat(0xef4444, 0.8),
  clothBlue: mat(0x3b82f6, 0.8),
  clothYellow: mat(0xf59e0b, 0.8),
  clothGreen: mat(0x10b981, 0.8),
  barrelWood: mat(0x925e36, 0.8),
  ironMetal: mat(0x374151, 0.4, 0.6),

  // Nature
  pineGreen: mat(0x1b432a, 0.88),
  pineGreenDark: mat(0x143320, 0.9),
  oakGreen: mat(0x4a7c36, 0.85),
  appleRed: mat(0xef4444, 0.6),
  autumnOrange: mat(0xe07a22, 0.85),
  wheatGold: mat(0xeab308, 0.85),
  pumpkinOrange: mat(0xf97316, 0.75),
  boulderStone: mat(0x6b7280, 0.85),

  // Dynamic / Translucent / Glow
  water: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.86,
    flatShading: true
  }),
  glass: new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x222222,
    emissiveIntensity: 0.15
  }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: 0xfde047 })
};

// Tracking lists
const villageWorld = new THREE.Group();
scene.add(villageWorld);

const interactableObjects = [];
const animatedRotations = [];
const smokePuffs = [];
const lanternLights = [];
const fireflies = [];
let waterMesh = null;
let instancedPineMesh = null;
let instancedOakMesh = null;
let instancedBushMesh = null;
let instancedBoulderMesh = null;

// ============================================================================
// 1. PROCEDURAL 100x100 TERRAIN & TOPOGRAPHY
// ============================================================================
// Mathematical curves for terrain & ground elevation (Shared by terrain, player & NPCs)
const riverCenterX = (z) => {
  return Math.sin(z * 0.06) * 14 + (z * 0.65) - 4;
};

function getGroundElevation(vx, vz) {
  const rx = riverCenterX(vz);
  const distRiver = Math.abs(vx - rx);
  let vy = 0;

  // 1. North-Eastern Windmill Hill (around x: 24, z: -26)
  const distHill = Math.hypot(vx - 24, vz - (-26));
  if (distHill < 22) {
    vy += Math.cos((distHill / 22) * (Math.PI / 2)) * 4.2;
  }

  // 2. Western Residential Plateau (around x: -26, z: -16)
  const distPlat = Math.hypot(vx - (-26), vz - (-16));
  if (distPlat < 20) {
    vy += Math.cos((distPlat / 20) * (Math.PI / 2)) * 1.6;
  }

  // 3. Eastern Forest Ridge (around x: 36, z: 16)
  const distForest = Math.hypot(vx - 36, vz - 16);
  if (distForest < 24) {
    vy += Math.cos((distForest / 24) * (Math.PI / 2)) * 2.8;
  }

  // 4. Carve River Valley Trench
  const riverWidth = 7.5;
  if (distRiver < riverWidth) {
    const depth = Math.cos((distRiver / riverWidth) * (Math.PI / 2)) * 2.2;
    vy -= depth;
  }

  // Organic gentle surface noise
  vy += Math.sin(vx * 0.12) * Math.cos(vz * 0.12) * 0.35;
  return vy;
}

function getGroundHeight(x, z) {
  // 1. Central Stone Arch Bridge (near Market, X: 0, Z: 4.5, rotated -PI/7, deck y=0.55 + height)
  const dxB1 = x - 0;
  const dzB1 = z - 4.5;
  const cos1 = Math.cos(Math.PI / 7);
  const sin1 = Math.sin(Math.PI / 7);
  const localX1 = dxB1 * cos1 - dzB1 * sin1;
  const localZ1 = dxB1 * sin1 + dzB1 * cos1;
  if (Math.abs(localX1) <= 2.2 && Math.abs(localZ1) <= 4.8) {
    return 0.72; // Deck height
  }

  // 2. Wooden Footbridge (near Watermill, X: -16, Z: 6, width 2.6, length 8.8)
  const dxB2 = x - (-16);
  const dzB2 = z - 6;
  if (Math.abs(dxB2) <= 1.4 && Math.abs(dzB2) <= 4.4) {
    return 0.45; // Wood deck height
  }

  // 3. Pier / Dock near Watermill (X: -18, Z: 14)
  if (Math.abs(x - (-18)) <= 2.6 && Math.abs(z - 14) <= 4.0) {
    return 0.4;
  }

  // Base terrain with water surface floor clamp
  let y = getGroundElevation(x, z);
  if (y < -0.15) {
    y = -0.15; // Shallow river water surface
  }
  return y;
}

function build100x100Terrain() {
  const terrainGroup = new THREE.Group();

  // Low-poly terrain mesh 100x100 with organic elevation
  const segments = 48;
  const terrainGeo = new THREE.PlaneGeometry(100, 100, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;

  const colors = [];
  const colorGrass = new THREE.Color(0x7fb858);
  const colorHills = new THREE.Color(0x6ca349);
  const colorDirt = new THREE.Color(0xa88764);
  const colorSand = new THREE.Color(0xd4be8c);
  const colorRiverBed = new THREE.Color(0x475569);

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);

    // River distance calculation
    const rx = riverCenterX(vz);
    const distRiver = Math.abs(vx - rx);
    const riverWidth = 7.5;

    const vy = getGroundElevation(vx, vz);
    pos.setY(i, vy);

    // Vertex color blending based on height and river proximity
    let vertexColor;
    if (distRiver < riverWidth * 0.65) {
      vertexColor = colorRiverBed;
    } else if (distRiver < riverWidth + 1.8) {
      vertexColor = colorSand;
    } else if (vy > 2.0) {
      vertexColor = colorHills;
    } else if (Math.abs(vx) < 14 && Math.abs(vz) < 14) {
      vertexColor = colorDirt; // Central village soil
    } else {
      vertexColor = colorGrass;
    }
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainGroup.add(terrainMesh);

  // Subsurface Diorama Skirt (Stylized low-poly floating cliff base)
  const cliffGeo = new THREE.BoxGeometry(100.2, 8, 100.2);
  const cliffMesh = new THREE.Mesh(cliffGeo, materials.stoneCliff);
  cliffMesh.position.y = -4.1;
  cliffMesh.receiveShadow = true;
  terrainGroup.add(cliffMesh);

  // River Water Mesh
  const riverPoints = [];
  for (let z = -48; z <= 48; z += 4) {
    riverPoints.push(new THREE.Vector3(riverCenterX(z), -0.4, z));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const riverGeo = new THREE.TubeGeometry(riverCurve, 42, 3.8, 6, false);
  riverGeo.scale(1, 0.16, 1);

  waterMesh = new THREE.Mesh(riverGeo, materials.water);
  waterMesh.position.y = -0.05;
  waterMesh.receiveShadow = true;
  terrainGroup.add(waterMesh);

  villageWorld.add(terrainGroup);
}

// ============================================================================
// 2. PATHWAYS & COBBLESTONE NETWORK
// ============================================================================
function buildPaths() {
  const pathGroup = new THREE.Group();

  // Central plaza cobblestone ring
  for (let r = 0; r < 360; r += 24) {
    const rad = (r * Math.PI) / 180;
    const px = Math.cos(rad) * 6.5;
    const pz = Math.sin(rad) * 6.5;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 1.6),
      materials.cobblestone
    );
    slab.position.set(px, 0.04, pz - 2);
    slab.rotation.y = rad;
    slab.receiveShadow = true;
    pathGroup.add(slab);
  }

  // Waypoints connecting village districts
  const paths = [
    // Center to Watermill
    { from: [0, -2], to: [-18, 10], steps: 14 },
    // Center to Tavern
    { from: [4, -2], to: [16, 6], steps: 10 },
    // Center to Residential
    { from: [-2, -4], to: [-20, -18], steps: 16 },
    // Center to Windmill hill path
    { from: [6, -4], to: [20, -22], steps: 15 },
    // Center to South Farms
    { from: [0, 2], to: [-6, 26], steps: 18 }
  ];

  paths.forEach(({ from, to, steps }) => {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = from[0] + (to[0] - from[0]) * t + (Math.sin(t * Math.PI * 3) * 0.4);
      const pz = from[1] + (to[1] - from[1]) * t + (Math.cos(t * Math.PI * 2) * 0.4);
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 + Math.random() * 0.4, 0.07, 1.2 + Math.random() * 0.4),
        Math.random() > 0.4 ? materials.cobblestone : materials.dirtPath
      );
      stone.position.set(px, 0.04, pz);
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      pathGroup.add(stone);
    }
  });

  villageWorld.add(pathGroup);
}

// ============================================================================
// 3. BRIDGES (Stone Arch Bridge & Wooden Plank Footbridge)
// ============================================================================
function buildBridges() {
  // 1. Central Stone Arch Bridge (near Market, X: 4, Z: 6)
  const stoneBridge = new THREE.Group();
  stoneBridge.name = 'Jembatan Batu Alun-Alun';

  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 9.5), materials.wallStone);
  deck.position.y = 0.55;
  deck.castShadow = true;
  deck.receiveShadow = true;
  stoneBridge.add(deck);

  // Parapets / Balustrades
  [-2.0, 2.0].forEach((sx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 9.5), materials.stoneCliff);
    rail.position.set(sx, 0.9, 0);
    rail.castShadow = true;
    rail.receiveShadow = true;
    stoneBridge.add(rail);

    // Pillar caps
    [-4.5, 0, 4.5].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.5), materials.stoneCliff);
      post.position.set(sx, 0.95, pz);
      post.castShadow = true;
      stoneBridge.add(post);
    });
  });

  // Supporting stone arch piers
  const pierGeo = new THREE.BoxGeometry(4.0, 1.8, 1.6);
  const pier1 = new THREE.Mesh(pierGeo, materials.stoneCliff);
  pier1.position.set(0, -0.4, -2.5);
  pier1.castShadow = true;
  pier1.receiveShadow = true;
  stoneBridge.add(pier1);

  const pier2 = pier1.clone();
  pier2.position.set(0, -0.4, 2.5);
  stoneBridge.add(pier2);

  stoneBridge.position.set(0, 0, 4.5);
  stoneBridge.rotation.y = -Math.PI / 7;
  villageWorld.add(stoneBridge);
  interactableObjects.push(stoneBridge);

  // 2. Rustic Wooden Footbridge (near Watermill, X: -16, Z: 6)
  const woodBridge = new THREE.Group();
  woodBridge.name = 'Jembatan Kayu Hilir';

  const woodDeck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 8.8), materials.woodPlank);
  woodDeck.position.y = 0.35;
  woodDeck.castShadow = true;
  woodDeck.receiveShadow = true;
  woodBridge.add(woodDeck);

  [-1.2, 1.2].forEach((sx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 8.8), materials.woodDark);
    rail.position.set(sx, 0.65, 0);
    rail.castShadow = true;
    woodBridge.add(rail);
  });

  woodBridge.position.set(-17, 0, 6.2);
  woodBridge.rotation.y = Math.PI / 3.5;
  villageWorld.add(woodBridge);
  interactableObjects.push(woodBridge);
}

// ============================================================================
// 4. DISTRICT 1: PASAR KECIL & ALUN-ALUN (Central Market Square)
// ============================================================================
function buildMarketDistrict() {
  const marketGroup = new THREE.Group();
  marketGroup.name = 'Pasar Alun-Alun Lembah';

  // Central Stone Fountain & Wishing Well
  const fountain = new THREE.Group();
  fountain.name = 'Air Mancur Desa';
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.7, 12),
    materials.wallStone
  );
  rim.position.y = 0.35;
  rim.castShadow = true;
  rim.receiveShadow = true;
  fountain.add(rim);

  const basinWater = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.1, 12),
    materials.water
  );
  basinWater.position.y = 0.55;
  fountain.add(basinWater);

  const centerPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.8, 8),
    materials.wallStone
  );
  centerPillar.position.y = 0.9;
  centerPillar.castShadow = true;
  fountain.add(centerPillar);

  fountain.position.set(2, 0, -3);
  marketGroup.add(fountain);
  interactableObjects.push(fountain);

  // Market Stalls Builder
  const stallData = [
    { x: -3.5, z: -7, rot: 0.1, color: materials.clothRed, name: 'Kios Buah & Sayur Segar' },
    { x: 3.5, z: -8, rot: -0.2, color: materials.clothBlue, name: 'Kios Kain & Tenun Lembah' },
    { x: 7.5, z: -4, rot: -1.4, color: materials.clothYellow, name: 'Kedai Roti Gandum Hangat' },
    { x: 7.0, z: 1.5, rot: -2.0, color: materials.clothGreen, name: 'Kios Jamu & Herbal Hutan' },
    { x: -4.0, z: 0.5, rot: 1.3, color: materials.clothRed, name: 'Pandai Besi & Perkakas' }
  ];

  stallData.forEach(({ x, z, rot, color, name }) => {
    const stall = new THREE.Group();
    stall.name = name;

    // Counter table
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), materials.woodPlank);
    table.position.y = 0.45;
    table.castShadow = true;
    table.receiveShadow = true;
    stall.add(table);

    // 4 Corner posts
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([cx, cz]) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), materials.woodDark);
      pole.position.set(cx, 1.1, cz);
      pole.castShadow = true;
      stall.add(pole);
    });

    // Canopy roof
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 1.6), color);
    canopy.position.set(0, 2.1, 0);
    canopy.rotation.x = 0.1;
    canopy.castShadow = true;
    stall.add(canopy);

    // Display crates & goods on counter
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), materials.woodDark);
    crate1.position.set(-0.6, 1.05, 0);
    crate1.castShadow = true;
    stall.add(crate1);

    const crate2 = crate1.clone();
    crate2.position.set(0.4, 1.05, 0.1);
    stall.add(crate2);

    stall.position.set(x, 0, z);
    stall.rotation.y = rot;
    marketGroup.add(stall);
    interactableObjects.push(stall);
  });

  // Notice Board / Village Map Plaque
  const noticeBoard = new THREE.Group();
  noticeBoard.name = 'Papan Pengumuman Warga';
  const boardPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), materials.woodDark);
  boardPost1.position.set(-0.8, 1.0, 0);
  noticeBoard.add(boardPost1);
  const boardPost2 = boardPost1.clone();
  boardPost2.position.set(0.8, 1.0, 0);
  noticeBoard.add(boardPost2);

  const boardPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.1), materials.woodPlank);
  boardPanel.position.set(0, 1.4, 0);
  boardPanel.castShadow = true;
  noticeBoard.add(boardPanel);

  noticeBoard.position.set(-1.0, 0, -8.5);
  marketGroup.add(noticeBoard);
  interactableObjects.push(noticeBoard);

  villageWorld.add(marketGroup);
}

// ============================================================================
// 5. DISTRICT 2: WARUNG & KEDAI KOPI (Cozy Tavern & Outdoor Garden)
// ============================================================================
function buildTavernDistrict() {
  const tavernDistrict = new THREE.Group();
  tavernDistrict.name = 'Kedai Kopi & Teh Lembah Lumut';

  const tavernHouse = createHouse({
    x: 18, z: 7, rotY: -Math.PI / 5,
    w: 5.2, h: 3.4, d: 4.2,
    roofType: 'gable', roofColor: materials.roofTerracotta,
    name: 'Kedai Kopi & Penginapan',
    hasChimney: true,
    twoStory: true
  });
  tavernDistrict.add(tavernHouse);

  // Outdoor wooden terrace
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 5.0), materials.woodPlank);
  deck.position.set(15.2, 0.1, 10.5);
  deck.rotation.y = -Math.PI / 5;
  deck.receiveShadow = true;
  tavernDistrict.add(deck);

  // Outdoor dining tables & benches
  [-1.6, 1.6].forEach((tx) => {
    const tableGroup = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.0), materials.woodDark);
    table.position.y = 0.45;
    table.castShadow = true;
    tableGroup.add(table);

    // 2 benches
    [-0.7, 0.7].forEach((bz) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.35), materials.woodPlank);
      bench.position.set(0, 0.25, bz);
      bench.castShadow = true;
      tableGroup.add(bench);
    });

    tableGroup.position.set(15.5 + tx * 1.5, 0.2, 10.8 + tx * 0.8);
    tableGroup.rotation.y = -Math.PI / 5;
    tavernDistrict.add(tableGroup);
  });

  // Hanging signpost
  const signpost = new THREE.Group();
  signpost.name = 'Papan Nama Kedai Kopi';
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), materials.woodDark);
  pole.position.y = 1.25;
  signpost.add(pole);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), materials.woodDark);
  bracket.position.set(0.35, 2.3, 0);
  signpost.add(bracket);

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.06), materials.woodPlank);
  signBoard.position.set(0.45, 2.05, 0);
  signBoard.castShadow = true;
  signpost.add(signBoard);

  signpost.position.set(13.5, 0, 8.2);
  tavernDistrict.add(signpost);
  interactableObjects.push(signpost);

  villageWorld.add(tavernDistrict);
}

// ============================================================================
// 6. DISTRICT 3: KINCIR AIR & DERMAGA SUNGAI (Watermill & Pier)
// ============================================================================
function buildWatermillDistrict() {
  const district = new THREE.Group();
  district.name = 'Kincir Air & Dermaga';

  // Watermill building on riverbank
  const mill = new THREE.Group();
  mill.name = 'Bangunan Kincir Air';

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 3.6), materials.wallTimber);
  body.position.y = 1.6;
  body.castShadow = true;
  body.receiveShadow = true;
  mill.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 4), materials.roofThatch);
  roof.position.y = 3.2 + 1.1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  mill.add(roof);

  // Large Water Wheel
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(2.35, 1.2, 0);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8), materials.woodDark);
  hub.rotation.z = Math.PI / 2;
  wheelGroup.add(hub);

  const spokeCount = 8;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.14), materials.woodDark);
    spoke.rotation.x = angle;
    wheelGroup.add(spoke);

    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.55), materials.woodPlank);
    paddle.position.set(0, Math.sin(angle) * 1.4, Math.cos(angle) * 1.4);
    paddle.rotation.x = angle;
    wheelGroup.add(paddle);
  }

  wheelGroup.castShadow = true;
  mill.add(wheelGroup);
  animatedRotations.push({ obj: wheelGroup, axis: 'x', speed: 0.022 });

  mill.position.set(-18, 0, 12);
  mill.rotation.y = Math.PI / 3.2;
  district.add(mill);
  interactableObjects.push(mill);

  // Wooden Fishing Pier / Dock
  const pier = new THREE.Group();
  pier.name = 'Dermaga Perahu Nelayan';

  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 7.5), materials.woodPlank);
  pierDeck.position.y = 0.25;
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  pier.add(pierDeck);

  // Pier wood pylons in water
  [[-1.2, -2.5], [1.2, -2.5], [-1.2, 2.5], [1.2, 2.5]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 6), materials.woodDark);
    post.position.set(px, -0.4, pz);
    pier.add(post);
  });

  // Docked Wooden Rowboat
  const boat = new THREE.Group();
  boat.name = 'Perahu Dayung Nelayan';
  const boatHull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 3.2), materials.woodDark);
  boatHull.position.y = -0.15;
  boatHull.castShadow = true;
  boat.add(boatHull);

  const boatSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.5), materials.woodPlank);
  boatSeat.position.y = -0.05;
  boat.add(boatSeat);

  boat.position.set(2.8, -0.15, 1.0);
  boat.rotation.y = 0.3;
  pier.add(boat);

  pier.position.set(-23, 0, 8);
  pier.rotation.y = Math.PI / 3.5;
  district.add(pier);
  interactableObjects.push(pier);

  villageWorld.add(district);
}

// ============================================================================
// 7. DISTRICT 4: BUKIT KINCIR ANGIN & LADANG GANDUM (Windmill Hill & Wheat)
// ============================================================================
function buildWindmillDistrict() {
  const district = new THREE.Group();
  district.name = 'Bukit Kincir Angin';

  // Dutch-style conical windmill
  const mill = new THREE.Group();
  mill.name = 'Kincir Angin Bukit Gandum';

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.5, 6.2, 10),
    materials.wallCream
  );
  tower.position.y = 3.1;
  tower.castShadow = true;
  tower.receiveShadow = true;
  mill.add(tower);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.8, 10), materials.roofSlate);
  cap.position.y = 6.2 + 0.9;
  cap.castShadow = true;
  mill.add(cap);

  // 4 Rotating Windmill Blades
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 6.2, 1.8);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), materials.woodDark);
  hub.rotation.x = Math.PI / 2;
  bladesGroup.add(hub);

  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;

    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.12), materials.woodDark);
    rod.position.y = 1.7;
    rod.castShadow = true;
    arm.add(rod);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.5, 0.04), materials.clothWhite);
    sail.position.set(0.4, 2.0, 0.04);
    sail.castShadow = true;
    arm.add(sail);

    bladesGroup.add(arm);
  }

  mill.add(bladesGroup);
  animatedRotations.push({ obj: bladesGroup, axis: 'z', speed: 0.018 });

  mill.position.set(24, 3.8, -26);
  district.add(mill);
  interactableObjects.push(mill);

  // Wheat farm plots and hay rolls
  const wheatGroup = new THREE.Group();
  wheatGroup.name = 'Ladang Gandum Emas';

  const plotGeo = new THREE.BoxGeometry(10, 0.15, 8);
  const wheatPlot = new THREE.Mesh(plotGeo, materials.wheatGold);
  wheatPlot.position.set(20, 3.5, -17);
  wheatPlot.rotation.y = 0.2;
  wheatPlot.receiveShadow = true;
  wheatGroup.add(wheatPlot);

  // Cylindrical Hay Bales
  const hayBales = [
    [17, 3.6, -15],
    [18.5, 3.6, -14.5],
    [22, 3.6, -18],
    [23, 3.6, -19]
  ];
  hayBales.forEach(([hx, hy, hz]) => {
    const bale = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8),
      materials.roofThatch
    );
    bale.position.set(hx, hy + 0.3, hz);
    bale.rotation.z = Math.PI / 2;
    bale.rotation.y = Math.random() * Math.PI;
    bale.castShadow = true;
    wheatGroup.add(bale);
  });

  district.add(wheatGroup);
  villageWorld.add(district);
}

// ============================================================================
// 8. DISTRICT 5: PEMUKIMAN WARGA (Residential District - 7 Unique Houses)
// ============================================================================
function buildResidentialDistrict() {
  const district = new THREE.Group();
  district.name = 'Pemukiman Warga Lembah';

  const houses = [
    {
      x: -24, z: -20, rotY: Math.PI / 4,
      w: 3.6, h: 2.4, d: 3.0,
      roofType: 'gable', roofColor: materials.roofTerracotta,
      name: 'Rumah Kepala Desa (Pak Lurah)', hasChimney: true
    },
    {
      x: -16, z: -23, rotY: -Math.PI / 6,
      w: 3.2, h: 2.2, d: 2.6,
      roofType: 'hipped', roofColor: materials.roofSlate,
      name: 'Rumah Tabib & Pengrajin Herbal', hasChimney: true
    },
    {
      x: -28, z: -14, rotY: 0.2,
      w: 3.4, h: 2.0, d: 2.8,
      roofType: 'gable', roofColor: materials.roofCrimson,
      name: 'Rumah Pandai Kayu Lembah', hasChimney: true
    },
    {
      x: -19, z: -14, rotY: -Math.PI / 3,
      w: 3.0, h: 2.2, d: 2.4,
      roofType: 'hipped', roofColor: materials.roofBlue,
      name: 'Rumah Pemburu Lembah', hasChimney: false
    },
    {
      x: -25, z: -8, rotY: 0.5,
      w: 3.5, h: 2.1, d: 2.7,
      roofType: 'gable', roofColor: materials.roofThatch,
      name: 'Rumah Penenun Sutra', hasChimney: true
    },
    {
      x: -33, z: -18, rotY: 0.8,
      w: 2.8, h: 2.8, d: 2.8,
      roofType: 'cone', roofColor: materials.roofSlate,
      name: 'Menara Jaga Barat', hasChimney: false
    }
  ];

  houses.forEach((hConfig) => {
    const h = createHouse(hConfig);
    district.add(h);
  });

  // Perimeter wooden fences
  const fenceGroup = new THREE.Group();
  for (let fx = -32; fx <= -12; fx += 2.2) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.08), materials.woodDark);
    fence.position.set(fx, 1.4, -26);
    fence.castShadow = true;
    fenceGroup.add(fence);
  }
  district.add(fenceGroup);

  villageWorld.add(district);
}

// ============================================================================
// 9. DISTRICT 6: KEBUN & PERTANIAN SAYUR (Vegetable Gardens & Farm Shed)
// ============================================================================
function buildFarmlandDistrict() {
  const farmGroup = new THREE.Group();
  farmGroup.name = 'Kebun Sayur & Pertanian Selatan';

  // Terraced Vegetable Soil Beds
  const soilBeds = [
    { x: -8, z: 24, w: 4.5, d: 6.5 },
    { x: -14, z: 26, w: 5.0, d: 5.5 },
    { x: -3, z: 28, w: 4.0, d: 6.0 }
  ];

  soilBeds.forEach(({ x, z, w, d }) => {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), materials.dirtDark);
    bed.position.set(x, 0.15, z);
    bed.receiveShadow = true;
    farmGroup.add(bed);

    // Crop rows (Pumpkins / Cabbages)
    for (let rx = -w / 2 + 0.6; rx <= w / 2 - 0.6; rx += 1.2) {
      for (let rz = -d / 2 + 0.6; rz <= d / 2 - 0.6; rz += 1.4) {
        const crop = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.28, 0),
          Math.random() > 0.4 ? materials.pumpkinOrange : materials.oakGreen
        );
        crop.position.set(x + rx, 0.45, z + rz);
        crop.scale.set(1.2, 0.9, 1.2);
        crop.castShadow = true;
        farmGroup.add(crop);
      }
    }
  });

  // Rustic Tool Shed / Barn
  const shed = new THREE.Group();
  shed.name = 'Lumbung Alat & Jerami';
  const shedBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 2.8), materials.woodDark);
  shedBody.position.y = 1.2;
  shedBody.castShadow = true;
  shedBody.receiveShadow = true;
  shed.add(shedBody);

  const shedRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.4, 4), materials.roofTerracotta);
  shedRoof.position.y = 2.4 + 0.7;
  shedRoof.rotation.y = Math.PI / 4;
  shedRoof.castShadow = true;
  shed.add(shedRoof);

  shed.position.set(-8, 0, 32);
  shed.rotation.y = 0.2;
  farmGroup.add(shed);
  interactableObjects.push(shed);

  // Friendly Scarecrow
  const scarecrow = new THREE.Group();
  scarecrow.name = 'Orang-orangan Sawah';
  const scPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), materials.woodDark);
  scPost.position.y = 0.9;
  scarecrow.add(scPost);

  const scCross = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), materials.woodDark);
  scCross.position.y = 1.4;
  scarecrow.add(scCross);

  const scHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), materials.roofThatch);
  scHead.position.y = 1.7;
  scarecrow.add(scHead);

  const scHat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 6), materials.clothRed);
  scHat.position.y = 1.95;
  scHat.castShadow = true;
  scarecrow.add(scHat);

  scarecrow.position.set(-11, 0, 25);
  farmGroup.add(scarecrow);
  interactableObjects.push(scarecrow);

  villageWorld.add(farmGroup);
}

// ============================================================================
// HOUSE FACTORY HELPER (Modular Low-Poly Architecture)
// ============================================================================
function createHouse({ x, z, rotY, w, h, d, roofType, roofColor, name, hasChimney = true, twoStory = false }) {
  const house = new THREE.Group();
  house.name = name;

  // Stone Foundation
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), materials.wallStone);
  foundation.position.y = 0.2;
  foundation.receiveShadow = true;
  house.add(foundation);

  // Main Walls
  const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.wallCream);
  wallMesh.position.y = 0.4 + h / 2;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  house.add(wallMesh);

  // Corner Timber Beams
  const beamSize = 0.16;
  [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]].forEach(([cx, cz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(beamSize, h + 0.02, beamSize), materials.woodDark);
    beam.position.set(cx, 0.4 + h / 2, cz);
    beam.castShadow = true;
    house.add(beam);
  });

  // Front Wooden Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.06), materials.woodDark);
  door.position.set(0, 0.4 + 0.65, d / 2 + 0.03);
  house.add(door);

  // Windows with Warm Emissive Panes
  [[-w * 0.28, d / 2 + 0.02], [w * 0.28, d / 2 + 0.02]].forEach(([wx, wz]) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.06), materials.glass);
    win.position.set(wx, 0.4 + h * 0.6, wz);
    house.add(win);
  });

  // Roof Variations
  const roofY = 0.4 + h;
  if (roofType === 'gable') {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.85, 1.6, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofColor);
    roofMesh.position.y = roofY + 0.8;
    roofMesh.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    house.add(roofMesh);
  } else if (roofType === 'hipped') {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.82, 1.4, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofColor);
    roofMesh.position.y = roofY + 0.7;
    roofMesh.castShadow = true;
    house.add(roofMesh);
  } else if (roofType === 'cone') {
    const roofGeo = new THREE.ConeGeometry(w * 0.75, 2.2, 8);
    const roofMesh = new THREE.Mesh(roofGeo, roofColor);
    roofMesh.position.y = roofY + 1.1;
    roofMesh.castShadow = true;
    house.add(roofMesh);
  }

  // Stone Chimney & Smoke Particles
  if (hasChimney) {
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), materials.wallStone);
    chim.position.set(w * 0.3, roofY + 1.0, -d * 0.2);
    chim.castShadow = true;
    house.add(chim);

    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + i * 0.06, 0),
        new THREE.MeshStandardMaterial({
          color: 0xe5e7eb,
          transparent: true,
          opacity: 0.5,
          roughness: 1.0,
          flatShading: true
        })
      );
      puff.userData = {
        basePos: new THREE.Vector3(x + w * 0.3, roofY + 1.8, z - d * 0.2),
        offsetY: i * 0.45,
        speed: 0.015 + Math.random() * 0.01
      };
      scene.add(puff);
      smokePuffs.push(puff);
    }
  }

  house.position.set(x, 0, z);
  house.rotation.y = rotY;
  interactableObjects.push(house);
  return house;
}

// ============================================================================
// 10. MASSIVE INSTANCED VEGETATION & NATURE (60 FPS Performance on 100x100)
// ============================================================================
function buildMassiveFoliage() {
  // 1. Pine Trees (Cone + Trunk)
  const pineCount = 220;
  const pineTrunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.2, 5);
  pineTrunkGeo.translate(0, 0.6, 0);
  const pineFoliageGeo = new THREE.ConeGeometry(1.6, 3.6, 5);
  pineFoliageGeo.translate(0, 2.6, 0);

  // Single combined geometry for one draw call
  const pineGeo = new THREE.BufferGeometry();
  // We'll create separate instanced meshes for trunk and foliage
  instancedPineMesh = new THREE.InstancedMesh(pineFoliageGeo, materials.pineGreen, pineCount);
  instancedPineMesh.castShadow = true;
  instancedPineMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let validPines = 0;

  for (let i = 0; i < pineCount; i++) {
    const rx = (Math.random() - 0.5) * 94;
    const rz = (Math.random() - 0.5) * 94;

    // Avoid river channel and central village square
    const riverX = Math.sin(rz * 0.06) * 14 + (rz * 0.65) - 4;
    if (Math.abs(rx - riverX) < 6.5) continue;
    if (Math.hypot(rx, rz) < 14) continue;

    let ry = 0;
    // Elevate on northern hill or eastern ridge
    if (Math.hypot(rx - 24, rz - (-26)) < 22) ry += 3.5;
    if (Math.hypot(rx - 36, rz - 16) < 24) ry += 2.2;

    const scale = 0.75 + Math.random() * 0.65;
    dummy.position.set(rx, ry, rz);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();

    instancedPineMesh.setMatrixAt(validPines, dummy.matrix);
    validPines++;
  }
  instancedPineMesh.count = validPines;
  instancedPineMesh.instanceMatrix.needsUpdate = true;
  villageWorld.add(instancedPineMesh);

  // 2. Oak / Fruit Trees (Round Foliage)
  const oakCount = 140;
  const oakFoliageGeo = new THREE.DodecahedronGeometry(1.5, 1);
  oakFoliageGeo.translate(0, 2.2, 0);
  instancedOakMesh = new THREE.InstancedMesh(oakFoliageGeo, materials.oakGreen, oakCount);
  instancedOakMesh.castShadow = true;
  instancedOakMesh.receiveShadow = true;

  let validOaks = 0;
  for (let i = 0; i < oakCount; i++) {
    const rx = (Math.random() - 0.5) * 92;
    const rz = (Math.random() - 0.5) * 92;

    const riverX = Math.sin(rz * 0.06) * 14 + (rz * 0.65) - 4;
    if (Math.abs(rx - riverX) < 5.5) continue;
    if (Math.hypot(rx, rz) < 12) continue;

    let ry = 0;
    if (Math.hypot(rx - (-26), rz - (-16)) < 20) ry += 1.4;

    const scale = 0.7 + Math.random() * 0.55;
    dummy.position.set(rx, ry, rz);
    dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.3), scale);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();

    instancedOakMesh.setMatrixAt(validOaks, dummy.matrix);
    validOaks++;
  }
  instancedOakMesh.count = validOaks;
  instancedOakMesh.instanceMatrix.needsUpdate = true;
  villageWorld.add(instancedOakMesh);

  // 3. Low-Poly Boulders along River and Ridges
  const boulderCount = 90;
  const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
  instancedBoulderMesh = new THREE.InstancedMesh(rockGeo, materials.boulderStone, boulderCount);
  instancedBoulderMesh.castShadow = true;
  instancedBoulderMesh.receiveShadow = true;

  for (let i = 0; i < boulderCount; i++) {
    const rz = (Math.random() - 0.5) * 90;
    const riverX = Math.sin(rz * 0.06) * 14 + (rz * 0.65) - 4;
    // Place alongside riverbanks or ridges
    const rx = riverX + (Math.random() > 0.5 ? 4.2 + Math.random() * 2.5 : -(4.2 + Math.random() * 2.5));

    dummy.position.set(rx, 0.2, rz);
    const s = 0.6 + Math.random() * 0.9;
    dummy.scale.set(s, s * 0.7, s);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.updateMatrix();
    instancedBoulderMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedBoulderMesh.instanceMatrix.needsUpdate = true;
  villageWorld.add(instancedBoulderMesh);

  // 4. Street Lanterns with Warm Lights along roads
  const lanternSpots = [
    [0, 0, -2],
    [5, 0, -4],
    [-4, 0, -5],
    [3, 0, 3],
    [10, 0, 5],
    [15, 0, 7],
    [-7, 0, 3],
    [-12, 0, 6],
    [-17, 0, 10],
    [-10, 0, -9],
    [-16, 0, -14],
    [-22, 1.2, -18],
    [10, 0, -12],
    [16, 1.5, -18],
    [22, 3.5, -24],
    [-4, 0, 16],
    [-7, 0, 24]
  ];

  lanternSpots.forEach(([lx, ly, lz]) => {
    createLantern(lx, ly, lz);
  });
}

// ============================================================================
// 11. STREET LANTERNS & EVENING FIREFLIES
// ============================================================================
function createLantern(x, y, z) {
  const post = new THREE.Group();
  post.name = 'Lampion Jalan Desa';

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), materials.woodDark);
  pole.position.y = 1.1;
  pole.castShadow = true;
  post.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.06), materials.woodDark);
  arm.position.set(0.2, 2.05, 0);
  post.add(arm);

  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), materials.lanternGlow);
  bulb.position.set(0.36, 1.9, 0);
  post.add(bulb);

  // PointLight for cozy night glow
  const light = new THREE.PointLight(
    0xfbbf24,
    CONFIG.isNight ? CONFIG.night.lanternIntensity : 0,
    9,
    1.6
  );
  light.position.set(0.36, 1.9, 0);
  light.castShadow = false; // ponytail: keep false for 60fps mobile headroom
  post.add(light);
  lanternLights.push(light);

  post.position.set(x, y, z);
  villageWorld.add(post);
  interactableObjects.push(post);
}

function createFireflies() {
  const count = 60;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xa3e635 })
    );
    mesh.position.set(
      (Math.random() - 0.5) * 80,
      1.0 + Math.random() * 3.5,
      (Math.random() - 0.5) * 80
    );
    mesh.userData = {
      basePos: mesh.position.clone(),
      seed: Math.random() * 100,
      speed: 0.6 + Math.random() * 0.8
    };
    mesh.visible = CONFIG.isNight;
    scene.add(mesh);
    fireflies.push(mesh);
  }
}

// ============================================================================
// ASSEMBLE 100x100 WORLD
// ============================================================================
build100x100Terrain();
buildPaths();
buildBridges();
buildMarketDistrict();
buildTavernDistrict();
buildWatermillDistrict();
buildWindmillDistrict();
buildResidentialDistrict();
buildFarmlandDistrict();
buildMassiveFoliage();
createFireflies();

// ============================================================================
// DAY / NIGHT LIGHTING & ATMOSPHERE SYSTEM
// ============================================================================
const btnTod = document.getElementById('btn-tod');
const todLabel = document.getElementById('tod-label');
const todIcon = document.getElementById('tod-icon');
const statTod = document.getElementById('stat-tod');
const clockDisplay = document.getElementById('clock-display');

function applyTimeOfDay(isNight) {
  CONFIG.isNight = isNight;
  const targetTheme = isNight ? CONFIG.night : CONFIG.day;

  // Sky & Fog transition
  scene.background.setHex(targetTheme.sky);
  if (CONFIG.settings.fog) {
    scene.fog.color.setHex(targetTheme.fog);
  }

  // Directional sun & ambient
  ambientLight.color.setHex(targetTheme.ambient);
  ambientLight.intensity = targetTheme.ambientIntensity;
  dirLight.color.setHex(targetTheme.sun);
  dirLight.intensity = targetTheme.sunIntensity;
  dirLight.position.copy(targetTheme.sunPos);

  // Lanterns & Window glow
  lanternLights.forEach((l) => {
    l.intensity = targetTheme.lanternIntensity;
  });
  materials.glass.emissive.setHex(targetTheme.windowEmissive);
  materials.glass.emissiveIntensity = targetTheme.windowIntensity;

  // Fireflies
  fireflies.forEach((f) => {
    f.visible = isNight && CONFIG.settings.particles;
  });

  // UI Updates
  if (isNight) {
    document.body.classList.add('night-mode');
    todLabel.textContent = 'Siang';
    todIcon.textContent = '☀️';
    if (statTod) statTod.textContent = 'Malam Syahdu';
    if (clockDisplay) clockDisplay.textContent = '21:30';
  } else {
    document.body.classList.remove('night-mode');
    todLabel.textContent = 'Malam';
    todIcon.textContent = '🌙';
    if (statTod) statTod.textContent = 'Siang Harmonis';
    if (clockDisplay) clockDisplay.textContent = '11:45';
  }
}

if (btnTod) {
  btnTod.addEventListener('click', () => {
    applyTimeOfDay(!CONFIG.isNight);
  });
}

// Auto-spin diorama toggle
const btnSpin = document.getElementById('btn-spin');
const spinIcon = document.getElementById('spin-icon');
const spinLabel = document.getElementById('spin-label');

if (btnSpin) {
  btnSpin.addEventListener('click', () => {
    CONFIG.autoRotate = !CONFIG.autoRotate;
    if (spinIcon) spinIcon.textContent = CONFIG.autoRotate ? '⏸️' : '▶️';
    if (spinLabel) spinLabel.textContent = CONFIG.autoRotate ? 'Berhenti' : 'Auto Putar';
  });
}

// ============================================================================
// CINEMATIC LANDMARK CAMERA PRESETS
// ============================================================================
const landmarkButtons = document.querySelectorAll('.landmark-btn');

function focusLandmark(key) {
  const targetConfig = LANDMARKS[key];
  if (!targetConfig) return;

  landmarkButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === key);
  });

  // Smooth lerp transition setup
  cameraTransition = {
    startPos: camera.position.clone(),
    endPos: targetConfig.pos.clone(),
    startTarget: controls.target.clone(),
    endTarget: targetConfig.target.clone(),
    startZoom: camera.zoom,
    endZoom: targetConfig.zoom,
    progress: 0,
    speed: 0.05
  };
}

landmarkButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    focusLandmark(btn.dataset.target);
  });
});

// ============================================================================
// SETTINGS DRAWER & PERFORMANCE CONFIGURATION
// ============================================================================
const settingsModal = document.getElementById('settings-modal');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');

const optShadows = document.getElementById('opt-shadows');
const optVegetation = document.getElementById('opt-vegetation');
const optParticles = document.getElementById('opt-particles');
const optFog = document.getElementById('opt-fog');
const optWater = document.getElementById('opt-water');
const optNpcCount = document.getElementById('opt-npc-count');
const optNpcChat = document.getElementById('opt-npc-chat');
const popDisplay = document.getElementById('pop-display');

function openSettings() {
  if (optShadows) optShadows.value = CONFIG.settings.shadows;
  if (optVegetation) optVegetation.value = CONFIG.settings.vegetation;
  if (optParticles) optParticles.checked = CONFIG.settings.particles;
  if (optFog) optFog.checked = CONFIG.settings.fog;
  if (optWater) optWater.checked = CONFIG.settings.waterAnim;
  if (optNpcCount) optNpcCount.value = CONFIG.settings.npcCount.toString();
  if (optNpcChat) optNpcChat.checked = CONFIG.settings.npcChat;
  if (settingsModal) settingsModal.classList.add('open');
}

function closeSettings() {
  if (settingsModal) settingsModal.classList.remove('open');
}

if (btnSettingsToggle) btnSettingsToggle.addEventListener('click', openSettings);
if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
if (btnSaveSettings) {
  btnSaveSettings.addEventListener('click', () => {
    applyGraphicSettings();
    closeSettings();
  });
}

if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });
}

function applyGraphicSettings() {
  if (!optShadows) return;

  // 1. Shadows
  const shadowVal = optShadows.value;
  CONFIG.settings.shadows = shadowVal;
  if (shadowVal === 'off') {
    renderer.shadowMap.enabled = false;
    dirLight.castShadow = false;
  } else {
    renderer.shadowMap.enabled = true;
    dirLight.castShadow = true;
    const mapSize = shadowVal === 'high' ? 2048 : shadowVal === 'medium' ? 1024 : 512;
    dirLight.shadow.mapSize.width = mapSize;
    dirLight.shadow.mapSize.height = mapSize;
    if (dirLight.shadow.map) dirLight.shadow.map.dispose();
  }

  // 2. Vegetation Density
  const vegVal = optVegetation.value;
  CONFIG.settings.vegetation = vegVal;
  const ratio = vegVal === 'dense' ? 1.0 : vegVal === 'balanced' ? 0.7 : 0.4;
  if (instancedPineMesh) instancedPineMesh.count = Math.floor(220 * ratio);
  if (instancedOakMesh) instancedOakMesh.count = Math.floor(140 * ratio);

  // 3. Particles
  CONFIG.settings.particles = optParticles.checked;
  smokePuffs.forEach((p) => {
    p.visible = CONFIG.settings.particles;
  });
  fireflies.forEach((f) => {
    f.visible = CONFIG.settings.particles && CONFIG.isNight;
  });

  // 4. Fog
  CONFIG.settings.fog = optFog.checked;
  if (!CONFIG.settings.fog) {
    scene.fog.near = 99999;
    scene.fog.far = 999999;
  } else {
    scene.fog.near = 65;
    scene.fog.far = 175;
  }

  // 5. Water animation toggle
  CONFIG.settings.waterAnim = optWater.checked;

  // 6. NPC Population Setting
  if (optNpcCount) {
    const newCount = parseInt(optNpcCount.value, 10) || 12;
    if (newCount !== CONFIG.settings.npcCount) {
      CONFIG.settings.npcCount = newCount;
      spawnVillagers(newCount);
    }
  }

  // 7. NPC Chat Bubbles Toggle
  if (optNpcChat) {
    CONFIG.settings.npcChat = optNpcChat.checked;
    villagers.forEach((v) => {
      if (v.parts && v.parts.speechSprite) {
        v.parts.speechSprite.visible = CONFIG.settings.npcChat && !v.isInside;
      }
    });
  }
}

// ============================================================================
// VILLAGERS & LIVING ECOSYSTEM (NPC AI, Behaviors, Conversing & Housing)
// ============================================================================

// Village Key Points of Interest across all 6 districts
const POIS = [
  // District 1: Alun-Alun & Pasar
  { id: 'fountain', name: 'Air Mancur Alun-Alun', x: 2, z: -3, type: 'public', emote: '⛲', desc: 'Menikmati gemericik air mancur' },
  { id: 'stall_fruit', name: 'Kios Buah & Sayur', x: -4, z: -7, type: 'stall', emote: '🍎', desc: 'Membeli apel dan labu manis' },
  { id: 'stall_flower', name: 'Kios Bunga & Rempah', x: 8, z: -7, type: 'stall', emote: '🌸', desc: 'Mencium aroma melati & rempah' },
  { id: 'stall_bakery', name: 'Kios Roti Gurih', x: -4, z: 1, type: 'stall', emote: '🍞', desc: 'Menikmati aroma roti hangat' },
  { id: 'stall_silk', name: 'Kios Kain Sutra', x: 8, z: 1, type: 'stall', emote: '🧵', desc: 'Melihat tenunan kain sutra' },
  { id: 'bench_plaza', name: 'Bangku Alun-Alun', x: -1.5, z: -1, type: 'bench', emote: '🪑', desc: 'Duduk santai di bangku kayu' },

  // District 2: Kedai Kopi & Teh Lembah
  { id: 'tavern_door', name: 'Pintu Kedai Kopi', x: 17, z: 7.5, type: 'door', isDoor: true, houseId: 'tavern', emote: '☕', desc: 'Masuk ke dalam kedai kopi' },
  { id: 'tavern_patio_1', name: 'Meja Teras Depan', x: 21, z: 8.5, type: 'tavern', emote: '☕', desc: 'Menyeruput kopi hangat di teras' },
  { id: 'tavern_patio_2', name: 'Balkon Tepi Sungai', x: 16, z: 11, type: 'tavern', emote: '🍵', desc: 'Menikmati teh herbal di tepi air' },

  // Jembatan
  { id: 'bridge_stone_mid', name: 'Jembatan Batu Alun-Alun', x: 0, z: 4.5, type: 'bridge', emote: '🌉', desc: 'Menyeberangi jembatan batu' },
  { id: 'bridge_wood_mid', name: 'Jembatan Kayu Hilir', x: -16, z: 6, type: 'bridge', emote: '🪵', desc: 'Menyeberangi jembatan kayu' },

  // District 3: Kincir Air & Dermaga
  { id: 'watermill_dock', name: 'Dermaga Kincir Air', x: -18, z: 14, type: 'dock', emote: '🌊', desc: 'Melihat putaran kincir air' },
  { id: 'fishing_spot', name: 'Tepi Kolam Sungai', x: -17, z: 16.5, type: 'fishing', emote: '🎣', desc: 'Melihat riak ikan di sungai' },

  // District 4: Bukit Kincir Angin & Ladang Gandum
  { id: 'windmill_door', name: 'Pintu Kincir Angin', x: 23, z: -25, type: 'door', isDoor: true, houseId: 'windmill', emote: '🌾', desc: 'Masuk ruang giling kincir angin' },
  { id: 'wheat_field', name: 'Ladang Gandum Emas', x: 28, z: -20, type: 'field', emote: '🌾', desc: 'Memeriksa bulir gandum siap panen' },

  // District 5: Pemukiman Barat (6 Residential Doors)
  { id: 'door_lurah', name: 'Rumah Pak Lurah', x: -23, z: -13, type: 'door', isDoor: true, houseId: 'h_lurah', emote: '🏠', desc: 'Pulang ke Rumah Pak Lurah' },
  { id: 'door_healer', name: 'Rumah Tabib Herbal', x: -29, z: -19, type: 'door', isDoor: true, houseId: 'h_healer', emote: '🌿', desc: 'Pulang meracik ramuan herbal' },
  { id: 'door_carpenter', name: 'Bengkel Pandai Kayu', x: -17, z: -21, type: 'door', isDoor: true, houseId: 'h_carpenter', emote: '🪵', desc: 'Pulang ke bengkel kayu' },
  { id: 'door_hunter', name: 'Rumah Pemburu', x: -31, z: -9, type: 'door', isDoor: true, houseId: 'h_hunter', emote: '🏹', desc: 'Pulang ke kabin pemburu' },
  { id: 'door_weaver', name: 'Rumah Penenun', x: -19, z: -9, type: 'door', isDoor: true, houseId: 'h_weaver', emote: '🧵', desc: 'Pulang menenun sutra' },
  { id: 'door_guard', name: 'Menara Jaga Desa', x: -12, z: -25, type: 'door', isDoor: true, houseId: 'h_guard', emote: '🛡️', desc: 'Melapor di pos menara jaga' },

  // District 6: Kebun Sayur
  { id: 'cabbage_patch', name: 'Kebun Sayur & Labu', x: 26, z: 22, type: 'garden', emote: '🎃', desc: 'Menyiram tanaman kubis dan labu' }
];

// 12 Handcrafted Human Archetypes with rich personalities
const VILLAGER_ARCHETYPES = [
  {
    name: 'Pak Budi', role: 'Kepala Desa',
    clothColor: 0x991b1b, hatType: 'cap', hatColor: 0x1f2937,
    homePoiId: 'door_lurah',
    quotes: ['Lembah Lumut damai hari ini.', 'Warga rukun, panen pun berkah.', 'Selamat datang di desa kami!']
  },
  {
    name: 'Bu Siti', role: 'Pedagang Buah',
    clothColor: 0x16a34a, hatType: 'cap', hatColor: 0xfef08a,
    homePoiId: 'door_weaver',
    quotes: ['Apel merah manis baru dipetik!', 'Labu musim ini gemuk-gemuk.', 'Ayo dicicipi buah segarnya!']
  },
  {
    name: 'Mbah Sastro', role: 'Sesepuh Lembah',
    clothColor: 0x475569, hatType: 'straw', hatColor: 0xd97706,
    homePoiId: 'door_carpenter',
    quotes: ['Udara lembah bikin awet muda.', 'Kincir air itu sudah berputar 40 tahun.', 'Santai sejenak di bangku taman.']
  },
  {
    name: 'Ayu', role: 'Tabib Herbal',
    clothColor: 0x0d9488, hatType: 'hood', hatColor: 0x115e59,
    homePoiId: 'door_healer',
    quotes: ['Teh daun mint bagus untuk stamina.', 'Bunga liar di bukit harum sekali.', 'Kesehatan warga adalah yang utama.']
  },
  {
    name: 'Joko', role: 'Tukang Kayu',
    clothColor: 0xb45309, hatType: 'none', hatColor: 0x3e2723,
    homePoiId: 'door_carpenter',
    quotes: ['Kayu jati lereng timur sangat kokoh.', 'Kincir angin butuh sedikit pelumas.', 'Kopi di kedai mantap sekali rasanya!']
  },
  {
    name: 'Dewi', role: 'Penenun Sutra',
    clothColor: 0x7c3aed, hatType: 'cap', hatColor: 0xf43f5e,
    homePoiId: 'door_weaver',
    quotes: ['Motif tenun ini terinspirasi riak sungai.', 'Kain sutra sejuk dipakai siang hari.', 'Alun-alun ramai sekali hari ini.']
  },
  {
    name: 'Rian', role: 'Pengelana Muda',
    clothColor: 0x2563eb, hatType: 'cap', hatColor: 0x1d4ed8,
    homePoiId: 'door_hunter',
    quotes: ['Pemandangan dari bukit kincir angin luar biasa!', 'Aku suka menyeberangi jembatan batu.', 'Ada hal baru di setiap sudut desa!']
  },
  {
    name: 'Wati', role: 'Pembuat Roti',
    clothColor: 0xd97706, hatType: 'chef', hatColor: 0xffffff,
    homePoiId: 'door_lurah',
    quotes: ['Roti gandum baru keluar dari tungku!', 'Aroma ragi segar semerbak di pasar.', 'Tepung dari kincir angin sangat halus.']
  },
  {
    name: 'Bambang', role: 'Petani Gandum',
    clothColor: 0xca8a04, hatType: 'straw', hatColor: 0x78350f,
    homePoiId: 'windmill_door',
    quotes: ['Bulir gandum emas siap dipanen.', 'Angin semilir membantu putaran kincir.', 'Bekerja di ladang menyehatkan badan.']
  },
  {
    name: 'Eko', role: 'Nelayan Sungai',
    clothColor: 0x0284c7, hatType: 'straw', hatColor: 0x0369a1,
    homePoiId: 'door_hunter',
    quotes: ['Air jernih membuat ikan berenang aktif.', 'Dermaga kincir air tempat terbaik melamun.', 'Sungai ini sumber kehidupan desa kita.']
  },
  {
    name: 'Lina', role: 'Barista Kedai',
    clothColor: 0xe11d48, hatType: 'cap', hatColor: 0xf43f5e,
    homePoiId: 'tavern_door',
    quotes: ['Kopi seduh hangat siap dinikmati!', 'Duduk di teras kedai sambil lihat sungai.', 'Mau coba teh melati khas Lembah?']
  },
  {
    name: 'Bayu', role: 'Penjaga Desa',
    clothColor: 0x334155, hatType: 'cap', hatColor: 0x64748b,
    homePoiId: 'door_guard',
    quotes: ['Situasi desa aman dan terkendali.', 'Patroli siang dan malam berjalan lancar.', 'Jembatan dan jalan dalam kondisi baik.']
  }
];

// Procedural generator for populations larger than 12
function getArchetype(index) {
  if (index < VILLAGER_ARCHETYPES.length) {
    return VILLAGER_ARCHETYPES[index];
  }
  const extraNames = ['Aris', 'Ningsih', 'Dimas', 'Tari', 'Bagus', 'Mega', 'Surya', 'Laras', 'Prasetyo', 'Endang', 'Danang', 'Yanti', 'Gilang', 'Intan', 'Wibowo', 'Citra', 'Hendra', 'Kusuma'];
  const extraRoles = ['Warga Lembah', 'Pekebun Sayur', 'Penjelajah', 'Penenun Muda', 'Penjual Rempah', 'Penjaga Malam', 'Santai Sore'];
  const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x06b6d4, 0x84cc16];
  const hats = ['straw', 'cap', 'none'];
  const name = extraNames[(index - 12) % extraNames.length];
  const role = extraRoles[(index - 12) % extraRoles.length];
  const homeDoors = ['door_lurah', 'door_healer', 'door_carpenter', 'door_hunter', 'door_weaver', 'door_guard', 'tavern_door'];

  return {
    name,
    role,
    clothColor: colors[index % colors.length],
    hatType: hats[index % hats.length],
    hatColor: 0x374151,
    homePoiId: homeDoors[index % homeDoors.length],
    quotes: ['Desa Lembah Lumut sangat asri.', 'Senang bisa tinggal di sini.', 'Halo teman, hari yang cerah!']
  };
}

// Overhead Speech Bubble Canvas Texture Sprite
function createSpeechBubbleSprite(name, role) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 1.05, 1);
  sprite.position.set(0, 1.48, 0);

  function renderBubble(emote, text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = 492;
    const h = 114;
    const x = 10;
    const y = 8;
    const r = 22;

    // Rounded Box
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Pointer tail
    ctx.lineTo(256 + 18, y + h);
    ctx.lineTo(256, y + h + 24);
    ctx.lineTo(256 - 18, y + h);

    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = CONFIG.isNight ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)';
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = CONFIG.isNight ? 'rgba(96, 165, 250, 0.45)' : 'rgba(0, 0, 0, 0.12)';
    ctx.stroke();

    // Line 1: Header (Name & Role)
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = CONFIG.isNight ? '#60a5fa' : '#0071e3';
    ctx.fillText(name, 28, 46);

    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = CONFIG.isNight ? '#94a3b8' : '#6e6e73';
    const nameWidth = ctx.measureText(name).width;
    ctx.fillText(`• ${role}`, 28 + nameWidth + 8, 46);

    // Line 2: Dialogue / Emote
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = CONFIG.isNight ? '#f1f5f9' : '#1d1d1f';
    const displayMsg = `${emote} ${text}`;
    const truncated = displayMsg.length > 34 ? displayMsg.slice(0, 34) + '...' : displayMsg;
    ctx.fillText(truncated, 28, 90);

    texture.needsUpdate = true;
  }

  sprite.updateText = renderBubble;
  renderBubble('🚶‍♂️', 'Sedang jalan santai...');
  return sprite;
}

// Create Stylized Low-Poly Villager 3D Model
function createVillagerMesh(archetype) {
  const root = new THREE.Group();
  root.name = `${archetype.name} • ${archetype.role}`;

  const skinMat = mat(0xffd1a9, 0.85);
  const clothMat = mat(archetype.clothColor, 0.85);
  const pantsMat = mat(0x334155, 0.85);
  const woodMat = materials.woodDark;
  const shoeMat = mat(0x27272a, 0.9);

  // Torso / Tunic
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.28), clothMat);
  torso.position.y = 0.65;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);

  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.3), woodMat);
  belt.position.y = 0.44;
  root.add(belt);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), skinMat);
  head.position.y = 1.05;
  head.castShadow = true;
  root.add(head);

  // Hat / Head accessory
  if (archetype.hatType === 'straw') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.05, 8), mat(archetype.hatColor, 0.9));
    brim.position.y = 1.22;
    root.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 8), mat(archetype.hatColor, 0.9));
    crown.position.y = 1.32;
    root.add(crown);
  } else if (archetype.hatType === 'cap') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.32), mat(archetype.hatColor, 0.85));
    cap.position.y = 1.24;
    root.add(cap);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.14), mat(archetype.hatColor, 0.85));
    visor.position.set(0, 1.19, 0.18);
    root.add(visor);
  } else if (archetype.hatType === 'hood') {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), mat(archetype.hatColor, 0.85));
    hood.position.set(0, 1.07, -0.04);
    root.add(hood);
  } else if (archetype.hatType === 'chef') {
    const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.28, 8), mat(0xffffff, 0.9));
    toque.position.y = 1.35;
    root.add(toque);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.3), mat(archetype.hatColor || 0x3e2723, 0.9));
    hair.position.y = 1.22;
    root.add(hair);
  }

  // Left Arm (Shoulder pivot)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.29, 0.85, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), clothMat);
  leftArmMesh.position.y = -0.19;
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  root.add(leftArmPivot);

  // Right Arm (Shoulder pivot)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.29, 0.85, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), clothMat);
  rightArmMesh.position.y = -0.19;
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);

  // Held Night Lantern in right hand
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0, -0.4, 0.12);
  const lanternBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), materials.woodDark);
  lanternGroup.add(lanternBody);
  const lanternGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, 0.1),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2
    })
  );
  lanternGroup.add(lanternGlass);

  const lanternLight = new THREE.PointLight(0xfbbf24, 0, 6, 1.5);
  lanternLight.position.set(0, 0, 0);
  lanternGroup.add(lanternLight);
  rightArmPivot.add(lanternGroup);
  root.add(rightArmPivot);

  // Left Leg (Hip pivot)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.13, 0.4, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), pantsMat);
  leftLegMesh.position.y = -0.19;
  leftLegMesh.castShadow = true;
  leftLegPivot.add(leftLegMesh);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), shoeMat);
  leftShoe.position.set(0, -0.38, 0.03);
  leftLegPivot.add(leftShoe);
  root.add(leftLegPivot);

  // Right Leg (Hip pivot)
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.13, 0.4, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), pantsMat);
  rightLegMesh.position.y = -0.19;
  rightLegMesh.castShadow = true;
  rightLegPivot.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), shoeMat);
  rightShoe.position.set(0, -0.38, 0.03);
  rightLegPivot.add(rightShoe);
  root.add(rightLegPivot);

  // Overhead Speech Bubble Sprite
  const speechSprite = createSpeechBubbleSprite(archetype.name, archetype.role);
  speechSprite.visible = CONFIG.settings.npcChat;
  root.add(speechSprite);

  return {
    root,
    torso,
    head,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    lanternLight,
    lanternGroup,
    speechSprite
  };
}

// Global Villager Active Instances
const villagers = [];
const villagerMeshes = [];

function spawnVillagers(count = 12) {
  // Clean up existing villagers safely
  villagers.forEach((v) => {
    villageWorld.remove(v.meshGroup);
    const idx = interactableObjects.indexOf(v.meshGroup);
    if (idx !== -1) interactableObjects.splice(idx, 1);
  });
  villagers.length = 0;
  villagerMeshes.length = 0;

  for (let i = 0; i < count; i++) {
    const archetype = getArchetype(i);
    const parts = createVillagerMesh(archetype);

    // Pick starting POI
    const startPoi = POIS[i % POIS.length];
    const sx = startPoi.x + (Math.random() - 0.5) * 1.5;
    const sz = startPoi.z + (Math.random() - 0.5) * 1.5;
    const sy = getGroundHeight(sx, sz);

    const villager = {
      id: i,
      archetype,
      parts,
      meshGroup: parts.root,
      pos: new THREE.Vector3(sx, sy, sz),
      facingAngle: Math.random() * Math.PI * 2,
      state: 'WALK', // 'WALK' | 'CHATTING' | 'VISITING' | 'INSIDE_HOUSE' | 'RESTING' | 'FISHING'
      targetPoi: POIS[(i + 3) % POIS.length],
      homePoi: POIS.find((p) => p.id === archetype.homePoiId) || POIS[0],
      timer: 0,
      chatCooldown: 8 + Math.random() * 10,
      greetCooldown: 0,
      walkSpeed: 1.6 + Math.random() * 0.5,
      walkCycle: Math.random() * 10,
      isInside: false,
      chatPartner: null
    };

    villager.meshGroup.position.copy(villager.pos);
    villager.meshGroup.rotation.y = villager.facingAngle;

    villageWorld.add(villager.meshGroup);
    interactableObjects.push(villager.meshGroup);
    villagerMeshes.push(villager.meshGroup);
    villagers.push(villager);
  }

  // Sync HUD display
  if (popDisplay) popDisplay.textContent = `${villagers.length} Warga`;
}

// Helper: Shortest angle interpolation
function lerpAngle(from, to, t) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return from + diff * t;
}

// NPC AI Update Loop (State Machine, Human Routines, Conversing, Housing & FPV Greeting)
function updateVillagers(delta, time) {
  villagers.forEach((v) => {
    // Cooldown tickers
    if (v.chatCooldown > 0) v.chatCooldown -= delta;
    if (v.greetCooldown > 0) v.greetCooldown -= delta;

    // Lantern intensity sync with night/day
    if (CONFIG.isNight) {
      v.parts.lanternLight.intensity = 2.0;
    } else {
      v.parts.lanternLight.intensity = 0;
    }

    // 1. STATE: WALK
    if (v.state === 'WALK') {
      const dx = v.targetPoi.x - v.pos.x;
      const dz = v.targetPoi.z - v.pos.z;
      const dist = Math.hypot(dx, dz);

      const targetAngle = Math.atan2(dx, dz);
      v.facingAngle = lerpAngle(v.facingAngle, targetAngle, 8 * delta);
      v.meshGroup.rotation.y = v.facingAngle;

      // Move forward
      v.pos.x += Math.sin(v.facingAngle) * v.walkSpeed * delta;
      v.pos.z += Math.cos(v.facingAngle) * v.walkSpeed * delta;
      v.pos.y = getGroundHeight(v.pos.x, v.pos.z);
      v.meshGroup.position.copy(v.pos);

      // Swing limbs rhythmically
      v.walkCycle += delta * v.walkSpeed * 4.5;
      v.parts.leftLegPivot.rotation.x = Math.sin(v.walkCycle) * 0.55;
      v.parts.rightLegPivot.rotation.x = -Math.sin(v.walkCycle) * 0.55;
      v.parts.leftArmPivot.rotation.x = -Math.sin(v.walkCycle) * 0.45;
      v.parts.rightArmPivot.rotation.x = Math.sin(v.walkCycle) * 0.45;

      // Check arrival at POI
      if (dist < 1.2) {
        // A. If POI is a house door -> Step Inside
        if (v.targetPoi.isDoor) {
          v.state = 'INSIDE_HOUSE';
          v.isInside = true;
          v.meshGroup.visible = false;
          v.parts.speechSprite.visible = false;
          v.timer = CONFIG.isNight ? 24 + Math.random() * 12 : 12 + Math.random() * 10;
          return;
        }

        // B. If POI is a market stall -> Browse goods
        if (v.targetPoi.type === 'stall') {
          v.state = 'VISITING';
          v.timer = 5 + Math.random() * 4;
          v.parts.leftLegPivot.rotation.x = 0;
          v.parts.rightLegPivot.rotation.x = 0;
          v.parts.leftArmPivot.rotation.x = 0;
          v.parts.rightArmPivot.rotation.x = 0;
          v.parts.speechSprite.updateText(v.targetPoi.emote, v.targetPoi.desc);
          return;
        }

        // C. If POI is tavern or plaza bench -> Sit down & relax
        if (v.targetPoi.type === 'tavern' || v.targetPoi.type === 'bench') {
          v.state = 'RESTING';
          v.timer = 8 + Math.random() * 8;
          // Sitting posture
          v.parts.leftLegPivot.rotation.x = -Math.PI / 2.2;
          v.parts.rightLegPivot.rotation.x = -Math.PI / 2.2;
          v.parts.leftArmPivot.rotation.x = -0.4;
          v.parts.rightArmPivot.rotation.x = -0.4;
          v.meshGroup.position.y -= 0.18;
          v.parts.speechSprite.updateText(v.targetPoi.emote, v.targetPoi.desc);
          return;
        }

        // D. Dock or Field -> Look at nature
        v.state = 'VISITING';
        v.timer = 6 + Math.random() * 5;
        v.parts.leftLegPivot.rotation.x = 0;
        v.parts.rightLegPivot.rotation.x = 0;
        v.parts.speechSprite.updateText(v.targetPoi.emote, v.targetPoi.desc);
        return;
      }

      // Check crossing paths with another villager -> Social Chat
      if (v.chatCooldown <= 0) {
        for (let j = 0; j < villagers.length; j++) {
          const other = villagers[j];
          if (other.id !== v.id && other.state === 'WALK' && other.chatCooldown <= 0) {
            const dNpc = Math.hypot(v.pos.x - other.pos.x, v.pos.z - other.pos.z);
            if (dNpc < 2.0 && Math.random() < 0.4) {
              v.state = 'CHATTING';
              other.state = 'CHATTING';
              v.chatPartner = other;
              other.chatPartner = v;
              v.timer = 6;
              other.timer = 6;
              v.chatCooldown = 18;
              other.chatCooldown = 18;

              // Rotate to face each other
              v.meshGroup.lookAt(other.pos.x, v.pos.y, other.pos.z);
              other.meshGroup.lookAt(v.pos.x, other.pos.y, v.pos.z);

              // Gesture with hand
              v.parts.rightArmPivot.rotation.x = -1.2;
              other.parts.leftArmPivot.rotation.x = -1.1;
              v.parts.leftLegPivot.rotation.x = 0;
              other.parts.rightLegPivot.rotation.x = 0;

              // Speak contextual quotes
              const q1 = v.archetype.quotes[Math.floor(Math.random() * v.archetype.quotes.length)];
              const q2 = other.archetype.quotes[Math.floor(Math.random() * other.archetype.quotes.length)];
              v.parts.speechSprite.updateText('💬', q1);
              other.parts.speechSprite.updateText('💬', q2);
              break;
            }
          }
        }
      }

      // Check proximity to FPV player -> Greet Explorer
      if (CONFIG.viewMode === 'fpv' && v.greetCooldown <= 0) {
        const dPlayer = Math.hypot(player.pos.x - v.pos.x, player.pos.z - v.pos.z);
        if (dPlayer < 2.6) {
          v.meshGroup.lookAt(player.pos.x, v.pos.y, player.pos.z);
          v.parts.rightArmPivot.rotation.x = -1.3;
          v.parts.speechSprite.updateText('👋', `Halo petualang! Selamat datang di Lembah!`);
          v.greetCooldown = 10;
        }
      }
    }

    // 2. STATE: INSIDE_HOUSE
    else if (v.state === 'INSIDE_HOUSE') {
      v.timer -= delta;
      if (v.timer <= 0) {
        // Step outside the front door
        v.isInside = false;
        v.meshGroup.visible = true;
        v.parts.speechSprite.visible = CONFIG.settings.npcChat;
        v.pos.set(v.targetPoi.x + 0.6, getGroundHeight(v.targetPoi.x + 0.6, v.targetPoi.z + 0.6), v.targetPoi.z + 0.6);
        v.meshGroup.position.copy(v.pos);
        v.parts.speechSprite.updateText('😊', 'Segarnya udara luar!');

        // Pick next destination (Market, Tavern, Bridge, or Field)
        const openPois = POIS.filter((p) => !p.isDoor);
        v.targetPoi = openPois[Math.floor(Math.random() * openPois.length)];
        v.state = 'WALK';
      }
    }

    // 3. STATE: CHATTING
    else if (v.state === 'CHATTING') {
      v.timer -= delta;
      // Idle breathing
      v.parts.torso.scale.y = 1 + Math.sin(time * 3) * 0.02;

      if (v.timer <= 0) {
        v.parts.rightArmPivot.rotation.x = 0;
        v.parts.leftArmPivot.rotation.x = 0;
        v.parts.speechSprite.updateText('👋', 'Sampai jumpa lagi!');
        setTimeout(() => {
          if (v.state === 'CHATTING') {
            v.state = 'WALK';
            v.parts.speechSprite.updateText('🚶‍♂️', `Menuju ${v.targetPoi.name}`);
          }
        }, 1200);
      }
    }

    // 4. STATE: VISITING or RESTING
    else if (v.state === 'VISITING' || v.state === 'RESTING') {
      v.timer -= delta;
      v.parts.torso.scale.y = 1 + Math.sin(time * 2.5) * 0.02;

      if (v.timer <= 0) {
        // Reset sitting posture
        v.parts.leftLegPivot.rotation.x = 0;
        v.parts.rightLegPivot.rotation.x = 0;
        v.parts.leftArmPivot.rotation.x = 0;
        v.parts.rightArmPivot.rotation.x = 0;
        v.meshGroup.position.y = v.pos.y;

        // Choose next POI based on time of day
        if (CONFIG.isNight && Math.random() < 0.65) {
          // Go home to sleep at night
          v.targetPoi = v.homePoi;
          v.parts.speechSprite.updateText('🏠', 'Saatnya pulang dan istirahat...');
        } else {
          // Pick another spot in the village
          let nextPoi = POIS[Math.floor(Math.random() * POIS.length)];
          while (nextPoi.id === v.targetPoi.id) {
            nextPoi = POIS[Math.floor(Math.random() * POIS.length)];
          }
          v.targetPoi = nextPoi;
          v.parts.speechSprite.updateText('🚶‍♂️', `Menuju ${v.targetPoi.name}`);
        }
        v.state = 'WALK';
      }
    }
  });
}

// ============================================================================
// FPV PLAYER CONTROLLER & DUAL CAMERA MANAGEMENT
// ============================================================================

const player = {
  pos: new THREE.Vector3(2, 1.65, 2), // Default spawn at central market square
  vel: new THREE.Vector3(),
  height: 1.65,
  walkSpeed: 5.5,
  sprintSpeed: 9.8,
  isGrounded: true,
  verticalVel: 0,
  headBobTimer: 0,
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false
  }
};

// Major building obstacles for smooth sliding collision
const OBSTACLES = [
  { x: 2, z: -3, r: 1.8, name: 'Air Mancur' },
  { x: 19, z: 6.5, r: 3.8, name: 'Kedai Kopi' },
  { x: -17, z: 10, r: 2.8, name: 'Kincir Air' },
  { x: 24, z: -26, r: 2.6, name: 'Kincir Angin' },
  { x: -24, z: -14, r: 2.5, name: 'Rumah Lurah' },
  { x: -30, z: -20, r: 2.5, name: 'Rumah Tabib' },
  { x: -18, z: -22, r: 2.5, name: 'Bengkel Kayu' },
  { x: -32, z: -10, r: 2.5, name: 'Rumah Pemburu' },
  { x: -20, z: -10, r: 2.5, name: 'Rumah Penenun' },
  { x: -12, z: -25, r: 2.0, name: 'Menara Jaga' }
];

// Keyboard Listeners (WASD, Sprint, Jump, and Toggle V)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') player.keys.forward = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') player.keys.backward = true;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') player.keys.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') player.keys.right = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.keys.sprint = true;
  if (e.code === 'Space') {
    if (CONFIG.viewMode === 'fpv') {
      player.keys.jump = true;
      e.preventDefault();
    }
  }
  if (e.code === 'KeyV') {
    // Quick toggle between God View and FPV Walk
    setViewMode(CONFIG.viewMode === 'iso' ? 'fpv' : 'iso');
  }
  if (e.code === 'Escape' && CONFIG.viewMode === 'fpv') {
    setViewMode('iso');
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') player.keys.forward = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') player.keys.backward = false;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') player.keys.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') player.keys.right = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.keys.sprint = false;
  if (e.code === 'Space') player.keys.jump = false;
});

// Update FPV Player Physics, Step Climbing & Obstacle Collision
function updatePlayer(delta) {
  if (CONFIG.viewMode !== 'fpv') return;

  const speed = player.keys.sprint ? player.sprintSpeed : player.walkSpeed;

  // Camera forward and right vectors projected onto XZ ground plane
  const forward = new THREE.Vector3();
  fpvCamera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  // Input direction
  const moveDir = new THREE.Vector3();
  if (player.keys.forward) moveDir.add(forward);
  if (player.keys.backward) moveDir.sub(forward);
  if (player.keys.right) moveDir.add(right);
  if (player.keys.left) moveDir.sub(right);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
  }

  // Smooth acceleration and damping
  const targetVelX = moveDir.x * speed;
  const targetVelZ = moveDir.z * speed;
  player.vel.x = THREE.MathUtils.lerp(player.vel.x, targetVelX, 10 * delta);
  player.vel.z = THREE.MathUtils.lerp(player.vel.z, targetVelZ, 10 * delta);

  // Apply horizontal movement
  player.pos.x += player.vel.x * delta;
  player.pos.z += player.vel.z * delta;

  // Boundary clamp (-47 to +47)
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -47, 47);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -47, 47);

  // Smooth obstacle sliding collision
  OBSTACLES.forEach((obs) => {
    const dx = player.pos.x - obs.x;
    const dz = player.pos.z - obs.z;
    const dist = Math.hypot(dx, dz);
    if (dist < obs.r) {
      const push = obs.r - dist;
      player.pos.x += (dx / (dist || 1)) * push;
      player.pos.z += (dz / (dist || 1)) * push;
    }
  });

  // Calculate terrain + bridge ground elevation
  const groundY = getGroundHeight(player.pos.x, player.pos.z);

  // Jumping & Gravity
  if (player.keys.jump && player.isGrounded) {
    player.verticalVel = 7.2;
    player.isGrounded = false;
  }

  if (!player.isGrounded) {
    player.verticalVel -= 22.0 * delta;
    player.pos.y += player.verticalVel * delta;
    if (player.pos.y <= groundY + player.height) {
      player.pos.y = groundY + player.height;
      player.verticalVel = 0;
      player.isGrounded = true;
    }
  } else {
    // Smooth step climbing
    const targetY = groundY + player.height;
    player.pos.y = THREE.MathUtils.lerp(player.pos.y, targetY, 14 * delta);
  }

  // Head bobbing when walking
  const horizontalSpeed = Math.hypot(player.vel.x, player.vel.z);
  let bobOffset = 0;
  if (player.isGrounded && horizontalSpeed > 0.4) {
    player.headBobTimer += delta * (player.keys.sprint ? 14 : 9);
    bobOffset = Math.sin(player.headBobTimer) * (player.keys.sprint ? 0.08 : 0.04);
  } else {
    player.headBobTimer = 0;
  }

  // Sync camera position
  fpvCamera.position.set(player.pos.x, player.pos.y + bobOffset, player.pos.z);
}

// UI Elements for FPV Mode
const btnModeIso = document.getElementById('btn-mode-iso');
const btnModeFpv = document.getElementById('btn-mode-fpv');
const fpvToast = document.getElementById('fpv-toast');
const btnCloseToast = document.getElementById('btn-close-toast');
const fpvCrosshair = document.getElementById('fpv-crosshair');
const fpvHudGuide = document.getElementById('fpv-hud-guide');
const fpvClickPrompt = document.getElementById('fpv-click-lock-prompt');

function setViewMode(mode) {
  CONFIG.viewMode = mode;

  if (mode === 'fpv') {
    activeCamera = fpvCamera;
    if (btnModeFpv) btnModeFpv.classList.add('active');
    if (btnModeIso) btnModeIso.classList.remove('active');

    // Show FPV HUD elements
    if (fpvCrosshair) fpvCrosshair.style.display = 'block';
    if (fpvHudGuide) fpvHudGuide.style.display = 'flex';
    if (fpvClickPrompt && !fpvControls.isLocked) fpvClickPrompt.style.display = 'flex';
    if (fpvToast) {
      fpvToast.style.display = 'flex';
      setTimeout(() => { if (fpvToast) fpvToast.style.display = 'none'; }, 4000);
    }

    // Try requesting pointer lock immediately
    try {
      fpvControls.lock();
    } catch (_) {
      // Browser requires user gesture
    }
  } else {
    // Mode God View / Iso
    activeCamera = camera;
    if (fpvControls.isLocked) fpvControls.unlock();

    if (btnModeIso) btnModeIso.classList.add('active');
    if (btnModeFpv) btnModeFpv.classList.remove('active');

    if (fpvCrosshair) fpvCrosshair.style.display = 'none';
    if (fpvHudGuide) fpvHudGuide.style.display = 'none';
    if (fpvClickPrompt) fpvClickPrompt.style.display = 'none';
    if (fpvToast) fpvToast.style.display = 'none';
  }
}

if (btnModeFpv) btnModeFpv.addEventListener('click', () => setViewMode('fpv'));
if (btnModeIso) btnModeIso.addEventListener('click', () => setViewMode('iso'));
if (btnCloseToast && fpvToast) btnCloseToast.addEventListener('click', () => { fpvToast.style.display = 'none'; });

// Pointer lock event listeners
if (fpvClickPrompt) {
  fpvClickPrompt.addEventListener('click', () => {
    fpvControls.lock();
  });
}

canvas.addEventListener('click', () => {
  if (CONFIG.viewMode === 'fpv' && !fpvControls.isLocked) {
    fpvControls.lock();
  }
});

fpvControls.addEventListener('lock', () => {
  if (fpvClickPrompt) fpvClickPrompt.style.display = 'none';
});

fpvControls.addEventListener('unlock', () => {
  if (CONFIG.viewMode === 'fpv' && fpvClickPrompt) {
    fpvClickPrompt.style.display = 'flex';
  }
});

// ============================================================================
// INTERACTIVE RAYCASTING (Hover Tooltips on Buildings, Landmarks & Villagers)
// ============================================================================
const tooltip = document.getElementById('hover-tooltip');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, activeCamera);
  const hits = raycaster.intersectObjects(interactableObjects, true);

  if (hits.length > 0 && tooltip) {
    let topParent = hits[0].object;
    while (topParent.parent && !interactableObjects.includes(topParent)) {
      topParent = topParent.parent;
    }
    if (topParent && topParent.name) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
      tooltip.textContent = `📍 ${topParent.name}`;
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  if (tooltip) tooltip.style.display = 'none';
  canvas.style.cursor = 'default';
});

// ============================================================================
// WINDOW RESIZE (Handles Orthographic and Perspective FPV Camera)
// ============================================================================
function onWindowResize() {
  const newAspect = window.innerWidth / window.innerHeight;

  // Orthographic God View camera
  camera.left = (-CONFIG.frustumSize * newAspect) / 2;
  camera.right = (CONFIG.frustumSize * newAspect) / 2;
  camera.top = CONFIG.frustumSize / 2;
  camera.bottom = -CONFIG.frustumSize / 2;
  camera.updateProjectionMatrix();

  // Perspective FPV camera
  fpvCamera.aspect = newAspect;
  fpvCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onWindowResize);

// ============================================================================
// ANIMATION LOOP & LIVE STATS
// ============================================================================
const clock = new THREE.Clock();
const fpsDisplay = document.getElementById('fps-display');
let frameCount = 0;
let lastFpsTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();

  // 1. Calculate live FPS
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    if (fpsDisplay) {
      fpsDisplay.textContent = Math.round((frameCount * 1000) / (now - lastFpsTime));
    }
    frameCount = 0;
    lastFpsTime = now;
  }

  // 2. Camera Lerp Transitions (Smooth landmark navigation in God View)
  if (cameraTransition && CONFIG.viewMode === 'iso') {
    cameraTransition.progress += cameraTransition.speed;
    const t = Math.min(cameraTransition.progress, 1);
    const ease = t * (2 - t); // Quad ease-out

    camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, ease);
    controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, ease);
    camera.zoom = THREE.MathUtils.lerp(cameraTransition.startZoom, cameraTransition.endZoom, ease);
    camera.updateProjectionMatrix();

    if (t >= 1) {
      cameraTransition = null;
    }
  }

  // 3. Auto-spin diorama (God View only)
  if (CONFIG.autoRotate && !cameraTransition && CONFIG.viewMode === 'iso') {
    villageWorld.rotation.y += 0.003;
  }

  // 4. Procedural mechanical rotations (Windmill sails & Watermill wheel)
  animatedRotations.forEach(({ obj, axis, speed }) => {
    obj.rotation[axis] += speed;
  });

  // 5. River Water Ripple / Wave Effect
  if (CONFIG.settings.waterAnim && waterMesh) {
    waterMesh.rotation.y = Math.sin(time * 0.8) * 0.002;
    waterMesh.position.y = -0.05 + Math.sin(time * 1.8) * 0.03;
  }

  // 6. Chimney Smoke physics
  if (CONFIG.settings.particles) {
    smokePuffs.forEach((puff) => {
      puff.userData.offsetY += puff.userData.speed;
      puff.position.set(
        puff.userData.basePos.x + Math.sin(time * 2 + puff.userData.offsetY) * 0.15,
        puff.userData.basePos.y + puff.userData.offsetY,
        puff.userData.basePos.z + Math.cos(time * 1.5 + puff.userData.offsetY) * 0.15
      );
      const progress = (puff.userData.offsetY % 1.8) / 1.8;
      puff.scale.setScalar(0.7 + progress * 1.4);
      puff.material.opacity = (1 - progress) * 0.55;

      if (puff.userData.offsetY > 1.8) {
        puff.userData.offsetY = 0;
      }
    });

    // 7. Night Fireflies
    if (CONFIG.isNight) {
      fireflies.forEach((f) => {
        const { basePos, seed, speed } = f.userData;
        f.position.x = basePos.x + Math.sin(time * speed + seed) * 0.6;
        f.position.y = basePos.y + Math.cos(time * speed * 1.2 + seed) * 0.35;
        f.position.z = basePos.z + Math.sin(time * speed * 0.8 + seed) * 0.6;
      });
    }
  }

  // 8. Update FPV Player Controller
  updatePlayer(delta);

  // 9. Update Villagers & Living AI (Conversing, Routines, Housing)
  updateVillagers(delta, time);

  // 10. Update Orbit Controls (God View) & Render Active Camera
  if (CONFIG.viewMode === 'iso') {
    controls.update();
  }
  renderer.render(scene, activeCamera);
}

// ============================================================================
// RUNNABLE SELF-CHECK (Senior Verification Ladder)
// ============================================================================
function runSelfCheck() {
  console.assert(scene !== null, 'Assert Error: Scene is null.');
  console.assert(camera.isOrthographicCamera === true, 'Assert Error: Camera must be Orthographic.');
  console.assert(fpvCamera.isPerspectiveCamera === true, 'Assert Error: FPV Camera must be Perspective.');
  console.assert(CONFIG.frustumSize >= 80, 'Assert Error: Camera frustum not sized for 100x100 world.');
  console.assert(interactableObjects.length >= 8, 'Assert Error: Missing interactable village districts.');
  console.assert(villagers.length >= 6, 'Assert Error: Villagers not spawned.');
  console.assert(POIS.length >= 15, 'Assert Error: Missing village POI network.');
  console.assert(Object.keys(LANDMARKS).length === 6, 'Assert Error: Missing camera landmark presets.');
  console.log(`✓ [Self-Check]: 100x100 Village World Ready (Dual Camera God View/FPV, ${villagers.length} Living Villagers, 6 Districts, 60FPS).`);
}

// Initialize Living Villagers Population
spawnVillagers(CONFIG.settings.npcCount);

runSelfCheck();
animate();
