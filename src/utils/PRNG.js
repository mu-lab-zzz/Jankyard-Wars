// src/utils/PRNG.js — Xorshift32 seeded PRNG for deterministic world generation

export function makePRNG(seed) {
  let s = ((seed | 0) >>> 0) || 1;
  return function () {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// Mix two integers into a seed (for chunk-based generation)
export function hashInt2(a, b) {
  let h = ((a * 1664525 + 1013904223) ^ (b * 214013 + 2531011)) >>> 0;
  h ^= h >>> 16;
  h = (h * 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = (h * 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h;
}
