// src/engine/Input.js — keyboard, mouse, touch input (zero per-frame allocation)

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Keyboard state — Object.create(null) avoids prototype chain lookup
    this._keys      = Object.create(null);
    this._justDown  = Object.create(null);

    // Mouse (screen coords)
    this.mouseX = 0;
    this.mouseY = 0;
    this._btnMask     = 0; // bitmask: button0 = left, button1 = middle, button2 = right
    this._justDownBtn = 0;

    // Virtual joystick (touch, left half of screen)
    this.joyX       = 0;  // -1..1
    this.joyY       = 0;
    this._joyId     = -1;
    this.joyOriginX = 0;  // screen position of joystick anchor
    this.joyOriginY = 0;

    // Touch fire (right half)
    this.touchFire  = false;
    this.touchFireX = 0;
    this.touchFireY = 0;
    this._fireId    = -1;

    // Bind handlers once so we can remove them in destroy()
    this._kd = this._onKeyDown.bind(this);
    this._ku = this._onKeyUp.bind(this);
    this._mm = this._onMouseMove.bind(this);
    this._md = this._onMouseDown.bind(this);
    this._mu = this._onMouseUp.bind(this);
    this._ts = this._onTouchStart.bind(this);
    this._tm = this._onTouchMove.bind(this);
    this._te = this._onTouchEnd.bind(this);

    window.addEventListener('keydown', this._kd, false);
    window.addEventListener('keyup',   this._ku, false);
    canvas.addEventListener('mousemove',  this._mm, { passive: true });
    canvas.addEventListener('mousedown',  this._md, false);
    canvas.addEventListener('mouseup',    this._mu, false);
    canvas.addEventListener('touchstart', this._ts, { passive: false });
    canvas.addEventListener('touchmove',  this._tm, { passive: false });
    canvas.addEventListener('touchend',   this._te, false);
    canvas.addEventListener('touchcancel',this._te, false);
  }

  // ---- raw handlers ----
  _onKeyDown(e) {
    if (!this._keys[e.code]) this._justDown[e.code] = true;
    this._keys[e.code] = true;
  }
  _onKeyUp(e) { this._keys[e.code] = false; }

  _canvasPos(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width  / r.width;
    const sy = this.canvas.height / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  _onMouseMove(e) {
    const p = this._canvasPos(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
  }
  _onMouseDown(e) { e.preventDefault(); this._btnMask |= 1 << e.button; this._justDownBtn |= 1 << e.button; }
  _onMouseUp(e)   { this._btnMask &= ~(1 << e.button); }

  _onTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const p = this._canvasPos(t.clientX, t.clientY);
      if (p.x < this.canvas.width * 0.5) {
        if (this._joyId < 0) {
          this._joyId     = t.identifier;
          this.joyOriginX = p.x;
          this.joyOriginY = p.y;
          this.joyX = 0; this.joyY = 0;
        }
      } else {
        if (this._fireId < 0) {
          this._fireId    = t.identifier;
          this.touchFire  = true;
          this.touchFireX = p.x;
          this.touchFireY = p.y;
        }
      }
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const p = this._canvasPos(t.clientX, t.clientY);
      if (t.identifier === this._joyId) {
        const dx = p.x - this.joyOriginX;
        const dy = p.y - this.joyOriginY;
        const r  = Math.sqrt(dx * dx + dy * dy);
        const maxR = 50;
        if (r > 0) {
          this.joyX = dx / Math.max(r, maxR);
          this.joyY = dy / Math.max(r, maxR);
        }
      } else if (t.identifier === this._fireId) {
        this.touchFireX = p.x;
        this.touchFireY = p.y;
      }
    }
  }

  _onTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this._joyId) {
        this._joyId = -1; this.joyX = 0; this.joyY = 0;
      } else if (t.identifier === this._fireId) {
        this._fireId = -1; this.touchFire = false;
      }
    }
  }

  // ---- query API ----
  isDown(code)      { return !!this._keys[code]; }
  justDown(code)    { return !!this._justDown[code]; }
  mouseDown(btn)    { return !!(this._btnMask & (1 << btn)); }
  mouseJustDown(btn){ return !!(this._justDownBtn & (1 << btn)); }

  /** Call once per frame, at the end, to clear just-pressed state. */
  flush() {
    for (const k in this._justDown) delete this._justDown[k];
    this._justDownBtn = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup',   this._ku);
    this.canvas.removeEventListener('mousemove',   this._mm);
    this.canvas.removeEventListener('mousedown',   this._md);
    this.canvas.removeEventListener('mouseup',     this._mu);
    this.canvas.removeEventListener('touchstart',  this._ts);
    this.canvas.removeEventListener('touchmove',   this._tm);
    this.canvas.removeEventListener('touchend',    this._te);
    this.canvas.removeEventListener('touchcancel', this._te);
  }
}
