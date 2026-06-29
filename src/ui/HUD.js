// src/ui/HUD.js — in-game HUD drawn directly on canvas

import { C, ORE, STATION_DOCK_RANGE, STATION_INNER_RANGE } from '../constants.js';
import { ORE_COLORS, ORE_NAMES } from '../inventory/Inventory.js';
import { dist2 } from '../utils/Math2D.js';

const ORE_ORDER = [ORE.IRON, ORE.COPPER, ORE.CRYSTAL, ORE.TITANIUM, ORE.DARK_MATTER];

function drawBar(ctx, x, y, w, h, value, maxVal, fillColor, bgColor) {
  ctx.fillStyle = bgColor ?? 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, h);
  if (maxVal > 0) {
    const ratio = Math.max(0, Math.min(1, value / maxVal));
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w * ratio, h);
  }
  ctx.strokeStyle = '#1a3050';
  ctx.lineWidth   = 1;
  ctx.strokeRect(x, y, w, h);
}

export class HUD {
  constructor() {
    this._fps      = 0;
    this._fpsTimer = 0;
    this._frames   = 0;
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
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cw
   * @param {number} ch
   * @param {Ship} playerShip
   * @param {Inventory} inventory
   * @param {Camera} camera
   * @param {World} world
   * @param {EnemyManager} enemies
   * @param {Station} station
   * @param {Input} input
   */
  draw(ctx, cw, ch, playerShip, inventory, camera, world, enemies, station, input) {
    this._drawShipStatus(ctx, playerShip, inventory);
    this._drawCargo(ctx, cw, ch, inventory);
    this._drawSpeed(ctx, cw, playerShip);
    this._drawMinimap(ctx, cw, ch, playerShip, world, enemies, station);
    this._drawStationProximity(ctx, cw, ch, playerShip, station);
    this._drawKeyHints(ctx, cw, ch);
    if (input) this._drawJoystick(ctx, input);

    ctx.fillStyle = 'rgba(80,120,100,0.6)';
    ctx.font      = '10px monospace';
    ctx.fillText(`${this._fps} FPS`, cw - 48, 12);
  }

  _drawShipStatus(ctx, ship, inventory) {
    if (!ship || !ship.stats) return;
    const x = 12, y = 12;
    const bw = 140, bh = 10;

    ctx.fillStyle = '#8ab0d0';
    ctx.font      = 'bold 11px monospace';
    ctx.fillText('HP', x, y + 9);
    drawBar(ctx, x + 22, y, bw, bh, ship.hp, ship.stats.maxHp,
      ship.hp / ship.stats.maxHp > 0.3 ? C.HP_BAR : C.HP_LOW,
      'rgba(0,0,0,0.5)'
    );
    ctx.fillStyle = '#a0c0d0';
    ctx.font      = '9px monospace';
    ctx.fillText(`${Math.ceil(ship.hp)}/${ship.stats.maxHp}`, x + 22 + bw + 4, y + 9);

    if (ship.shieldMax > 0) {
      ctx.fillStyle = '#8ab0d0';
      ctx.font      = 'bold 11px monospace';
      ctx.fillText('SH', x, y + 24);
      drawBar(ctx, x + 22, y + 14, bw, bh, ship.shieldHp, ship.shieldMax, C.SHIELD_BAR, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = '#a0c0d0';
      ctx.font      = '9px monospace';
      ctx.fillText(`${Math.ceil(ship.shieldHp)}/${ship.shieldMax}`, x + 22 + bw + 4, y + 23);
    }

    if (ship.stats.powerGen > 0 || ship.stats.powerDraw > 0) {
      const bal = ship.stats.powerBalance;
      ctx.fillStyle = bal >= 0 ? '#60ff80' : '#ff6040';
      ctx.font      = '10px monospace';
      ctx.fillText(`⚡ ${bal >= 0 ? '+' : ''}${bal | 0}`, x, y + 40);
    }
  }

  _drawCargo(ctx, cw, ch, inventory) {
    const used = inventory.cargoUsed;
    const cap  = inventory.cargoCapacity;
    const full = used >= cap;
    const x = 12, y = 56;
    const bw = 140, bh = 10;

    ctx.fillStyle = full ? C.CARGO_FULL : C.CARGO_BAR;
    ctx.font      = 'bold 11px monospace';
    ctx.fillText('積荷', x, y + 9);

    drawBar(ctx, x + 36, y, bw, bh, used, cap,
      full ? C.CARGO_FULL : C.CARGO_BAR,
      'rgba(0,0,0,0.5)'
    );
    ctx.fillStyle = '#a0c0a0';
    ctx.font      = '9px monospace';
    ctx.fillText(`${used}/${cap}`, x + 36 + bw + 4, y + 9);

    // Ore breakdown at bottom
    const by = ch - 10;
    let cx2  = 12;
    ctx.font = '10px monospace';
    for (const oreId of ORE_ORDER) {
      const count = inventory.getCargo(oreId);
      if (count <= 0) continue;
      ctx.fillStyle = ORE_COLORS[oreId] ?? '#ffffff';
      const label   = `${ORE_NAMES[oreId] ?? oreId}:${count}`;
      ctx.fillText(label, cx2, by);
      cx2 += ctx.measureText(label).width + 12;
    }
  }

  _drawSpeed(ctx, cw, ship) {
    if (!ship) return;
    const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) | 0;
    ctx.fillStyle = '#7090a0';
    ctx.font      = '10px monospace';
    ctx.fillText(`${spd} u/s`, cw - 60, 24);
  }

  _drawStationProximity(ctx, cw, ch, ship, station) {
    if (!ship || !station) return;
    const d2    = dist2(ship.x, ship.y, station.x, station.y);
    const dockR = STATION_DOCK_RANGE;
    if (d2 > dockR * dockR) return;

    const dist   = Math.sqrt(d2) | 0;
    const inner  = dist2(ship.x, ship.y, station.x, station.y) < STATION_INNER_RANGE * STATION_INNER_RANGE;
    const blink  = (Math.sin(Date.now() * 0.005) > 0);
    const col    = inner ? C.DOCK_ACTIVE : (blink ? '#ffe060' : '#a0c080');

    ctx.fillStyle = col;
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'center';
    const label   = inner
      ? '🛸 ドック接続中'
      : `🛸 ステーション ${dist}m [E]でドック`;
    ctx.fillText(label, cw * 0.5, ch - 48);
    ctx.textAlign = 'left';
  }

  _drawMinimap(ctx, cw, ch, playerShip, world, enemies, station) {
    const mmW = 120, mmH = 120;
    const mmX = cw - mmW - 8;
    const mmY = ch - mmH - 8;
    const scale = 1 / 6;

    ctx.fillStyle   = 'rgba(0,6,16,0.75)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = C.HUD_BORDER;
    ctx.lineWidth   = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    const cx = mmX + mmW / 2;
    const cy = mmY + mmH / 2;
    const px = playerShip?.x ?? 0;
    const py = playerShip?.y ?? 0;

    // Station dot (cyan)
    if (station) {
      const sx = cx + (station.x - px) * scale;
      const sy = cy + (station.y - py) * scale;
      if (sx >= mmX && sx <= mmX + mmW && sy >= mmY && sy <= mmY + mmH) {
        ctx.fillStyle = '#40d8ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Asteroids
    ctx.fillStyle = '#605040';
    for (const a of world.asteroids) {
      const ax = cx + (a.x - px) * scale;
      const ay = cy + (a.y - py) * scale;
      if (ax >= mmX && ax <= mmX + mmW && ay >= mmY && ay <= mmY + mmH) {
        ctx.fillRect(ax - 1, ay - 1, 2, 2);
      }
    }

    // Enemies
    ctx.fillStyle = '#ff4020';
    for (const ship of enemies.ships) {
      const ex = cx + (ship.x - px) * scale;
      const ey = cy + (ship.y - py) * scale;
      if (ex >= mmX && ex <= mmX + mmW && ey >= mmY && ey <= mmY + mmH) {
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
    }

    // Drops
    ctx.fillStyle = '#40e060';
    for (const d of world.drops) {
      const dx = cx + (d.x - px) * scale;
      const dy = cy + (d.y - py) * scale;
      if (dx >= mmX && dx <= mmX + mmW && dy >= mmY && dy <= mmY + mmH) {
        ctx.fillRect(dx - 1, dy - 1, 2, 2);
      }
    }

    // Player arrow
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
    ctx.font      = '9px monospace';
    ctx.fillText('[WASD]移動  [クリック/右側タップ]射撃  [E]ドリル/ドック  [Esc]設定', 12, ch - 24);
  }

  _drawJoystick(ctx, input) {
    if (input._joyId < 0) return; // no active touch on left side
    const ox   = input.joyOriginX;
    const oy   = input.joyOriginY;
    const jx   = input.joyX;
    const jy   = input.joyY;
    const maxR = 50;

    // Base ring
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#6090c0';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    // Knob
    ctx.fillStyle = 'rgba(80,160,220,0.5)';
    ctx.beginPath();
    ctx.arc(ox + jx * maxR, oy + jy * maxR, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#80c0ff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
