// src/world/World.js — chunk-based infinite world with asteroid/enemy spawning

import {
  CHUNK_PX, ACTIVE_RADIUS_CHUNKS,
  ASTEROID_DENSITY, ASTEROIDS_PER_CHUNK,
  ENEMY_DENSITY, ENEMIES_PER_CHUNK,
  ASTEROID_DESPAWN_DIST, ENEMY_DESPAWN_DIST,
  PICKUP_RANGE,
} from '../constants.js';
import { Pool }              from '../utils/Pool.js';
import { makePRNG, hashInt2 } from '../utils/PRNG.js';
import { dist2 }              from '../utils/Math2D.js';
import { Asteroid, initAsteroidSprites } from './Asteroid.js';
import { DropItem }           from './DropItem.js';

const asteroidPool = new Pool(
  () => new Asteroid(),
  (a) => { a.alive = false; }
);

const dropPool = new Pool(
  () => new DropItem(),
  (d) => { d.alive = false; d.count = 0; }
);

asteroidPool.prewarm(40);
dropPool.prewarm(60);

export class World {
  constructor(seed = 42) {
    this._seed            = seed;
    this._activeChunks    = new Set();
    this._asteroids       = [];
    this._drops           = [];
    this._enemySpawnQueue = [];
    this._pruneTimer      = 0;
    this._lastPcx         = null;
    this._lastPcy         = null;
  }

  init() { initAsteroidSprites(); }

  _chunkKey(cx, cy) { return `${cx},${cy}`; }

  _activateChunk(cx, cy) {
    const key = this._chunkKey(cx, cy);
    if (this._activeChunks.has(key)) return;
    this._activeChunks.add(key);
    this._spawnChunkContent(cx, cy);
  }

  _deactivateChunk(cx, cy) { this._activeChunks.delete(this._chunkKey(cx, cy)); }

  _spawnChunkContent(cx, cy) {
    const seed = hashInt2(cx, cy) ^ this._seed;
    const rng  = makePRNG(seed);

    if (rng() < ASTEROID_DENSITY) {
      const count = 1 + Math.floor(rng() * ASTEROIDS_PER_CHUNK);
      for (let i = 0; i < count; i++) {
        const ax = cx * CHUNK_PX + rng() * CHUNK_PX;
        const ay = cy * CHUNK_PX + rng() * CHUNK_PX;
        const variant = rng() * 10 | 0;
        const a = asteroidPool.get();
        a.init(ax, ay, variant, rng);
        this._asteroids.push(a);
      }
    }

    if (rng() < ENEMY_DENSITY) {
      const count = Math.floor(rng() * ENEMIES_PER_CHUNK) + 1;
      for (let i = 0; i < count; i++) {
        const ex = cx * CHUNK_PX + rng() * CHUNK_PX;
        const ey = cy * CHUNK_PX + rng() * CHUNK_PX;
        this._enemySpawnQueue.push({ x: ex, y: ey });
      }
    }
  }

  _pruneChunks(pcx, pcy, R) {
    const toDelete = [];
    for (const key of this._activeChunks) {
      const ci = key.indexOf(',');
      const cx = parseInt(key, 10);
      const cy = parseInt(key.slice(ci + 1), 10);
      if (Math.abs(cx - pcx) > R + 2 || Math.abs(cy - pcy) > R + 2) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) this._activeChunks.delete(key);
  }

  /** Update world each frame. inventory.addOre() is cargo-capacity-aware. */
  update(playerX, playerY, dt, inventory) {
    const pcx = Math.floor(playerX / CHUNK_PX);
    const pcy = Math.floor(playerY / CHUNK_PX);
    const R   = ACTIVE_RADIUS_CHUNKS;

    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        this._activateChunk(pcx + dx, pcy + dy);
      }
    }

    // Prune stale chunk records every 5 seconds to prevent unbounded growth
    this._pruneTimer += dt;
    if (this._pruneTimer > 5) {
      this._pruneTimer = 0;
      this._pruneChunks(pcx, pcy, R);
    }

    const astDespSq = ASTEROID_DESPAWN_DIST * ASTEROID_DESPAWN_DIST;
    for (let i = this._asteroids.length - 1; i >= 0; i--) {
      const a = this._asteroids[i];
      if (!a.alive || dist2(a.x, a.y, playerX, playerY) > astDespSq) {
        asteroidPool.release(a);
        this._asteroids.splice(i, 1);
        continue;
      }
      a.update(dt);
    }

    const pickSq = PICKUP_RANGE * PICKUP_RANGE;
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i];
      if (!d.alive) { dropPool.release(d); this._drops.splice(i, 1); continue; }
      d.update(dt);
      if (dist2(d.x, d.y, playerX, playerY) < pickSq) {
        const added = inventory.addOre(d.resId, d.count);
        if (added > 0 || d._life < 1) {
          // Only remove if at least partially picked up, or about to expire
          if (added >= d.count) {
            d.alive = false;
            dropPool.release(d);
            this._drops.splice(i, 1);
          } else {
            // Partial pickup — reduce count
            d.count -= added;
          }
        }
      }
    }
  }

  damageAsteroid(asteroid, amount) {
    asteroid.hp -= amount;
    if (asteroid.hp <= 0) {
      for (const drop of asteroid.getDrops()) {
        const d = dropPool.get();
        d.init(asteroid.x, asteroid.y, drop.id, drop.count);
        this._drops.push(d);
      }
      asteroid.alive = false;
      return true;
    }
    return false;
  }

  drainEnemySpawns() {
    const q = this._enemySpawnQueue.slice();
    this._enemySpawnQueue.length = 0;
    return q;
  }

  get asteroids() { return this._asteroids; }
  get drops()     { return this._drops; }

  drawDrops(ctx)     { for (const d of this._drops)     d.draw(ctx); }
  drawAsteroids(ctx) { for (const a of this._asteroids) a.draw(ctx); }
}
