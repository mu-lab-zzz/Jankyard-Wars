// src/world/Asteroid.js — asteroid entity with HP and resource drops

import { cacheSprite, getSprite } from '../utils/SpriteCache.js';
import { ORE } from '../constants.js';

const VARIANTS = 5;
const MIN_R    = 20;
const MAX_R    = 60;

export function initAsteroidSprites() {
  for (let v = 0; v < VARIANTS; v++) {
    const r   = MIN_R + (v / (VARIANTS - 1)) * (MAX_R - MIN_R);
    const key = `ast_${v}`;
    const sz  = (r * 2 + 4) | 0;
    cacheSprite(key, sz, sz, (ctx, w, h) => {
      const cx = w / 2, cy = h / 2;
      const pts = 9 + (v % 3);
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const a      = (i / pts) * Math.PI * 2;
        const jitter = 0.65 + 0.35 * Math.abs(Math.sin(v * 7.3 + i * 2.1));
        const pr     = r * jitter;
        const px     = cx + Math.cos(a) * pr;
        const py     = cy + Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, r*0.1, cx, cy, r);
      g.addColorStop(0, '#a09080');
      g.addColorStop(1, '#504038');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#302820'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#605040'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        const ax = cx + (Math.sin(v * 3.1 + i) * r * 0.4);
        const ay = cy + (Math.cos(v * 2.7 + i) * r * 0.4);
        ctx.beginPath();
        ctx.arc(ax, ay, r * 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
}

const DROP_TABLE = [
  { id: ORE.IRON,        weight: 50, min: 3, max: 8 },
  { id: ORE.COPPER,      weight: 25, min: 2, max: 5 },
  { id: ORE.CRYSTAL,     weight: 15, min: 1, max: 3 },
  { id: ORE.TITANIUM,    weight: 8,  min: 1, max: 2 },
  { id: ORE.DARK_MATTER, weight: 2,  min: 1, max: 1 },
];
const _totalWeight = DROP_TABLE.reduce((s, e) => s + e.weight, 0);

function rollDrop(rng) {
  let roll = rng() * _totalWeight;
  for (const entry of DROP_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) {
      const count = entry.min + Math.floor(rng() * (entry.max - entry.min + 1));
      return { id: entry.id, count };
    }
  }
  return { id: ORE.IRON, count: 1 };
}

export class Asteroid {
  constructor() {
    this.x  = 0; this.y  = 0;
    this.vx = 0; this.vy = 0;
    this.variant = 0;
    this.radius  = MIN_R;
    this.maxHp   = 100;
    this.hp      = 100;
    this.angle   = 0;
    this.av      = 0;
    this.alive   = false;
    this._pooled = false;
    this._drops  = [];
  }

  init(x, y, variant, rng) {
    this.x   = x; this.y = y;
    this.vx  = (rng() - 0.5) * 10;
    this.vy  = (rng() - 0.5) * 10;
    this.angle = rng() * Math.PI * 2;
    this.av    = (rng() - 0.5) * 0.2;
    this.variant = variant % VARIANTS;
    const t  = this.variant / (VARIANTS - 1);
    this.radius = MIN_R + t * (MAX_R - MIN_R);
    this.maxHp  = 50 + this.radius * 4 | 0;
    this.hp     = this.maxHp;
    this.alive  = true;

    this._drops.length = 0;
    const numDrops = 1 + (this.variant >> 1);
    for (let i = 0; i < numDrops; i++) {
      this._drops.push(rollDrop(rng));
    }
  }

  update(dt) {
    this.x     += this.vx * dt;
    this.y     += this.vy * dt;
    this.angle += this.av * dt;
    this.vx    *= 0.999;
    this.vy    *= 0.999;
  }

  getDrops() { return this._drops; }

  draw(ctx) {
    if (!this.alive) return;
    const sprite = getSprite(`ast_${this.variant}`);
    if (!sprite) return;
    const sw = sprite.width, sh = sprite.height;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
    if (this.hp < this.maxHp) {
      const t = 1 - this.hp / this.maxHp;
      ctx.fillStyle = `rgba(255,60,0,${(t * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
