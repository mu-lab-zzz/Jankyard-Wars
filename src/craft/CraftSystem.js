// src/craft/CraftSystem.js — crafting logic (uses station materials)

import { RECIPES }   from './Recipes.js';
import { MAT_NAMES } from '../inventory/Inventory.js';

export class CraftSystem {
  constructor(inventory) {
    this._inv = inventory;
  }

  /** Returns RECIPES annotated with canCraft flag. */
  getAnnotatedRecipes() {
    return RECIPES.map(r => ({
      ...r,
      canCraft: this._inv.canAffordMat(r.cost),
    }));
  }

  /** Try to craft one item of recipe `id`. Returns true on success. */
  craft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    if (!this._inv.spendMat(recipe.cost)) return false;
    this._inv.addBlock(recipe.id, recipe.output);
    return true;
  }

  /** Format MAT cost as human-readable string. */
  static costLabel(cost) {
    return Object.entries(cost)
      .map(([id, n]) => `${MAT_NAMES[id] ?? id}×${n}`)
      .join(', ');
  }
}
