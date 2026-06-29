// src/world/DropItem.js — floating ore drop entity

import { ORE_COLORS } from '../inventory/Inventory.js';

export class DropItem {
  constructor() {
    this.x  = 0; this.y  = 0;
    this.vx = 0; this.vy = 0;
    this.resId  = '';
    this.count  = 0;
    this.alive  = false;
    this._pooled= false;
    this._life  = 30;
    this._t     = 0;
  }

  init(x, y, resId, count) {
    this.x    = x; this.y = y;
    this.vx   = (Math.random() - 0.5) * 40;
    this.vy   = (Math.random() - 0.5) * 40;
    this.resId = resId;
    this.count = count;
    this.alive = true;
    this._life = 30;
    this._t    = 0;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this._t += dt;
    this._life -= dt;
    if (this._life <= 0) this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const bob  = Math.sin(this._t * 3) * 2;
    const size = 8;
    const col  = ORE_COLORS[this.resId] ?? '#ffffff';
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.fillStyle   = col;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth   = 1;
    ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
    ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
    ctx.restore();
  }
}
