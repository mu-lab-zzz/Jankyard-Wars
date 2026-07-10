// src/combat/WeaponSystem.js — weapon firing + bullet pooling

import { Pool }    from '../utils/Pool.js';
import { Bullet }  from './Bullet.js';
import { getDef }  from '../blocks/BlockRegistry.js';
import { BID }     from '../constants.js';
import { dist2, angleTo, angleDiff, rotX, rotY } from '../utils/Math2D.js';

// Shared bullet pool for player and enemy bullets
export const bulletPool = new Pool(
  () => new Bullet(),
  (b) => { b.alive = false; }
);
bulletPool.prewarm(80);

// All live bullets (single array, checked by Game each frame)
export const bullets = [];

/**
 * Try to fire weapon blocks on `ship` toward `targetX, targetY`.
 * `isPlayer` flag determines bullet faction.
 */
export function fireWeapons(ship, targetX, targetY, isPlayer) {
  const cos = Math.cos(-ship.angle);
  const sin = Math.sin(-ship.angle);
  const fired = [];

  for (const blk of ship.blocks.values()) {
    const def = getDef(blk.typeId);
    if (blk.typeId !== BID.WEAPON) continue;
    if (blk._wCooldown > 0) continue;

    const eff  = def.effect;
    // Muzzle position in world space
    const lx   = blk.gx * 32 + 16; // +16 = block half-width (barrel tip)
    const ly   = blk.gy * 32;
    const wCos = Math.cos(ship.angle);
    const wSin = Math.sin(ship.angle);
    const mx   = ship.x + rotX(lx, ly, wCos, wSin);
    const my   = ship.y + rotY(lx, ly, wCos, wSin);

    // Auto-aim: check if target is within arc
    const aimAngle = angleTo(mx, my, targetX, targetY);
    const maxArc   = Math.PI * 0.5; // 90° each side

    // Weapon points right (+x) in ship local space
    const weaponWorldAngle = ship.angle;
    const diff = angleDiff(weaponWorldAngle, aimAngle);

    if (Math.abs(diff) > maxArc) continue;

    // Fire
    const b = bulletPool.get();
    b.init(mx, my, aimAngle, eff.weaponDmg ?? 20, isPlayer);
    bullets.push(b);
    blk._wCooldown = eff.weaponCooldown ?? 0.5;
    fired.push(b);
  }
  return fired;
}

/** Update all bullets and remove dead ones. Returns array of live bullets. */
export function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update(dt);
    if (!b.alive) {
      bulletPool.release(b);
      bullets.splice(i, 1);
    }
  }
}

/** Draw all live bullets. */
export function drawBullets(ctx) {
  ctx.save();
  for (const b of bullets) {
    if (!b.alive) continue;
    const angle = Math.atan2(b.vy, b.vx);
    const cos   = Math.cos(angle);
    const sin   = Math.sin(angle);
    ctx.fillStyle = b.isPlayer ? '#ffe080' : '#ff5030';
    ctx.setTransform(cos, sin, -sin, cos, b.x, b.y);
    ctx.fillRect(-5, -1.5, 10, 3);
  }
  ctx.restore();
}

/** Check if a bullet hits any ship in `ships` array. Returns { bullet, ship } or null. */
export function checkBulletShipCollision(bullet, ships) {
  for (const ship of ships) {
    if (!ship.alive) continue;
    const r = ship.radius + 8;
    if (dist2(bullet.x, bullet.y, ship.x, ship.y) < r * r) {
      return ship;
    }
  }
  return null;
}
