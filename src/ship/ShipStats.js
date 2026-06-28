// src/ship/ShipStats.js — compute ship stats from block composition

import { getDef } from '../blocks/BlockRegistry.js';

// Stats object reused to avoid allocation
const _stats = {
  mass: 0,
  hp: 0,
  maxHp: 0,
  thrust: 0,
  powerGen: 0,
  powerDraw: 0,
  powerBalance: 0,
  shieldMax: 0,
  shieldRegen: 0,
  cargoCapacity: 200,  // base cargo
  radarRange: 600,     // base radar
  weaponCount: 0,
  drillCount: 0,
  droneCount: 0,
  batteryCapacity: 0,
  engineCount: 0,
  blockCount: 0,
};

/**
 * Recalculate stats from the ship's block map.
 * Returns the shared _stats object — copy values you need to persist.
 */
export function calcStats(blocks) {
  _stats.mass           = 0;
  _stats.maxHp          = 0;
  _stats.thrust         = 0;
  _stats.powerGen       = 0;
  _stats.powerDraw      = 0;
  _stats.shieldMax      = 0;
  _stats.shieldRegen    = 0;
  _stats.cargoCapacity  = 200;
  _stats.radarRange     = 600;
  _stats.weaponCount    = 0;
  _stats.drillCount     = 0;
  _stats.droneCount     = 0;
  _stats.batteryCapacity= 0;
  _stats.engineCount    = 0;
  _stats.blockCount     = 0;

  for (const blk of blocks.values()) {
    const def = getDef(blk.typeId);
    _stats.mass           += def.mass;
    _stats.maxHp          += def.hp;
    _stats.powerGen       += def.powerGen;
    _stats.powerDraw      += def.powerDraw;

    const eff = def.effect;
    if (eff.thrust)          { _stats.thrust          += eff.thrust;          _stats.engineCount++; }
    if (eff.shieldMax)         _stats.shieldMax        += eff.shieldMax;
    if (eff.shieldRegen)       _stats.shieldRegen      += eff.shieldRegen;
    if (eff.cargoBonus)        _stats.cargoCapacity    += eff.cargoBonus;
    if (eff.radarRange)        _stats.radarRange        = Math.max(_stats.radarRange, eff.radarRange);
    if (eff.weaponDmg)         _stats.weaponCount++;
    if (eff.drillDmg)          _stats.drillCount++;
    if (eff.drones)            _stats.droneCount       += eff.drones;
    if (eff.batteryCapacity)   _stats.batteryCapacity  += eff.batteryCapacity;
    _stats.blockCount++;
  }

  _stats.powerBalance = _stats.powerGen - _stats.powerDraw;
  // Underpowered ships get reduced thrust
  if (_stats.powerBalance < 0 && _stats.powerGen > 0) {
    const ratio = _stats.powerGen / _stats.powerDraw;
    _stats.thrust *= ratio;
  }

  return _stats;
}
