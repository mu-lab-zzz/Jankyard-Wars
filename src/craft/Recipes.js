// src/craft/Recipes.js — crafting recipe definitions

import { BID, RES } from '../constants.js';

// Each recipe: { id (=block typeId), name, cost: { [resId]: count }, output: 1 }
export const RECIPES = [
  {
    id:   BID.ARMOR,
    name: '装甲',
    cost: { [RES.IRON]: 3 },
    output: 1,
  },
  {
    id:   BID.ENGINE,
    name: 'エンジン',
    cost: { [RES.IRON]: 5, [RES.COPPER]: 3 },
    output: 1,
  },
  {
    id:   BID.WEAPON,
    name: '武器',
    cost: { [RES.IRON]: 4, [RES.COPPER]: 2 },
    output: 1,
  },
  {
    id:   BID.DRILL,
    name: 'ドリル',
    cost: { [RES.IRON]: 4, [RES.TITANIUM]: 1 },
    output: 1,
  },
  {
    id:   BID.CONTAINER,
    name: 'コンテナ',
    cost: { [RES.IRON]: 3, [RES.COPPER]: 1 },
    output: 1,
  },
  {
    id:   BID.GENERATOR,
    name: '発電機',
    cost: { [RES.COPPER]: 4, [RES.CRYSTAL]: 1 },
    output: 1,
  },
  {
    id:   BID.BATTERY,
    name: 'バッテリー',
    cost: { [RES.COPPER]: 2, [RES.CRYSTAL]: 2 },
    output: 1,
  },
  {
    id:   BID.SHIELD,
    name: 'シールド',
    cost: { [RES.CRYSTAL]: 3, [RES.COPPER]: 2 },
    output: 1,
  },
  {
    id:   BID.RADAR,
    name: 'レーダー',
    cost: { [RES.COPPER]: 2, [RES.CRYSTAL]: 1 },
    output: 1,
  },
  {
    id:   BID.DRONE_HATCH,
    name: 'ドローン格納庫',
    cost: { [RES.IRON]: 3, [RES.COPPER]: 3, [RES.CRYSTAL]: 1 },
    output: 1,
  },
];
