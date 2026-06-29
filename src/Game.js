// src/Game.js — main game controller: loop, state machine, systems coordination

import {
  SCREEN, BID, BS, FIXED_DT, MAX_DT,
  STAR_COUNT, STAR_VIRTUAL, C,
  STATION_DOCK_RANGE, STATION_INNER_RANGE,
} from './constants.js';
import { Camera }          from './engine/Camera.js';
import { Input }           from './engine/Input.js';
import { initSprites }     from './blocks/BlockRegistry.js';
import { Ship }            from './ship/Ship.js';
import { Inventory }       from './inventory/Inventory.js';
import { World }           from './world/World.js';
import { Station }         from './world/Station.js';
import { EnemyManager }    from './enemy/EnemyShip.js';
import {
  bullets, updateBullets, drawBullets,
  fireWeapons,
}                          from './combat/WeaponSystem.js';
import { Effects }         from './effects/EffectsSystem.js';
import { HUD }             from './ui/HUD.js';
import { BuildUI }         from './ui/BuildUI.js';
import { StationUI }       from './ui/StationUI.js';
import { UIManager }       from './ui/UIManager.js';
import { SaveSystem }      from './save/SaveSystem.js';
import { dist2 }           from './utils/Math2D.js';

// ── Star field ────────────────────────────────────────────────────────────────

const _starX    = new Float32Array(STAR_COUNT);
const _starY    = new Float32Array(STAR_COUNT);
const _starType = new Uint8Array(STAR_COUNT);
const STAR_COLS = [C.STAR_DIM, C.STAR_MED, C.STAR_BRIGHT];

function _initStars() {
  for (let i = 0; i < STAR_COUNT; i++) {
    _starX[i]    = Math.random() * STAR_VIRTUAL;
    _starY[i]    = Math.random() * STAR_VIRTUAL;
    _starType[i] = Math.random() < 0.6 ? 0 : (Math.random() < 0.7 ? 1 : 2);
  }
}

function _drawStars(ctx, camX, camY, cw, ch) {
  const px = 0.04;
  const ox = ((camX * px) % STAR_VIRTUAL + STAR_VIRTUAL) % STAR_VIRTUAL;
  const oy = ((camY * px) % STAR_VIRTUAL + STAR_VIRTUAL) % STAR_VIRTUAL;

  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = STAR_COLS[c];
    const sz = c === 2 ? 2 : 1;
    for (let i = c; i < STAR_COUNT; i += 3) {
      let x = ((_starX[i] - ox + STAR_VIRTUAL * 4) % STAR_VIRTUAL);
      let y = ((_starY[i] - oy + STAR_VIRTUAL * 4) % STAR_VIRTUAL);
      for (let tx = 0; x + tx * STAR_VIRTUAL < cw + STAR_VIRTUAL; tx++) {
        for (let ty = 0; y + ty * STAR_VIRTUAL < ch + STAR_VIRTUAL; ty++) {
          const sx = x + tx * STAR_VIRTUAL;
          const sy = y + ty * STAR_VIRTUAL;
          if (sx >= -2 && sx <= cw + 2 && sy >= -2 && sy <= ch + 2) {
            ctx.fillRect(sx, sy, sz, sz);
          }
        }
      }
    }
  }
}

// ── Default player ship ────────────────────────────────────────────────────────

function _buildDefaultShip() {
  const ship = new Ship(0, -600, true); // Start away from station
  ship.addBlock(BID.CORE,      0,  0);
  ship.addBlock(BID.ARMOR,     0, -1);
  ship.addBlock(BID.ENGINE,   -2,  0);
  ship.addBlock(BID.ENGINE,   -2, -1);
  ship.addBlock(BID.WEAPON,    1,  0);
  ship.addBlock(BID.GENERATOR,-1,  1);
  ship.recalcStats();
  ship.hp       = ship.stats.maxHp;
  ship.shieldHp = 0;
  return ship;
}

// ── Game class ─────────────────────────────────────────────────────────────────

export class Game {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');

    this._screen  = SCREEN.GAME;
    this._running = false;
    this._docked  = false;

    this._lastTime    = 0;
    this._accumulator = 0;
    this._autoSaveTimer = 0;
    this._drillTimer    = 0;

    this.camera    = new Camera();
    this.input     = new Input(canvas);
    this.inventory = new Inventory();
    this.world     = new World(Math.random() * 999999 | 0);
    this.station   = new Station();
    this.enemies   = new EnemyManager();
    this.hud       = new HUD();

    this.player    = null;
    this._uiMgr    = new UIManager();
    this._buildUI  = null;
    this._stationUI= null;

    this._boundLoop = this._loop.bind(this);
  }

  // ── Initialise ──────────────────────────────────────────────────────────────

  async init() {
    this._resize();
    window.addEventListener('resize', () => this._resize());

    initSprites();
    this.world.init();
    _initStars();

    this.player = _buildDefaultShip();
    this._syncCargoCapacity();

    // Starter block stock (player starts with some blocks already crafted)
    this.inventory.addBlock(BID.ARMOR,     3);
    this.inventory.addBlock(BID.ENGINE,    1);
    this.inventory.addBlock(BID.WEAPON,    1);
    this.inventory.addBlock(BID.GENERATOR, 1);

    const saved = SaveSystem.loadLocal();
    if (saved) {
      SaveSystem.applyLoad(saved, this.player, this.inventory, this.camera);
      this._syncCargoCapacity();
    } else {
      this.camera.x  = this.player.x;
      this.camera.y  = this.player.y;
      this.camera.tx = this.player.x;
      this.camera.ty = this.player.y;
    }

    this._buildUI = new BuildUI(
      this._canvas, this.player, this.inventory,
      () => this._exitBuild()
    );

    this._stationUI = new StationUI(
      this.inventory,
      () => this._exitStation(),
      () => this._enterBuild()
    );

    this._uiMgr.onEvent('restart',      () => this._restart());
    this._uiMgr.onEvent('screenChange', () => { this._screen = this._uiMgr.current; });

    this._uiMgr.bindSettingsSaveLoad(
      () => SaveSystem.downloadSave(this.player, this.inventory, this.camera),
      () => SaveSystem.loadFromFile(data => {
        SaveSystem.applyLoad(data, this.player, this.inventory, this.camera);
        this._syncCargoCapacity();
        this._uiMgr.switchTo(SCREEN.GAME);
        this._screen = SCREEN.GAME;
      })
    );
  }

  // ── Game loop ───────────────────────────────────────────────────────────────

  start() {
    this._running  = true;
    this._lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);
  }

  _loop(now) {
    if (!this._running) return;
    requestAnimationFrame(this._boundLoop);

    const rawDt = Math.min((now - this._lastTime) / 1000, MAX_DT);
    this._lastTime = now;

    if (this._screen === SCREEN.GAME) {
      this._accumulator += rawDt;
      while (this._accumulator >= FIXED_DT) {
        this._fixedUpdate(FIXED_DT);
        this._accumulator -= FIXED_DT;
      }
      this.hud.update(rawDt);
    }

    this.station.update(rawDt);
    this._render();
    this.input.flush();
  }

  // ── Fixed update ────────────────────────────────────────────────────────────

  _fixedUpdate(dt) {
    this._handleInput(dt);
    this.player.update(dt);

    // Sync cargo capacity whenever stats may have changed
    this._syncCargoCapacity();

    this.camera.follow(this.player.x, this.player.y);
    this.camera.update();

    this.world.update(this.player.x, this.player.y, dt, this.inventory);

    for (const spawn of this.world.drainEnemySpawns()) {
      this.enemies.spawn(spawn.x, spawn.y);
    }

    this.enemies.update(dt, this.player.x, this.player.y,
      (ship, tx, ty, isPlayer) => fireWeapons(ship, tx, ty, isPlayer)
    );

    updateBullets(dt);
    this._checkCollisions();
    Effects.update(dt);
    this._drillTimer -= dt;

    this._autoSaveTimer += dt;
    if (this._autoSaveTimer > 60) {
      SaveSystem.saveLocal(this.player, this.inventory, this.camera);
      this._autoSaveTimer = 0;
    }

    if (!this.player.alive) {
      this._screen = SCREEN.GAMEOVER;
      this._uiMgr.showGameOver();
    }
  }

  // ── Input handling ──────────────────────────────────────────────────────────

  _handleInput(dt) {
    const inp  = this.input;
    const ship = this.player;

    const fwd   = (inp.isDown('KeyW') || inp.isDown('ArrowUp'))    ? 1   : 0;
    const back  = (inp.isDown('KeyS') || inp.isDown('ArrowDown'))  ? 0.3 : 0;
    const left  = (inp.isDown('KeyA') || inp.isDown('ArrowLeft'))  ? 1   : 0;
    const right = (inp.isDown('KeyD') || inp.isDown('ArrowRight')) ? 1   : 0;

    const jx     = inp.joyX;
    const jy     = inp.joyY;
    const joyMag = Math.sqrt(jx * jx + jy * jy);

    let throttle = Math.max(fwd - back, 0);
    let torque   = right - left;

    if (joyMag > 0.1) {
      const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
      const dot = jx * cos + jy * sin;
      throttle  = Math.max(dot, 0) * joyMag;
      const cross = jx * sin - jy * cos;
      torque    = cross * 3;
    }

    ship.applyThrust(throttle, torque, dt);

    const cw     = this._canvas.width;
    const ch     = this._canvas.height;
    const mouseWX = this.camera.toWX(inp.mouseX, cw);
    const mouseWY = this.camera.toWY(inp.mouseY, ch);

    const firing = inp.mouseDown(0) || inp.touchFire;
    const fireX  = inp.touchFire ? this.camera.toWX(inp.touchFireX, cw) : mouseWX;
    const fireY  = inp.touchFire ? this.camera.toWY(inp.touchFireY, ch) : mouseWY;
    if (firing) fireWeapons(ship, fireX, fireY, true);

    if (throttle > 0.1 && ship.stats && ship.stats.engineCount > 0) {
      for (const blk of ship.blocks.values()) {
        if (blk.typeId !== BID.ENGINE) continue;
        const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
        const wx  = ship.x + blk.gx * BS * cos - blk.gy * BS * sin;
        const wy  = ship.y + blk.gx * BS * sin + blk.gy * BS * cos;
        Effects.engineTrail(wx - cos * BS * 0.8, wy - sin * BS * 0.8);
      }
    }

    if ((inp.isDown('KeyE') || inp.isDown('Space')) && this._drillTimer <= 0) {
      // If near station, dock instead of drill
      const d2 = dist2(ship.x, ship.y, this.station.x, this.station.y);
      if (d2 < STATION_INNER_RANGE * STATION_INNER_RANGE) {
        if (inp.justDown('KeyE') || inp.justDown('Space')) {
          this._enterStation();
        }
      } else {
        this._tryDrill();
        this._drillTimer = 0.12;
      }
    }

    if (inp.justDown('KeyB')) {
      // Build only while docked
      if (this._docked) this._enterBuild();
    }
    if (inp.justDown('Escape') || inp.justDown('KeyP')) this._enterSettings();
  }

  // ── Drill ───────────────────────────────────────────────────────────────────

  _tryDrill() {
    const ship = this.player;
    if (!ship.stats || ship.stats.drillCount === 0) return;

    const drillRange = 80 + BS * 1.5;
    const rangeSq    = drillRange * drillRange;
    let closestDist2 = Infinity;
    let closestAst   = null;

    for (const a of this.world.asteroids) {
      if (!a.alive) continue;
      const d2 = dist2(ship.x, ship.y, a.x, a.y);
      if (d2 < rangeSq && d2 < closestDist2) {
        closestDist2 = d2;
        closestAst   = a;
      }
    }

    if (closestAst) {
      let drillDmg = 0;
      for (const blk of ship.blocks.values()) {
        if (blk.typeId === BID.DRILL) drillDmg += 40;
      }
      const destroyed = this.world.damageAsteroid(closestAst, drillDmg);
      Effects.drillSpark(closestAst.x, closestAst.y);
      if (destroyed) {
        Effects.explosion(closestAst.x, closestAst.y, closestAst.radius / 25);
        this.camera.addShake(4);
      }
    }
  }

  // ── Collision detection ─────────────────────────────────────────────────────

  _checkCollisions() {
    const enemyShips = this.enemies.ships;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.alive) continue;

      if (b.isPlayer) {
        let hit = false;
        for (const a of this.world.asteroids) {
          if (!a.alive) continue;
          const r = a.radius;
          if (dist2(b.x, b.y, a.x, a.y) < r * r) {
            const destroyed = this.world.damageAsteroid(a, b.damage);
            if (destroyed) { Effects.explosion(a.x, a.y, a.radius / 28); this.camera.addShake(3); }
            else             Effects.drillSpark(b.x, b.y);
            b.alive = false; hit = true; break;
          }
        }
        if (hit) continue;

        for (const ship of enemyShips) {
          if (!ship.alive) continue;
          const r = ship.radius + 6;
          if (dist2(b.x, b.y, ship.x, ship.y) < r * r) {
            const prev = ship.shieldHp;
            ship.damageAt(b.x, b.y, b.damage);
            if (prev > 0) Effects.shieldHit(b.x, b.y);
            else          Effects.explosion(b.x, b.y, 0.5);
            if (!ship.alive) Effects.explosion(ship.x, ship.y, 2.5);
            b.alive = false;
            break;
          }
        }
      } else {
        if (!this.player.alive) continue;
        const pr = this.player.radius + 6;
        if (dist2(b.x, b.y, this.player.x, this.player.y) < pr * pr) {
          const prev = this.player.shieldHp;
          this.player.damageAt(b.x, b.y, b.damage);
          if (prev > 0) { Effects.shieldHit(b.x, b.y); this.camera.addShake(4); }
          else          { Effects.explosion(b.x, b.y, 0.4); this.camera.addShake(9); }
          b.alive = false;
        }
      }
    }
  }

  // ── Screen transitions ──────────────────────────────────────────────────────

  _enterStation() {
    if (this._screen !== SCREEN.GAME) return;
    this._docked = true;
    this._screen = SCREEN.STATION;
    this._uiMgr.switchTo(SCREEN.STATION);
    this._stationUI.show();
  }

  _exitStation() {
    this._docked = false;
    this._stationUI.hide();
    this._uiMgr.switchTo(SCREEN.GAME);
    this._screen = SCREEN.GAME;
  }

  _enterBuild() {
    if (!this._docked) return; // dock required
    if (this._screen === SCREEN.BUILD) { this._exitBuild(); return; }
    this._stationUI.hide();
    this._screen = SCREEN.BUILD;
    this._buildUI.show();
  }

  _exitBuild() {
    this._screen = SCREEN.STATION;
    this._buildUI.hide();
    this.player.recalcStats();
    this._syncCargoCapacity();
    this.player.hp = Math.min(this.player.hp || this.player.stats.maxHp, this.player.stats.maxHp);
    this._stationUI.show();
  }

  _enterSettings() {
    if (this._screen === SCREEN.SETTINGS) {
      this._screen = SCREEN.GAME;
      this._uiMgr.switchTo(SCREEN.GAME);
    } else {
      this._screen = SCREEN.SETTINGS;
      this._uiMgr.switchTo(SCREEN.SETTINGS);
    }
  }

  _syncCargoCapacity() {
    if (this.player?.stats) {
      this.inventory.setCapacity(this.player.stats.cargoCapacity);
    }
  }

  _restart() {
    const ship = this.player;
    ship.blocks.clear();
    ship._statsDirty  = true;
    ship._spriteDirty = true;
    ship._sprite      = null;
    ship.x = -600; ship.y = 0;
    ship.vx = 0;   ship.vy = 0;
    ship.angle = 0; ship.av = 0;
    ship.alive = true;

    ship.addBlock(BID.CORE,      0,  0);
    ship.addBlock(BID.ARMOR,     0, -1);
    ship.addBlock(BID.ENGINE,   -2,  0);
    ship.addBlock(BID.WEAPON,    1,  0);
    ship.addBlock(BID.GENERATOR,-1,  1);
    ship.recalcStats();
    ship.hp       = ship.stats.maxHp;
    ship.shieldHp = 0;

    this.camera.x  = ship.x; this.camera.y  = ship.y;
    this.camera.tx = ship.x; this.camera.ty = ship.y;

    this._docked = false;
    this._screen = SCREEN.GAME;
    this._uiMgr.switchTo(SCREEN.GAME);
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  _render() {
    const ctx = this._ctx;
    const cw  = this._canvas.width;
    const ch  = this._canvas.height;

    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, cw, ch);

    if (this._screen === SCREEN.BUILD) {
      this._buildUI.draw();
      return;
    }

    _drawStars(ctx, this.camera.x, this.camera.y, cw, ch);

    ctx.save();
    this.camera.apply(ctx);

    this.station.draw(ctx);
    this.world.drawAsteroids(ctx);
    this.world.drawDrops(ctx);
    drawBullets(ctx);
    this.enemies.draw(ctx);
    this.player.drawShield(ctx);
    this.player.draw(ctx);
    Effects.draw(ctx);

    ctx.restore();

    if (this._screen === SCREEN.GAME || this._screen === SCREEN.STATION) {
      this.hud.draw(ctx, cw, ch, this.player, this.inventory,
        this.camera, this.world, this.enemies, this.station, this.input);
    }
  }

  _resize() {
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }
}
