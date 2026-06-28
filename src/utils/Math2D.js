// src/utils/Math2D.js — allocation-free 2D math helpers

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
}
export function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
export function len2(x, y) { return x * x + y * y; }
export function len(x, y) { return Math.sqrt(x * x + y * y); }

// Rotate point (x, y) by angle (precomputed cos/sin)
export function rotX(x, y, cos, sin) { return x * cos - y * sin; }
export function rotY(x, y, cos, sin) { return x * sin + y * cos; }

export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

// Normalise angle to [-PI, PI]
export function normAngle(a) {
  const PI2 = Math.PI * 2;
  a = a % PI2;
  if (a >  Math.PI) a -= PI2;
  if (a < -Math.PI) a += PI2;
  return a;
}

// Shortest signed difference: how much to rotate `from` to reach `to`
export function angleDiff(from, to) { return normAngle(to - from); }
