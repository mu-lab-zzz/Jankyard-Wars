// src/craft/CraftSystem.js — crafting logic

import { RECIPES }    from './Recipes.js';
import { RES_NAMES }  from '../inventory/Inventory.js';

export class CraftSystem {
  constructor(inventory) {
    this._inv = inventory;
  }

  /** Returns RECIPES annotated with canCraft flag. */
  getAnnotatedRecipes() {
    return RECIPES.map(r => ({
      ...r,
      canCraft: this._inv.canAfford(r.cost),
    }));
  }

  /** Try to craft one item of recipe `id`. Returns true on success. */
  craft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    if (!this._inv.spendRes(recipe.cost)) return false;
    this._inv.addBlock(recipe.id, recipe.output);
    return true;
  }

  /** Format cost as human-readable string. */
  static costLabel(cost) {
    return Object.entries(cost)
      .map(([id, n]) => `${RES_NAMES[id] ?? id}×${n}`)
      .join(', ');
  }
}
