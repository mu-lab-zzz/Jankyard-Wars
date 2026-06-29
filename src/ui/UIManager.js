// src/ui/UIManager.js — screen / overlay management

import { SCREEN } from '../constants.js';

export class UIManager {
  constructor() {
    this._screen    = SCREEN.GAME;
    this._listeners = new Map();

    this._overlays = {
      [SCREEN.STATION]:  document.getElementById('station-overlay'),
      [SCREEN.SETTINGS]: document.getElementById('settings-overlay'),
      [SCREEN.GAMEOVER]: document.getElementById('gameover-overlay'),
    };

    document.getElementById('btn-settings-close')?.addEventListener('click', () => {
      this.switchTo(SCREEN.GAME);
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this._emit('restart');
    });
  }

  onEvent(name, fn) { this._listeners.set(name, fn); }
  _emit(name)       { this._listeners.get(name)?.(); }

  get current() { return this._screen; }

  switchTo(screen) {
    for (const el of Object.values(this._overlays)) {
      if (el) el.classList.remove('active');
    }
    this._screen = screen;
    const el = this._overlays[screen];
    if (el) el.classList.add('active');
    this._emit('screenChange');
    return this;
  }

  showGameOver() { this.switchTo(SCREEN.GAMEOVER); }

  bindSettingsSaveLoad(onSave, onLoad) {
    document.getElementById('btn-settings-save')?.addEventListener('click', onSave);
    document.getElementById('btn-settings-load')?.addEventListener('click', onLoad);
  }
}
