#!/usr/bin/env node
// scripts/bundle.js — combine all ES modules into a single standalone index.html
// Run: node scripts/bundle.js

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Files in dependency order (bottom-up)
const ORDER = [
  'src/constants.js',
  'src/utils/Math2D.js',
  'src/utils/Pool.js',
  'src/utils/SpriteCache.js',
  'src/utils/PRNG.js',
  'src/engine/Input.js',
  'src/engine/Camera.js',
  'src/blocks/BlockDefs.js',
  'src/blocks/BlockRegistry.js',
  'src/ship/ShipStats.js',
  'src/inventory/Inventory.js',
  'src/ship/Ship.js',
  'src/world/Asteroid.js',
  'src/world/DropItem.js',
  'src/world/Station.js',
  'src/world/World.js',
  'src/combat/Bullet.js',
  'src/combat/WeaponSystem.js',
  'src/enemy/EnemyAI.js',
  'src/enemy/EnemyShip.js',
  'src/effects/EffectsSystem.js',
  'src/craft/Recipes.js',
  'src/craft/CraftSystem.js',
  'src/ui/HUD.js',
  'src/ui/BuildUI.js',
  'src/ui/StationUI.js',
  'src/ui/UIManager.js',
  'src/save/SaveSystem.js',
  'src/Game.js',
  'src/main.js',
];

function stripImportsExports(code) {
  // Remove multi-line import statements: import { ... } from '...';
  code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"]\s*;?/g, '');
  // Remove: import DefaultName from '...'
  code = code.replace(/import\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, '');
  // Remove: import * as name from '...'
  code = code.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, '');
  // Remove standalone export blocks: export { foo, bar };
  code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  // Remove 'export default' keyword
  code = code.replace(/\bexport\s+default\s+/g, '');
  // Remove 'export' before declarations (class, function, const, let, var)
  code = code.replace(/\bexport\s+((?:async\s+)?(?:class|function|const|let|var)\b)/g, '$1');
  return code;
}

let bundle = '// Jankyard Wars — bundled single-file build\n"use strict";\n\n';

for (const relPath of ORDER) {
  const fullPath = path.join(ROOT, relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  code = stripImportsExports(code);
  code = code.replace(/^\s*\n/gm, '\n').trim();
  bundle += `// ═══ ${relPath} ═══\n${code}\n\n`;
}

// Build the final HTML — read the template and swap out the script block
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Match either:
//   <script type="module" src="src/main.js"></script>  (first run)
//   <script>// Jankyard Wars — bundled...</script>       (subsequent runs)
const moduleTagRe = /\s*<script\s+type="module"\s+src="src\/main\.js"><\/script>/;
const bundleTagRe = /\s*<script>\s*\/\/ Jankyard Wars — bundled[\s\S]*?<\/script>/;

if (moduleTagRe.test(html)) {
  html = html.replace(moduleTagRe, `\n  <script>\n${bundle}\n  </script>`);
} else if (bundleTagRe.test(html)) {
  html = html.replace(bundleTagRe, `\n  <script>\n${bundle}\n  </script>`);
} else {
  console.error('ERROR: Could not find script placeholder in index.html');
  process.exit(1);
}

const outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✓ Bundled into index.html (${(html.length / 1024).toFixed(1)} KB)`);
