// src/combat/Bullet.js — poolable projectile entity

import { BULLET_SPEED, BULLET_LIFE } from '../constants.js';

export class Bullet {
  constructor() {
    this.x  = 0; this.y  = 0;
    this.vx = 0; this.vy = 0;
    this.damage    = 20;
    this.isPlayer  = true;
    this.life      = 0;
    this.alive     = false;
    this._pooled   = false;
  }

  init(x, y, angle, damage, isPlayer, speedMult = 1) {
    this.x        = x; this.y = y;
    const s       = BULLET_SPEED * speedMult;
    this.vx       = Math.cos(angle) * s;
    this.vy       = Math.sin(angle) * s;
    this.damage   = damage;
    this.isPlayer = isPlayer;
    this.life     = BULLET_LIFE;
    this.alive    = true;
  }

  update(dt) {
    this.x    += this.vx * dt;
    this.y    += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  draw(ctx, isPlayer) {
    if (!this.alive) return;
    ctx.fillStyle = isPlayer ? '#ffe080' : '#ff5030';
    // Bullet is a small rotated rectangle
    const cos = this.vx / BULLET_SPEED;
    const sin = this.vy / BULLET_SPEED;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillRect(-5, -1.5, 10, 3);
    ctx.restore();
  }
}
