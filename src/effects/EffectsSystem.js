// src/effects/EffectsSystem.js — pooled particle effects system

import { Pool } from '../utils/Pool.js';

// ── Particle ───────────────────────────────────────────────────────────────

class Particle {
  constructor() {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.life = 0; this.maxLife = 1;
    this.r = 3;
    this.r0 = 0; // start radius
    this.cr = 255; this.cg = 200; this.cb = 60;  // colour
    this.alive = false;
    this._pooled = false;
  }

  init(x, y, vx, vy, life, r, cr, cg, cb) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.r = r; this.r0 = r;
    this.cr = cr; this.cg = cg; this.cb = cb;
    this.alive = true;
  }

  update(dt) {
    this.x    += this.vx * dt;
    this.y    += this.vy * dt;
    this.vx   *= 0.96;
    this.vy   *= 0.96;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const t     = this.life / this.maxLife;
    const alpha = t.toFixed(2);
    const rad   = this.r * t;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(rad, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.cr},${this.cg},${this.cb},${alpha})`;
    ctx.fill();
  }
}

// ── Pool ───────────────────────────────────────────────────────────────────

const particlePool = new Pool(
  () => new Particle(),
  (p) => { p.alive = false; }
);
particlePool.prewarm(150);

const _particles = [];

// Pre-allocated colour sets to avoid string building in hot path
const COLORS = {
  explosion: [255, 160, 40],
  shield:    [80,  120, 255],
  drill:     [255, 180, 30],
  engine:    [60,  180, 255],
  spark:     [255, 240, 80],
};

function _emit(x, y, cr, cg, cb, count, speed, life, size) {
  for (let i = 0; i < count; i++) {
    const a  = Math.random() * Math.PI * 2;
    const s  = speed * (0.4 + Math.random() * 0.8);
    const p  = particlePool.get();
    p.init(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.8), size * (0.5 + Math.random()), cr, cg, cb);
    _particles.push(p);
  }
}

export const Effects = {
  explosion(x, y, scale = 1) {
    const [cr, cg, cb] = COLORS.explosion;
    _emit(x, y, cr, cg, cb,     Math.ceil(18 * scale), 150 * scale, 0.6, 6 * scale);
    _emit(x, y, 255, 80, 20,   Math.ceil(10 * scale), 80  * scale, 0.9, 4 * scale);
    _emit(x, y, 255, 255, 200, Math.ceil(6  * scale), 200 * scale, 0.3, 3 * scale);
  },

  shieldHit(x, y) {
    const [cr, cg, cb] = COLORS.shield;
    _emit(x, y, cr, cg, cb, 8, 120, 0.4, 4);
  },

  drillSpark(x, y) {
    const [cr, cg, cb] = COLORS.drill;
    _emit(x, y, cr, cg, cb, 4, 80, 0.25, 2);
  },

  engineTrail(x, y) {
    const [cr, cg, cb] = COLORS.engine;
    _emit(x, y, cr, cg, cb, 2, 30, 0.2, 3);
  },

  update(dt) {
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.update(dt);
      if (!p.alive) {
        particlePool.release(p);
        _particles.splice(i, 1);
      }
    }
  },

  draw(ctx) {
    for (const p of _particles) p.draw(ctx);
  },

  get count() { return _particles.length; },
};
