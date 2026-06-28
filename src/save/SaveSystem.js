// src/save/SaveSystem.js — JSON save / load via localStorage + file download

const LS_KEY = 'jankyard_wars_save';

export class SaveSystem {
  /** Serialize game state to a plain object. */
  static buildSave(playerShip, inventory, camera) {
    return {
      version:   2,
      timestamp: Date.now(),
      ship:      playerShip.toJSON(),
      inventory: inventory.toJSON(),
      camera:    { x: camera.x, y: camera.y },
    };
  }

  /** Save to localStorage. Returns true on success. */
  static saveLocal(playerShip, inventory, camera) {
    try {
      const data = SaveSystem.buildSave(playerShip, inventory, camera);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      return false;
    }
  }

  /** Download save as a JSON file. */
  static downloadSave(playerShip, inventory, camera) {
    const data = SaveSystem.buildSave(playerShip, inventory, camera);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `jankyard_wars_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Load from localStorage. Returns parsed object or null. */
  static loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** Prompt user to select a JSON file, return parsed data via callback. */
  static loadFromFile(callback) {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        callback(JSON.parse(text));
      } catch (err) {
        console.error('Load failed:', err);
      }
    };
    input.click();
  }

  /** Apply loaded data to game objects. Mutates ship, inventory, camera. */
  static applyLoad(data, playerShip, inventory, camera) {
    if (!data || data.version < 2) return false;
    try {
      // Rebuild ship
      playerShip.blocks.clear();
      playerShip._statsDirty  = true;
      playerShip._spriteDirty = true;
      for (const b of data.ship.blocks) {
        playerShip.addBlock(b.typeId, b.gx, b.gy);
        const blk = playerShip.getBlock(b.gx, b.gy);
        if (blk && b.hp !== undefined) blk.hp = b.hp;
      }
      playerShip.x     = data.ship.x     ?? 0;
      playerShip.y     = data.ship.y     ?? 0;
      playerShip.angle = data.ship.angle ?? 0;
      playerShip.vx    = data.ship.vx    ?? 0;
      playerShip.vy    = data.ship.vy    ?? 0;
      playerShip.recalcStats();
      playerShip.shieldHp = playerShip.shieldMax;

      inventory.fromJSON(data.inventory);

      if (data.camera) {
        camera.x = data.camera.x;
        camera.y = data.camera.y;
        camera.tx = camera.x;
        camera.ty = camera.y;
      }
      return true;
    } catch (e) {
      console.error('Apply save failed:', e);
      return false;
    }
  }
}
