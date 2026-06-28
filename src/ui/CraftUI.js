// src/ui/CraftUI.js — crafting overlay (DOM-based)

import { CraftSystem } from '../craft/CraftSystem.js';
import { getBlockSprite } from '../blocks/BlockRegistry.js';
import { RES_NAMES } from '../inventory/Inventory.js';

export class CraftUI {
  constructor(inventory, onClose) {
    this._inv      = inventory;
    this._onClose  = onClose;
    this._craft    = new CraftSystem(inventory);

    this._overlay  = document.getElementById('craft-overlay');
    this._grid     = document.getElementById('recipe-grid');
    this._closeBtn = document.getElementById('btn-craft-close');

    this._closeBtn.addEventListener('click', () => this._onClose());
    this._cards = []; // cached card elements
  }

  show() {
    this._overlay.classList.add('active');
    this._rebuildGrid();
  }

  hide() {
    this._overlay.classList.remove('active');
  }

  _rebuildGrid() {
    this._grid.innerHTML = '';
    this._cards.length   = 0;

    const recipes = this._craft.getAnnotatedRecipes();
    for (const recipe of recipes) {
      const card = document.createElement('div');
      card.className = 'recipe-card' + (recipe.canCraft ? ' can-craft' : '');

      // Block preview
      const cv = document.createElement('canvas');
      cv.width = 36; cv.height = 36;
      cv.style.display = 'block';
      cv.style.margin  = '0 auto 6px';
      const sprite = getBlockSprite(recipe.id);
      if (sprite) cv.getContext('2d').drawImage(sprite, 0, 0, 36, 36);
      card.appendChild(cv);

      const nameEl = document.createElement('div');
      nameEl.className   = 'recipe-name';
      nameEl.textContent = recipe.name;
      card.appendChild(nameEl);

      const costEl = document.createElement('div');
      costEl.className   = 'recipe-cost';
      costEl.textContent = CraftSystem.costLabel(recipe.cost);
      card.appendChild(costEl);

      const countEl = document.createElement('div');
      countEl.className   = 'recipe-count';
      countEl.textContent = `所持: ${this._inv.getBlocks(recipe.id)}`;
      card.appendChild(countEl);

      const btn = document.createElement('button');
      btn.className   = 'btn' + (recipe.canCraft ? ' primary' : '');
      btn.textContent = 'クラフト';
      btn.disabled    = !recipe.canCraft;
      btn.addEventListener('click', () => {
        if (this._craft.craft(recipe.id)) {
          this._rebuildGrid(); // refresh after crafting
        }
      });
      card.appendChild(btn);

      this._grid.appendChild(card);
      this._cards.push({ card, recipe });
    }
  }
}
