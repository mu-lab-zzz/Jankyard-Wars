// src/enemy/EnemyAI.js — finite state machine AI for enemy ships

import { AI } from '../constants.js';
import { dist2, angleTo, angleDiff, normAngle } from '../utils/Math2D.js';

// Tuning
const PATROL_SPEED       = 0.25;
const SEEK_DIST_SQ       = 1200 * 1200;  // enter seek state
const CHASE_DIST_SQ      = 900  * 900;   // enter chase
const ATTACK_DIST_SQ     = 450  * 450;   // enter attack mode
const FLEE_HP_RATIO      = 0.2;          // flee below 20% HP
const FLEE_DIST_SQ       = 1600 * 1600;  // stop fleeing

export class EnemyAI {
  constructor(ship) {
    this.ship    = ship;
    this.state   = AI.PATROL;
    this._timer  = 0;
    this._patrolAngle = Math.random() * Math.PI * 2;
    this._originX     = ship.x;
    this._originY     = ship.y;
  }

  update(dt, playerX, playerY, fireCallback) {
    const ship = this.ship;
    if (!ship.alive) return;

    const pDist2 = dist2(ship.x, ship.y, playerX, playerY);
    const stats  = ship.stats;
    const hpRatio = stats ? ship.hp / stats.maxHp : 1;

    this._timer += dt;

    // ── State transitions ──────────────────────────────────────────────
    switch (this.state) {
      case AI.PATROL:
        if (hpRatio < FLEE_HP_RATIO)      this._setState(AI.FLEE);
        else if (pDist2 < CHASE_DIST_SQ)  this._setState(AI.CHASE);
        else if (pDist2 < SEEK_DIST_SQ)   this._setState(AI.SEEK);
        break;

      case AI.SEEK:
        if (hpRatio < FLEE_HP_RATIO)      this._setState(AI.FLEE);
        else if (pDist2 < ATTACK_DIST_SQ) this._setState(AI.ATTACK);
        else if (pDist2 > SEEK_DIST_SQ)   this._setState(AI.PATROL);
        break;

      case AI.CHASE:
        if (hpRatio < FLEE_HP_RATIO)      this._setState(AI.FLEE);
        else if (pDist2 < ATTACK_DIST_SQ) this._setState(AI.ATTACK);
        else if (pDist2 > SEEK_DIST_SQ)   this._setState(AI.SEEK);
        break;

      case AI.ATTACK:
        if (hpRatio < FLEE_HP_RATIO)      this._setState(AI.FLEE);
        else if (pDist2 > ATTACK_DIST_SQ * 1.4) this._setState(AI.CHASE);
        break;

      case AI.FLEE:
        if (pDist2 > FLEE_DIST_SQ)        this._setState(AI.PATROL);
        break;
    }

    // ── State behaviours ──────────────────────────────────────────────
    switch (this.state) {
      case AI.PATROL:
        this._patrol(dt);
        break;

      case AI.SEEK:
        this._faceTarget(dt, playerX, playerY, 0.6);
        ship.applyThrust(PATROL_SPEED * 1.5, this._steerToward(playerX, playerY), dt);
        break;

      case AI.CHASE:
        this._faceTarget(dt, playerX, playerY, 0.9);
        ship.applyThrust(0.9, this._steerToward(playerX, playerY), dt);
        break;

      case AI.ATTACK:
        // Orbit player at moderate distance
        this._orbit(dt, playerX, playerY, 350);
        // Fire every frame (weapon has its own cooldown)
        fireCallback(ship, playerX, playerY, false);
        break;

      case AI.FLEE: {
        const awayAngle = angleTo(playerX, playerY, ship.x, ship.y);
        this._faceTarget(dt, ship.x + Math.cos(awayAngle) * 1000, ship.y + Math.sin(awayAngle) * 1000, 1);
        ship.applyThrust(1.0, this._steerToAngle(awayAngle), dt);
        break;
      }
    }
  }

  _setState(s) {
    this.state  = s;
    this._timer = 0;
  }

  _patrol(dt) {
    const ship = this.ship;
    // Wander in a circle around origin
    if (this._timer > 3 + Math.random() * 2) {
      this._patrolAngle += (Math.random() - 0.5) * Math.PI * 0.8;
      this._timer = 0;
    }
    const tx = this._originX + Math.cos(this._patrolAngle) * 200;
    const ty = this._originY + Math.sin(this._patrolAngle) * 200;
    ship.applyThrust(PATROL_SPEED, this._steerToward(tx, ty), dt);
  }

  _orbit(dt, cx, cy, radius) {
    const ship  = this.ship;
    const angle = angleTo(cx, cy, ship.x, ship.y);
    const perpAngle = angle + Math.PI * 0.5;
    const tx = cx + Math.cos(angle) * radius + Math.cos(perpAngle) * 80;
    const ty = cy + Math.sin(angle) * radius + Math.sin(perpAngle) * 80;
    ship.applyThrust(0.6, this._steerToward(tx, ty), dt);
  }

  _steerToward(tx, ty) {
    return this._steerToAngle(angleTo(this.ship.x, this.ship.y, tx, ty));
  }

  _steerToAngle(targetAngle) {
    const diff = angleDiff(this.ship.angle, targetAngle);
    return Math.sign(diff) * Math.min(Math.abs(diff) * 2, 1);
  }

  _faceTarget(dt, tx, ty, lerp) {
    // Snap angle toward target
    const desired = angleTo(this.ship.x, this.ship.y, tx, ty);
    const diff    = angleDiff(this.ship.angle, desired);
    this.ship.angle += diff * lerp * dt * 5;
  }
}
