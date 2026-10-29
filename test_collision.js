import assert from 'node:assert';

// 1. Data structures
const SOLID_OBSTACLES = [
  { x: 2, z: -3, r: 1.8, name: 'Air Mancur' },
  { x: 18, z: 7, r: 3.5, name: 'Kedai Kopi' },
  { x: -18, z: 12, r: 2.8, name: 'Kincir Air' },
  { x: 24, z: -26, r: 2.6, name: 'Kincir Angin' },
  { x: -4, z: -7, r: 1.4, name: 'Kios Buah' },
  { x: 8, z: -7, r: 1.4, name: 'Kios Bunga' },
  { x: -4, z: 1, r: 1.4, name: 'Kios Roti' },
  { x: 8, z: 1, r: 1.4, name: 'Kios Sutra' }
];

const WALKABLE_HOUSES = [
  { id: 'carpenter', name: 'Rumah Pandai Kayu Lembah', x: -28, z: -14, rotY: 0.2, w: 3.4, d: 2.8, doorWidth: 0.9 },
  { id: 'hunter', name: 'Rumah Pemburu Lembah', x: -19, z: -14, rotY: -Math.PI / 3, w: 3.0, d: 2.4, doorWidth: 0.9 },
  { id: 'weaver', name: 'Rumah Penenun Sutra', x: -25, z: -8, rotY: 0.5, w: 3.5, d: 2.7, doorWidth: 0.9 },
  { id: 'guard', name: 'Menara Jaga Barat', x: -33, z: -18, rotY: 0.8, w: 2.8, d: 2.8, doorWidth: 0.9 },
  { id: 'shed', name: 'Lumbung Alat & Jerami', x: -8, z: 32, rotY: 0.2, w: 3.5, d: 2.8, doorWidth: 1.0 },
  { id: 'lurah', name: 'Rumah Kepala Desa (Pak Lurah)', x: -24, z: -20, rotY: Math.PI / 4, w: 3.6, d: 3.0, doorWidth: 0.9 },
  { id: 'healer', name: 'Rumah Tabib & Pengrajin Herbal', x: -16, z: -23, rotY: -Math.PI / 6, w: 3.2, d: 2.6, doorWidth: 0.9 }
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ponytail: 2D OBB + circular sliding collision. Upgrade to 3D voxel/BVH if multi-floor vertical navigation is added.
function resolveEntityCollision(pos, radius = 0.35) {
  // 1. World perimeter boundary (-47 to +47)
  pos.x = clamp(pos.x, -47, 47);
  pos.z = clamp(pos.z, -47, 47);

  // 2. Solid circular obstacles
  for (let i = 0; i < SOLID_OBSTACLES.length; i++) {
    const obs = SOLID_OBSTACLES[i];
    const dx = pos.x - obs.x;
    const dz = pos.z - obs.z;
    const dist = Math.hypot(dx, dz);
    const minDist = obs.r + radius;
    if (dist < minDist) {
      const push = minDist - dist;
      const nx = dist > 0.0001 ? dx / dist : 1;
      const nz = dist > 0.0001 ? dz / dist : 0;
      pos.x += nx * push;
      pos.z += nz * push;
    }
  }

  // 3. Walkable houses with doorway thresholds (Ambang Pintu) & interior/exterior walls
  let currentHouse = null;
  let inDoorway = false;

  for (let i = 0; i < WALKABLE_HOUSES.length; i++) {
    const h = WALKABLE_HOUSES[i];
    const halfW = h.w / 2;
    const halfD = h.d / 2;
    const doorHalfW = (h.doorWidth || 0.9) / 2;
    const wallThick = 0.15;

    // Transform world position to house local space
    const dx = pos.x - h.x;
    const dz = pos.z - h.z;
    const cos = Math.cos(h.rotY);
    const sin = Math.sin(h.rotY);
    let lx = dx * cos - dz * sin;
    let lz = dx * sin + dz * cos;

    // Fast reject if completely outside bounding radius
    const maxBound = Math.max(halfW, halfD) + radius + 0.6;
    if (Math.abs(lx) > maxBound || Math.abs(lz) > maxBound) continue;

    // Doorway corridor check: in front wall opening
    const isAtDoorX = Math.abs(lx) <= doorHalfW;
    const isAtDoorZ = Math.abs(lz - halfD) <= 0.45;

    if (isAtDoorX && isAtDoorZ) {
      // Entity is in the doorway threshold (ambang pintu)
      const maxLx = doorHalfW - radius * 0.5;
      if (maxLx > 0) {
        lx = clamp(lx, -maxLx, maxLx);
      }
      inDoorway = true;
      currentHouse = h;
    } else {
      // Check if entity is inside or outside the house
      const isInside = Math.abs(lx) < halfW && lz < halfD && lz > -halfD;

      if (isInside) {
        // Constrain within interior walls
        currentHouse = h;
        const innerMinX = -halfW + wallThick + radius;
        const innerMaxX = halfW - wallThick - radius;
        const innerMinZ = -halfD + wallThick + radius;
        const innerMaxZ = halfD - wallThick - radius;

        lx = clamp(lx, innerMinX, innerMaxX);

        if (isAtDoorX) {
          // If aligned with doorway, allow stepping out through the threshold
          if (lz < innerMinZ) lz = innerMinZ;
        } else {
          // Blocked by front wall away from doorway
          lz = clamp(lz, innerMinZ, innerMaxZ);
        }
      } else {
        // Entity is OUTSIDE the house - slide along exterior walls
        const closeX = Math.abs(lx) < halfW + radius;
        const closeZ = Math.abs(lz) < halfD + radius;

        if (closeX && closeZ) {
          if (lz >= halfD && isAtDoorX) {
            // Approaching doorway from outside: allow entry!
          } else {
            const penLeft = (lx + radius) - (-halfW);
            const penRight = (halfW) - (lx - radius);
            const penBack = (lz + radius) - (-halfD);
            const penFront = (halfD) - (lz - radius);

            const minPen = Math.min(penLeft, penRight, penBack, penFront);
            if (minPen === penLeft) lx = -halfW - radius;
            else if (minPen === penRight) lx = halfW + radius;
            else if (minPen === penBack) lz = -halfD - radius;
            else if (minPen === penFront) lz = halfD + radius;
          }
        }
      }
    }

    // Transform local back to world coordinates
    pos.x = h.x + (lx * cos + lz * sin);
    pos.z = h.z + (-lx * sin + lz * cos);
  }

  return { currentHouse, inDoorway };
}

// ==========================================
// TEST SUITE
// ==========================================

console.log('Running collision map self-checks...');

// Test 1: Solid obstacle collision (Air Mancur at 2, -3, radius 1.8)
{
  const pos = { x: 2, z: -3 }; // inside fountain center
  resolveEntityCollision(pos, 0.35);
  const dist = Math.hypot(pos.x - 2, pos.z - (-3));
  assert(dist >= 1.8 + 0.35 - 0.001, `Failed Test 1: dist ${dist} should be >= ${1.8 + 0.35}`);
  console.log('✓ Test 1 passed: Solid obstacle pushes entity out.');
}

// Test 2: Exterior wall collision (back of Rumah Pandai Kayu)
{
  const h = WALKABLE_HOUSES.find(x => x.id === 'carpenter');
  // Back wall is at local lz = -halfD (-1.4). Approaching from -1.8 towards -1.0
  const cos = Math.cos(h.rotY);
  const sin = Math.sin(h.rotY);
  const lx = 0;
  const lz = -1.5; // penetrating back wall
  const wx = h.x + (lx * cos + lz * sin);
  const wz = h.z + (-lx * sin + lz * cos);

  const pos = { x: wx, z: wz };
  resolveEntityCollision(pos, 0.35);

  // Re-calculate local coordinate
  const rdx = pos.x - h.x;
  const rdz = pos.z - h.z;
  const rlx = rdx * cos - rdz * sin;
  const rlz = rdx * sin + rdz * cos;

  assert(rlz <= -h.d / 2 - 0.35 + 0.001, `Failed Test 2: rlz ${rlz} should be pushed out to <= ${-h.d/2 - 0.35}`);
  console.log('✓ Test 2 passed: Entity cannot walk through exterior back wall.');
}

// Test 3: Doorway threshold entry (ambang pintu)
{
  const h = WALKABLE_HOUSES.find(x => x.id === 'carpenter');
  const cos = Math.cos(h.rotY);
  const sin = Math.sin(h.rotY);
  // In front of door: lx = 0, lz = 1.35 (just inside doorway)
  const lx = 0;
  const lz = 1.35;
  const wx = h.x + (lx * cos + lz * sin);
  const wz = h.z + (-lx * sin + lz * cos);

  const pos = { x: wx, z: wz };
  const res = resolveEntityCollision(pos, 0.35);

  const rdx = pos.x - h.x;
  const rdz = pos.z - h.z;
  const rlx = rdx * cos - rdz * sin;
  const rlz = rdx * sin + rdz * cos;

  assert(res.inDoorway === true || res.currentHouse !== null, 'Failed Test 3: should detect doorway or inside house');
  assert(Math.abs(rlz - 1.35) < 0.1, `Failed Test 3: Doorway should allow entry, got rlz=${rlz}`);
  console.log('✓ Test 3 passed: Entity can walk through doorway threshold into house.');
}

// Test 4: Interior wall containment
{
  const h = WALKABLE_HOUSES.find(x => x.id === 'carpenter');
  const cos = Math.cos(h.rotY);
  const sin = Math.sin(h.rotY);
  // Deep inside house, trying to walk through left wall (halfW = 1.7, wall at -1.7)
  const lx = -1.6;
  const lz = 0;
  const wx = h.x + (lx * cos + lz * sin);
  const wz = h.z + (-lx * sin + lz * cos);

  const pos = { x: wx, z: wz };
  const res = resolveEntityCollision(pos, 0.35);

  const rdx = pos.x - h.x;
  const rdz = pos.z - h.z;
  const rlx = rdx * cos - rdz * sin;

  assert.strictEqual(res.currentHouse.id, 'carpenter');
  assert(rlx >= -h.w / 2 + 0.15 + 0.35 - 0.001, `Failed Test 4: rlx ${rlx} should be clamped by interior left wall`);
  console.log('✓ Test 4 passed: Interior walls contain entity inside room.');
}

// Test 5: All 7 houses doorway threshold entry and interior containment
{
  for (const h of WALKABLE_HOUSES) {
    const cos = Math.cos(h.rotY);
    const sin = Math.sin(h.rotY);

    // Doorway entry check
    const doorLx = 0;
    const doorLz = h.d / 2; // threshold
    const doorWx = h.x + (doorLx * cos + doorLz * sin);
    const doorWz = h.z + (-doorLx * sin + doorLz * cos);

    const pos = { x: doorWx, z: doorWz };
    const res = resolveEntityCollision(pos, 0.35);
    assert(res.inDoorway === true || res.currentHouse !== null, `Failed for house ${h.name}: doorway entry check`);

    // Interior center check
    const innerPos = { x: h.x, z: h.z };
    const innerRes = resolveEntityCollision(innerPos, 0.35);
    assert.strictEqual(innerRes.currentHouse?.id, h.id, `Failed for house ${h.name}: interior center check`);
  }
  console.log('✓ Test 5 passed: All 7 walkable houses allow doorway threshold entry & interior containment.');
}

// Test 6: NPC / Player soft separation collision
{
  const npc1 = { pos: { x: 5.0, z: 5.0 } };
  const npc2 = { pos: { x: 5.2, z: 5.0 } }; // distance 0.2 < minSeparation (0.55)

  const dx = npc1.pos.x - npc2.pos.x;
  const dz = npc1.pos.z - npc2.pos.z;
  const dist = Math.hypot(dx, dz);
  assert(dist < 0.55);

  const push = (0.55 - dist) * 0.5;
  npc1.pos.x += (dx / dist) * push;
  npc2.pos.x -= (dx / dist) * push;

  const newDist = Math.hypot(npc1.pos.x - npc2.pos.x, npc1.pos.z - npc2.pos.z);
  assert(Math.abs(newDist - 0.55) < 0.001, `Failed Test 6: separation ${newDist} should be 0.55`);
  console.log('✓ Test 6 passed: NPC separation push separates overlapping entities.');
}

console.log('ALL SELF-CHECKS PASSED!');
