// src/ui/BuildUI.js — ship builder DOM overlay

import { getDef, allDefs, getBlockSprite } from '../blocks/BlockRegistry.js';
import { BID, BS }  from '../constants.js';
import { CraftSystem } from '../craft/CraftSystem.js';

export class BuildUI {
  constructor(canvas, ship, inventory, onDone) {
    this._canvas    = canvas;
    this._ship      = ship;
    this._inventory = inventory;
    this._onDone    = onDone;
    this._selectedType = BID.ARMOR;
    this._mode      = 'place'; // 'place' | 'delete'
    this._craftSys  = new CraftSystem(inventory);

    this._ui       = document.getElementById('build-ui');
    this._palette  = document.getElementById('build-palette');
    this._statsEl  = document.getElementById('build-stats');
    this._doneBtn  = document.getElementById('btn-build-done');
    this._clearBtn = document.getElementById('btn-build-clear');

    // Canvas for grid rendering (reuse main canvas)
    this._ctx = canvas.getContext('2d');

    this._bound_onPointerDown = this._onPointerDown.bind(this);
    this._bound_onContextMenu = (e) => e.preventDefault();

    this._paletteCards = new Map(); // typeId -> DOM element
    this._buildPalette();
    this._doneBtn.addEventListener('click', () => this._onDone());
    this._clearBtn.addEventListener('click', () => this._clearAll());
  }

  _buildPalette() {
    this._palette.innerHTML = '';
    this._paletteCards.clear();

    for (const def of allDefs()) {
      if (def.id === BID.CORE) continue; // core cannot be added from palette
      const card = document.createElement('div');
      card.className = 'palette-block';
      card.title = def.name;

      // Small preview canvas
      const previewCv = document.createElement('canvas');
      previewCv.width = 36; previewCv.height = 36;
      const pCtx = previewCv.getContext('2d');
      const sprite = getBlockSprite(def.id);
      if (sprite) pCtx.drawImage(sprite, 0, 0, 36, 36);
      card.appendChild(previewCv);

      const label = document.createElement('div');
      label.textContent = def.name;
      card.appendChild(label);

      const countEl = document.createElement('div');
      countEl.style.color = '#60e080';
      countEl.style.fontSize = '9px';
      card.appendChild(countEl);

      card.addEventListener('click', () => this._selectType(def.id));
      this._palette.appendChild(card);
      this._paletteCards.set(def.id, { card, countEl });
    }

    this._selectType(this._selectedType);
  }

  _selectType(typeId) {
    this._selectedType = typeId;
    for (const [id, { card }] of this._paletteCards) {
      card.classList.toggle('selected', id === typeId);
    }
  }

  _clearAll() {
    const toDelete = [];
    for (const blk of this._ship.blocks.values()) {
      if (blk.typeId !== BID.CORE) toDelete.push({ gx: blk.gx, gy: blk.gy });
    }
    for (const { gx, gy } of toDelete) this._ship.removeBlock(gx, gy);
    this._updateStats();
  }

  // ── Grid interaction ─────────────────────────────────────────────────────

  _onPointerDown(e) {
    if (e.target !== this._canvas) return;
    e.preventDefault();

    const r    = this._canvas.getBoundingClientRect();
    const scX  = this._canvas.width  / r.width;
    const scY  = this._canvas.height / r.height;
    const sx   = (e.clientX - r.left) * scX;
    const sy   = (e.clientY - r.top)  * scY;

    // Transform screen → ship-local grid
    const cw   = this._canvas.width;
    const ch   = this._canvas.height;
    const lx   = sx - cw / 2;
    const ly   = sy - ch / 2;
    const gx   = Math.round(lx / BS);
    const gy   = Math.round(ly / BS);

    if (e.button === 2 || e.buttons === 2) {
      // Right-click: delete
      this._ship.removeBlock(gx, gy);
    } else {
      // Left-click: place
      if (gx === 0 && gy === 0) return; // can't overwrite core
      // Check stock
      const count = this._inventory.getBlocks(this._selectedType);
      if (count <= 0) {
        // Flash indicator
        return;
      }
      if (this._ship.addBlock(this._selectedType, gx, gy)) {
        this._inventory.spendBlock(this._selectedType, 1);
      }
    }

    this._updateStats();
    this._updatePaletteCounters();
  }

  // ── Draw build view ──────────────────────────────────────────────────────

  draw() {
    const ctx  = this._ctx;
    const cw   = this._canvas.width;
    const ch   = this._canvas.height;

    // Background
    ctx.fillStyle = '#06090f';
    ctx.fillRect(0, 0, cw, ch);

    // Grid
    const gridCells = 20;
    const offX = cw / 2 % BS;
    const offY = ch / 2 % BS;
    ctx.strokeStyle = 'rgba(30,50,80,0.5)';
    ctx.lineWidth   = 0.5;
    for (let x = offX; x < cw; x += BS) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = offY; y < ch; y += BS) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // Centre cross
    ctx.strokeStyle = 'rgba(60,100,140,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cw/2, 0); ctx.lineTo(cw/2, ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ch/2); ctx.lineTo(cw, ch/2); ctx.stroke();

    // Draw ship blocks
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    for (const blk of this._ship.blocks.values()) {
      const px = blk.gx * BS - BS / 2;
      const py = blk.gy * BS - BS / 2;
      const sprite = getBlockSprite(blk.typeId);
      if (sprite) ctx.drawImage(sprite, px, py, BS, BS);
      // Highlight selected type
      if (blk.typeId === this._selectedType) {
        ctx.strokeStyle = '#60c0ff';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(px, py, BS, BS);
      }
    }

    // Ghost block at cursor (if hovering)
    if (this._hoverGX !== undefined) {
      const sprite = getBlockSprite(this._selectedType);
      if (sprite) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sprite, this._hoverGX * BS - BS / 2, this._hoverGY * BS - BS / 2, BS, BS);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _updateStats() {
    this._ship.recalcStats();
    const s = this._ship.stats;
    if (!s || !this._statsEl) return;
    this._statsEl.innerHTML =
      `<b>ブロック数</b>: ${s.blockCount}<br>` +
      `<b>重量</b>: ${s.mass}<br>` +
      `<b>推力</b>: ${s.thrust | 0}<br>` +
      `<b>耐久力</b>: ${s.maxHp}<br>` +
      `<b>シールド</b>: ${s.shieldMax}<br>` +
      `<b>発電量</b>: ${s.powerGen} / 消費${s.powerDraw}<br>` +
      `<b>積載量</b>: ${s.cargoCapacity}<br>` +
      `<b>武器数</b>: ${s.weaponCount}<br>`;
  }

  _updatePaletteCounters() {
    for (const [typeId, { countEl }] of this._paletteCards) {
      const n = this._inventory.getBlocks(typeId);
      countEl.textContent = `×${n}`;
      countEl.style.color = n > 0 ? '#60e080' : '#804040';
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  show() {
    this._ui.classList.add('active');
    this._canvas.addEventListener('pointerdown', this._bound_onPointerDown);
    this._canvas.addEventListener('contextmenu', this._bound_onContextMenu);
    this._canvas.addEventListener('pointermove', this._onPointerMove = (e) => {
      const r   = this._canvas.getBoundingClientRect();
      const scX = this._canvas.width  / r.width;
      const scY = this._canvas.height / r.height;
      const sx  = (e.clientX - r.left) * scX;
      const sy  = (e.clientY - r.top)  * scY;
      this._hoverGX = Math.round((sx - this._canvas.width  / 2) / BS);
      this._hoverGY = Math.round((sy - this._canvas.height / 2) / BS);
    });
    this._updateStats();
    this._updatePaletteCounters();
  }

  hide() {
    this._ui.classList.remove('active');
    this._canvas.removeEventListener('pointerdown', this._bound_onPointerDown);
    this._canvas.removeEventListener('contextmenu', this._bound_onContextMenu);
    if (this._onPointerMove) {
      this._canvas.removeEventListener('pointermove', this._onPointerMove);
      this._onPointerMove = null;
    }
    this._hoverGX = undefined;
    this._hoverGY = undefined;
    this._ship.recalcStats();
  }
}
