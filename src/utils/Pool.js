// src/utils/Pool.js — generic object pool (zero GC in steady state)

export class Pool {
  constructor(factory, onRelease) {
    this._factory   = factory;
    this._onRelease = onRelease;
    this._free      = [];
    this.activeCount = 0;
  }

  get() {
    const obj = this._free.length > 0 ? this._free.pop() : this._factory();
    obj._pooled = false;
    this.activeCount++;
    return obj;
  }

  release(obj) {
    if (obj._pooled) return;
    obj._pooled = true;
    this._onRelease(obj);
    this._free.push(obj);
    this.activeCount--;
  }

  // Pre-allocate objects so the factory isn't called during gameplay
  prewarm(n) {
    for (let i = 0; i < n; i++) {
      const obj = this._factory();
      obj._pooled = true;
      this._free.push(obj);
    }
  }
}
