// src/blocks/BlockRegistry.js — registry of all block types + sprite cache

import { BLOCK_DEFS } from './BlockDefs.js';
import { cacheSprite, getSprite } from '../utils/SpriteCache.js';
import { BS } from '../constants.js';

const _byId = new Map();

for (const def of BLOCK_DEFS) {
  _byId.set(def.id, def);
}

/** Return block definition by id (throws if missing). */
export function getDef(id) {
  const d = _byId.get(id);
  if (!d) throw new Error(`Unknown block id: ${id}`);
  return d;
}

/** All registered block ids. */
export function allIds() { return _byId.keys(); }

/** All registered defs. */
export function allDefs() { return _byId.values(); }

/**
 * Pre-render every block type's sprite into an OffscreenCanvas.
 * Call once at startup — never during the game loop.
 */
export function initSprites() {
  for (const def of _byId.values()) {
    cacheSprite('block_' + def.id, BS, BS, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      def.draw(ctx, w, h);
    });
    // Damaged tint overlay (50% red)
    cacheSprite('block_dmg_' + def.id, BS, BS, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      def.draw(ctx, w, h);
      ctx.fillStyle = 'rgba(255,0,0,0.45)';
      ctx.fillRect(0, 0, w, h);
    });
  }
}

/** Return cached sprite canvas for a block id. */
export function getBlockSprite(id) { return getSprite('block_' + id); }
export function getBlockDmgSprite(id) { return getSprite('block_dmg_' + id); }
