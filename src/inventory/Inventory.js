// src/inventory/Inventory.js — resources + block stock management

import { RES } from '../constants.js';

// Resource display colours (index mirrors RES order)
export const RES_COLORS = {
  [RES.IRON]:        '#a0b8c8',
  [RES.COPPER]:      '#e07830',
  [RES.CRYSTAL]:     '#60d8ff',
  [RES.TITANIUM]:    '#c0c8e0',
  [RES.DARK_MATTER]: '#d060ff',
};

export const RES_NAMES = {
  [RES.IRON]:        '鉄',
  [RES.COPPER]:      '銅',
  [RES.CRYSTAL]:     '水晶',
  [RES.TITANIUM]:    'チタン',
  [RES.DARK_MATTER]: '暗黒物質',
};

export class Inventory {
  constructor() {
    // Resources: id -> count (always integers)
    this._res = Object.create(null);
    for (const k of Object.values(RES)) this._res[k] = 0;

    // Block stock: blockTypeId -> count
    this._blocks = Object.create(null);

    // Total cargo used (resources only; 1 unit = 1 resource)
    this.capacity = 200; // updated from ship stats
  }

  // ── Resources ──────────────────────────────────────────────────────────

  getRes(id) { return this._res[id] ?? 0; }

  addRes(id, amount) {
    if (!this._res[id] !== undefined) return false;
    this._res[id] = (this._res[id] || 0) + amount;
    return true;
  }

  /**
   * Attempt to consume resources.
   * @param {{ [id]: number }} cost
   * @returns {boolean} true if successful (resources deducted), false if insufficient
   */
  spendRes(cost) {
    for (const id in cost) {
      if ((this._res[id] || 0) < cost[id]) return false;
    }
    for (const id in cost) { this._res[id] -= cost[id]; }
    return true;
  }

  canAfford(cost) {
    for (const id in cost) {
      if ((this._res[id] || 0) < cost[id]) return false;
    }
    return true;
  }

  totalRes() {
    let t = 0;
    for (const k in this._res) t += this._res[k];
    return t;
  }

  resEntries() { return Object.entries(this._res); }

  // ── Block stock ────────────────────────────────────────────────────────

  getBlocks(typeId) { return this._blocks[typeId] ?? 0; }

  addBlock(typeId, n = 1) { this._blocks[typeId] = (this._blocks[typeId] || 0) + n; }

  spendBlock(typeId, n = 1) {
    if ((this._blocks[typeId] || 0) < n) return false;
    this._blocks[typeId] -= n;
    return true;
  }

  blockEntries() { return Object.entries(this._blocks); }

  // ── Serialisation ─────────────────────────────────────────────────────

  toJSON() {
    return { res: Object.assign({}, this._res), blocks: Object.assign({}, this._blocks) };
  }

  fromJSON(data) {
    if (data.res)    Object.assign(this._res,    data.res);
    if (data.blocks) Object.assign(this._blocks, data.blocks);
  }
}
