// src/craft/Recipes.js — recipe definitions for refining and crafting

import { BID, ORE, MAT } from '../constants.js';

// Refining: convert station ore into processed materials
export const REFINE_RECIPES = [
  { oreId: ORE.IRON,        matId: MAT.IRON_PLATE,     orePerMat: 2, name: '鉄板精製'       },
  { oreId: ORE.COPPER,      matId: MAT.COPPER_WIRE,    orePerMat: 2, name: '銅線精製'       },
  { oreId: ORE.CRYSTAL,     matId: MAT.CRYSTAL_LENS,   orePerMat: 1, name: '水晶レンズ精製'  },
  { oreId: ORE.TITANIUM,    matId: MAT.TITANIUM_ALLOY, orePerMat: 2, name: 'チタン合金精製'  },
  { oreId: ORE.DARK_MATTER, matId: MAT.ENERGY_CELL,    orePerMat: 1, name: 'エネルギーセル精製' },
];

// Crafting: spend processed materials to create block items
export const RECIPES = [
  { id: BID.ARMOR,       name: '装甲',          cost: { [MAT.IRON_PLATE]: 2                                            }, output: 1 },
  { id: BID.ENGINE,      name: 'エンジン',      cost: { [MAT.IRON_PLATE]: 2, [MAT.COPPER_WIRE]: 1                     }, output: 1 },
  { id: BID.WEAPON,      name: '武器',          cost: { [MAT.IRON_PLATE]: 1, [MAT.COPPER_WIRE]: 1                     }, output: 1 },
  { id: BID.DRILL,       name: 'ドリル',        cost: { [MAT.IRON_PLATE]: 2, [MAT.TITANIUM_ALLOY]: 1                  }, output: 1 },
  { id: BID.CONTAINER,   name: 'コンテナ',      cost: { [MAT.IRON_PLATE]: 2                                            }, output: 1 },
  { id: BID.GENERATOR,   name: '発電機',        cost: { [MAT.COPPER_WIRE]: 2, [MAT.CRYSTAL_LENS]: 1                   }, output: 1 },
  { id: BID.BATTERY,     name: 'バッテリー',    cost: { [MAT.COPPER_WIRE]: 2, [MAT.CRYSTAL_LENS]: 1                   }, output: 1 },
  { id: BID.SHIELD,      name: 'シールド',      cost: { [MAT.CRYSTAL_LENS]: 2, [MAT.COPPER_WIRE]: 1                   }, output: 1 },
  { id: BID.RADAR,       name: 'レーダー',      cost: { [MAT.COPPER_WIRE]: 1, [MAT.CRYSTAL_LENS]: 1                   }, output: 1 },
  { id: BID.DRONE_HATCH, name: 'ドローン格納庫', cost: { [MAT.IRON_PLATE]: 2, [MAT.COPPER_WIRE]: 2, [MAT.CRYSTAL_LENS]: 1 }, output: 1 },
];
