// src/engine/Camera.js — 2D camera with smooth follow and screen shake

import { lerp } from '../utils/Math2D.js';
import { CAMERA_LERP } from '../constants.js';

export class Camera {
  constructor() {
    this.x  = 0; this.y  = 0;   // current world position of screen centre
    this.tx = 0; this.ty = 0;   // target
    this.zoom = 1;

    this._shake  = 0;
    this._shakeX = 0;
    this._shakeY = 0;
  }

  follow(wx, wy) { this.tx = wx; this.ty = wy; }

  addShake(amount) { if (amount > this._shake) this._shake = amount; }

  update() {
    this.x = lerp(this.x, this.tx, CAMERA_LERP);
    this.y = lerp(this.y, this.ty, CAMERA_LERP);

    if (this._shake > 0.4) {
      this._shakeX = (Math.random() * 2 - 1) * this._shake;
      this._shakeY = (Math.random() * 2 - 1) * this._shake;
      this._shake *= 0.82;
    } else {
      this._shake  = 0;
      this._shakeX = 0;
      this._shakeY = 0;
    }
  }

  /** Apply world transform to ctx so world-space drawing works correctly. */
  apply(ctx) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    ctx.translate(cw * 0.5 + this._shakeX, ch * 0.5 + this._shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // World → screen
  toSX(wx, cw) { return (wx - this.x) * this.zoom + cw * 0.5 + this._shakeX; }
  toSY(wy, ch) { return (wy - this.y) * this.zoom + ch * 0.5 + this._shakeY; }

  // Screen → world
  toWX(sx, cw) { return (sx - cw * 0.5 - this._shakeX) / this.zoom + this.x; }
  toWY(sy, ch) { return (sy - ch * 0.5 - this._shakeY) / this.zoom + this.y; }

  /** Returns true if world-space circle is within the visible area. */
  isVisible(wx, wy, radius, cw, ch) {
    const margin = radius;
    const hw = cw * 0.5 / this.zoom + margin;
    const hh = ch * 0.5 / this.zoom + margin;
    return Math.abs(wx - this.x) < hw && Math.abs(wy - this.y) < hh;
  }
}
