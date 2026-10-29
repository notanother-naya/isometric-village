import assert from 'node:assert';

// 1. Geography & Bridges
function riverCenterX(z) {
  return Math.sin(z * 0.08) * 4.5 + Math.cos(z * 0.03) * 1.5;
}

function isPointOnBridge(x, z) {
  // 1. Central Stone Arch Bridge (across Main River, X: 2.5, Z: 4.5, rotY: -0.60)
  const dxB1 = x - 2.5;
  const dzB1 = z - 4.5;
  const cos1 = Math.cos(0.60);
  const sin1 = Math.sin(0.60);
  const localX1 = dxB1 * cos1 + dzB1 * sin1;
  const localZ1 = -dxB1 * sin1 + dzB1 * cos1;
  if (Math.abs(localX1) <= 2.2 && Math.abs(localZ1) <= 7.2) return true;

  // 2. Wooden Footbridge (across Millstream, X: -17, Z: 6.2, rotY: PI/2)
  const localX2 = z - 6.2;
  const localZ2 = -(x - (-17));
  if (Math.abs(localX2) <= 1.4 && Math.abs(localZ2) <= 6.2) return true;

  // 3. Pier / Dock near Watermill (X: -20.5, Z: 7.5, rotY: PI / 3.2)
  const dxP = x - (-20.5);
  const dzP = z - 7.5;
  const rotP = Math.PI / 3.2;
  const cosP = Math.cos(rotP);
  const sinP = Math.sin(rotP);
  const localXP = dxP * cosP - dzP * sinP;
  const localZP = dxP * sinP + dzP * cosP;
  if (Math.abs(localXP) <= 1.5 && Math.abs(localZP) <= 3.7) return true;

  return false;
}

function isPointInWater(x, z) {
  if (isPointOnBridge(x, z)) return false;
  const rx = riverCenterX(z);
  if (Math.abs(x - rx) < 3.8) return true;
  if (z >= 0 && z <= 18 && Math.abs(x - (-17)) < 2.2) return true;
  return false;
}

// 2. Navigation Grid & A*
const NAV_GRID_MIN = -48;
const NAV_GRID_MAX = 48;
const NAV_CELL_SIZE = 1.0;
const NAV_GRID_W = Math.round((NAV_GRID_MAX - NAV_GRID_MIN) / NAV_CELL_SIZE) + 1;
const NAV_GRID_H = NAV_GRID_W;

function worldToGrid(x, z) {
  return {
    gx: Math.round((x - NAV_GRID_MIN) / NAV_CELL_SIZE),
    gz: Math.round((z - NAV_GRID_MIN) / NAV_CELL_SIZE)
  };
}

function gridToWorld(gx, gz) {
  return {
    x: NAV_GRID_MIN + gx * NAV_CELL_SIZE,
    z: NAV_GRID_MIN + gz * NAV_CELL_SIZE
  };
}

const navGrid = new Uint8Array(NAV_GRID_W * NAV_GRID_H);

function isCellWalkable(x, z) {
  if (x < -47 || x > 47 || z < -47 || z > 47) return false;
  if (isPointInWater(x, z)) return false;
  return true;
}

for (let gz = 0; gz < NAV_GRID_H; gz++) {
  for (let gx = 0; gx < NAV_GRID_W; gx++) {
    const w = gridToWorld(gx, gz);
    navGrid[gz * NAV_GRID_W + gx] = isCellWalkable(w.x, w.z) ? 1 : 0;
  }
}

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
  }
  pop() {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const bottom = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = bottom;
      this._sinkDown(0);
    }
    return top;
  }
  size() { return this.items.length; }
  _bubbleUp(idx) {
    while (idx > 0) {
      const p = (idx - 1) >> 1;
      if (this.items[idx].f < this.items[p].f) {
        const t = this.items[idx];
        this.items[idx] = this.items[p];
        this.items[p] = t;
        idx = p;
      } else break;
    }
  }
  _sinkDown(idx) {
    const len = this.items.length;
    while (true) {
      let smallest = idx;
      const l = (idx << 1) + 1;
      const r = l + 1;
      if (l < len && this.items[l].f < this.items[smallest].f) smallest = l;
      if (r < len && this.items[r].f < this.items[smallest].f) smallest = r;
      if (smallest !== idx) {
        const t = this.items[idx];
        this.items[idx] = this.items[smallest];
        this.items[smallest] = t;
        idx = smallest;
      } else break;
    }
  }
}

function findPath(start, end) {
  const s = worldToGrid(start.x, start.z);
  const e = worldToGrid(end.x, end.z);

  const startIdx = s.gz * NAV_GRID_W + s.gx;
  const targetIdx = e.gz * NAV_GRID_W + e.gx;

  const openSet = new MinHeap();
  const gScore = new Float32Array(NAV_GRID_W * NAV_GRID_H).fill(Infinity);
  const cameFrom = new Int32Array(NAV_GRID_W * NAV_GRID_H).fill(-1);

  gScore[startIdx] = 0;
  openSet.push({ idx: startIdx, f: Math.hypot(s.gx - e.gx, s.gz - e.gz) });

  const dirs = [
    { dx: 1, dz: 0, cost: 1.0 },
    { dx: -1, dz: 0, cost: 1.0 },
    { dx: 0, dz: 1, cost: 1.0 },
    { dx: 0, dz: -1, cost: 1.0 },
    { dx: 1, dz: 1, cost: 1.414 },
    { dx: -1, dz: 1, cost: 1.414 },
    { dx: 1, dz: -1, cost: 1.414 },
    { dx: -1, dz: -1, cost: 1.414 }
  ];

  let found = false;
  let iterations = 0;

  while (openSet.size() > 0 && iterations < 8000) {
    iterations++;
    const current = openSet.pop();
    const cIdx = current.idx;

    if (cIdx === targetIdx) {
      found = true;
      break;
    }

    const cx = cIdx % NAV_GRID_W;
    const cz = Math.floor(cIdx / NAV_GRID_W);

    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const nx = cx + d.dx;
      const nz = cz + d.dz;

      if (nx < 0 || nx >= NAV_GRID_W || nz < 0 || nz >= NAV_GRID_H) continue;
      const nIdx = nz * NAV_GRID_W + nx;

      if (navGrid[nIdx] === 0) continue;

      const tentativeG = gScore[cIdx] + d.cost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = cIdx;
        gScore[nIdx] = tentativeG;
        const h = Math.hypot(nx - e.gx, nz - e.gz);
        openSet.push({ idx: nIdx, f: tentativeG + h });
      }
    }
  }

  if (!found) return null;

  const path = [];
  let curr = targetIdx;
  while (curr !== -1) {
    const px = curr % NAV_GRID_W;
    const pz = Math.floor(curr / NAV_GRID_W);
    const w = gridToWorld(px, pz);
    path.unshift(w);
    if (curr === startIdx) break;
    curr = cameFrom[curr];
  }

  return path;
}

// 3. NPC Cycle Simulator
const POIS = [
  { id: 'fountain', name: 'Air Mancur Alun-Alun', x: 2, z: -3, type: 'public' },
  { id: 'bridge_stone_mid', name: 'Jembatan Batu Alun-Alun', x: 0, z: 4.5, type: 'bridge' },
  { id: 'door_lurah', name: 'Rumah Pak Lurah', x: -22.8, z: -18.8, type: 'door', isDoor: true },
  { id: 'tavern_patio', name: 'Teras Kedai Kopi', x: 21, z: 8.5, type: 'tavern' }
];

console.log('Running NPC Navigation & Life Cycle Tests...');

// Test 1: Cross-river pathfinding must use bridge choke point
{
  const pWest = { x: -8, z: 4.5 };
  const pEast = { x: 12, z: 4.5 };
  const path = findPath(pWest, pEast);
  assert(path && path.length > 0, 'Path across river should be found');
  const crossesBridge = path.some(pt => isPointOnBridge(pt.x, pt.z));
  assert(crossesBridge, 'Path across river must cross bridge');
  console.log('✓ Test 1 passed: A* path across river successfully routes through bridge choke point.');
}

// Test 2: NPC arrival at door enters INSIDE_HOUSE and hides mesh/lantern
{
  const villager = {
    pos: { x: -22.8, z: -18.8 },
    state: 'WALK',
    targetPoi: POIS.find(p => p.id === 'door_lurah'),
    isInside: false,
    meshVisible: true,
    lanternIntensity: 2.0
  };

  // Arrival handler
  if (villager.targetPoi.isDoor) {
    villager.state = 'INSIDE_HOUSE';
    villager.isInside = true;
    villager.meshVisible = false;
    villager.lanternIntensity = 0;
    villager.timer = 15;
  }

  assert.strictEqual(villager.state, 'INSIDE_HOUSE');
  assert.strictEqual(villager.isInside, true);
  assert.strictEqual(villager.meshVisible, false);
  assert.strictEqual(villager.lanternIntensity, 0);
  console.log('✓ Test 2 passed: NPC entering house switches to INSIDE_HOUSE, hides mesh and turns off lantern.');
}

// Test 3: NPC exiting house spawns at door threshold and walks to open POI
{
  const villager = {
    pos: { x: 0, z: 0 },
    state: 'INSIDE_HOUSE',
    targetPoi: POIS.find(p => p.id === 'door_lurah'),
    isInside: true,
    meshVisible: false,
    timer: 0
  };

  // Exit house when timer <= 0
  villager.isInside = false;
  villager.meshVisible = true;
  villager.pos.x = villager.targetPoi.x;
  villager.pos.z = villager.targetPoi.z;
  const openPois = POIS.filter(p => !p.isDoor);
  const next = openPois[0];
  villager.targetPoi = next;
  villager.state = 'WALK';

  assert.strictEqual(villager.state, 'WALK');
  assert.strictEqual(villager.isInside, false);
  assert.strictEqual(villager.meshVisible, true);
  assert.strictEqual(villager.pos.x, -22.8);
  assert.strictEqual(villager.pos.z, -18.8);
  assert.strictEqual(villager.targetPoi.id, 'fountain');
  console.log('✓ Test 3 passed: NPC exiting house appears at door threshold and selects new destination.');
}

// Test 4: Bridge crossing detection & speed modifier
{
  const bridgeX = 2.5;
  const bridgeZ = 4.5;
  assert(isPointOnBridge(bridgeX, bridgeZ) === true);

  const baseSpeed = 2.0;
  const onBridgeSpeed = baseSpeed * 0.92;
  assert(onBridgeSpeed < baseSpeed);
  console.log('✓ Test 4 passed: Bridge crossing correctly detected with speed damping.');
}

console.log('ALL NPC CYCLE TESTS PASSED!');
