// src/ship/Ship.js — ship entity: physics, block grid, rendering, damage

import { BS, DRAG, ANG_DRAG } from '../constants.js';
import { rotX, rotY, dist2 } from '../utils/Math2D.js';
import { calcStats }        from './ShipStats.js';
import { getDef, getBlockSprite } from '../blocks/BlockRegistry.js';

let _nextBlockId = 1;

/** Create a fresh block instance (plain object — no class overhead). */
function makeBlock(typeId, gx, gy) {
  const def = getDef(typeId);
  return {
    id: _nextBlockId++,
    typeId,
    gx, gy,
    hp: def.hp,
    maxHp: def.hp,
    _pooled: false,
    // weapon cooldown state
    _wCooldown: 0,
    // drill state
    _dActive: false,
  };
}

export class Ship {
  /**
   * @param {number} wx  World x
   * @param {number} wy  World y
   * @param {boolean} isPlayer
   */
  constructor(wx, wy, isPlayer = false) {
    // Physics
    this.x  = wx; this.y  = wy;
    this.vx = 0;  this.vy = 0;
    this.angle = 0;  // radians, 0 = pointing right (+x)
    this.av = 0;     // angular velocity

    this.isPlayer  = isPlayer;
    this.alive     = true;
    this._pooled   = false;

    // Block grid: key = `${gx},${gy}`, value = block object
    this.blocks = new Map();

    // Cached stats (recalculated when block set changes)
    this.stats = null;
    this._statsDirty = true;

    // Combat state
    this.hp        = 0;
    this.shieldHp  = 0;
    this.shieldMax = 0;
    this._power    = 0;    // current power (may be limited)

    // Pre-rendered ship canvas (invalidated on structure change)
    this._sprite       = null;
    this._spriteOffX   = 0;  // offset to centre the sprite
    this._spriteOffY   = 0;
    this._spriteDirty  = true;
  }

  // ── Block management ─────────────────────────────────────────────────────

  addBlock(typeId, gx, gy) {
    const key = `${gx},${gy}`;
    if (this.blocks.has(key)) return false;
    this.blocks.set(key, makeBlock(typeId, gx, gy));
    this._statsDirty  = true;
    this._spriteDirty = true;
    return true;
  }

  removeBlock(gx, gy) {
    const key = `${gx},${gy}`;
    if (!this.blocks.has(key)) return false;
    const blk = this.blocks.get(key);
    if (!getDef(blk.typeId).canDelete) return false;
    this.blocks.delete(key);
    this._statsDirty  = true;
    this._spriteDirty = true;
    return true;
  }

  getBlock(gx, gy) { return this.blocks.get(`${gx},${gy}`) ?? null; }
  hasBlock(gx, gy) { return this.blocks.has(`${gx},${gy}`); }

  /** Damage block at world position (bx, by). Returns excess damage (0 if absorbed). */
  damageAt(bx, by, amount) {
    // Transform world point into ship local space
    const dx = bx - this.x;
    const dy = by - this.y;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const lx = rotX(dx, dy, cos, sin);
    const ly = rotY(dx, dy, cos, sin);
    const gx = Math.round(lx / BS);
    const gy = Math.round(ly / BS);

    return this.damageBlock(gx, gy, amount);
  }

  damageBlock(gx, gy, amount) {
    const blk = this.getBlock(gx, gy);
    if (!blk) return amount;

    // Shield absorbs first
    let dmg = amount;
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, dmg);
      this.shieldHp -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) return 0;
    }

    const actualDmg = Math.min(dmg, blk.hp);
    blk.hp -= actualDmg;
    this.hp  = Math.max(0, this.hp - actualDmg); // fast-track update

    if (blk.hp <= 0) {
      const overflow = -blk.hp;
      this.blocks.delete(`${gx},${gy}`);
      this._statsDirty  = true;
      this._spriteDirty = true;
      if (gx === 0 && gy === 0) this.alive = false;
      return overflow > 0 ? overflow : 0;
    }
    this._spriteDirty = true;
    return 0;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  recalcStats() {
    if (!this._statsDirty) return;
    const s = calcStats(this.blocks);
    if (!this.stats) this.stats = {};
    Object.assign(this.stats, s);

    // Recompute current HP accurately from block HPs
    let currentHp = 0;
    for (const blk of this.blocks.values()) currentHp += blk.hp;
    this.hp = currentHp || s.maxHp; // use maxHp if blocks just created

    this.shieldMax = s.shieldMax;
    if (this.shieldHp > this.shieldMax) this.shieldHp = this.shieldMax;
    this._statsDirty = false;
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  /**
   * Apply thrust in the ship's forward direction.
   * @param {number} throttle  0..1
   * @param {number} torque    -1..1 (negative = turn left / counter-clockwise)
   * @param {number} dt
   */
  applyThrust(throttle, torque, dt) {
    if (!this.stats) return;
    const mass   = Math.max(this.stats.mass, 1);
    const thrust = this.stats.thrust;
    const accel  = (thrust / mass) * throttle;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    this.vx += cos * accel * dt;
    this.vy += sin * accel * dt;

    const turnRate = 2.2 / Math.max(mass * 0.15, 1);
    this.av += torque * turnRate * dt;
  }

  update(dt) {
    this.recalcStats();

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.av * dt;

    // Damping
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.av *= ANG_DRAG;

    // Shield regen
    if (this.shieldHp < this.shieldMax) {
      this.shieldHp = Math.min(this.shieldMax, this.shieldHp + this.stats.shieldRegen * dt);
    }

    // Block cooldowns
    for (const blk of this.blocks.values()) {
      if (blk._wCooldown > 0) blk._wCooldown -= dt;
    }
  }

  // ── Sprite cache ──────────────────────────────────────────────────────────

  _rebuildSprite() {
    // Compute bounding box in local block space
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const blk of this.blocks.values()) {
      const lx = blk.gx * BS;
      const ly = blk.gy * BS;
      if (lx < minX) minX = lx; if (lx > maxX) maxX = lx;
      if (ly < minY) minY = ly; if (ly > maxY) maxY = ly;
    }
    if (this.blocks.size === 0) { this._sprite = null; return; }

    const pad  = BS / 2;
    const w    = (maxX - minX + BS) + pad * 2;
    const h    = (maxY - minY + BS) + pad * 2;
    const offX = minX - pad;  // world local offset to sprite top-left
    const offY = minY - pad;

    // Reuse or create canvas
    if (!this._sprite || this._sprite.width !== (w | 0) || this._sprite.height !== (h | 0)) {
      if (typeof OffscreenCanvas !== 'undefined') {
        this._sprite = new OffscreenCanvas(w | 0, h | 0);
      } else {
        this._sprite = document.createElement('canvas');
        this._sprite.width  = w | 0;
        this._sprite.height = h | 0;
      }
    }

    const ctx = this._sprite.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    for (const blk of this.blocks.values()) {
      const sprite = getBlockSprite(blk.typeId);
      if (!sprite) continue;
      const px = blk.gx * BS - offX - BS / 2;
      const py = blk.gy * BS - offY - BS / 2;
      ctx.drawImage(sprite, px, py, BS, BS);

      // Draw damage tint
      if (blk.hp < blk.maxHp) {
        const t = 1 - blk.hp / blk.maxHp;
        ctx.fillStyle = `rgba(255,30,0,${(t * 0.55).toFixed(2)})`;
        ctx.fillRect(px, py, BS, BS);
      }
    }

    this._spriteOffX   = offX;
    this._spriteOffY   = offY;
    this._spriteDirty  = false;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.alive || this.blocks.size === 0) return;
    if (this._spriteDirty) this._rebuildSprite();
    if (!this._sprite) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(this._sprite, this._spriteOffX, this._spriteOffY);
    ctx.restore();
  }

  /** Draw shield bubble (separate pass for transparency). */
  drawShield(ctx) {
    if (this.shieldHp <= 0 || this.shieldMax <= 0) return;
    const r = (Math.sqrt(this.blocks.size) * BS * 0.75) + 8;
    const alpha = (this.shieldHp / this.shieldMax) * 0.35 + 0.05;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle   = `rgba(80,100,255,${alpha.toFixed(2)})`;
    ctx.strokeStyle = `rgba(120,160,255,${(alpha * 2).toFixed(2)})`;
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Approximate bounding radius for culling / collision. */
  get radius() {
    return Math.sqrt(this.blocks.size) * BS * 0.65 + BS;
  }

  // ── Serialisation ─────────────────────────────────────────────────────────

  toJSON() {
    const blks = [];
    for (const blk of this.blocks.values()) {
      blks.push({ typeId: blk.typeId, gx: blk.gx, gy: blk.gy, hp: blk.hp });
    }
    return { x: this.x, y: this.y, angle: this.angle, vx: this.vx, vy: this.vy, blocks: blks };
  }

  static fromJSON(data, isPlayer = false) {
    const ship = new Ship(data.x, data.y, isPlayer);
    ship.angle = data.angle || 0;
    ship.vx    = data.vx   || 0;
    ship.vy    = data.vy   || 0;
    for (const b of data.blocks) {
      ship.addBlock(b.typeId, b.gx, b.gy);
      const blk = ship.getBlock(b.gx, b.gy);
      if (blk && b.hp !== undefined) blk.hp = b.hp;
    }
    ship.recalcStats();
    ship.shieldHp = ship.shieldMax;
    return ship;
  }
}
