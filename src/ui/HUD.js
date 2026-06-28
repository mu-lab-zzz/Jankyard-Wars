// src/ui/HUD.js — in-game HUD drawn directly on canvas (no DOM, no allocation)

import { C, RES } from '../constants.js';
import { RES_COLORS, RES_NAMES } from '../inventory/Inventory.js';

// Pre-allocated label strings for each resource
const RES_ORDER = [RES.IRON, RES.COPPER, RES.CRYSTAL, RES.TITANIUM, RES.DARK_MATTER];

// A reusable bar-drawing helper
function drawBar(ctx, x, y, w, h, value, maxVal, fillColor, bgColor) {
  ctx.fillStyle = bgColor ?? 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, h);
  if (maxVal > 0) {
    const ratio = Math.max(0, Math.min(1, value / maxVal));
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w * ratio, h);
  }
  ctx.strokeStyle = '#1a3050';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export class HUD {
  constructor() {
    this._fps      = 0;
    this._fpsTimer = 0;
    this._frames   = 0;
    this._showMinimap = true;
  }

  update(dt) {
    this._fpsTimer += dt;
    this._frames++;
    if (this._fpsTimer >= 1) {
      this._fps      = this._frames;
      this._frames   = 0;
      this._fpsTimer = 0;
    }
  }

  /**
   * Draw all HUD elements.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cw  canvas width
   * @param {number} ch  canvas height
   * @param {Ship} playerShip
   * @param {Inventory} inventory
   * @param {Camera} camera
   * @param {World} world
   * @param {EnemyManager} enemies
   */
  draw(ctx, cw, ch, playerShip, inventory, camera, world, enemies) {
    this._drawShipStatus(ctx, playerShip);
    this._drawResources(ctx, cw, ch, inventory);
    this._drawSpeed(ctx, cw, playerShip);
    if (this._showMinimap) this._drawMinimap(ctx, cw, ch, playerShip, world, enemies);
    this._drawKeyHints(ctx, cw, ch);
    // FPS (top right corner)
    ctx.fillStyle = 'rgba(80,120,100,0.6)';
    ctx.font = '10px monospace';
    ctx.fillText(`${this._fps} FPS`, cw - 48, 12);
  }

  _drawShipStatus(ctx, ship) {
    if (!ship || !ship.stats) return;
    const x = 12, y = 12;
    const bw = 140, bh = 10;

    // HP
    ctx.fillStyle = '#8ab0d0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('HP', x, y + 9);
    drawBar(ctx, x + 22, y, bw, bh, ship.hp, ship.stats.maxHp,
      ship.hp / ship.stats.maxHp > 0.3 ? C.HP_BAR : C.HP_LOW,
      'rgba(0,0,0,0.5)'
    );
    ctx.fillStyle = '#a0c0d0';
    ctx.font = '9px monospace';
    ctx.fillText(`${Math.ceil(ship.hp)}/${ship.stats.maxHp}`, x + 22 + bw + 4, y + 9);

    // Shield
    if (ship.shieldMax > 0) {
      ctx.fillStyle = '#8ab0d0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SH', x, y + 24);
      drawBar(ctx, x + 22, y + 14, bw, bh, ship.shieldHp, ship.shieldMax, C.SHIELD_BAR, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = '#a0c0d0';
      ctx.font = '9px monospace';
      ctx.fillText(`${Math.ceil(ship.shieldHp)}/${ship.shieldMax}`, x + 22 + bw + 4, y + 23);
    }

    // Power balance
    if (ship.stats.powerGen > 0 || ship.stats.powerDraw > 0) {
      const bal  = ship.stats.powerBalance;
      const col  = bal >= 0 ? '#60ff80' : '#ff6040';
      ctx.fillStyle = col;
      ctx.font = '10px monospace';
      ctx.fillText(`⚡ ${bal >= 0 ? '+' : ''}${bal | 0}`, x, y + 40);
    }
  }

  _drawResources(ctx, cw, ch, inventory) {
    const y  = ch - 10;
    const x0 = 12;
    let   cx = x0;

    ctx.font = '10px monospace';
    for (const resId of RES_ORDER) {
      const count = inventory.getRes(resId);
      if (count <= 0) continue;
      ctx.fillStyle = RES_COLORS[resId] ?? '#ffffff';
      ctx.fillText(`${RES_NAMES[resId]}:${count}`, cx, y);
      cx += ctx.measureText(`${RES_NAMES[resId]}:${count}`).width + 14;
    }
  }

  _drawSpeed(ctx, cw, ship) {
    if (!ship) return;
    const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) | 0;
    ctx.fillStyle = '#7090a0';
    ctx.font = '10px monospace';
    ctx.fillText(`${spd} u/s`, cw - 60, 24);
  }

  _drawMinimap(ctx, cw, ch, playerShip, world, enemies) {
    const mmW = 120, mmH = 120;
    const mmX = cw - mmW - 8;
    const mmY = ch - mmH - 8;
    const scale = 1 / 6; // 1:6 world-to-minimap

    ctx.fillStyle = 'rgba(0,6,16,0.75)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = C.HUD_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    const cx = mmX + mmW / 2;
    const cy = mmY + mmH / 2;
    const px = playerShip?.x ?? 0;
    const py = playerShip?.y ?? 0;

    // Asteroids (gray)
    ctx.fillStyle = '#605040';
    for (const a of world.asteroids) {
      const ax = cx + (a.x - px) * scale;
      const ay = cy + (a.y - py) * scale;
      if (ax >= mmX && ax <= mmX + mmW && ay >= mmY && ay <= mmY + mmH) {
        ctx.fillRect(ax - 1, ay - 1, 2, 2);
      }
    }

    // Enemies (red)
    ctx.fillStyle = '#ff4020';
    for (const ship of enemies.ships) {
      const ex = cx + (ship.x - px) * scale;
      const ey = cy + (ship.y - py) * scale;
      if (ex >= mmX && ex <= mmX + mmW && ey >= mmY && ey <= mmY + mmH) {
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
    }

    // Drops (green dots)
    ctx.fillStyle = '#40e060';
    for (const d of world.drops) {
      const dx = cx + (d.x - px) * scale;
      const dy = cy + (d.y - py) * scale;
      if (dx >= mmX && dx <= mmX + mmW && dy >= mmY && dy <= mmY + mmH) {
        ctx.fillRect(dx - 1, dy - 1, 2, 2);
      }
    }

    // Player (white arrow)
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerShip?.angle ?? 0);
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _drawKeyHints(ctx, cw, ch) {
    ctx.fillStyle = 'rgba(60,80,100,0.5)';
    ctx.font = '9px monospace';
    const hints = '[WASD]移動  [Bキー]建造  [Cキー]クラフト  [クリック]射撃  [Eキー]ドリル';
    ctx.fillText(hints, 12, ch - 24);
  }
}
