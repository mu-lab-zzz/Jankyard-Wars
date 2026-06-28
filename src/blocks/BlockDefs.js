// src/blocks/BlockDefs.js — data-driven block type definitions
// To add a new block: create a new entry here (or import from a separate file).
// No switch statements — behaviours are encoded as data.

import { BS, BID, RES } from '../constants.js';

// Helper drawers
function rect(ctx, x, y, w, h, fill, stroke, lw = 1) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw * 0.5, y + lw * 0.5, w - lw, h - lw);
  }
}

function polygon(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill;     ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function circle(ctx, cx, cy, r, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fill)   { ctx.fillStyle = fill;     ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// Each definition object:
// id, name, hp, mass, powerDraw, powerGen,
// cost: { [RES.xxx]: n, ... }  (null = not craftable)
// effect: { thrust, weaponDmg, weaponRange, weaponCooldown, drillDmg,
//           cargoBonus, shieldMax, shieldRegen, radarRange, drones }
// canDelete: boolean (core = false)
// draw(ctx, w, h) — draws sprite into a w×h canvas

export const BLOCK_DEFS = [
  // ── CORE ─────────────────────────────────────────────────────────────────
  {
    id: BID.CORE,
    name: 'コア',
    hp: 250, mass: 6, powerDraw: 5, powerGen: 0,
    cost: null, canDelete: false,
    effect: {},
    draw(ctx, w, h) {
      rect(ctx, w*0.1, h*0.1, w*0.8, h*0.8, '#302000', '#e0a020', 2);
      // Inner diamond
      polygon(ctx,
        [w*0.5,h*0.15, w*0.85,h*0.5, w*0.5,h*0.85, w*0.15,h*0.5],
        '#c08010', '#ffd040', 1.5
      );
      circle(ctx, w*0.5, h*0.5, w*0.12, '#fff8e0', null);
    },
  },

  // ── ARMOR ─────────────────────────────────────────────────────────────────
  {
    id: BID.ARMOR,
    name: '装甲',
    hp: 350, mass: 10, powerDraw: 0, powerGen: 0,
    cost: { [RES.IRON]: 3 }, canDelete: true,
    effect: {},
    draw(ctx, w, h) {
      rect(ctx, w*0.04, h*0.04, w*0.92, h*0.92, '#3a4a5c', '#6080a0', 2);
      ctx.strokeStyle = '#506070'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w*0.04,h*0.04); ctx.lineTo(w*0.96,h*0.96); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.96,h*0.04); ctx.lineTo(w*0.04,h*0.96); ctx.stroke();
    },
  },

  // ── ENGINE ────────────────────────────────────────────────────────────────
  {
    id: BID.ENGINE,
    name: 'エンジン',
    hp: 80, mass: 3, powerDraw: 18, powerGen: 0,
    cost: { [RES.IRON]: 5, [RES.COPPER]: 3 }, canDelete: true,
    effect: { thrust: 900 },
    draw(ctx, w, h) {
      // Body
      rect(ctx, w*0.12, h*0.18, w*0.56, h*0.64, '#182840', '#2060a0', 1.5);
      // Nozzle cone (pointing right = +x direction)
      polygon(ctx,
        [w*0.68,h*0.24, w*0.94,h*0.5, w*0.68,h*0.76],
        '#1890d0', '#40c0ff', 1
      );
      // Exhaust glow at left
      rect(ctx, w*0.02, h*0.32, w*0.12, h*0.36, 'rgba(60,160,255,0.35)', null);
      // Detail lines
      ctx.strokeStyle = '#204060'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w*0.25,h*0.28); ctx.lineTo(w*0.25,h*0.72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.45,h*0.28); ctx.lineTo(w*0.45,h*0.72); ctx.stroke();
    },
  },

  // ── WEAPON ────────────────────────────────────────────────────────────────
  {
    id: BID.WEAPON,
    name: '武器',
    hp: 70, mass: 4, powerDraw: 8, powerGen: 0,
    cost: { [RES.IRON]: 4, [RES.COPPER]: 2 }, canDelete: true,
    effect: { weaponDmg: 25, weaponRange: 600, weaponCooldown: 0.5 },
    draw(ctx, w, h) {
      // Turret base
      circle(ctx, w*0.4, h*0.5, w*0.26, '#300808', '#802020', 1.5);
      // Gun barrel (pointing right)
      rect(ctx, w*0.36, h*0.42, w*0.58, h*0.16, '#601010', '#d03030', 1.5);
      // Tip flash
      circle(ctx, w*0.94, h*0.5, w*0.07, '#ff8080', null);
    },
  },

  // ── DRILL ────────────────────────────────────────────────────────────────
  {
    id: BID.DRILL,
    name: 'ドリル',
    hp: 120, mass: 5, powerDraw: 12, powerGen: 0,
    cost: { [RES.IRON]: 4, [RES.TITANIUM]: 1 }, canDelete: true,
    effect: { drillDmg: 40, drillRange: 80 },
    draw(ctx, w, h) {
      rect(ctx, w*0.1, h*0.2, w*0.5, h*0.6, '#3a2208', '#c06010', 1.5);
      // Drill cone
      polygon(ctx,
        [w*0.6,h*0.22, w*0.96,h*0.5, w*0.6,h*0.78],
        '#e08020', '#ffa040', 1.5
      );
      // Spiral lines on cone
      ctx.strokeStyle = '#804010'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ty = h * (0.32 + i * 0.14);
        ctx.beginPath(); ctx.moveTo(w*0.62,ty); ctx.lineTo(w*0.88, h*0.5 + (ty - h*0.5)*0.2); ctx.stroke();
      }
    },
  },

  // ── CONTAINER ────────────────────────────────────────────────────────────
  {
    id: BID.CONTAINER,
    name: 'コンテナ',
    hp: 100, mass: 4, powerDraw: 0, powerGen: 0,
    cost: { [RES.IRON]: 3, [RES.COPPER]: 1 }, canDelete: true,
    effect: { cargoBonus: 200 },
    draw(ctx, w, h) {
      rect(ctx, w*0.06, h*0.1, w*0.88, h*0.8, '#0e2e10', '#30a040', 2);
      // Three compartments
      ctx.fillStyle = '#1a4a20';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(w*(0.12 + i*0.26), h*0.18, w*0.2, h*0.64);
      }
      ctx.strokeStyle = '#206030'; ctx.lineWidth = 1;
      ctx.strokeRect(w*0.06, h*0.1, w*0.88, h*0.8);
    },
  },

  // ── GENERATOR ────────────────────────────────────────────────────────────
  {
    id: BID.GENERATOR,
    name: '発電機',
    hp: 90, mass: 5, powerDraw: 0, powerGen: 40,
    cost: { [RES.COPPER]: 4, [RES.CRYSTAL]: 1 }, canDelete: true,
    effect: {},
    draw(ctx, w, h) {
      rect(ctx, w*0.08, h*0.08, w*0.84, h*0.84, '#282000', '#c0c000', 1.5);
      // Lightning bolt
      polygon(ctx,
        [w*0.56,h*0.1, w*0.3,h*0.52, w*0.5,h*0.52, w*0.44,h*0.9, w*0.7,h*0.48, w*0.5,h*0.48],
        '#ffff20', '#fff060', 1
      );
    },
  },

  // ── BATTERY ──────────────────────────────────────────────────────────────
  {
    id: BID.BATTERY,
    name: 'バッテリー',
    hp: 80, mass: 4, powerDraw: 0, powerGen: 0,
    cost: { [RES.COPPER]: 2, [RES.CRYSTAL]: 2 }, canDelete: true,
    effect: { batteryCapacity: 300 },
    draw(ctx, w, h) {
      rect(ctx, w*0.08, h*0.15, w*0.76, h*0.7, '#001e20', '#20a0c0', 1.5);
      // Terminal nub
      rect(ctx, w*0.84, h*0.35, w*0.1, h*0.3, '#208090', null);
      // Cells
      ctx.fillStyle = '#006080';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(w*(0.12 + i*0.17), h*0.22, w*0.12, h*0.56);
      }
    },
  },

  // ── SHIELD ───────────────────────────────────────────────────────────────
  {
    id: BID.SHIELD,
    name: 'シールド',
    hp: 60, mass: 2, powerDraw: 20, powerGen: 0,
    cost: { [RES.CRYSTAL]: 3, [RES.COPPER]: 2 }, canDelete: true,
    effect: { shieldMax: 150, shieldRegen: 8 },
    draw(ctx, w, h) {
      // Dome
      ctx.beginPath();
      ctx.arc(w*0.5, h*0.5, w*0.42, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,0,160,0.4)';
      ctx.fill();
      ctx.strokeStyle = '#a040ff'; ctx.lineWidth = 2;
      ctx.stroke();
      // Inner ring
      ctx.beginPath();
      ctx.arc(w*0.5, h*0.5, w*0.22, 0, Math.PI * 2);
      ctx.strokeStyle = '#c080ff'; ctx.lineWidth = 1;
      ctx.stroke();
    },
  },

  // ── RADAR ────────────────────────────────────────────────────────────────
  {
    id: BID.RADAR,
    name: 'レーダー',
    hp: 50, mass: 1, powerDraw: 6, powerGen: 0,
    cost: { [RES.COPPER]: 2, [RES.CRYSTAL]: 1 }, canDelete: true,
    effect: { radarRange: 1400 },
    draw(ctx, w, h) {
      // Dish
      ctx.fillStyle = '#062010';
      ctx.beginPath();
      ctx.arc(w*0.5, h*0.7, w*0.4, Math.PI, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#40c060'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w*0.5, h*0.7, w*0.4, Math.PI, 0);
      ctx.stroke();
      // Mast
      ctx.strokeStyle = '#40c060'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(w*0.5,h*0.7); ctx.lineTo(w*0.5,h*0.15); ctx.stroke();
      // Sweep arc
      ctx.strokeStyle = 'rgba(60,200,80,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(w*0.5, h*0.7, w*0.32, -Math.PI*0.7, -Math.PI*0.3); ctx.stroke();
    },
  },

  // ── DRONE HATCH ──────────────────────────────────────────────────────────
  {
    id: BID.DRONE_HATCH,
    name: 'ドローン格納庫',
    hp: 80, mass: 3, powerDraw: 10, powerGen: 0,
    cost: { [RES.IRON]: 3, [RES.COPPER]: 3, [RES.CRYSTAL]: 1 }, canDelete: true,
    effect: { drones: 1 },
    draw(ctx, w, h) {
      rect(ctx, w*0.06, h*0.06, w*0.88, h*0.88, '#200830', '#d040ff', 1.5);
      // Hatch lines
      ctx.strokeStyle = '#a020d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w*0.5,h*0.06); ctx.lineTo(w*0.5,h*0.94); ctx.stroke();
      // Drone silhouette
      polygon(ctx,
        [w*0.5,h*0.28, w*0.72,h*0.5, w*0.5,h*0.72, w*0.28,h*0.5],
        'rgba(200,80,255,0.5)', '#ff80ff', 1
      );
    },
  },
];
