// main.js — Phaser prototype + VERSION read/display
const FALLBACK_VERSION = '0.01';

async function loadVersion() {
  try {
    const res = await fetch('/VERSION', { cache: 'no-cache' });
    if (!res.ok) throw new Error('no VERSION');
    const text = (await res.text()).trim();
    return text || FALLBACK_VERSION;
  } catch (e) {
    return FALLBACK_VERSION;
  }
}

(async () => {
  const ver = await loadVersion();
  const verEl = document.getElementById('version');
  if (verEl) verEl.textContent = `Ver ${ver}`;

  // --- Phaser prototype below ---
  const WIDTH = 800, HEIGHT = 600;
  let mode = 'build'; // 'build' or 'play'
  let placedParts = []; // { _id, x, y, w, h }
  let player; // in play mode

  const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game-container',
    backgroundColor: '#222',
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 } }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  const game = new Phaser.Game(config);

  function preload() {
    // No external assets in this minimal prototype.
  }

  function create() {
    const scene = this;
    // simple grid background
    const g = scene.add.graphics();
    g.lineStyle(1, 0x333333);
    for (let x=0;x<WIDTH;x+=32) g.lineBetween(x,0,x,HEIGHT);
    for (let y=0;y<HEIGHT;y+=32) g.lineBetween(0,y,WIDTH,y);

    // restore any placedParts (if loaded via JSON before page reload)
    placedParts.forEach(p => {
      const r = scene.add.rectangle(p.x, p.y, p.w, p.h, 0x88cc88).setStrokeStyle(2,0x335533);
      r._id = p._id;
    });

    // input for placing parts
    scene.input.on('pointerdown', (pointer) => {
      if (mode !== 'build') return;
      const w = 48, h = 24;
      const snap = { x: Math.round(pointer.x/8)*8, y: Math.round(pointer.y/8)*8 }; // simple grid snap
      const part = scene.add.rectangle(snap.x, snap.y, w, h, 0x88cc88).setStrokeStyle(2,0x335533);
      part.setInteractive();
      part.on('pointerdown', (p) => {
        if (p.rightButtonDown()) {
          part.destroy();
          placedParts = placedParts.filter(pp => pp._id !== part._id);
        }
      });
      part._id = Phaser.Utils.String.UUID();
      placedParts.push({ _id: part._id, x: part.x, y: part.y, w, h });
    });

    // UI buttons (DOM)
    document.getElementById('btnMode').onclick = () => {
      if (mode === 'build') startPlayMode(scene);
      else startBuildMode(scene);
    };
    document.getElementById('btnSave').onclick = () => {
      const json = JSON.stringify(placedParts, null, 2);
      const blob = new Blob([json], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ship.json'; a.click();
      URL.revokeObjectURL(url);
    };
    document.getElementById('btnLoad').onclick = () => {
      const input = document.getElementById('fileInput');
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const arr = JSON.parse(text);
          // clear current rectangles
          scene.children.list.filter(c=>c.type==='Rectangle').forEach(r=>r.destroy());
          placedParts = arr;
          arr.forEach(p => {
            const r = scene.add.rectangle(p.x, p.y, p.w, p.h, 0x88cc88).setStrokeStyle(2,0x335533);
            r._id = p._id;
          });
        } catch (err) {
          console.error(err);
          alert('Invalid JSON');
        } finally {
          input.value = '';
        }
      };
      input.click();
    };

    scene.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT');
  }

  function startPlayMode(scene) {
    mode = 'play';
    document.getElementById('modeLabel').textContent = 'Mode: Play';
    document.getElementById('btnMode').textContent = 'Build';
    // remove build rectangles
    scene.children.list.filter(c=>c.type==='Rectangle').forEach(r=>r.destroy());
    // create a single player from placedParts bounding box or center
    if (placedParts.length === 0) {
      var spawn = { x: WIDTH/2, y: HEIGHT/2 };
    } else {
      const p = placedParts[0];
      var spawn = { x: p.x, y: p.y };
    }
    player = scene.physics.add.image(spawn.x, spawn.y, null);
    player.setSize(48, 24);
    player.setCollideWorldBounds(true);
    player.setDamping(true);
    player.setDrag(0.9);
    player.setMaxVelocity(300);
  }

  function startBuildMode(scene) {
    mode = 'build';
    document.getElementById('modeLabel').textContent = 'Mode: Build';
    document.getElementById('btnMode').textContent = 'Play';
    if (player) {
      // re-create rectangles from placedParts
      placedParts.forEach(p => {
        const r = scene.add.rectangle(p.x, p.y, p.w, p.h, 0x88cc88).setStrokeStyle(2,0x335533);
        r._id = p._id;
      });
      player.destroy();
      player = null;
    }
  }

  function update(time, dt) {
    if (mode === 'play' && player) {
      const kb = this.keys;
      const speed = 200;
      let vx=0, vy=0;
      if (kb.W.isDown || kb.UP.isDown) vy -= speed;
      if (kb.S.isDown || kb.DOWN.isDown) vy += speed;
      if (kb.A.isDown || kb.LEFT.isDown) vx -= speed;
      if (kb.D.isDown || kb.RIGHT.isDown) vx += speed;
      player.setVelocity(vx, vy);
    }
  }
})();
