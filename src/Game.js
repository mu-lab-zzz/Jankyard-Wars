// src/Game.js — main game controller: loop, state machine, systems coordination

import {
  SCREEN, BID, BS, FIXED_DT, MAX_DT,
  STAR_COUNT, STAR_VIRTUAL, C, RES,
} from './constants.js';
import { Camera }          from './engine/Camera.js';
import { Input }           from './engine/Input.js';
import { initSprites }     from './blocks/BlockRegistry.js';
import { Ship }            from './ship/Ship.js';
import { Inventory }       from './inventory/Inventory.js';
import { World }           from './world/World.js';
import { EnemyManager }    from './enemy/EnemyShip.js';
import {
  bullets, updateBullets, drawBullets,
  fireWeapons, bulletPool,
}                          from './combat/WeaponSystem.js';
import { Effects }         from './effects/EffectsSystem.js';
import { HUD }             from './ui/HUD.js';
import { BuildUI }         from './ui/BuildUI.js';
import { CraftUI }         from './ui/CraftUI.js';
import { UIManager }       from './ui/UIManager.js';
import { SaveSystem }      from './save/SaveSystem.js';
import { dist2, angleTo }  from './utils/Math2D.js';

// ── Star field (pre-allocated, no per-frame allocation) ─────────────────────

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
  const px = 0.04; // parallax factor (stars move slower than world)
  const ox = ((camX * px) % STAR_VIRTUAL + STAR_VIRTUAL) % STAR_VIRTUAL;
  const oy = ((camY * px) % STAR_VIRTUAL + STAR_VIRTUAL) % STAR_VIRTUAL;

  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = STAR_COLS[c];
    const sz = c === 2 ? 2 : 1;
    for (let i = c; i < STAR_COUNT; i += 3) {
      // Tile the virtual canvas across the screen
      let x = ((_starX[i] - ox + STAR_VIRTUAL * 4) % STAR_VIRTUAL);
      let y = ((_starY[i] - oy + STAR_VIRTUAL * 4) % STAR_VIRTUAL);
      // Repeat tile if screen is larger than STAR_VIRTUAL
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

// ── Default player ship layout ───────────────────────────────────────────────

function _buildDefaultShip() {
  const ship = new Ship(0, 0, true);
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

// ── Game class ────────────────────────────────────────────────────────────────

export class Game {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');

    this._screen  = SCREEN.GAME;
    this._running = false;

    this._lastTime    = 0;
    this._accumulator = 0;

    // Systems
    this.camera    = new Camera();
    this.input     = new Input(canvas);
    this.inventory = new Inventory();
    this.world     = new World(Math.random() * 999999 | 0);
    this.enemies   = new EnemyManager();
    this.hud       = new HUD();

    // Player ship
    this.player    = null;

    // UI managers (initialised after ship is created)
    this._uiMgr    = new UIManager();
    this._buildUI  = null;
    this._craftUI  = null;

    // Fire cooldown key (prevent spam)
    this._drillTimer = 0;

    // Bound loop function
    this._boundLoop = this._loop.bind(this);
  }

  // ── Initialise ─────────────────────────────────────────────────────────────

  async init() {
    // Resize canvas to viewport
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Pre-render all block sprites
    initSprites();

    // Init world (asteroid sprites)
    this.world.init();

    // Init star field
    _initStars();

    // Create player ship
    this.player = _buildDefaultShip();

    // Starter resources
    this.inventory.addRes(RES.IRON,   25);
    this.inventory.addRes(RES.COPPER, 12);
    // Starter block stock
    this.inventory.addBlock(BID.ARMOR,     4);
    this.inventory.addBlock(BID.ENGINE,    2);
    this.inventory.addBlock(BID.WEAPON,    1);
    this.inventory.addBlock(BID.GENERATOR, 1);

    // Try to load saved game
    const saved = SaveSystem.loadLocal();
    if (saved) {
      SaveSystem.applyLoad(saved, this.player, this.inventory, this.camera);
    } else {
      this.camera.x  = this.player.x;
      this.camera.y  = this.player.y;
      this.camera.tx = this.player.x;
      this.camera.ty = this.player.y;
    }

    // Build + craft UI
    this._buildUI = new BuildUI(
      this._canvas, this.player, this.inventory,
      () => this._exitBuild()
    );
    this._craftUI = new CraftUI(
      this.inventory,
      () => this._exitCraft()
    );

    // UI manager events
    this._uiMgr.onEvent('restart',  () => this._restart());
    this._uiMgr.onEvent('screenChange', () => {}); // no-op, we handle manually

    this._uiMgr.bindSettingsSaveLoad(
      () => SaveSystem.downloadSave(this.player, this.inventory, this.camera),
      () => SaveSystem.loadFromFile(data => {
        SaveSystem.applyLoad(data, this.player, this.inventory, this.camera);
        this._uiMgr.switchTo(SCREEN.GAME);
        this._screen = SCREEN.GAME;
      })
    );

    // Settings close is handled by UIManager constructor; sync our state here
    this._uiMgr.onEvent('screenChange', () => {
      this._screen = this._uiMgr.current;
    });
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

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

    this._render();
    this.input.flush();
  }

  // ── Fixed update (physics) ────────────────────────────────────────────────

  _fixedUpdate(dt) {
    this._handleInput(dt);
    this.player.update(dt);
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update();

    // World (chunks, asteroids, drops)
    this.world.update(this.player.x, this.player.y, dt, this.inventory);

    // Consume pending enemy spawns
    for (const spawn of this.world.drainEnemySpawns()) {
      this.enemies.spawn(spawn.x, spawn.y);
    }

    // Enemies
    this.enemies.update(dt, this.player.x, this.player.y,
      (ship, tx, ty, isPlayer) => fireWeapons(ship, tx, ty, isPlayer)
    );

    // Bullets
    updateBullets(dt);

    // Collision: bullets <-> world
    this._checkCollisions();

    // Effects
    Effects.update(dt);

    // Drill
    this._drillTimer -= dt;

    // Auto-save every 60 seconds (approximate)
    this._autoSaveTimer = (this._autoSaveTimer || 0) + dt;
    if (this._autoSaveTimer > 60) {
      SaveSystem.saveLocal(this.player, this.inventory, this.camera);
      this._autoSaveTimer = 0;
    }

    // Game over check
    if (!this.player.alive) {
      this._screen = SCREEN.GAMEOVER;
      this._uiMgr.showGameOver();
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _handleInput(dt) {
    const inp = this.input;
    const ship = this.player;

    // Keyboard: W = forward, S = backward, A = rotate CCW, D = rotate CW
    const fwd   = (inp.isDown('KeyW') || inp.isDown('ArrowUp'))    ? 1 : 0;
    const back  = (inp.isDown('KeyS') || inp.isDown('ArrowDown'))  ? 0.3 : 0;
    const left  = (inp.isDown('KeyA') || inp.isDown('ArrowLeft'))  ? 1 : 0;
    const right = (inp.isDown('KeyD') || inp.isDown('ArrowRight')) ? 1 : 0;

    // Touch joystick
    const jx = inp.joyX;
    const jy = inp.joyY;
    const joyMag = Math.sqrt(jx * jx + jy * jy);

    let throttle = Math.max(fwd - back, 0);
    let torque   = right - left;

    if (joyMag > 0.1) {
      // Touch: joystick drives both rotation and thrust
      const shipFwd = { x: Math.cos(ship.angle), y: Math.sin(ship.angle) };
      const dot     = jx * shipFwd.x + jy * shipFwd.y;
      throttle      = Math.max(dot, 0) * joyMag;
      const cross   = jx * shipFwd.y - jy * shipFwd.x;
      torque        = -cross * 3;
    }

    ship.applyThrust(throttle, torque, dt);

    // Screen-space mouse position → world
    const cw = this._canvas.width, ch = this._canvas.height;
    const mouseWX = this.camera.toWX(inp.mouseX, cw);
    const mouseWY = this.camera.toWY(inp.mouseY, ch);

    // Fire (left mouse button or touch fire)
    const firing = inp.mouseDown(0) || inp.touchFire;
    const fireX  = inp.touchFire ? this.camera.toWX(inp.touchFireX, cw) : mouseWX;
    const fireY  = inp.touchFire ? this.camera.toWY(inp.touchFireY, ch) : mouseWY;
    if (firing) {
      fireWeapons(ship, fireX, fireY, true);
    }

    // Engine trail effect
    if (throttle > 0.1 && ship.stats && ship.stats.engineCount > 0) {
      for (const blk of ship.blocks.values()) {
        if (blk.typeId !== BID.ENGINE) continue;
        const cos = Math.cos(ship.angle);
        const sin = Math.sin(ship.angle);
        const lx = blk.gx * BS;
        const ly = blk.gy * BS;
        const wx = ship.x + lx * cos - ly * sin;
        const wy = ship.y + lx * sin + ly * cos;
        Effects.engineTrail(wx - cos * BS * 0.8, wy - sin * BS * 0.8);
      }
    }

    // Drill (E key)
    if ((inp.isDown('KeyE') || inp.isDown('Space')) && this._drillTimer <= 0) {
      this._tryDrill();
      this._drillTimer = 0.12;
    }

    // Mode switches
    if (inp.justDown('KeyB')) this._enterBuild();
    if (inp.justDown('KeyC')) this._enterCraft();
    if (inp.justDown('Escape') || inp.justDown('KeyP')) this._enterSettings();
  }

  // ── Drill ─────────────────────────────────────────────────────────────────

  _tryDrill() {
    const ship = this.player;
    if (!ship.stats || ship.stats.drillCount === 0) return;

    let closestDist2 = Infinity;
    let closestAst   = null;
    const drillRange = 80 + BS * 1.5;
    const rangeSq    = drillRange * drillRange;

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

  // ── Collision detection ────────────────────────────────────────────────────

  _checkCollisions() {
    const enemyShips = this.enemies.ships;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.alive) continue;

      if (b.isPlayer) {
        // vs asteroids
        let hit = false;
        for (const a of this.world.asteroids) {
          if (!a.alive) continue;
          const r = a.radius;
          if (dist2(b.x, b.y, a.x, a.y) < r * r) {
            const destroyed = this.world.damageAsteroid(a, b.damage);
            if (destroyed) {
              Effects.explosion(a.x, a.y, a.radius / 28);
              this.camera.addShake(3);
            } else {
              Effects.drillSpark(b.x, b.y);
            }
            b.alive = false; hit = true; break;
          }
        }
        if (hit) continue;

        // vs enemies
        for (const ship of enemyShips) {
          if (!ship.alive) continue;
          const r = ship.radius + 6;
          if (dist2(b.x, b.y, ship.x, ship.y) < r * r) {
            const prevShield = ship.shieldHp;
            ship.damageAt(b.x, b.y, b.damage);
            if (prevShield > 0) Effects.shieldHit(b.x, b.y);
            else                Effects.explosion(b.x, b.y, 0.5);
            if (!ship.alive)    Effects.explosion(ship.x, ship.y, 2.5);
            b.alive = false;
            break;
          }
        }

      } else {
        // Enemy bullet vs player
        if (!this.player.alive) continue;
        const pr = this.player.radius + 6;
        if (dist2(b.x, b.y, this.player.x, this.player.y) < pr * pr) {
          const prevShield = this.player.shieldHp;
          this.player.damageAt(b.x, b.y, b.damage);
          if (prevShield > 0) {
            Effects.shieldHit(b.x, b.y);
            this.camera.addShake(4);
          } else {
            Effects.explosion(b.x, b.y, 0.4);
            this.camera.addShake(9);
          }
          b.alive = false;
        }
      }
    }
  }

  // ── Screen transitions ────────────────────────────────────────────────────

  _enterBuild() {
    if (this._screen === SCREEN.BUILD) { this._exitBuild(); return; }
    this._screen = SCREEN.BUILD;
    this._buildUI.show();
  }

  _exitBuild() {
    this._screen = SCREEN.GAME;
    this._buildUI.hide();
    this.player.recalcStats();
    // Restore HP if it now exceeds max after blocks removed
    this.player.hp = Math.min(this.player.hp || this.player.stats.maxHp, this.player.stats.maxHp);
  }

  _enterCraft() {
    if (this._screen === SCREEN.CRAFT) { this._exitCraft(); return; }
    this._screen = SCREEN.CRAFT;
    this._craftUI.show();
  }

  _exitCraft() {
    this._screen = SCREEN.GAME;
    this._craftUI.hide();
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

  _restart() {
    // Rebuild player ship
    this.player.blocks.clear();
    this.player._statsDirty  = true;
    this.player._spriteDirty = true;
    this.player._sprite      = null;
    this.player.x     = 0; this.player.y = 0;
    this.player.vx    = 0; this.player.vy = 0;
    this.player.angle = 0; this.player.av = 0;
    this.player.alive = true;

    this.player.addBlock(BID.CORE,      0,  0);
    this.player.addBlock(BID.ARMOR,     0, -1);
    this.player.addBlock(BID.ENGINE,   -2,  0);
    this.player.addBlock(BID.WEAPON,    1,  0);
    this.player.addBlock(BID.GENERATOR,-1,  1);
    this.player.recalcStats();
    this.player.hp       = this.player.stats.maxHp;
    this.player.shieldHp = 0;

    this.camera.x  = 0; this.camera.y  = 0;
    this.camera.tx = 0; this.camera.ty = 0;

    this._screen = SCREEN.GAME;
    this._uiMgr.switchTo(SCREEN.GAME);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    const ctx  = this._ctx;
    const cw   = this._canvas.width;
    const ch   = this._canvas.height;

    // Clear
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, cw, ch);

    if (this._screen === SCREEN.BUILD) {
      this._buildUI.draw();
      return;
    }

    // Stars (screen-space parallax — before camera transform)
    _drawStars(ctx, this.camera.x, this.camera.y, cw, ch);

    // World-space rendering
    ctx.save();
    this.camera.apply(ctx);

    this.world.drawAsteroids(ctx);
    this.world.drawDrops(ctx);
    drawBullets(ctx);
    this.enemies.draw(ctx);
    this.player.drawShield(ctx);
    this.player.draw(ctx);
    Effects.draw(ctx);

    ctx.restore();

    // HUD (screen-space)
    if (this._screen === SCREEN.GAME) {
      this.hud.draw(ctx, cw, ch, this.player, this.inventory, this.camera, this.world, this.enemies);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  _resize() {
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }
}
