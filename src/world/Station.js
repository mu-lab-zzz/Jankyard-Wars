// src/world/Station.js — animated home base station at world origin

import { STATION_X, STATION_Y, STATION_DOCK_RANGE, C } from '../constants.js';

export class Station {
  constructor() {
    this.x = STATION_X;
    this.y = STATION_Y;
    this._t = 0;

    // Pre-render glow sprite once to avoid per-frame gradient creation
    const sz = 50;
    const gc = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(sz, sz)
      : (() => { const c = document.createElement('canvas'); c.width = sz; c.height = sz; return c; })();
    const gctx = gc.getContext('2d');
    const g = gctx.createRadialGradient(sz/2, sz/2, 2, sz/2, sz/2, sz/2 - 3);
    g.addColorStop(0, 'rgba(60,180,255,1)');
    g.addColorStop(1, 'rgba(20,80,180,0)');
    gctx.fillStyle = g;
    gctx.beginPath();
    gctx.arc(sz/2, sz/2, sz/2 - 3, 0, Math.PI * 2);
    gctx.fill();
    this._glowSprite = gc;
    this._glowHalf   = sz / 2;
  }

  update(dt) { this._t += dt; }

  draw(ctx) {
    const t = this._t;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Dock range faint ring
    ctx.strokeStyle = 'rgba(60,200,100,0.08)';
    ctx.fillStyle   = 'rgba(60,200,100,0.03)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(0, 0, STATION_DOCK_RANGE, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Outer rotating ring
    ctx.save();
    ctx.rotate(t * 0.12);
    ctx.strokeStyle = '#1a3858';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      ctx.strokeStyle = '#1a3050';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(cx * 30, cy * 30);
      ctx.lineTo(cx * 82, cy * 82);
      ctx.stroke();
      ctx.fillStyle = '#2a5878';
      ctx.beginPath();
      ctx.arc(cx * 82, cy * 82, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a80b0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // Inner counter-rotating ring
    ctx.save();
    ctx.rotate(-t * 0.28);
    ctx.strokeStyle = '#204870';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.fillStyle   = '#305878';
      ctx.strokeStyle = '#50a0d0';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 46, Math.sin(a) * 46, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Static docking arms
    for (let i = 0; i < 3; i++) {
      const a  = (i / 3) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      ctx.strokeStyle = '#285888';
      ctx.lineWidth   = 5;
      ctx.beginPath();
      ctx.moveTo(cx * 26, cy * 26);
      ctx.lineTo(cx * 56, cy * 56);
      ctx.stroke();
      ctx.fillStyle   = '#3a80c0';
      ctx.strokeStyle = '#60c0ff';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(cx * 56, cy * 56, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Central hub
    ctx.fillStyle   = '#0c1e30';
    ctx.strokeStyle = '#3070b8';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Core glow (pulsing) — pre-rendered sprite, only globalAlpha changes
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.4);
    ctx.globalAlpha = pulse;
    ctx.drawImage(this._glowSprite, -this._glowHalf, -this._glowHalf);
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}
