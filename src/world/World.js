// src/world/World.js — chunk-based infinite world with asteroid/enemy spawning

import {
  CHUNK_PX, ACTIVE_RADIUS_CHUNKS,
  ASTEROID_DENSITY, ASTEROIDS_PER_CHUNK,
  ENEMY_DENSITY, ENEMIES_PER_CHUNK,
  ASTEROID_DESPAWN_DIST, ENEMY_DESPAWN_DIST,
  PICKUP_RANGE, BS,
} from '../constants.js';
import { Pool }              from '../utils/Pool.js';
import { makePRNG, hashInt2 } from '../utils/PRNG.js';
import { dist2 }              from '../utils/Math2D.js';
import { Asteroid, initAsteroidSprites } from './Asteroid.js';
import { DropItem }           from './DropItem.js';

// ── Object pools ───────────────────────────────────────────────────────────

const asteroidPool = new Pool(
  () => new Asteroid(),
  (a) => { a.alive = false; }
);

const dropPool = new Pool(
  () => new DropItem(),
  (d) => { d.alive = false; d.count = 0; }
);

// Prewarm pools at startup
asteroidPool.prewarm(40);
dropPool.prewarm(60);

export class World {
  constructor(seed = 42) {
    this._seed       = seed;
    this._activeChunks = new Set();   // 'cx,cy' strings
    this._asteroids  = [];            // live Asteroid refs
    this._drops      = [];            // live DropItem refs
    this._enemySpawnQueue = [];       // { cx, cy, x, y } pending spawns
  }

  init() {
    initAsteroidSprites();
  }

  // ── Chunk system ───────────────────────────────────────────────────────

  _chunkKey(cx, cy) { return `${cx},${cy}`; }

  _activateChunk(cx, cy) {
    const key = this._chunkKey(cx, cy);
    if (this._activeChunks.has(key)) return;
    this._activeChunks.add(key);
    this._spawnChunkContent(cx, cy);
  }

  _deactivateChunk(cx, cy) {
    this._activeChunks.delete(this._chunkKey(cx, cy));
  }

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

  /** Call each frame with the player's world position. */
  update(playerX, playerY, dt, inventory) {
    const pcx = Math.floor(playerX / CHUNK_PX);
    const pcy = Math.floor(playerY / CHUNK_PX);
    const R   = ACTIVE_RADIUS_CHUNKS;

    // Activate needed chunks
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        this._activateChunk(pcx + dx, pcy + dy);
      }
    }

    // Update asteroids, remove dead / out-of-range
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

    // Update drops, auto-collect near player
    const pickSq = PICKUP_RANGE * PICKUP_RANGE;
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i];
      if (!d.alive) { dropPool.release(d); this._drops.splice(i, 1); continue; }
      d.update(dt);
      if (dist2(d.x, d.y, playerX, playerY) < pickSq) {
        inventory.addRes(d.resId, d.count);
        d.alive = false;
        dropPool.release(d);
        this._drops.splice(i, 1);
      }
    }
  }

  /** Check bullet/drill collision against all asteroids. */
  damageAsteroid(asteroid, amount) {
    asteroid.hp -= amount;
    if (asteroid.hp <= 0) {
      // Spawn drops
      for (const drop of asteroid.getDrops()) {
        const d = dropPool.get();
        d.init(asteroid.x, asteroid.y, drop.id, drop.count);
        this._drops.push(d);
      }
      asteroid.alive = false;
      return true; // destroyed
    }
    return false;
  }

  /** Consume pending enemy spawn requests — caller handles instantiation. */
  drainEnemySpawns() {
    const q = this._enemySpawnQueue.slice();
    this._enemySpawnQueue.length = 0;
    return q;
  }

  get asteroids() { return this._asteroids; }
  get drops()     { return this._drops; }

  // ── Rendering ─────────────────────────────────────────────────────────

  drawDrops(ctx) {
    for (const d of this._drops) d.draw(ctx);
  }

  drawAsteroids(ctx) {
    for (const a of this._asteroids) a.draw(ctx);
  }
}
