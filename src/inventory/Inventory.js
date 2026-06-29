// src/inventory/Inventory.js — 2-tier resource system: cargo (ship) + station storage

import { ORE, MAT, ORE_WEIGHT } from '../constants.js';

export const ORE_COLORS = Object.freeze({
  [ORE.IRON]:        '#a0b8c8',
  [ORE.COPPER]:      '#e07830',
  [ORE.CRYSTAL]:     '#60d8ff',
  [ORE.TITANIUM]:    '#c0c8e0',
  [ORE.DARK_MATTER]: '#d060ff',
});

export const ORE_NAMES = Object.freeze({
  [ORE.IRON]:        '鉄鉱石',
  [ORE.COPPER]:      '銅鉱石',
  [ORE.CRYSTAL]:     '水晶',
  [ORE.TITANIUM]:    'チタン',
  [ORE.DARK_MATTER]: '暗黒物質',
});

export const MAT_COLORS = Object.freeze({
  [MAT.IRON_PLATE]:     '#c8d8e0',
  [MAT.COPPER_WIRE]:    '#f0a050',
  [MAT.CRYSTAL_LENS]:   '#80e8ff',
  [MAT.TITANIUM_ALLOY]: '#e0e8ff',
  [MAT.ENERGY_CELL]:    '#e080ff',
});

export const MAT_NAMES = Object.freeze({
  [MAT.IRON_PLATE]:     '鉄板',
  [MAT.COPPER_WIRE]:    '銅線',
  [MAT.CRYSTAL_LENS]:   '水晶レンズ',
  [MAT.TITANIUM_ALLOY]: 'チタン合金',
  [MAT.ENERGY_CELL]:    'エネルギーセル',
});

export class Inventory {
  constructor() {
    // Ores carried on ship (weight-limited)
    this._cargo       = Object.create(null);
    this.cargoUsed     = 0;
    this.cargoCapacity = 20; // updated from ship.stats.cargoCapacity

    // Ores deposited at station
    this._stationOre = Object.create(null);

    // Processed materials at station
    this._materials  = Object.create(null);

    // Crafted block stock at station
    this._blockStock = Object.create(null);
  }

  // ── Cargo (ship) ───────────────────────────────────────────────────────────

  setCapacity(cap) { this.cargoCapacity = Math.max(1, cap); }

  /** Add ore to ship cargo, respecting weight limit. Returns amount actually added. */
  addOre(oreId, amount) {
    const weight   = ORE_WEIGHT[oreId] ?? 1;
    const free     = this.cargoCapacity - this.cargoUsed;
    const canAdd   = Math.max(0, Math.floor(free / weight));
    const actual   = Math.min(amount, canAdd);
    if (actual <= 0) return 0;
    this._cargo[oreId]  = (this._cargo[oreId]  || 0) + actual;
    this.cargoUsed      += actual * weight;
    return actual;
  }

  getCargo(oreId)   { return this._cargo[oreId] ?? 0; }
  cargoFull()       { return this.cargoUsed >= this.cargoCapacity; }
  cargoEntries()    { return Object.entries(this._cargo); }

  // ── Station ore ────────────────────────────────────────────────────────────

  /** Move all ship cargo to station ore storage. */
  depositAllOre() {
    for (const id in this._cargo) {
      if (this._cargo[id] > 0) {
        this._stationOre[id] = (this._stationOre[id] || 0) + this._cargo[id];
      }
    }
    this._cargo    = Object.create(null);
    this.cargoUsed = 0;
  }

  getStationOre(oreId) { return this._stationOre[oreId] ?? 0; }
  stationOreEntries()  { return Object.entries(this._stationOre); }

  // ── Materials (refined at station) ─────────────────────────────────────────

  getMat(matId)    { return this._materials[matId] ?? 0; }
  matEntries()     { return Object.entries(this._materials); }

  addMat(matId, n) { this._materials[matId] = (this._materials[matId] || 0) + n; }

  canAffordMat(cost) {
    for (const id in cost) {
      if ((this._materials[id] || 0) < cost[id]) return false;
    }
    return true;
  }

  spendMat(cost) {
    if (!this.canAffordMat(cost)) return false;
    for (const id in cost) this._materials[id] -= cost[id];
    return true;
  }

  /** Refine station ore into material. Returns units produced (0 if insufficient). */
  refineOre(oreId, matId, orePerMat) {
    const have   = this._stationOre[oreId] ?? 0;
    const canMake = Math.floor(have / orePerMat);
    if (canMake <= 0) return 0;
    const useOre = canMake * orePerMat;
    this._stationOre[oreId] -= useOre;
    this._materials[matId]   = (this._materials[matId] || 0) + canMake;
    return canMake;
  }

  // ── Block stock (crafted at station) ───────────────────────────────────────

  getBlocks(typeId)  { return this._blockStock[typeId] ?? 0; }
  blockEntries()     { return Object.entries(this._blockStock); }
  addBlock(typeId, n = 1) { this._blockStock[typeId] = (this._blockStock[typeId] || 0) + n; }

  spendBlock(typeId, n = 1) {
    if ((this._blockStock[typeId] || 0) < n) return false;
    this._blockStock[typeId] -= n;
    return true;
  }

  // ── Serialisation ──────────────────────────────────────────────────────────

  toJSON() {
    return {
      cargo:      { ...this._cargo      },
      stationOre: { ...this._stationOre },
      materials:  { ...this._materials  },
      blockStock: { ...this._blockStock },
    };
  }

  fromJSON(data) {
    if (data.cargo)      { this._cargo      = Object.create(null); Object.assign(this._cargo,      data.cargo);      }
    if (data.stationOre) { this._stationOre = Object.create(null); Object.assign(this._stationOre, data.stationOre); }
    if (data.materials)  { this._materials  = Object.create(null); Object.assign(this._materials,  data.materials);  }
    if (data.blockStock) { this._blockStock = Object.create(null); Object.assign(this._blockStock, data.blockStock); }
    this._recalcCargoUsed();
  }

  _recalcCargoUsed() {
    let total = 0;
    for (const id in this._cargo) total += (this._cargo[id] || 0) * (ORE_WEIGHT[id] ?? 1);
    this.cargoUsed = total;
  }
}
