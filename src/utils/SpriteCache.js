// src/utils/SpriteCache.js — cache pre-rendered canvas images (no image files needed)

const _cache = new Map();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * Create and cache a sprite.
 * drawFn(ctx, w, h) — called once at startup to draw the sprite.
 */
export function cacheSprite(key, w, h, drawFn) {
  if (_cache.has(key)) return _cache.get(key);
  const canvas = makeCanvas(w, h);
  const ctx    = canvas.getContext('2d');
  drawFn(ctx, w, h);
  _cache.set(key, canvas);
  return canvas;
}

export function getSprite(key) { return _cache.get(key) ?? null; }
export function hasSprite(key) { return _cache.has(key); }
export function clearAll()     { _cache.clear(); }
