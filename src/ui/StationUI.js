// src/ui/StationUI.js — station overlay: deposit/refine, craft, dock tabs

import { CraftSystem } from '../craft/CraftSystem.js';
import { REFINE_RECIPES } from '../craft/Recipes.js';
import { getBlockSprite } from '../blocks/BlockRegistry.js';
import {
  ORE_NAMES, ORE_COLORS, MAT_NAMES, MAT_COLORS,
} from '../inventory/Inventory.js';

export class StationUI {
  constructor(inventory, onClose, onEnterDock) {
    this._inv        = inventory;
    this._onClose    = onClose;
    this._onEnterDock= onEnterDock;
    this._craft      = new CraftSystem(inventory);
    this._activeTab  = 'refine';

    this._overlay    = document.getElementById('station-overlay');
    this._closeBtn   = document.getElementById('btn-station-close');
    this._depositBtn = document.getElementById('btn-deposit-all');
    this._dockBtn    = document.getElementById('btn-enter-build');

    this._panels = {
      refine: document.getElementById('station-panel-refine'),
      craft:  document.getElementById('station-panel-craft'),
      dock:   document.getElementById('station-panel-dock'),
    };

    this._closeBtn?.addEventListener('click', () => this._onClose());
    this._depositBtn?.addEventListener('click', () => {
      this._inv.depositAllOre();
      this._refresh();
    });
    this._dockBtn?.addEventListener('click', () => {
      this._onEnterDock();
    });

    document.querySelectorAll('.station-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
  }

  show() {
    this._overlay?.classList.add('active');
    this._switchTab('refine');
    this._refresh();
  }

  hide() {
    this._overlay?.classList.remove('active');
  }

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.station-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    for (const [key, panel] of Object.entries(this._panels)) {
      if (panel) panel.classList.toggle('hidden', key !== tab);
    }
    this._refresh();
  }

  _refresh() {
    if (this._activeTab === 'refine') this._refreshRefine();
    if (this._activeTab === 'craft')  this._refreshCraft();
    if (this._activeTab === 'dock')   this._refreshDock();
  }

  _refreshRefine() {
    const inv = this._inv;

    // Cargo summary
    const cargoEl = document.getElementById('station-cargo-info');
    if (cargoEl) {
      let html = `<div class="stat-row"><b>積荷</b>: ${inv.cargoUsed} / ${inv.cargoCapacity}</div>`;
      for (const [id, count] of inv.cargoEntries()) {
        if (count <= 0) continue;
        const col  = ORE_COLORS[id] ?? '#fff';
        const name = ORE_NAMES[id] ?? id;
        html += `<div class="ore-row" style="color:${col}">${name}: ${count}</div>`;
      }
      cargoEl.innerHTML = html || '<div style="color:#405060">積荷なし</div>';
    }

    // Station ore stocks + refine buttons
    const oreList = document.getElementById('station-ore-list');
    if (oreList) {
      oreList.innerHTML = '<div class="section-title">ステーション在庫 / 精製</div>';
      for (const recipe of REFINE_RECIPES) {
        const have    = inv.getStationOre(recipe.oreId);
        const canMake = Math.floor(have / recipe.orePerMat);
        const matHave = inv.getMat(recipe.matId);
        const col     = ORE_COLORS[recipe.oreId] ?? '#fff';
        const matCol  = MAT_COLORS[recipe.matId] ?? '#fff';
        const matName = MAT_NAMES[recipe.matId]  ?? recipe.matId;
        const oreName = ORE_NAMES[recipe.oreId]  ?? recipe.oreId;

        const row = document.createElement('div');
        row.className = 'refine-row';
        row.innerHTML =
          `<span style="color:${col}">${oreName}: ${have}</span>` +
          ` → <span style="color:${matCol}">${matName}: ${matHave}</span>` +
          `<button class="btn${canMake > 0 ? ' primary' : ''}" ${canMake <= 0 ? 'disabled' : ''}` +
          ` data-ore="${recipe.oreId}" data-mat="${recipe.matId}" data-ratio="${recipe.orePerMat}">` +
          `精製 (×${recipe.orePerMat}→1)</button>`;

        row.querySelector('button').addEventListener('click', (e) => {
          const btn = e.currentTarget;
          inv.refineOre(btn.dataset.ore, btn.dataset.mat, Number(btn.dataset.ratio));
          this._refreshRefine();
        });
        oreList.appendChild(row);
      }
    }
  }

  _refreshCraft() {
    // Material summary
    const matList = document.getElementById('station-mat-list');
    if (matList) {
      matList.innerHTML = '<div class="section-title">材料在庫</div>';
      let any = false;
      for (const [id, n] of this._inv.matEntries()) {
        if (n <= 0) continue;
        const col  = MAT_COLORS[id] ?? '#fff';
        const name = MAT_NAMES[id]  ?? id;
        matList.innerHTML += `<span class="mat-chip" style="color:${col}">${name}×${n}</span>`;
        any = true;
      }
      if (!any) matList.innerHTML += '<span style="color:#405060">材料なし</span>';
    }

    // Recipe cards
    const grid = document.getElementById('station-recipe-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const recipe of this._craft.getAnnotatedRecipes()) {
      const card = document.createElement('div');
      card.className = 'recipe-card' + (recipe.canCraft ? ' can-craft' : '');

      const cv = document.createElement('canvas');
      cv.width = 36; cv.height = 36;
      cv.style.cssText = 'display:block;margin:0 auto 6px';
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

      const stockEl = document.createElement('div');
      stockEl.className   = 'recipe-count';
      stockEl.textContent = `所持: ${this._inv.getBlocks(recipe.id)}`;
      card.appendChild(stockEl);

      const btn = document.createElement('button');
      btn.className   = 'btn' + (recipe.canCraft ? ' primary' : '');
      btn.textContent = '製造';
      btn.disabled    = !recipe.canCraft;
      btn.addEventListener('click', () => {
        if (this._craft.craft(recipe.id)) this._refreshCraft();
      });
      card.appendChild(btn);

      grid.appendChild(card);
    }
  }

  _refreshDock() {
    const dockInfo = document.getElementById('station-dock-info');
    if (dockInfo) {
      const s = this._inv;
      dockInfo.innerHTML =
        `<div class="stat-row">積荷: ${s.cargoUsed} / ${s.cargoCapacity}</div>`;
    }
  }
}
