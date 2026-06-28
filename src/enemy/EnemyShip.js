// src/enemy/EnemyShip.js — enemy ship factory + management

import { Pool }   from '../utils/Pool.js';
import { Ship }   from '../ship/Ship.js';
import { EnemyAI } from './EnemyAI.js';
import { BID, ENEMY_DESPAWN_DIST } from '../constants.js';
import { dist2 } from '../utils/Math2D.js';

// Difficulty tiers: each is an array of { typeId, gx, gy }
const LAYOUTS = [
  // Tier 0 — Scout (3 blocks)
  [
    { typeId: BID.CORE,   gx: 0,  gy: 0  },
    { typeId: BID.ARMOR,  gx: -1, gy: 0  },
    { typeId: BID.WEAPON, gx: 1,  gy: 0  },
    { typeId: BID.ENGINE, gx: -2, gy: 0  },
    { typeId: BID.GENERATOR, gx: 0, gy: 1 },
  ],
  // Tier 1 — Fighter
  [
    { typeId: BID.CORE,      gx: 0,  gy: 0  },
    { typeId: BID.ARMOR,     gx: -1, gy: 0  },
    { typeId: BID.ARMOR,     gx: 1,  gy: 0  },
    { typeId: BID.ARMOR,     gx: 0,  gy: -1 },
    { typeId: BID.WEAPON,    gx: 1,  gy: -1 },
    { typeId: BID.WEAPON,    gx: 1,  gy:  1 },
    { typeId: BID.ENGINE,    gx: -2, gy: 0  },
    { typeId: BID.ENGINE,    gx: -2, gy: -1 },
    { typeId: BID.GENERATOR, gx: -1, gy: 1  },
    { typeId: BID.SHIELD,    gx:  0, gy: 1  },
  ],
  // Tier 2 — Heavy
  [
    { typeId: BID.CORE,      gx: 0,  gy:  0 },
    { typeId: BID.ARMOR,     gx: -1, gy:  0 },
    { typeId: BID.ARMOR,     gx:  1, gy:  0 },
    { typeId: BID.ARMOR,     gx:  0, gy: -1 },
    { typeId: BID.ARMOR,     gx:  0, gy:  1 },
    { typeId: BID.WEAPON,    gx:  2, gy: -1 },
    { typeId: BID.WEAPON,    gx:  2, gy:  0 },
    { typeId: BID.WEAPON,    gx:  2, gy:  1 },
    { typeId: BID.ENGINE,    gx: -2, gy: -1 },
    { typeId: BID.ENGINE,    gx: -2, gy:  1 },
    { typeId: BID.GENERATOR, gx: -1, gy: -1 },
    { typeId: BID.GENERATOR, gx: -1, gy:  1 },
    { typeId: BID.SHIELD,    gx:  1, gy: -1 },
    { typeId: BID.SHIELD,    gx:  1, gy:  1 },
  ],
];

// Reuse enemy ships to avoid GC spikes (ship objects are large)
// We use a simple free-list rather than Pool since Ship is stateful
const _freeShips = [];
function acquireEnemy(x, y, tier) {
  const ship = _freeShips.length > 0 ? _freeShips.pop() : new Ship(0, 0, false);
  ship.x = x; ship.y = y;
  ship.vx = 0; ship.vy = 0;
  ship.angle = Math.random() * Math.PI * 2;
  ship.av = 0;
  ship.alive = true;
  ship._pooled = false;
  ship.blocks.clear();
  ship._statsDirty  = true;
  ship._spriteDirty = true;
  ship._sprite      = null;

  const layout = LAYOUTS[Math.min(tier, LAYOUTS.length - 1)];
  for (const b of layout) ship.addBlock(b.typeId, b.gx, b.gy);
  ship.recalcStats();
  ship.hp       = ship.stats.maxHp;
  ship.shieldHp = ship.stats.shieldMax;
  return ship;
}

function releaseEnemy(ship) {
  ship.alive = false;
  _freeShips.push(ship);
}

export class EnemyManager {
  constructor() {
    this._enemies = [];   // { ship, ai }
  }

  spawn(x, y) {
    // Tier based on distance from origin
    const dist = Math.sqrt(x * x + y * y);
    const tier = Math.min(Math.floor(dist / 2000), LAYOUTS.length - 1);
    const ship = acquireEnemy(x, y, tier);
    const ai   = new EnemyAI(ship);
    this._enemies.push({ ship, ai });
    return ship;
  }

  update(dt, playerX, playerY, fireCallback) {
    const despSq = ENEMY_DESPAWN_DIST * ENEMY_DESPAWN_DIST;
    for (let i = this._enemies.length - 1; i >= 0; i--) {
      const { ship, ai } = this._enemies[i];
      if (!ship.alive || dist2(ship.x, ship.y, playerX, playerY) > despSq) {
        releaseEnemy(ship);
        this._enemies.splice(i, 1);
        continue;
      }
      ship.update(dt);
      ai.update(dt, playerX, playerY, fireCallback);
    }
  }

  draw(ctx) {
    for (const { ship } of this._enemies) {
      ship.drawShield(ctx);
      ship.draw(ctx);
    }
  }

  get ships() { return this._enemies.map(e => e.ship); }
}
