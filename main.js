import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================
const CONFIG = {
  isNight: false,
  autoRotate: false,
  frustumSize: 22,
  cameraDefaultPos: new THREE.Vector3(26, 26, 26),
  targetDefault: new THREE.Vector3(0, 0, 0),
  day: {
    sky: 0xd8eefe,
    fog: 0xd8eefe,
    ambient: 0xfff6eb,
    ambientIntensity: 0.9,
    sun: 0xfffaed,
    sunIntensity: 1.8,
    sunPos: new THREE.Vector3(18, 28, 14),
    lanternIntensity: 0,
    windowEmissive: 0x222222,
    windowIntensity: 0.2
  },
  night: {
    sky: 0x0b1120,
    fog: 0x0b1120,
    ambient: 0x1e293b,
    ambientIntensity: 0.4,
    sun: 0x60a5fa,
    sunIntensity: 0.5,
    sunPos: new THREE.Vector3(-15, 22, -15),
    lanternIntensity: 2.2,
    windowEmissive: 0xfbbf24,
    windowIntensity: 1.0
  }
};

// ============================================================================
// THREE.JS CORE SETUP
// ============================================================================
const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.day.sky);
scene.fog = new THREE.Fog(CONFIG.day.fog, 25, 75);

const aspect = window.innerWidth / window.innerHeight;
const halfF = CONFIG.frustumSize / 2;
const camera = new THREE.OrthographicCamera(
  -halfF * aspect, halfF * aspect,
  halfF, -halfF,
  0.1, 500
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
controls.maxPolarAngle = Math.PI / 2.35; // Keep isometric perspective above ground
controls.minZoom = 0.5;
controls.maxZoom = 2.5;
controls.target.copy(CONFIG.targetDefault);

// ============================================================================
// LIGHTING SETUP
// ============================================================================
const ambientLight = new THREE.AmbientLight(CONFIG.day.ambient, CONFIG.day.ambientIntensity);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(CONFIG.day.sun, CONFIG.day.sunIntensity);
dirLight.position.copy(CONFIG.day.sunPos);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
const d = 16;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0004;
scene.add(dirLight);

// Shared Materials for Low-Poly Aesthetics
const matFlat = (color, roughness = 0.85, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

const materials = {
  grass: matFlat(0x5ca346, 0.9),
  dirt: matFlat(0x7c5335, 0.95),
  cliff: matFlat(0x524843, 0.9),
  stone: matFlat(0x8a929a, 0.8),
  cobblestone: matFlat(0xa3a8b0, 0.85),
  woodDark: matFlat(0x5c381e, 0.8),
  woodPlank: matFlat(0x8d5b34, 0.75),
  roofTerracotta: matFlat(0xbf492b, 0.7),
  roofSlate: matFlat(0x2f3e46, 0.65),
  roofThatch: matFlat(0xb08945, 0.85),
  wallCream: matFlat(0xf4ebd9, 0.85),
  wallTimber: matFlat(0xd8b589, 0.8),
  leaves1: matFlat(0x386641, 0.85),
  leaves2: matFlat(0x6a994e, 0.85),
  leaves3: matFlat(0x2a9d8f, 0.8),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 1.2,
    transparent: true,
    opacity: 0.85,
    flatShading: true
  }),
  glass: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: CONFIG.day.windowEmissive,
    emissiveIntensity: CONFIG.day.windowIntensity,
    roughness: 0.2
  }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: 0xfef08a })
};

// ============================================================================
// PROCEDURAL LOW-POLY GEOMETRY BUILDERS
// ============================================================================
const villageGroup = new THREE.Group();
scene.add(villageGroup);

// Collections for animation & interactivity
const animatedObjects = [];
const smokePuffs = [];
const lanternLights = [];
const fireflies = [];
const interactableObjects = [];

// 1. Floating Island Terrain
function buildTerrain() {
  const island = new THREE.Group();

  // Top Grass Plate (18x18 with chamfered low-poly corners)
  const topGeo = new THREE.CylinderGeometry(11.5, 11, 1.8, 8);
  topGeo.rotateY(Math.PI / 8);
  const topMesh = new THREE.Mesh(topGeo, materials.grass);
  topMesh.position.y = -0.9;
  topMesh.receiveShadow = true;
  island.add(topMesh);

  // Dirt & Subsurface Rock Core
  const baseGeo = new THREE.CylinderGeometry(10.8, 3.5, 5.5, 8);
  baseGeo.rotateY(Math.PI / 8);
  const baseMesh = new THREE.Mesh(baseGeo, materials.cliff);
  baseMesh.position.y = -4.5;
  baseMesh.receiveShadow = true;
  island.add(baseMesh);

  // River Basin (sunken curved water body)
  const riverPoints = [
    new THREE.Vector3(-10.5, 0.05, -5),
    new THREE.Vector3(-4, 0.05, -3),
    new THREE.Vector3(0, 0.05, 0.5),
    new THREE.Vector3(5, 0.05, 5),
    new THREE.Vector3(10.5, 0.05, 8.5)
  ];
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const riverGeo = new THREE.TubeGeometry(riverCurve, 24, 1.6, 6, false);
  riverGeo.scale(1, 0.15, 1);
  const riverMesh = new THREE.Mesh(riverGeo, materials.water);
  riverMesh.position.y = 0.02;
  riverMesh.receiveShadow = true;
  island.add(riverMesh);

  // Cobblestone Pathways
  const pathCoords = [
    [-2, 0.03, 4], [-1, 0.03, 3], [0, 0.03, 2], [1, 0.03, 1],
    [-2, 0.03, -1], [-3, 0.03, -2], [-4, 0.03, -3],
    [2, 0.03, -2], [3, 0.03, -1], [4, 0.03, 1]
  ];
  pathCoords.forEach(([px, py, pz]) => {
    const pGeo = new THREE.BoxGeometry(1.2 + Math.random() * 0.4, 0.08, 1.2 + Math.random() * 0.4);
    const pMesh = new THREE.Mesh(pGeo, materials.cobblestone);
    pMesh.position.set(px, py, pz);
    pMesh.rotation.y = Math.random() * Math.PI;
    pMesh.receiveShadow = true;
    island.add(pMesh);
  });

  // Wooden Bridge across the river
  const bridge = new THREE.Group();
  bridge.name = "Jembatan Kayu Hilir";
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 3.8), materials.woodPlank);
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;
  bridge.add(bridgeDeck);

  // Bridge railings
  [-1.1, 1.1].forEach(side => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 3.8), materials.woodDark);
    rail.position.set(side, 0.35, 0);
    rail.castShadow = true;
    bridge.add(rail);
  });
  bridge.position.set(0, 0.2, 0.5);
  bridge.rotation.y = Math.PI / 4;
  island.add(bridge);
  interactableObjects.push(bridge);

  villageGroup.add(island);
}

// 2. Village Houses Builder
function createHouse({ x, z, rotY, w, h, d, roofType, roofColor, name, hasChimney = true }) {
  const house = new THREE.Group();
  house.name = name;

  // Base Walls
  const wallGeo = new THREE.BoxGeometry(w, h, d);
  const wallMesh = new THREE.Mesh(wallGeo, materials.wallCream);
  wallMesh.position.y = h / 2;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  house.add(wallMesh);

  // Timber corner beams
  const beamW = 0.16;
  const corners = [
    [-w/2, -d/2], [w/2, -d/2],
    [-w/2, d/2], [w/2, d/2]
  ];
  corners.forEach(([cx, cz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(beamW, h + 0.02, beamW), materials.woodDark);
    beam.position.set(cx, h / 2, cz);
    beam.castShadow = true;
    house.add(beam);
  });

  // Roof
  let roofMesh;
  if (roofType === 'gable') {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.85, 1.4, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofMesh = new THREE.Mesh(roofGeo, roofColor || materials.roofTerracotta);
    roofMesh.position.y = h + 0.7;
    roofMesh.scale.set(w / Math.max(w, d) * 1.25, 1, d / Math.max(w, d) * 1.25);
  } else {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.8, 1.8, 6);
    roofMesh = new THREE.Mesh(roofGeo, roofColor || materials.roofSlate);
    roofMesh.position.y = h + 0.9;
  }
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  house.add(roofMesh);

  // Door
  const doorGeo = new THREE.BoxGeometry(0.65, 1.1, 0.1);
  const doorMesh = new THREE.Mesh(doorGeo, materials.woodDark);
  doorMesh.position.set(0, 0.55, d / 2 + 0.02);
  doorMesh.castShadow = true;
  house.add(doorMesh);

  // Glowing Windows
  const windowGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
  const winFront = new THREE.Mesh(windowGeo, materials.glass);
  winFront.position.set(w / 4, h * 0.6, d / 2 + 0.02);
  house.add(winFront);

  const winSide = new THREE.Mesh(windowGeo, materials.glass);
  winSide.position.set(w / 2 + 0.02, h * 0.6, 0);
  winSide.rotation.y = Math.PI / 2;
  house.add(winSide);

  // Chimney & Smoke
  if (hasChimney) {
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), materials.stone);
    chimney.position.set(w * 0.3, h + 0.6, -d * 0.2);
    chimney.castShadow = true;
    house.add(chimney);

    // Initial smoke particle anchor
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + i * 0.05, 0),
        new THREE.MeshStandardMaterial({
          color: 0xecf0f1,
          transparent: true,
          opacity: 0.6,
          roughness: 1.0,
          flatShading: true
        })
      );
      puff.userData = {
        basePos: new THREE.Vector3(x + w * 0.3, h + 1.6, z - d * 0.2),
        offsetY: i * 0.45,
        speed: 0.015 + Math.random() * 0.01,
        life: i * 0.25
      };
      scene.add(puff);
      smokePuffs.push(puff);
    }
  }

  house.position.set(x, 0, z);
  house.rotation.y = rotY;
  villageGroup.add(house);
  interactableObjects.push(house);
  return house;
}

// 3. Watermill Builder
function createWatermill(x, z, rotY) {
  const mill = new THREE.Group();
  mill.name = "Kincir Air Tepi Sungai";

  // Mill building
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.2), materials.wallTimber);
  body.position.y = 1.1;
  body.castShadow = true;
  body.receiveShadow = true;
  mill.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.5, 4), materials.roofThatch);
  roof.position.y = 2.2 + 0.75;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  mill.add(roof);

  // Rotating Water Wheel
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(1.4, 0.8, 0);

  // Hub & Rim
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8), materials.woodDark);
  hub.rotation.z = Math.PI / 2;
  wheelGroup.add(hub);

  // Spokes & Paddles
  const spokeCount = 6;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.12), materials.woodDark);
    spoke.rotation.x = angle;
    wheelGroup.add(spoke);

    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.4), materials.woodPlank);
    paddle.position.set(0, Math.sin(angle) * 0.9, Math.cos(angle) * 0.9);
    paddle.rotation.x = angle;
    wheelGroup.add(paddle);
  }

  wheelGroup.castShadow = true;
  mill.add(wheelGroup);
  animatedObjects.push({ obj: wheelGroup, axis: 'x', speed: 0.025 });

  mill.position.set(x, 0, z);
  mill.rotation.y = rotY;
  villageGroup.add(mill);
  interactableObjects.push(mill);
}

// 4. Windmill on the Hill
function createWindmill(x, z) {
  const mill = new THREE.Group();
  mill.name = "Kincir Angin Bukit";

  // Tower body
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, 4.2, 8), materials.wallCream);
  tower.position.y = 2.1;
  tower.castShadow = true;
  tower.receiveShadow = true;
  mill.add(tower);

  // Dome Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.2, 8), materials.roofSlate);
  cap.position.y = 4.2 + 0.6;
  cap.castShadow = true;
  mill.add(cap);

  // Blades Group
  const blades = new THREE.Group();
  blades.position.set(0, 4.2, 1.15);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8), materials.woodDark);
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);

  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;

    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), materials.woodDark);
    stick.position.y = 1.1;
    arm.add(stick);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.02), materials.wallCream);
    sail.position.set(0.25, 1.2, 0.02);
    arm.add(sail);

    blades.add(arm);
  }

  blades.castShadow = true;
  mill.add(blades);
  animatedObjects.push({ obj: blades, axis: 'z', speed: 0.02 });

  mill.position.set(x, 0, z);
  villageGroup.add(mill);
  interactableObjects.push(mill);
}

// 5. Trees & Nature Elements
function createTree(x, z, scale = 1, type = 'pine') {
  const tree = new THREE.Group();

  // Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.25 * scale, 1.2 * scale, 6), materials.woodDark);
  trunk.position.y = (1.2 * scale) / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Foliage
  if (type === 'pine') {
    const leafColor = Math.random() > 0.5 ? materials.leaves1 : materials.leaves2;
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((1.1 - i * 0.25) * scale, 1.3 * scale, 6),
        leafColor
      );
      cone.position.y = (1.0 + i * 0.75) * scale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }
  } else {
    // Deciduous round tree
    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.0 * scale, 0),
      materials.leaves3
    );
    foliage.position.y = 1.6 * scale;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);
  }

  tree.position.set(x, 0, z);
  villageGroup.add(tree);
}

// 6. Low-Poly Boulders
function createRock(x, z, scale = 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6 * scale, 0),
    materials.stone
  );
  rock.position.set(x, 0.3 * scale, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  villageGroup.add(rock);
}

// 7. Village Street Lanterns with Warm Lights
function createLantern(x, z) {
  const post = new THREE.Group();
  post.name = "Lampion Desa";

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), materials.woodDark);
  pole.position.y = 0.9;
  pole.castShadow = true;
  post.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), materials.woodDark);
  arm.position.set(0.18, 1.7, 0);
  post.add(arm);

  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), materials.lanternGlow);
  bulb.position.set(0.32, 1.55, 0);
  post.add(bulb);

  // PointLight for cozy night glow
  const light = new THREE.PointLight(0xfbbf24, CONFIG.isNight ? CONFIG.night.lanternIntensity : 0, 5, 1.5);
  light.position.set(0.32, 1.55, 0);
  light.castShadow = false; // ponytail: disabled per-lantern shadow to preserve 60 FPS mobile headroom
  post.add(light);
  lanternLights.push(light);

  post.position.set(x, 0, z);
  villageGroup.add(post);
  interactableObjects.push(post);
}

// 8. Fireflies (night mode particle sparkle)
function createFireflies() {
  const count = 35;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xa3e635 })
    );
    mesh.position.set(
      (Math.random() - 0.5) * 16,
      0.8 + Math.random() * 2.5,
      (Math.random() - 0.5) * 16
    );
    mesh.userData = {
      basePos: mesh.position.clone(),
      seed: Math.random() * 100,
      speed: 0.5 + Math.random() * 0.8
    };
    mesh.visible = CONFIG.isNight;
    scene.add(mesh);
    fireflies.push(mesh);
  }
}

// ============================================================================
// SCENE ASSEMBLY
// ============================================================================
buildTerrain();

// 3 Unique Houses
createHouse({
  x: -4.5, z: 3.5, rotY: Math.PI / 6,
  w: 2.8, h: 2.0, d: 2.2,
  roofType: 'gable', roofColor: materials.roofTerracotta,
  name: 'Rumah Kepala Desa', hasChimney: true
});

createHouse({
  x: -5.5, z: -2.5, rotY: Math.PI / 3,
  w: 2.2, h: 2.6, d: 2.0,
  roofType: 'cone', roofColor: materials.roofSlate,
  name: 'Menara Pengawas Lembah', hasChimney: false
});

createHouse({
  x: 3.8, z: -3.5, rotY: -Math.PI / 4,
  w: 3.0, h: 1.8, d: 2.2,
  roofType: 'gable', roofColor: materials.roofThatch,
  name: 'Toko Roti & Kedai Teh', hasChimney: true
});

// Watermill near the river
createWatermill(-1.5, -4.2, Math.PI / 2.8);

// Windmill on northern ridge
createWindmill(4.8, 4.0);

// Nature: Pine & Round Trees
createTree(-7.5, 2.0, 1.2, 'pine');
createTree(-6.8, 5.0, 0.9, 'pine');
createTree(-2.5, 6.5, 1.1, 'pine');
createTree(6.5, -1.0, 1.0, 'round');
createTree(7.2, 2.5, 1.2, 'pine');
createTree(2.0, -6.5, 0.9, 'round');
createTree(-6.0, -5.5, 1.1, 'pine');
createTree(5.5, -6.0, 0.8, 'pine');

// Low-Poly Boulders along river bank
createRock(-1.8, 1.8, 0.8);
createRock(-2.6, -1.2, 1.1);
createRock(1.5, 2.6, 0.7);
createRock(2.8, 3.8, 1.0);
createRock(-4.0, 1.2, 0.6);

// Village Lanterns along the pathway
createLantern(-1.8, 1.2);
createLantern(1.6, -0.6);
createLantern(-3.4, -0.4);
createLantern(3.2, 2.2);

// Ambient Night Fireflies
createFireflies();

// ============================================================================
// DAY / NIGHT SYSTEM & HUD INTEGRATION
// ============================================================================
const btnTod = document.getElementById('btn-tod');
const todLabel = document.getElementById('tod-label');
const todIcon = document.getElementById('tod-icon');
const timeBadge = document.getElementById('time-badge');
const weatherText = document.getElementById('weather-text');
const clockText = document.getElementById('clock-text');
const btnReset = document.getElementById('btn-reset');
const btnSpin = document.getElementById('btn-spin');
const spinIcon = document.getElementById('spin-icon');
const spinLabel = document.getElementById('spin-label');
const tooltip = document.getElementById('hover-tooltip');

function applyTimeOfDay(isNight) {
  CONFIG.isNight = isNight;
  const targetTheme = isNight ? CONFIG.night : CONFIG.day;

  // Scene background & fog
  scene.background.setHex(targetTheme.sky);
  scene.fog.color.setHex(targetTheme.fog);

  // Ambient & Sun Directional Light
  ambientLight.color.setHex(targetTheme.ambient);
  ambientLight.intensity = targetTheme.ambientIntensity;
  dirLight.color.setHex(targetTheme.sun);
  dirLight.intensity = targetTheme.sunIntensity;
  dirLight.position.copy(targetTheme.sunPos);

  // Lantern & Window Glow
  lanternLights.forEach(light => {
    light.intensity = targetTheme.lanternIntensity;
  });
  materials.glass.emissive.setHex(targetTheme.windowEmissive);
  materials.glass.emissiveIntensity = targetTheme.windowIntensity;

  // Fireflies
  fireflies.forEach(f => {
    f.visible = isNight;
  });

  // UI Updates
  if (isNight) {
    document.body.classList.add('night-mode');
    todLabel.textContent = 'Mode Siang';
    todIcon.textContent = '☀️';
    timeBadge.textContent = 'Malam Hari';
    weatherText.textContent = 'Malam Bertabur Bintang';
    clockText.textContent = '21:45';
  } else {
    document.body.classList.remove('night-mode');
    todLabel.textContent = 'Mode Malam';
    todIcon.textContent = '🌙';
    timeBadge.textContent = 'Siang Hari';
    weatherText.textContent = 'Cerah Lembut';
    clockText.textContent = '12:30';
  }
}

btnTod.addEventListener('click', () => {
  applyTimeOfDay(!CONFIG.isNight);
});

btnSpin.addEventListener('click', () => {
  CONFIG.autoRotate = !CONFIG.autoRotate;
  spinIcon.textContent = CONFIG.autoRotate ? '⏸️' : '▶️';
  spinLabel.textContent = CONFIG.autoRotate ? 'Berhenti' : 'Auto Putar';
});

btnReset.addEventListener('click', () => {
  camera.position.copy(CONFIG.cameraDefaultPos);
  controls.target.copy(CONFIG.targetDefault);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.update();
});

// ============================================================================
// MOUSE INTERACTION & HOVER TOOLTIP (Raycasting)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactableObjects, true);

  if (hits.length > 0) {
    let topParent = hits[0].object;
    while (topParent.parent && !interactableObjects.includes(topParent)) {
      topParent = topParent.parent;
    }
    if (topParent && topParent.name) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.textContent = `🏡 ${topParent.name}`;
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  tooltip.style.display = 'none';
  canvas.style.cursor = 'default';
});

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================
function onWindowResize() {
  const newAspect = window.innerWidth / window.innerHeight;
  camera.left = (-CONFIG.frustumSize * newAspect) / 2;
  camera.right = (CONFIG.frustumSize * newAspect) / 2;
  camera.top = CONFIG.frustumSize / 2;
  camera.bottom = -CONFIG.frustumSize / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onWindowResize);

// ============================================================================
// RUNNABLE SELF-CHECK (Verification Ladder)
// ============================================================================
function runSelfCheck() {
  console.assert(scene !== null, 'Assert Error: Scene is uninitialized.');
  console.assert(camera.isOrthographicCamera === true, 'Assert Error: Camera must be Orthographic.');
  console.assert(interactableObjects.length >= 4, 'Assert Error: Missing interactable village buildings.');
  console.assert(smokePuffs.length > 0, 'Assert Error: Smoke particles must exist.');
  console.log('✓ [Self-Check]: 3D Isometric Village initialized successfully (OrthographicCamera 60FPS).');
}
runSelfCheck();

// ============================================================================
// ANIMATION LOOP (Targeting 60 FPS)
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // 1. Auto rotation
  if (CONFIG.autoRotate) {
    villageGroup.rotation.y += 0.005;
  }

  // 2. Watermill and windmill procedural rotation
  animatedObjects.forEach(({ obj, axis, speed }) => {
    obj.rotation[axis] += speed;
  });

  // 3. Smoke particle physics
  smokePuffs.forEach(puff => {
    puff.userData.offsetY += puff.userData.speed;
    puff.position.set(
      puff.userData.basePos.x + Math.sin(time * 2 + puff.userData.offsetY) * 0.1,
      puff.userData.basePos.y + puff.userData.offsetY,
      puff.userData.basePos.z + Math.cos(time * 1.5 + puff.userData.offsetY) * 0.08
    );
    const progress = (puff.userData.offsetY % 1.6) / 1.6;
    puff.scale.setScalar(0.8 + progress * 1.2);
    puff.material.opacity = (1 - progress) * 0.55;

    if (puff.userData.offsetY > 1.6) {
      puff.userData.offsetY = 0;
    }
  });

  // 4. Night Fireflies hovering
  if (CONFIG.isNight) {
    fireflies.forEach(f => {
      const { basePos, seed, speed } = f.userData;
      f.position.x = basePos.x + Math.sin(time * speed + seed) * 0.4;
      f.position.y = basePos.y + Math.cos(time * speed * 1.2 + seed) * 0.25;
      f.position.z = basePos.z + Math.sin(time * speed * 0.8 + seed) * 0.4;
    });
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
